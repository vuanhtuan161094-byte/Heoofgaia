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
   s.battle.lastTargets={p0:'e1'}; // existing last-turn receipt; auto must keep this living target
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
      target:b.lastTargets?.p0,
      strict:HOG_ENGINE.strictSave(s)};
  }""")
  check("Automatic first turn converts obsolete Advance into real Attack",
    after["turn"]==2 and after["auto"] and after["stance"]=="attack" and after["firstOrder"]=="attack" and after["strict"],after)
  check("Auto retains previously engaged living target (no erratic flip)",
    after["target"]=="e1",after)
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
  page.locator('[data-action="save-combat"]').click()
  page.reload(wait_until="load")
  reloaded=page.evaluate("""()=>{
   const s=HOG_APP_DEBUG.getState();
   return {valid:HOG_ENGINE.strictSave(s),auto:s.battleAuto,
       turn:s.battle?.turn,kind:s.battle?.kind};
  }""")
  check("Reload retains exact battle state and disables auto until requested",
    reloaded["valid"] and not reloaded["auto"] and reloaded["turn"]==paused and reloaded["kind"]=="npc",reloaded)
  page.screenshot(path=str(OUT/"02-reloaded-paused-1280x720.png"))
  # Re-enable autoplay and observe twelve actual sequential battle turns,
  # not merely a single click or a static state fixture.
  page.locator('[data-action="auto"]').click()
  observed=[]
  for step in range(1,13):
    expected=paused+step
    page.wait_for_function("""n=>{
      const b=HOG_APP_DEBUG.getState().battle;
      return !!b&&b.turn>=n;
    }""",arg=expected,timeout=5500)
    sample=page.evaluate("""()=>{
      const s=HOG_APP_DEBUG.getState(),b=s.battle,
        live=[...b.allies,...b.enemies].filter(u=>u.pool>0),
        positions=live.map(u=>u.x+','+u.y);
      return {turn:b.turn,strict:HOG_ENGINE.strictSave(s),
        auto:s.battleAuto,actorTarget:b.lastTargets?.p0||null,
        live:live.length,uniqueCells:new Set(positions).size===positions.length,
        receipts:b.lastEvents?.length||0};
    }""")
    sample["wallMs"]=round(time.monotonic()*1000)
    observed.append(sample)
    if step in (1,6,12):
      page.screenshot(path=str(OUT/f"auto-sequence-turn-{step:02d}-1280x720.png"))
  check("12 continuous auto turns resolve in exact order without timer double-firing",
        [s["turn"] for s in observed]==list(range(paused+1,paused+13)),
        {"turns":[s["turn"] for s in observed]})
  gaps=[observed[i]["wallMs"]-observed[i-1]["wallMs"] for i in range(1,len(observed))]
  check("All 12 automatic turn transitions preserve the animation clock",
        min(gaps)>=1050,{"minimumGapMs":min(gaps),"gapsMs":gaps})
  check("No phantom collision, empty receipts or invalid Save during sustained auto",
        all(s["strict"] and s["uniqueCells"] and s["receipts"]>0 and s["auto"] for s in observed),
        {"samples":observed})
  check("Automatic target remains stable across living enemies",
        len({s["actorTarget"] for s in observed})==1 and observed[0]["actorTarget"] is not None,
        {"targetTrail":[s["actorTarget"] for s in observed]})
  page.locator('[data-action="auto"]').click()
  page.set_viewport_size({"width":960,"height":540})
  page.evaluate("window.dispatchEvent(new Event('resize'))")
  page.wait_for_timeout(220)
  compact=page.evaluate("""()=>{
    const c=document.getElementById('battle-canvas'),r=c.getBoundingClientRect(),
      P=HOG_PAINTER,E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),
      layout=P.battleUnitLayout(s.battle,P.battleProjection(c,E),c.width,c.height);
    return {aspectError:Math.abs(c.width/r.width-c.height/r.height),
      xOverflow:document.documentElement.scrollWidth-innerWidth,
      anchored:layout.every(u=>Math.abs(u.x-u.baseX)<=18.01&&Math.abs(u.y-u.baseY)<.01),
      strict:E.strictSave(s),auto:s.battleAuto};
  }""")
  check("960×540 real auto frame remains aligned and without horizontal distortion",
        compact["aspectError"]<.008 and compact["xOverflow"]<=1 and compact["anchored"] and compact["strict"] and not compact["auto"],compact)
  page.screenshot(path=str(OUT/"auto-sequence-12-turns-960x540.png"))
  check("No uncaught Chromium exceptions",not errors,errors[:3])
  browser.close()
result={"pass":len(checks)==16 and all(x["pass"] for x in checks),
        "checks":checks,"errors":errors,"fixture":"Actual NPC battle, only enemy HP/DEF/ATK adjusted to observe timing, no victory injected",
        "images":["01-auto-first-turn-1280x720.png","02-reloaded-paused-1280x720.png","auto-sequence-turn-01-1280x720.png","auto-sequence-turn-06-1280x720.png","auto-sequence-turn-12-1280x720.png","auto-sequence-12-turns-960x540.png"],"observed":observed,"viewport":compact}
REPORT.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf8")
assert result["pass"],"Not all auto stability gates passed"
print("HG28 AUTO P0",len(checks),"/",len(checks),"PASS",flush=True)
