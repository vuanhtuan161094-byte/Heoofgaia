"""HG33 H5: verify original troop thumbnails and offline art in real Chromium."""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
GAME = ROOT / "Play-Heoofgaia-HG11.html"
OUT = ROOT / "docs/evidence/hg33/H5-release-assets"
SIZES = [(1280, 720), (960, 540)]
screenshots, checks, errors = [], [], []


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


with sync_playwright() as pw:
    launch = {"headless": True, "args": ["--no-sandbox", "--disable-dev-shm-usage", "--allow-file-access-from-files"]}
    if os.environ.get("HOG_CHROME_PATH"):
        launch["executable_path"] = os.environ["HOG_CHROME_PATH"]
    browser = pw.chromium.launch(**launch)
    for width, height in SIZES:
        page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
        page.set_default_timeout(15000)
        page.on("pageerror", lambda exc: errors.append(str(exc)))
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.goto(GAME.as_uri(), wait_until="load")
        page.locator('[data-action="race"][data-race="human"]').click()
        page.locator('[data-action="start"]').click()
        page.locator('[data-action="tab"][data-tab="army"]').first.click()
        page.wait_for_timeout(150)
        result = page.evaluate("""async () => {
          const A=window.HOG_ART_PACK,P=window.HOG_PAINTER,R=window.HOG_HG33_TROOP_ATLASES,C=window.HOG_CATALOG;
          if(!A||!P||!R||!C)throw Error('Missing offline game/art modules');
          const forbiddenGlobals=['HOG_FREE_SPRITES','HOG_HG192_SPRITES','HOG_HG193_SPRITES','HOG_HG22_SKELETON'];
          if(forbiddenGlobals.some(name=>window[name]))throw Error('Legacy third-party sprite module is loaded');
          if(document.querySelector('[id^="hg191-"],[id^="hg192-"],[id^="hg193-"],[id^="hg22-skeleton-"]'))throw Error('Legacy combat sprite preloader remains in the page');
          const core=Object.values(C.units).flat().map(u=>u.id),rewards=R.additional.filter(x=>x.kind==='reward').map(x=>x.unitId),ids=[...core,...rewards],decodeIds=new Set([...Object.values(C.units).map(units=>units[0].id),...rewards]);
          if(core.length!==40||rewards.length!==8||new Set(ids).size!==48)throw Error('Expected 40 core + 8 reward units');
          const coverage=[];
          for(const id of ids){
            const atlas=R.resolve(id),thumb=document.getElementById('hg33-thumb-'+id);
            if(!atlas||!thumb)throw Error('Missing atlas or original thumb '+id);
            const source=thumb.getAttribute('data-hg33-thumb-src');
            if(!source?.startsWith('data:image/webp;base64,'))throw Error('Bad offline thumb source '+id);
            const required=['idle','walk','attack','hit','death'];
            if(required.some(action=>{const clip=atlas.actions[action];return clip?.count!==8||(clip.frames&&new Set(clip.frames.map(f=>f.sha256Rgba)).size!==8)})||new Set(required.map(action=>atlas.actions[action].row)).size!==5)throw Error('Incomplete original animation metadata '+id);
            const holder=document.createElement('div');holder.innerHTML=A.unitHTML(id,56);const card=holder.querySelector('img.hog-unit-thumb');
            if(!card)throw Error('Unit card thumbnail missing '+id);
            if(!card.src.startsWith('data:image/'))throw Error('Unit card is not self-contained '+id);
            if(card.classList.contains('hg33-original-thumb')&&!card.src.startsWith('data:image/webp;base64,'))throw Error('HG33 atlas thumb is not inline WebP '+id);
            let alpha=null,width=null,height=null;
            if(decodeIds.has(id)){
              const decoded=new Image();decoded.src=source;await decoded.decode();width=decoded.naturalWidth;height=decoded.naturalHeight;
              if(width!==96||height!==102)throw Error('Bad decoded atlas crop '+id);
              const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d');ctx.drawImage(decoded,0,0,64,64);
              const data=ctx.getImageData(0,0,64,64).data;alpha=0;for(let i=3;i<data.length;i+=4)if(data[i]>24)alpha++;
              if(alpha<45)throw Error('Blank unit thumbnail '+id);
            }
            coverage.push({id,thumbWidth:width,thumbHeight:height,kind:atlas.kind||'core',fiveActions:true,visiblePixels:alpha,decoded:decodeIds.has(id),uiThumbSource:card.classList.contains('hg33-original-thumb')?'HG33 atlas crop':card.classList.contains('hg28-troop-thumb')?'preserved high-tier original master':'preserved spear original art'});
          }
          const visible=[...document.querySelectorAll('.hog-unit-thumb')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0}).length;
          return {coreCount:core.length,rewardCount:rewards.length,unitCount:ids.length,coverage,visibleArmyThumbs:visible,legacySpriteGlobalsAbsent:forbiddenGlobals.every(name=>!window[name]),legacySpritePreloadersAbsent:true,saveValid:window.HOG_ENGINE.strictSave(window.HOG_APP_DEBUG.getState())};
        }""")
        assert result["unitCount"] == 48 and result["saveValid"], f"{width}x{height}: roster/art validation failed"
        assert result["legacySpriteGlobalsAbsent"] and result["legacySpritePreloadersAbsent"], f"{width}x{height}: external source remained in runtime"
        assert all(x["fiveActions"] for x in result["coverage"]) and all(x["visiblePixels"] >= 45 for x in result["coverage"] if x["decoded"]), f"{width}x{height}: bad atlas crop"
        page.wait_for_timeout(250)
        OUT.mkdir(parents=True, exist_ok=True)
        screenshot = OUT / f"army-original-unit-art-{width}x{height}.png"
        page.screenshot(path=str(screenshot), animations="disabled")
        screenshots.append({"viewport": f"{width}x{height}", "path": screenshot.relative_to(ROOT).as_posix(), "sha256": sha(screenshot)})
        checks.append({"viewport": f"{width}x{height}", "status": "PASS", "coreUnits": result["coreCount"], "rewardUnits": result["rewardCount"], "checkedActionSequences": 48 * 5, "visibleArmyThumbs": result["visibleArmyThumbs"], "saveV07Valid": result["saveValid"], "coverage": result["coverage"]})
        page.close()
    browser.close()

receipt = {
    "commit": subprocess.check_output(["git", "-c", f"safe.directory={ROOT.resolve().as_posix()}", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
    "html": GAME.name,
    "htmlSha256": sha(GAME),
    "browser": "Playwright Chromium opened the built offline file:// game; New Game -> Army tab; screenshots are real viewport captures.",
    "externalCombatArt": "PASS: source modules, preload nodes and audited third-party payloads excluded from the offline release",
    "screenshots": screenshots,
    "checks": checks,
    "pageErrors": errors,
    "result": "PASS" if len(checks) == 2 and len(screenshots) == 2 and not errors else "FAIL",
}
qa = ROOT / "docs/qa/hg33/H5-release-assets/chromium.json"
qa.parent.mkdir(parents=True, exist_ok=True)
qa.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"HG33 H5 real Chromium: {len(checks)}/2 viewports PASS; 48 unit cards; {len(screenshots)} screenshots; {len(errors)} browser errors")
print(f"Offline HTML SHA-256 {receipt['htmlSha256']} · receipt {qa.relative_to(ROOT).as_posix()}")
if receipt["result"] != "PASS":
    raise SystemExit(1)
