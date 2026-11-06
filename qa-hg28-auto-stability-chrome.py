"""HG28 PvE P0: auto battle must be a single deadline-gated clock.
Real file:// Chromium, real NPC march, actual tactical turns; setup increases enemy
HP/DEF and removes enemy damage to observe timings, NOT fake a win/reward.
"""
from pathlib import Path
import json,time
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
HTML=ROOT/"Play-Heoofgaia-HG11.html"
OUT=ROOT/"docs"/"evidence"/"hg28"/"pve-p0"
REPORT=ROOT/"docs"/"qa"/"hg28"/"pve-auto-stability.json"
OUT.mkdir(parents=True,exist_ok=True)
REPORT.parent.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];times=[]
def check(label,yes,detail=None):
  result={"name":label,"pass":bool(yes),"detail":detail}
  checks.append(result);print(("PASS" if yes else "FAIL"),label,detail or "",flush=True)
  if not yes:raise AssertionError(label)
with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage","--allow-file-access-from-files"])
  page=browser.new_page(viewport={"width":1280,"height":720})
  page.set_default_timeout(9000)
  page.on("pageerror",lambda error:errors.append(str(error)))
  page.goto(HTML.as_uri(),wait_until="load")
  page.locator('[data-action="start"]').click()
  setup=page.evaluate("""()=>{
   const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState();
   s.army.human_3=40;
   E.setFormation(s,[{unitId:'human_3',count:40}]);
   const npc=E.NPC_CAMPS_2009.find(n=>n.stars===1&&E.pathfind(E.activeCity(s).key,n.key));
   E.startMarch(s,npc.key);
   E.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);
   for(const e of s.battle.enemies){
     e.hp=4000;e.pool=4000;e.count=1;e.initial=1;
     e.atk=0;e.def=350;e.range=1;
   }
   s.battle.orders.p0="advance"; // a stale one-shot manual order
   HOG_APP_DEBUG.render();
   return {realNpc:s.battle.kind==='npc',strict:E.strictSave(s),target:npc.key};
  }""")
  check("Actual world NPC march and valid Save",setup["realNpc"] and setup["strict"],setup)
  first=page.evaluate("HOG_APP_DEBUG.getState().battle.turn")
  page.locator('[data-action="auto"]').click()
  check("Auto begins in real combat without an instant extra turn",
   page.evaluate("HOG_APP_DEBUG.getState().battle.turn")==first)
  page.wait_for_timeout(450)
  check("No tactical turn before 1.35 second auto deadline",
   page.evaluate("HOG_APP_DEBUG.getState().battle.turn")==first)
  page.wait_for_function("()=>HOG_APP_DEBUG.getState().battle?.turn>=2",timeout=5500)
  t1=time.monotonic()
  after=page.evaluate("""()=>{
   const s=HOG_APP_DEBUG.getState(),b=s.battle;
   return {turn:b.turn,auto:s.battleAuto,stance:b.orders.p0,
      firstOrder:b.lastEvents.find(e=>e.actorId==='p0')?.order,
      strict:HOG_ENGINE.strictSave(s)};
  }""")
  check("Automatic first turn converts obsolete Advance into real Attack",
    after["turn"]==2 and after["auto"] and after["stance"]=="attack" and after["firstOrder"]=="attack" and after["strict"],after)
  page.screenshot(path=str(OUT/"01-auto-first-turn-1280x720.png"))
  page.wait_for_timeout(650)
  check("No duplicate auto turn from a second scheduling interval",
        page.evaluate("HOG_APP_DEBUG.getState().battle.turn")==2)
  page.wait_for_function("()=>HOG_APP_DEBUG.getState().battle?.turn>=3",timeout=5500)
  t2=time.monotonic()
  latency=round((t2-t1)*1000)
  check("Consecutive automatic turns separated by animation budget",
    latency>=1150,{"betweenTurnsMs":latency})
  page.evaluate("""()=>{
   const b=HOG_APP_DEBUG.getState().battle;
   b.focused='e-removed';b.orders.p0='focus';
  }""")
  page.wait_for_function("()=>HOG_APP_DEBUG.getState().battle?.turn>=4",timeout=5500)
  cleanup=page.evaluate("""()=>{
   const s=HOG_APP_DEBUG.getState(),b=s.battle;
   return {turn:b.turn,focus:b.focused||null,order:b.orders.p0,
     strict:HOG_ENGINE.strictSave(s)};
  }""")
  check("Dead/invalid focus safely falls back to attack",cleanup["turn"]==4 and
        cleanup["focus"] is None and cleanup["order"]=="attack" and cleanup["strict"],cleanup)
  page.locator('[data-action="auto"]').click()
  paused=page.evaluate("HOG_APP_DEBUG.getState().battle.turn")
  page.wait_for_timeout(1800)
  check("Manual pause does not launch any further auto turns",
        page.evaluate("HOG_APP_DEBUG.getState().battle.turn")==paused)
  page.locator("#save").click()
  page.reload(wait_until="load")
  reloaded=page.evaluate("""()=>{
   const s=HOG_APP_DEBUG.getState();
   return {valid:HOG_ENGINE.strictSave(s),auto:s.battleAuto,
       turn:s.battle?.turn,kind:s.battle?.kind};
  }""")
  check("Reload retains exact battle state and disables auto until requested",
    reloaded["valid"] and not reloaded["auto"] and reloaded["turn"]==paused and reloaded["kind"]=="npc",reloaded)
  page.screenshot(path=str(OUT/"02-reloaded-paused-1280x720.png"))
  check("No uncaught Chromium exceptions",not errors,errors[:3])
  browser.close()
result={"pass":len(checks)==9 and all(x["pass"] for x in checks),
        "checks":checks,"errors":errors,"fixture":"Actual NPC battle, only enemy HP/DEF/ATK adjusted to observe timing, no victory injected",
        "images":["01-auto-first-turn-1280x720.png","02-reloaded-paused-1280x720.png"]}
REPORT.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf8")
assert result["pass"],"Not all auto stability gates passed"
print("HG28 AUTO P0",len(checks),"/",len(checks),"PASS",flush=True)
