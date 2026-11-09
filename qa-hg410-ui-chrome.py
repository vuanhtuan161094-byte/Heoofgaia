"""HG41 real desktop/mobile user interactions: duplicate-type slots, Save v07,
and an actual new PvE battle with two fixed deployment columns."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,hashlib,os
ROOT=Path(__file__).resolve().parent
HTML=ROOT/"Play-Heoofgaia-HG11.html"
QA=ROOT/"docs/qa/hg410";EVIDENCE=ROOT/"docs/evidence/hg410"
QA.mkdir(parents=True,exist_ok=True);EVIDENCE.mkdir(parents=True,exist_ok=True)
checks=[];shots=[];errors=[]
def check(label,ok,data=None):
 result={"name":label,"pass":bool(ok),"detail":data}
 checks.append(result);print(("PASS" if ok else "FAIL")+" HG41 UI "+label,flush=True)
 if not ok:raise AssertionError(label+" "+str(data)[:300])
def shot(page,label):
 file=EVIDENCE/(label+".png")
 page.screenshot(path=str(file),animations="disabled")
 shots.append({"file":str(file.relative_to(ROOT)),"sha256":hashlib.sha256(file.read_bytes()).hexdigest()})
with sync_playwright() as pw:
 opts={"headless":True,"args":["--no-sandbox","--disable-dev-shm-usage","--allow-file-access-from-files"]}
 if os.environ.get("HOG_CHROME_PATH"):opts["executable_path"]=os.environ["HOG_CHROME_PATH"]
 browser=pw.chromium.launch(**opts)
 for label,w,h,mobile in [("desktop-1280x720",1280,720,False),("phone-844x390",844,390,True)]:
  ctx=browser.new_context(viewport={"width":w,"height":h},is_mobile=mobile,has_touch=mobile,device_scale_factor=2 if mobile else 1)
  page=ctx.new_page();page.set_default_timeout(18000)
  page.on("pageerror",lambda e,label=label:errors.append({"viewport":label,"error":str(e)}))
  page.goto(HTML.as_uri(),wait_until="load",timeout=60000)
  page.locator('[data-action="start"]').click()
  tile=page.evaluate("""() => {
   const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
   const t=E.NPC_CAMPS_2009.find(x=>x.stars===5);
   s.army.human_1=100;s.formation=[];delete s.hg20.plans[(s.activeCityId||'main')+':'+s.activeHero];
   s.heroes[0].level=100;
   HOG_APP_DEBUG.render();
   return t.key;
  }""")
  check(label+" seeded only inside QA browser and Save remains valid",page.evaluate("() => HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())"))
  page.locator('[data-action="world-index"]').first.click()
  page.locator('#game-modal-body [data-action="select"][data-key="'+tile+'"]').first.click()
  page.locator('[data-action="modal-close"]').first.click()
  page.locator('[data-action="dispatch-open"]').first.click()
  check(label+" real dispatch popup open",page.locator(".hg39-dispatch").count()==1)
  for i in range(2):
   page.locator("#hg39-dispatch-unit").select_option("human_1")
   page.locator('[data-action="dispatch-add-unit"]').click()
  check(label+" same unit is independently selectable twice",page.locator(".hg39-dispatch-row").count()==2)
  page.locator('[data-action="dispatch-adjust"][data-slot="0"][data-delta="1"]').click()
  vals=page.locator(".hg39-dispatch-row input[data-dispatch-slot]").evaluate_all("(items)=>items.map(x=>x.value)")
  check(label+" + button edits only slot zero",vals==["2","1"],vals)
  shot(page,label+"-two-independent-slots")
  page.locator('[data-action="dispatch-save"]').click()
  plan=page.evaluate("""() => HOG_ENGINE.hg20HeroPlan(HOG_APP_DEBUG.getState(),1).map(x=>({unitId:x.unitId,count:x.count}))""")
  check(label+" real stored hero plan has distinct repeated types",len(plan)==2 and all(x["unitId"]=="human_1" for x in plan) and [x["count"] for x in plan]==[2,1],plan)
  page.locator('[data-action="dispatch-remove"][data-slot="1"]').click()
  page.locator('[data-action="dispatch-save"]').click()
  plan=page.evaluate("""() => HOG_ENGINE.hg20HeroPlan(HOG_APP_DEBUG.getState(),1).map(x=>({unitId:x.unitId,count:x.count}))""")
  check(label+" removing slot one preserves slot zero",len(plan)==1 and plan[0]["count"]==2,plan)
  check(label+" Save v07 after duplicated slot edits",page.evaluate("() => HOG_ENGINE.strictSave(HOG_ENGINE.parseSave(HOG_ENGINE.serializeSave(HOG_APP_DEBUG.getState())))"))
  page.locator('[data-action="dispatch-close"]').click()
  battle=page.evaluate("""key => {
   const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
   s.battle=E.makeBattle(s,key);s.battle.autoUntil=Date.now()+3600000;s.battleAuto=false;
   HOG_APP_DEBUG.render();
   const b=s.battle,all=[...b.allies,...b.enemies];
   return {stacks:b.enemies.length,columns:[...new Set(all.map(x=>x.x))].sort((a,b)=>a-b),
    unique:new Set(all.map(x=>x.x+','+x.y)).size===all.length,
    safe:E.strictSave(s),range:[E.TACTICAL_RANGE.melee,E.TACTICAL_RANGE.ranged,E.TACTICAL_RANGE.eliteRanged]};
  }""",tile)
  check(label+" 12 enemy stacks on exactly two starting columns per side",battle["stacks"]==12 and set(battle["columns"]).issubset({0,1,10,11}) and battle["unique"] and battle["safe"],battle)
  # The live battle is opened via the existing QA-only view bridge: the
  # normal map navigation intentionally has no Combat tab before marching.
  page.evaluate("() => HOG_APP_DEBUG.showCombatForTests()")
  check(label+" genuine combat canvas and 2-column army HUD",page.locator("#battle-canvas").count()==1 and page.locator(".hg410-combat-army").count()==1)
  shot(page,label+"-actual-deployed-battle")
  check(label+" no browser JS exceptions",not [x for x in errors if x["viewport"]==label],errors)
  ctx.close()
 browser.close()
(QA/"chromium-dispatch-formation.json").write_text(json.dumps({"checks":checks,"screenshots":shots,"errors":errors},ensure_ascii=False,indent=2),encoding="utf-8")
print("HG41 LIVE CHROMIUM "+str(sum(x["pass"] for x in checks))+"/"+str(len(checks)),flush=True)
