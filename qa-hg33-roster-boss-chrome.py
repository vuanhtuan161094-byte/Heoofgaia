"""Exercise the built offline HTML in Chromium with real game battle state and HG33 atlases."""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).parent
GAME = ROOT / "Play-Heoofgaia-HG11.html"
OUT = ROOT / "docs/evidence/hg33/H4-boss-roster-chromium"
SIZES = [(1280, 720), (960, 540)]
checks, screenshots, errors = [], [], []


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
        page.locator('[data-action="race"][data-race="elf"]').click()
        page.locator('[data-action="start"]').click()
        state = page.evaluate("""() => {
          const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
          s.army.elf_2=16;E.setFormation(s,[{unitId:'elf_2',count:16}]);
          const target=E.TILES.find(t=>t.kind==='npc'&&t.value==='Azrael');
          if(!target)throw Error('Azrael NPC missing');
          const out=E.startMarch(s,target.key);
          if(out&&out.type==='error')throw Error(out.message||'march rejected');
          E.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);HOG_APP_DEBUG.render();
          return {target:target.key,inBattle:!!s.battle,allies:s.battle?.allies.map(u=>u.unitId),enemies:s.battle?.enemies.map(u=>u.name),saveValid:E.strictSave(s)};
        }""")
        assert state["inBattle"] and any(u == "elf_2" for u in state["allies"]), f"{width}x{height}: real march failed: {state}"
        assert state["saveValid"] and any("Azrael" in n for n in state["enemies"]), f"{width}x{height}: no valid Azrael battle: {state}"

        decoded = page.evaluate("""async () => {
          const rows=HOG_HG33_TROOP_ATLASES.additional,results=[];
          for(const row of rows){
            const img=document.getElementById(row.imageId);
            if(!img)throw Error('offline atlas image element missing: '+row.imageId);
            if(!img.hasAttribute('src'))img.src=img.dataset.hg33AtlasSrc;
            await img.decode();
            results.push({id:row.id,src:img.currentSrc.startsWith('data:image/webp;base64,'),width:img.naturalWidth,height:img.naturalHeight,actions:Object.keys(row.actions).length,frames:Object.values(row.actions).every(a=>a.count===8)});
          }
          return results;
        }""")
        assert len(decoded) == 21 and all(r["src"] and r["width"] == 1536 and r["height"] == 1024 and r["actions"] == 5 and r["frames"] for r in decoded), f"{width}x{height}: atlas decode failure"

        paint = page.evaluate("""() => {
          const E=HOG_ENGINE,P=HOG_PAINTER,s=HOG_APP_DEBUG.getState(),canvas=document.getElementById('battle-canvas'),ctx=canvas.getContext('2d'),calls=[],original=ctx.drawImage,state=JSON.stringify(E.clone(s));
          ctx.drawImage=function(img,...args){if(img?.id?.startsWith('hg33-atlas-')||img?.id==='unit-hg33-elf-2-atlas')calls.push(img.id);return original.call(this,img,...args)};
          try{
            P.drawBattle(canvas,E,s,performance.now(),{showGrid:true});
            const layout=P.battleUnitLayout(s.battle,P.battleProjection(canvas,E),canvas.width,canvas.height);
            const ally=layout.find(x=>x.u.unitId==='elf_2'),boss=layout.find(x=>x.u.side==='enemy'&&String(x.u.name).includes('Azrael'));
            return {calls,stateUnchanged:state===JSON.stringify(E.clone(s)),saveValid:E.strictSave(s),allyDraws:calls.filter(x=>x==='unit-hg33-elf-2-atlas').length,bossDraws:calls.filter(x=>x==='hg33-atlas-azrael').length,ally:!!ally,boss:!!boss};
          }finally{ctx.drawImage=original}
        }""")
        assert paint["stateUnchanged"] and paint["saveValid"] and paint["allyDraws"] > 0 and paint["bossDraws"] > 0 and paint["ally"] and paint["boss"], f"{width}x{height}: atlases not drawn by actual battle renderer: {paint}"
        page.wait_for_timeout(200)
        OUT.mkdir(parents=True, exist_ok=True)
        screenshot = OUT / f"azrael-real-battle-{width}x{height}.png"
        page.screenshot(path=str(screenshot), animations="disabled")
        screenshots.append({"viewport": f"{width}x{height}", "path": screenshot.relative_to(ROOT).as_posix(), "sha256": sha(screenshot)})
        checks.append({"viewport": f"{width}x{height}", "pass": True, "realNpcMarch": state["target"], "battleEnemies": state["enemies"], "decodedOfflineAtlases": len(decoded), "actualCoreDrawCalls": paint["allyDraws"], "actualAzraelDrawCalls": paint["bossDraws"], "saveV07ValidBeforeAndAfterDraw": paint["saveValid"] and paint["stateUnchanged"]})
        page.close()
    browser.close()

receipt = {
    "commit": subprocess.check_output(["git", "-c", f"safe.directory={ROOT.resolve().as_posix()}", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
    "html": GAME.name,
    "htmlSha256": sha(GAME),
    "browser": "Playwright Chromium opening the built file:// HTML; New Game + actual engine march to Azrael NPC; no battle result is claimed.",
    "checks": checks,
    "screenshots": screenshots,
    "pageErrors": errors,
    "offlineAtlasImages": 21,
    "result": "PASS" if len(checks) == 2 and len(screenshots) == 2 and not errors else "FAIL",
}
qa = ROOT / "docs/qa/hg33/H4-boss-roster-chromium.json"
qa.parent.mkdir(parents=True, exist_ok=True)
qa.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"HG33 real Chromium roster/Boss: {len(checks)}/2 viewports PASS; {len(screenshots)} screenshots; {len(errors)} browser errors")
print(f"HTML SHA256 {receipt['htmlSha256']} · receipt {qa.relative_to(ROOT).as_posix()}")
if receipt["result"] != "PASS":
    raise SystemExit(1)
