#!/usr/bin/env python3
"""R04 static portrait pilot browser QA at desktop and mobile viewports."""
from __future__ import annotations
import base64
import json
import sys
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SAVE_KEY = "muu_dinh_tam_quoc_v1"
STUB = """<script>window.__P2_ENABLE_QA__=true;const __store=__NL_STORE__;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>Object.prototype.hasOwnProperty.call(__store,k)?__store[k]:null,setItem:(k,v)=>__store[k]=String(v),removeItem:k=>delete __store[k],clear:()=>Object.keys(__store).forEach(k=>delete __store[k])}});</script>"""
checks=[]
errors=[]
def check(name, condition):
    ok=bool(condition); checks.append({"name":name,"pass":ok}); print(("PASS " if ok else "FAIL ")+name,flush=True)
def open_page(browser,width,height):
    page=browser.new_page(viewport={"width":width,"height":height},device_scale_factor=1)
    page.on("pageerror",lambda e:errors.append(str(e)))
    page.set_content(HTML.replace("__NL_STORE__",json.dumps({},ensure_ascii=False),1).replace("<script>",STUB.replace("__NL_STORE__",json.dumps({},ensure_ascii=False))+"<script>",1),wait_until="domcontentloaded")
    return page
def stage25_fixture(page):
    page.evaluate("""()=>{const g=__P2_QA__.getGame();g.cleared=Array.from({length:24},(_,i)=>i+1);for(const id of ["sun","zhou"]){if(!g.roster.includes(id))g.roster.push(id);g.hero[id]={level:32,xp:0,troops:900}}g.slots=["guan","zhang","liu","sun","zhou",null,null,null,null];g.silver=50000;g.grain=30000;g.iron=18000;for(const id of g.roster)g.hero[id]={...(g.hero[id]||{}),level:32,xp:0,troops:900};g.p3TroopTier=Object.fromEntries(g.roster.map(id=>[id,4]));__P2_QA__.setGame(g)}""")
def main():
    manifest=json.loads((ROOT/"assets/r04/r04-original-visual-pilot-v1.json").read_text(encoding="utf-8"))
    records={item["id"]:item for item in manifest["characters"]}
    for cid,record in records.items():
        path=ROOT/"assets/r04"/record["registeredMaster"]
        with Image.open(path) as im:
            alpha=im.getchannel("A")
            check(f"{cid} registered master is 512x640 RGBA with transparent padding",im.mode=="RGBA" and im.size==(512,640) and alpha.getbbox() is not None and alpha.getbbox()[0]>=28 and alpha.getbbox()[1]>=34 and alpha.getbbox()[2]<=484 and alpha.getbbox()[3]<=606)
        expected="data:image/png;base64,"+base64.b64encode(path.read_bytes()).decode("ascii")
        check(f"{cid} embedded browser payload matches the registered source PNG",f'{cid}:"{expected}"' in HTML)
    check("manifest identifies the asset as recreated original art and static-only",manifest["status"]=="RECREATED" and manifest["animationStatus"]=="STATIC_MASTER_ONLY" and len(records)==2)
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
        page=open_page(browser,1280,720)
        page.on("pageerror",lambda e:errors.append(str(e)))
        stage25_fixture(page)
        page.locator('.nav[data-tab="campaign"]').click(); page.locator('[data-stage="25"]').click(); page.locator('[data-battle="25"]').click()
        scout=page.locator('.nlr03-encounter [data-r04-pilot-art="scout"]')
        check("real stage-25 battle callout renders its exact scout portrait",scout.count()==1 and scout.get_attribute("src")==page.evaluate("window.__NL_R04_QA__.art.scout") and scout.evaluate("e=>e.complete&&e.naturalWidth===512&&e.naturalHeight===640"))
        expected_scout="data:image/png;base64,"+base64.b64encode((ROOT/"assets/r04"/records["scout"]["registeredMaster"]).read_bytes()).decode("ascii")
        check("embedded scout browser payload is byte-identical to its registered PNG",page.evaluate("window.__NL_R04_QA__.art.scout")==expected_scout)
        box=scout.bounding_box() if scout.count() else None
        check("desktop portrait respects 56x70 display target",box is not None and abs(box["width"]-56)<1 and abs(box["height"]-70)<1)
        check("Save v5 and campaign state remain unchanged by portrait rendering",page.evaluate("__P2_QA__.getGame().version===5&&__P2_QA__.getGame().cleared.length===24"))
        page.screenshot(path=str(ROOT/"qa/nl-r04-pilot-desktop.png"),full_page=False)
        page.evaluate("""()=>{const g=__P2_QA__.getGame();g.cleared=Array.from({length:25},(_,i)=>i+1);__P2_QA__.setGame(g);__P2_QA__.beginBattle(26,'campaign')}""")
        tactician=page.locator('.nlr03-encounter [data-r04-pilot-art="tactician"]')
        check("real stage-26 battle callout swaps to the tactician portrait",tactician.count()==1 and tactician.get_attribute("src")==page.evaluate("window.__NL_R04_QA__.art.tactician") and tactician.evaluate("e=>e.complete&&e.naturalWidth===512&&e.naturalHeight===640"))
        expected_tactician="data:image/png;base64,"+base64.b64encode((ROOT/"assets/r04"/records["tactician"]["registeredMaster"]).read_bytes()).decode("ascii")
        check("embedded tactician browser payload is byte-identical to its registered PNG",page.evaluate("window.__NL_R04_QA__.art.tactician")==expected_tactician)
        check("pilot portraits are presentation-only and do not mutate battle power or unit roster",page.evaluate("__P2_QA__.getBattle().p.length===5&&__P2_QA__.getBattle().e.length===5"))
        page.screenshot(path=str(ROOT/"qa/nl-r04-pilot-ember-desktop.png"),full_page=False)
        mobile=open_page(browser,390,844); stage25_fixture(mobile); mobile.locator('.nav[data-tab="campaign"]').click(); mobile.locator('[data-stage="25"]').click(); mobile.locator('[data-battle="25"]').click()
        mportrait=mobile.locator('.nlr03-encounter [data-r04-pilot-art="scout"]')
        check("390px Chromium renders the full-alpha portrait and callout without horizontal overflow",mportrait.count()==1 and mportrait.evaluate("e=>e.complete&&e.naturalWidth===512&&e.naturalHeight===640") and mobile.evaluate("document.documentElement.scrollWidth<=innerWidth"))
        mobile.screenshot(path=str(ROOT/"qa/nl-r04-pilot-mobile-390.png"),full_page=False)
        check("R04 desktop/mobile scenes report no JavaScript exceptions",not errors)
        browser.close()
    result={"milestone":"NL-R04-STATIC-VISUAL-PILOT","checks":checks,"errors":errors,"total":len(checks),"passed":sum(1 for c in checks if c["pass"]),"failed":[c["name"] for c in checks if not c["pass"]]}
    (ROOT/"qa/NL_R04_PILOT.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({k:result[k] for k in ("total","passed","failed")},ensure_ascii=False))
    return 0 if result["passed"]==result["total"] else 1
if __name__=="__main__": raise SystemExit(main())
