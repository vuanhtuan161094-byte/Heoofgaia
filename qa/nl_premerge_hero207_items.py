"""Pre-merge cross-module Chromium gate: newly recruited hero equips Group04 gear and survives Save v5."""
from __future__ import annotations
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/"index.html").read_text(encoding="utf-8")
PACK=json.loads((ROOT/"data/ngoalong/alpha_content.json").read_text(encoding="utf-8"))
SAVE_KEY="muu_dinh_tam_quoc_v1"
STUB="""<script>window.__P2_ENABLE_QA__=true;const __store=__NL_STORE__;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>Object.prototype.hasOwnProperty.call(__store,k)?__store[k]:null,setItem:(k,v)=>__store[k]=String(v),removeItem:k=>delete __store[k],clear:()=>Object.keys(__store).forEach(k=>delete __store[k])}});</script>"""
checks=[]
errors=[]
def check(label,condition):
 ok=bool(condition);checks.append((label,ok));print(("PASS " if ok else "FAIL ")+label,flush=True)
def open_page(browser,stored=None,width=1280):
 page=browser.new_page(viewport={"width":width,"height":720 if width>600 else 844},device_scale_factor=1)
 page.on("pageerror",lambda error:errors.append(str(error)))
 payload={SAVE_KEY:stored} if stored else {}
 page.set_content(HTML.replace("<script>",STUB.replace("__NL_STORE__",json.dumps(payload,ensure_ascii=False))+"<script>",1),wait_until="domcontentloaded")
 return page
def state(page): return page.evaluate("window.__P2_QA__.getGame()")
def run():
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
  page=open_page(browser)
  checks_runtime=page.evaluate("()=>({hero:window.__NL_HERO207_QA__?.count,gear:window.__NL_ITEM_QA__?.getCounts(),v:window.__P2_QA__.getGame()?.version})")
  check("both Heroes207 and Items modules coexist in same canonical HTML",checks_runtime.get("hero")==207 and checks_runtime.get("gear")=={"playable":411,"references":392} and checks_runtime.get("v")==5)
  first=next((h for h in PACK["heroes"]["hero207Roster"] if PACK["heroes"]["hero207Unlocks"][h["id"]]["stage"]==1),None)
  check("first-stage recruit candidate is present",first is not None)
  if first is None:return 1
  key=first["id"]
  game=state(page);game["silver"]=100000;game["iron"]=20000;game["cleared"]=[1]
  page.evaluate("g=>window.__P2_QA__.setGame(g)",game)
  page.locator('.nav[data-tab="heroes"]').click()
  select=page.locator("[data-nl207-select]")
  check("candidate appears in real Heroes UI",select.count()==1 and key in select.locator("option").evaluate_all("(opts)=>opts.map(o=>o.value)"))
  select.select_option(key)
  before=state(page)
  page.locator("[data-nl207-recruit]").click()
  hired=state(page)
  check("real Heroes UI recruits exactly one new hero and charges once",key in hired["roster"] and key not in before["roster"] and before["silver"]-hired["silver"]==PACK["heroes"]["hero207Unlocks"][key]["silverCost"])
  page.locator('.nav[data-tab="equipment"]').click()
  owner=page.locator("[data-nli-hero]")
  check("new Hero207 is available in Group04 equipment owner selector",owner.count()==1 and key in owner.locator("option").evaluate_all("(opts)=>opts.map(o=>o.value)"))
  owner.select_option(key)
  page.locator('[data-nli-shop="1"]').click()
  buy=page.locator('[data-nli-action="buy"][data-item="mdt-equip02-1"]')
  check("new gear is listed and buyable for Hero207",buy.count()==1 and buy.is_enabled())
  buy.click()
  postbuy=state(page)
  bought=next((x for x in postbuy["items"] if x["base"]=="mdt-equip02-1"),None)
  check("new item purchased into the actual shared Save",bought is not None)
  page.locator('[data-nli-shop="0"]').click()
  if bought:
   eq=page.locator('[data-nli-action="equip"][data-uid="'+bought["uid"]+'"]')
   check("new gear is selectable from shared warehouse",eq.count()==1)
   if eq.count()==1:eq.click()
  equipped=state(page)
  check("newly recruited Hero207 owns real equipment UID",bought is not None and equipped["gear"].get(key,{}).get("weapon")==bought["uid"])
  bonus=page.evaluate("id=>window.__NL_ITEM_QA__.bonus(id)",key)
  unit=page.evaluate("id=>window.__NL_R03_QA__.unit(id,'p',2,1)",key)
  check("new hero equipment contributes positive live combat stats",bonus.get("weaponAtk",0)>0 and isinstance(unit,dict) and unit.get("id")==key)
  ledger=equipped["nlItemsV1"]
  check("item receipt ledger and recruited hero share Save-v5 state",ledger.get("actionNonce",0)>=2 and key in equipped["hero"] and equipped["version"]==5)
  page.evaluate("window.__P2_QA__.getGame().cleared.includes(1)")
  saved=page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1')")
  reload=open_page(browser,saved)
  restored=state(reload)
  check("reload preserves new hero, gear, receipt ledger, and silver",key in restored["roster"] and restored["gear"].get(key,{}).get("weapon")==bought["uid"] and restored["nlItemsV1"]["receipts"]==ledger["receipts"] and restored["silver"]==equipped["silver"])
  check("after reload, both modules can create combat unit and read bonuses",reload.evaluate("(id)=>window.__NL_HERO207_QA__.owned()===1 && window.__NL_ITEM_QA__.bonus(id).weaponAtk>0 && !!window.__NL_R03_QA__.unit(id,'p',2,1)",key))
  mobile=open_page(browser,saved,width=390)
  mobile.locator('.nav[data-tab="heroes"]').click()
  hero_ui=mobile.locator("[data-nl-hero207]").count()==1
  mobile.locator('.nav[data-tab="equipment"]').click()
  item_ui=mobile.locator("[data-nl-item-bridge]").count()==1
  check("390px mobile can navigate both Heroes207 and Item shop",hero_ui and item_ui)
  check("390px shared UI has no horizontal overflow",mobile.evaluate("document.documentElement.scrollWidth <= innerWidth+2"))
  check("no Chromium JS exception while combining modules",not errors)
  for p in [page,reload,mobile]:p.close()
  browser.close()
 report={"name":"NL_PREMERGE_HERO207_ITEMS","total":len(checks),"passed":sum(ok for _,ok in checks),"failed":[name for name,ok in checks if not ok],"errors":errors}
 (ROOT/"qa/NL_PREMERGE_HERO207_ITEMS.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
 print(json.dumps(report,ensure_ascii=False),flush=True)
 return 0 if not report["failed"] else 1
if __name__=="__main__":sys.exit(run())
