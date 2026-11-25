"""D2: actual native battle render, no mock action and no extra combat units."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from nl_native_pve_a1_browser import open_page, errors
import json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"qa"/"nl-art-d2"
OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
    for width in [1280,390]:
        page=open_page(browser,width=width)
        page.wait_for_function("window.__NL_ART_D2_QA__?.ready()",timeout=30000)
        page.evaluate("""()=>{const q=__P2_QA__;q.beginBattle(1,'campaign');q.debugBattle().next=Date.now()+999999;q.stepBattle()}""")
        page.wait_for_function("__P2_QA__.debugBattle()?.current?.attacker && __P2_QA__.debugBattle()?.current?.hits?.length")
        out=page.evaluate("""()=>{
          const q=__P2_QA__,d=__NL_ART_D2_QA__,b=q.debugBattle(),ev=b.current;
          const saved=JSON.stringify(q.getGame()),count=b.p.length+b.e.length,events=b.events.length;
          const result={sheets:d.count()===18,heroes:Object.keys(window.__NL_ART_CATALOG__).length>=368,
            attack:d.visual(ev.attacker,ev.time+250).actor,
            hit:d.visual(ev.hits[0].target,ev.time+520).hit};
          for(const elapsed of [70,290,520,790]){
            ev.time=performance.now()-elapsed;__P41_QA__.drawScene(performance.now());
          }
          const m=d.metrics();result.groups=m.groups>0&&m.soldiers>=2*m.groups;
          const dims=d.raster();result.originalRaster=dims.p41[0]===800&&dims.p41[1]===5184&&dims.p5[0]===400&&dims.p5[1]===2880;
          result.rasterPainted=m.raster>0&&m.raster+m.vector===m.soldiers;
          result.polishedVfx=m.polishFx>0;
          result.vfx=m.fx>0;result.state=JSON.stringify(q.getGame())===saved&&b.p.length+b.e.length===count&&b.events.length===events;
          result.save=q.getGame().version===5;return {result,m,count,events};
        }""")
        print("NL_ART_D2",width,json.dumps(out),flush=True)
        assert all(out["result"].values()),out
        for ms,label in [(70,"charge"),(290,"release"),(520,"contact"),(790,"fade")]:
            page.evaluate("(ms)=>{__P41_QA__.setVisualElapsed(ms);__P41_QA__.drawScene(performance.now())}",ms)
            page.locator("#battle-canvas").screenshot(path=str(OUT/f"{width}-{label}.png"))
        page.close()
    assert not errors,errors
    browser.close()
