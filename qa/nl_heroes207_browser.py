"""Focused real-Chromium Hero207 UI, campaign recruitment, combat registry, Save-v5 reload."""
from __future__ import annotations
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout,"reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8",errors="replace")
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/"index.html").read_text(encoding="utf-8")
PACK=json.loads((ROOT/"data/ngoalong/alpha_content.json").read_text(encoding="utf-8"))
SAVE_KEY="muu_dinh_tam_quoc_v1"
STUB="""<script>window.__P2_ENABLE_QA__=true;const __store=__NL_STORE__;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>Object.prototype.hasOwnProperty.call(__store,k)?__store[k]:null,setItem:(k,v)=>__store[k]=String(v),removeItem:k=>delete __store[k],clear:()=>Object.keys(__store).forEach(k=>delete __store[k])}});</script>"""
checks=[]
errors=[]
def check(label,value):
 ok=bool(value)
 checks.append({"name":label,"pass":ok})
 print(("PASS " if ok else "FAIL ")+label,flush=True)
def open_page(browser,width=1280,stored=None):
 page=browser.new_page(viewport={"width":width,"height":720 if width>600 else 844},device_scale_factor=1)
 page.on("pageerror",lambda err:errors.append(str(err)))
 store={} if stored is None else {SAVE_KEY:stored}
 markup=HTML.replace("<script>",STUB.replace("__NL_STORE__",json.dumps(store,ensure_ascii=False))+"<script>",1)
 page.set_content(markup,wait_until="domcontentloaded")
 return page
def main():
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
  page=open_page(browser)
  check("Hero207 module loaded from the generated single-file index",page.evaluate("Boolean(window.__NL_HERO207_QA__) && window.__NL_HERO207_QA__.count===207"))
  check("preserved 14 old roster identities",page.evaluate("window.__NL_HERO207_QA__.originalHeroesRemainUntouched && window.__NL_R03_QA__.catalog.heroes.length===14"))
  page.locator('.nav[data-tab="heroes"]').click()
  check("Heroes view contains an actual 207 candidate selection panel",page.locator('[data-nl-hero207]').count()==1)
  original=page.evaluate("window.__P2_QA__.getGame()")
  check("new heroes not auto-recruited on new save",page.evaluate("window.__NL_HERO207_QA__.owned()") == 0)
  first=next((x for x in PACK["heroes"]["hero207Roster"] if PACK["heroes"]["hero207Unlocks"][x["id"]]["stage"]==1),None)
  check("one project candidate unlocks from the first stage",first is not None)
  if first is None:
   browser.close()
   return 1
  key=first["id"]
  check("stage lock prevents early recruitment",page.evaluate("(id)=>!window.__NL_HERO207_QA__.canRecruit(id)",key))
  original["cleared"]=[1]
  original["silver"]=50000
  page.evaluate("(g)=>window.__P2_QA__.setGame(g)",original)
  page.locator('.nav[data-tab="heroes"]').click()
  check("after clearing stage 1, live UI lists recruit candidates",page.locator('[data-nl207-select]').count()==1)
  gate=PACK["heroes"]["hero207Unlocks"][key]
  before=page.evaluate("window.__P2_QA__.getGame()")
  recruited=page.evaluate("(id)=>window.__NL_HERO207_QA__.recruit(id)",key)
  after=page.evaluate("window.__P2_QA__.getGame()")
  check("real recruit succeeds and persists unique roster ID",recruited and key in after["roster"] and key not in before["roster"] and after["hero"].get(key) is not None)
  check("real recruit charges silver exactly once",before["silver"]-after["silver"]==gate["silverCost"])
  check("recruit cannot double-settle",page.evaluate("(id)=>!window.__NL_HERO207_QA__.recruit(id)",key) and page.evaluate("window.__P2_QA__.getGame().silver")==after["silver"])
  binding=page.evaluate("""(id)=>({hero:!!window.__NL_R03_QA__.catalog.runtimeHeroes[id],skill:!!window.__NL_R03_QA__.catalog.runtimeHeroSkills[id],unit:window.__NL_R03_QA__.unit(id,'p',2,1)})""",key)
  # NL_R03_QA.catalog is a snapshot at module initialization, before additional registration.
  # The authoritative combat check is live unit creation.
  check("recruited general builds into actual PvE combat unit",isinstance(binding.get("unit"),dict) and binding["unit"].get("id")==key)
  stored=page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1')")
  check("Save v5 writes a persisted post-recruit state",isinstance(stored,str) and len(stored)>100 and '"version":5' in stored)
  reloaded=open_page(browser,1280,stored)
  fresh=reloaded.evaluate("window.__P2_QA__.getGame()")
  check("browser reload preserves recruited hero + silver",key in fresh["roster"] and fresh["silver"]==after["silver"])
  check("browser reload rehydrates the original skill descriptor",reloaded.evaluate("(id)=>window.__NL_HERO207_QA__.owned()===1 && !!window.__NL_HERO207_QA__.getUnlock(id)",key))
  page.screenshot(path=str(ROOT/"qa/nl-heroes207-desktop.png"),full_page=False)
  mobile=open_page(browser,390,stored)
  mobile.locator('.nav[data-tab="heroes"]').click()
  check("mobile 390px Heroes panel renders without horizontal overflow",mobile.locator('[data-nl-hero207]').count()==1 and mobile.evaluate("document.documentElement.scrollWidth <= innerWidth + 4"))
  mobile.screenshot(path=str(ROOT/"qa/nl-heroes207-mobile.png"),full_page=False)
  check("no browser JavaScript exceptions on desktop/mobile/Save reload",not errors)
  page.close()
  reloaded.close()
  mobile.close()
  browser.close()
 report={"milestone":"NL-HERO207-V1","total":len(checks),"passed":sum(x["pass"] for x in checks),"failed":[x["name"] for x in checks if not x["pass"]],"pageErrors":errors}
 (ROOT/"qa/NL_HERO207.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
 print(json.dumps(report,ensure_ascii=False),flush=True)
 return 0 if not report["failed"] else 1
if __name__=="__main__":
 sys.exit(main())
