"""CL-P5 infantry sprite source, atlas, and real Chromium battle gate."""
from __future__ import annotations

import base64
import hashlib
import json
import os
import re
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets" / "p5" / "cl-p5-infantry-scout-v1"
ATLAS_PATH = ASSET_DIR / "cl-p5-infantry-scout-atlas.webp"
MANIFEST_PATH = ASSET_DIR / "cl-p5-infantry-scout-manifest.json"
HTML_PATH = ROOT / "index.html"
ACTIONS = ["idle", "walk", "attack", "hurt", "death"]
DIRECTIONS = ["front", "right", "back", "left"]
CHECKS: list[dict[str, object]] = []


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def check(label: str, condition: object) -> None:
    passed = bool(condition)
    CHECKS.append({"name": label, "pass": passed})
    print(("PASS" if passed else "FAIL"), label, flush=True)


manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
html = HTML_PATH.read_text(encoding="utf-8")
atlas_bytes = ATLAS_PATH.read_bytes()
with Image.open(ATLAS_PATH) as atlas_open:
    atlas = atlas_open.convert("RGBA")

check("manifest registers 80 original frames", manifest["automatedChecks"]["sheetCells"] == 80)
check("atlas dimensions match 20 directional action rows", atlas.size == (400, 2880))
check("atlas is lossless WebP from manifest", manifest["atlas"]["format"] == "lossless WebP" and sha256(atlas_bytes) == manifest["atlas"]["sha256"])
visible_frames = True
for row in manifest["automatedChecks"]["frameReport"]:
    x, y, width, height = row["packedRect"]
    if atlas.crop((x, y, x + width, y + height)).getchannel("A").getbbox() is None:
        visible_frames = False
check("atlas has all 80 visible packed frames", len(manifest["automatedChecks"]["frameReport"]) == 80 and visible_frames)

for action in ACTIONS:
    sheet = ASSET_DIR / f"{action}-4x4-sheet.png"
    row = next(x for x in manifest["sourceSheets"] if x["path"] == sheet.name)
    with Image.open(sheet) as source:
        source_rgba = source.convert("RGBA")
        alpha = source_rgba.getchannel("A")
        has_cutout = alpha.getextrema()[0] == 0 and alpha.getextrema()[1] == 255 and alpha.getbbox() is not None
        correct_sheet = source_rgba.size == (1254, 1254)
        clean_frames = True
        for direction in range(4):
            hashes = []
            for frame in range(4):
                x0, x1 = round(frame * source_rgba.width / 4), round((frame + 1) * source_rgba.width / 4)
                y0, y1 = round(direction * source_rgba.height / 4), round((direction + 1) * source_rgba.height / 4)
                cell = source_rgba.crop((x0, y0, x1, y1))
                hashes.append(sha256(cell.tobytes()))
                if cell.getchannel("A").getbbox() is None:
                    clean_frames = False
            if len(set(hashes)) != 4:
                clean_frames = False
    check(f"{action} sheet is true-alpha 4x4 with four distinct frames per view", correct_sheet and has_cutout and clean_frames)
    check(f"{action} source SHA matches manifest", sha256(sheet.read_bytes()) == row["sha256"])

for row in manifest.get("rejectedSources", []):
    rejected = ASSET_DIR / row["path"]
    check(f"rejected source retained with its reason: {row['path']}", rejected.is_file() and sha256(rejected.read_bytes()) == row["sha256"] and bool(row["rejectionReason"]))

for action_index, action in enumerate(ACTIONS):
    for direction_index, direction in enumerate(DIRECTIONS):
        frame_hashes = []
        for frame in range(4):
            cell = atlas.crop((frame * 100, (action_index * 4 + direction_index) * 144, (frame + 1) * 100, (action_index * 4 + direction_index + 1) * 144))
            frame_hashes.append(sha256(cell.tobytes()))
        check(f"packed {action}/{direction} retains four separate poses", len(set(frame_hashes)) == 4)

start = html.index("// CL-P5_INFANTRY_SCOUT_ATLAS_START")
end = html.index("// CL-P5_INFANTRY_SCOUT_ATLAS_END", start)
block = html[start:end]
match = re.search(r"const CL_P5_INFANTRY_SCOUT_ATLAS = \[(.*?)\]\.join\(\"\"\)", block, re.S)
check("canonical game embeds the P5 atlas", match is not None)
embedded = ""
if match:
    values = re.findall(r'"([^"\\]*)"', match.group(1))
    embedded = "".join(values)
    check("embedded WebP bytes equal the source atlas", embedded.startswith("data:image/webp;base64,") and base64.b64decode(embedded.split(",", 1)[1], validate=True) == atlas_bytes)
else:
    check("embedded WebP bytes equal the source atlas", False)

browser_errors: list[str] = []
gallery_bytes = b""
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=os.environ.get("CHROMIUM_BIN") or None, headless=True, args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
    page.on("pageerror", lambda error: browser_errors.append(str(error)))
    shim = "<script>window.__P2_ENABLE_QA__=true;const __store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>__store[k]??null,setItem:(k,v)=>__store[k]=String(v),removeItem:k=>delete __store[k]}});</script>"
    page.set_content(html.replace("<script>", shim + "<script>", 1), wait_until="domcontentloaded")
    page.wait_for_function("window.__P41_QA__?.p5Image?.complete && window.__P41_QA__.p5Image.naturalWidth === 400 && window.__P41_QA__.p5Image.naturalHeight === 2880", timeout=30000)
    check("new sprite atlas decodes offline in Chromium", page.evaluate("__P41_QA__.p5Image.complete && __P41_QA__.p5Image.naturalWidth===400 && __P41_QA__.p5Image.naturalHeight===2880"))
    check("all 80 action and direction coordinates resolve", page.evaluate("(()=>{for(const a of __P41_QA__.p5Manifest.actions)for(const d of __P41_QA__.p5Manifest.directions)for(let f=0;f<4;f++)if(__P41_QA__.p5Index(d,a,f)<0)return false;return true})()"))

    mapped = page.evaluate("""(()=>{
      const qa=window.__P41_QA__,actions=['idle','walk','attack','hurt','death'],dirs=['front','right','back','left'];
      const same=(a,b)=>{const x=a.getImageData(0,0,100,144).data,y=b.getImageData(0,0,100,144).data;for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;return true;};
      for(const action of actions)for(const direction of dirs){
        const sourceFrame=action==='death'?2:4,mappedFrame=action==='death'?sourceFrame:Math.floor(sourceFrame*4/6),index=qa.p5Index(direction,action,mappedFrame);
        const actual=document.createElement('canvas').getContext('2d'),expected=document.createElement('canvas').getContext('2d');
        if(!qa.drawFrame(actual,'infantry',direction,action,sourceFrame,0,0,100,144))return false;
        expected.drawImage(qa.p5Image,(mappedFrame%4)*100,Math.floor(index/4)*144,100,144,0,0,100,144);
        if(!same(actual,expected))return false;
      }
      return true;
    })()""")
    check("live renderer maps all five P5 actions across four directions", mapped)

    legacy = page.evaluate("""(()=>{
      const qa=window.__P41_QA__,index=qa.index('cavalry','left','attack',2),actual=document.createElement('canvas').getContext('2d'),expected=document.createElement('canvas').getContext('2d');
      qa.drawFrame(actual,'cavalry','left','attack',2,0,0,100,144);expected.drawImage(qa.image,(index%8)*100,Math.floor(index/8)*144,100,144,0,0,100,144);
      const a=actual.getImageData(0,0,100,144).data,b=expected.getImageData(0,0,100,144).data;for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;
    })()""")
    check("non-infantry sprites still use the preserved P4.1 atlas", legacy)

    page.evaluate("__P2_QA__.beginBattle(1,'campaign')")
    page.evaluate("__P2_QA__.debugBattle().next=Date.now()+999999;__P2_QA__.stepBattle()")
    event = page.evaluate("__P41_QA__.currentEvent()")
    check("actual battle supplies an attacker and recorded hit targets", bool(event and event.get("actor") and event.get("hits")))
    phase_action = page.evaluate("""(()=>{const b=__P2_QA__.debugBattle(),now=performance.now();b.current.time=now-250;const actor=b.current.attacker,attack=__P41_QA__.visual(actor,now).action;b.current.time=now-520;const target=b.current.hits[0]?.target,hit=target?__P41_QA__.visual(target,now).action:null;__P41_QA__.drawScene(now);return {attack,hit,hasInfantry:[...b.p,...b.e].some(u=>u.troop==='infantry')};})()""")
    check("real battle event selects attack and hit animation states", phase_action["attack"] == "attack" and phase_action["hit"] == "hit")
    gallery = page.evaluate("""(()=>{const c=document.createElement('canvas');c.width=800;c.height=1440;const x=c.getContext('2d'),qa=__P41_QA__,actions=['idle','walk','attack','hurt','death'],dirs=['front','right','back','left'];x.fillStyle='#16251f';x.fillRect(0,0,c.width,c.height);for(let a=0;a<5;a++)for(let d=0;d<4;d++){const xx=d*200,yy=a*288;x.fillStyle='#30443b';x.fillRect(xx,yy,200,288);qa.drawFrame(x,'infantry',dirs[d],actions[a],2,xx,yy,200,288);x.fillStyle='#f4ddb0';x.font='16px sans-serif';x.fillText(actions[a]+'/'+dirs[d],xx+4,yy+280);}return c.toDataURL('image/png').split(',')[1]})()""")
    from base64 import b64decode
    gallery_bytes = b64decode(gallery)
    (ROOT / "qa" / "cl-p5-infantry-browser-matrix.png").write_bytes(gallery_bytes)
    page.screenshot(path=str(ROOT / "qa" / "cl-p5-infantry-battle.png"))

    death = page.evaluate("""(()=>{
      const b=__P2_QA__.debugBattle(),units=[...b.p,...b.e],victim=units.find(u=>u.troop==='infantry')||units[0],attacker=units.find(u=>u!==victim);
      victim.troop='infantry';victim.hp=1;victim.alive=true;
      const hit=__P2_QA__.p2Hit(attacker,victim,'physical',1);
      __P41_QA__.applyFrame({actorTeam:attacker.team,actorSlot:attacker.slot,hits:[hit],mode:'normal',kind:'physical',round:b.round||1});
      const now=performance.now(),key=victim.team+':'+victim.slot,first=__P41_QA__.visual(victim,now);
      b.deathAnimations[key]=now-500;const last=__P41_QA__.visual(victim,now);__P41_QA__.drawScene(now);
      return {hp:victim.hp,action:first.action,first:first.frame,last:last.frame};
    })()""")
    check("real damage event triggers the four-frame infantry death clip", death["hp"] == 0 and death["action"] == "death" and death["first"] == 0 and death["last"] == 3)
    page.screenshot(path=str(ROOT / "qa" / "cl-p5-infantry-death.png"))
    page.set_viewport_size({"width": 390, "height": 844})
    page.wait_for_timeout(120)
    mobile_bounds = page.locator("#battle-canvas").bounding_box()
    check("battle canvas remains inside mobile Chromium viewport", bool(mobile_bounds and mobile_bounds["x"] >= -1 and mobile_bounds["x"] + mobile_bounds["width"] <= 391))
    page.screenshot(path=str(ROOT / "qa" / "cl-p5-infantry-death-mobile.png"))
    check("no Chromium JavaScript exceptions", not browser_errors)
    browser.close()

result = {
    "milestone": "CL-P5",
    "assetId": manifest["assetId"],
    "sourceHtmlSha256": sha256(html.encode("utf-8")),
    "atlasSha256": sha256(atlas_bytes),
    "checksPassed": sum(bool(row["pass"]) for row in CHECKS),
    "checksTotal": len(CHECKS),
    "checks": CHECKS,
    "actualBattleEvent": event,
    "liveBattleStates": phase_action,
    "deathClip": death,
    "browserErrors": browser_errors,
    "visualEvidence": ["qa/cl-p5-infantry-browser-matrix.png", "qa/cl-p5-infantry-battle.png", "qa/cl-p5-infantry-death.png", "qa/cl-p5-infantry-death-mobile.png"],
}
(ROOT / "qa" / "CL_P5_INFANTRY.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"CL-P5 INFANTRY CHROMIUM {result['checksPassed']}/{result['checksTotal']}", flush=True)
assert result["checksPassed"] == result["checksTotal"], result
