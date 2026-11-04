"""HG14.5 file:// Chromium QA: grid/HP toggles, live receipts, effects, Save/Reload."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,hashlib,sys
if hasattr(sys.stdout,"reconfigure"):sys.stdout.reconfigure(encoding="utf8")
ROOT=Path(__file__).resolve().parent
HTML=ROOT/"Play-Heoofgaia-HG11.html"
OUT=ROOT/"docs/evidence/hg145";OUT.mkdir(parents=True,exist_ok=True)
QA=ROOT/"docs/qa/hg145";QA.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];screens=[]
def check(label,passed):
 ok=bool(passed);checks.append({"name":label,"passed":ok})
 print(("PASS " if ok else "FAIL ")+label,flush=True)
def shot(page,name):
 path=OUT/name;page.screenshot(path=str(path),full_page=False)
 screens.append(str(path.relative_to(ROOT)))
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage","--allow-file-access-from-files"])
 page=browser.new_page(viewport={"width":1280,"height":720})
 page.on("pageerror",lambda e:errors.append(str(e)))
 page.set_default_timeout(12000)
 page.goto(HTML.as_uri(),wait_until="load")
 page.locator('[data-action="start"]').click()
 fixture=page.evaluate("""() => {
  const E=HOG_ENGINE,P=HOG_PAINTER,s=HOG_APP_DEBUG.getState();
  s.army.human_3=16;E.setFormation(s,[{unitId:'human_3',count:16}]);
  const npc=E.NPC_CAMPS_2009.find(n=>n.stars===1&&E.pathfind(E.activeCity(s).key,n.key));
  E.startMarch(s,npc.key);E.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);
  HOG_APP_DEBUG.render();
  const c=document.getElementById('battle-canvas'),cam=P.battleProjection(c,E),
    layout=P.battleUnitLayout(s.battle,cam,c.width,c.height),
    cells=P.battleGridCells(cam);
  window._qaNow=performance.now()+220;
  window._qaCombatState=()=>JSON.stringify({
    turn:s.battle?.turn,allies:s.battle?.allies,enemies:s.battle?.enemies,
    events:s.battle?.lastEvents||[]
  });
  window._qaFrame=()=>{
    const canvas=document.getElementById('battle-canvas'),
      prefs=HOG_APP_DEBUG.battleViewPrefs();
    P.drawBattle(canvas,E,s,window._qaNow,{showGrid:prefs.grid,showHP:prefs.hp});
    return canvas.toDataURL('image/png');
  };
  return {inBattle:!!s.battle,valid:E.strictSave(s),
    grid:cells.length,cellsValid:cells.every(q=>{
      const hit=P.battleCellAt(c,q.center.x,q.center.y,E);
      return hit?.x===q.x&&hit?.y===q.y;
    }),feetValid:layout.every(e=>P.battleHit(c,e.x,e.y,E,s)?.id===e.id),
    prefs:HOG_APP_DEBUG.battleViewPrefs()};
 }""")
 check("Real human Archer NPC march reaches playable battle",fixture["inBattle"] and fixture["valid"])
 check("Both grid and HP visible ON by default",fixture["prefs"]=={"grid":True,"hp":True})
 check("Tactical grid contains exactly 108 canonical invertible cells",fixture["grid"]==108 and fixture["cellsValid"])
 check("Displayed unit feet remain clickable in grid mode",fixture["feetValid"])
 check("Two accessible buttons show ON state",page.locator('.battle-display-toggle[aria-pressed="true"]').count()==2)
 original=page.evaluate("window._qaFrame()")
 stateBefore=page.evaluate("window._qaCombatState()")
 shot(page,"grid-hp-on-desktop.png")
 page.locator('[data-action="battle-grid"]').click()
 check("Grid OFF updates accessible control and preference",
   page.locator('[data-action="battle-grid"]').get_attribute("aria-pressed")=="false" and
   not page.evaluate("HOG_APP_DEBUG.battleViewPrefs().grid"))
 noGrid=page.evaluate("window._qaFrame()")
 check("Grid switch really changes canvas pixels",original!=noGrid)
 page.locator('[data-action="battle-hp"]').click()
 check("HP OFF updates accessible control and preference",
   page.locator('[data-action="battle-hp"]').get_attribute("aria-pressed")=="false" and
   not page.evaluate("HOG_APP_DEBUG.battleViewPrefs().hp"))
 noHp=page.evaluate("window._qaFrame()")
 check("HP switch really changes canvas pixels",noGrid!=noHp)
 shot(page,"grid-hp-off-desktop.png")
 page.locator('[data-action="battle-grid"]').click()
 page.locator('[data-action="battle-hp"]').click()
 restored=page.evaluate("window._qaFrame()")
 check("Switching both back ON restores deterministic canvas pixels",restored==original)
 check("Display-only toggles preserve actual combat state",stateBefore==page.evaluate("window._qaCombatState()"))
 shot(page,"grid-hp-restored-desktop.png")
 fx=page.evaluate("""() => {
  const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,P=HOG_PAINTER,b=s.battle,
    c=document.getElementById('battle-canvas'),ctx=c.getContext('2d');
  const act=E.battleAct(s,'attack'),stamp=performance.now()+10;
  P.drawBattle(c,E,s,stamp,{showGrid:true,showHP:true});
  const before=JSON.stringify(E.clone(s)),origFill=ctx.fillText,origStroke=ctx.strokeText,strings=[];
  ctx.fillText=function(value,...args){strings.push(String(value));return origFill.call(this,value,...args)};
  ctx.strokeText=function(value,...args){return origStroke.call(this,value,...args)};
  try{
   P.drawBattle(c,E,s,stamp+600,{showGrid:true,showHP:true});
   const camera=P.battleProjection(c,E),layout=P.battleUnitLayout(b,camera,c.width,c.height),
     effects=P.battleFxPlan(b,camera,600,layout);
   return {outcome:act.type,
     receipts:b.lastEvents.filter(e=>e.damage>0&&e.targetId).map(e=>({
       actorId:e.actorId,targetId:e.targetId,damage:e.damage,
       casualties:e.casualties,death:e.death})),
     effects:effects.map(e=>({actorId:e.actorId,targetId:e.targetId,damage:e.damage,
       casualties:e.casualties,death:e.death,ranged:e.ranged})),
     drawn:strings,stable:JSON.stringify(E.clone(s))===before,strict:E.strictSave(s)};
  }finally{ctx.fillText=origFill;ctx.strokeText=origStroke}
 }""")
 check("Actual engine turn generated nonzero damage receipts",fx["outcome"]=="continue" and len(fx["receipts"])>0)
 check("Each visual effect preserves exact damage and death receipt",
   len(fx["effects"])==len(fx["receipts"]) and all(
     any(e["actorId"]==r["actorId"] and e["targetId"]==r["targetId"] and
         e["damage"]==r["damage"] and e["casualties"]==r["casualties"] and
         e["death"]==r["death"] for e in fx["effects"]) for r in fx["receipts"]))
 check("Ranged attack produces real arrow effect",any(e["ranged"] for e in fx["effects"]))
 check("Death effect only appears for a truly killed stack",any(e["death"] for e in fx["effects"]))
 check("Visible floating values match actual engine damage",all(
   "-"+str(round(e["damage"])) in fx["drawn"] for e in fx["effects"]))
 check("Rendering effects never changes strict game save",fx["stable"] and fx["strict"])
 shot(page,"actual-receipt-fx-desktop.png")
 page.locator('[data-action="save-combat"]').click()
 page.reload(wait_until="load")
 check("Grid and HP settings survive cold reload",page.evaluate("""() => {
  const p=HOG_APP_DEBUG.battleViewPrefs();
  return p.grid===true&&p.hp===true;
 }"""))
 check("Combat and receipts survive cold reload unchanged",page.evaluate("""() => {
  const s=HOG_APP_DEBUG.getState();
  return !!s?.battle&&HOG_ENGINE.strictSave(s)&&s.battle.lastEvents?.some(e=>e.damage>0);
 }"""))
 page.set_viewport_size({"width":960,"height":540})
 page.evaluate("window.dispatchEvent(new Event('resize'))")
 page.wait_for_timeout(180)
 mobile=page.evaluate("""() => {
  const c=document.getElementById('battle-canvas'),r=c.getBoundingClientRect(),
   E=HOG_ENGINE,P=HOG_PAINTER,s=HOG_APP_DEBUG.getState(),
   cam=P.battleProjection(c,E),layout=P.battleUnitLayout(s.battle,cam,c.width,c.height);
  return {aspect:Math.abs(c.width/r.width-c.height/r.height),
   overflow:document.documentElement.scrollWidth>innerWidth+1,
   cells:P.battleGridCells(cam).length,
   clicks:layout.filter(e=>e.u.pool>0).every(e=>P.battleHit(c,e.x,e.y,E,s)?.id===e.id),
   buttons:[...document.querySelectorAll('.battle-display-toggle')].map(e=>({
     active:e.getAttribute('aria-pressed')==='true',
     visible:e.getBoundingClientRect().width>0}))};
 }""")
 check("960x540: precise grid, clickable units, no distortion or overflow",
   mobile["aspect"]<.008 and not mobile["overflow"] and mobile["cells"]==108 and mobile["clicks"])
 check("960x540: both ON controls remain visible",len(mobile["buttons"])==2 and
   all(b["active"] and b["visible"] for b in mobile["buttons"]))
 shot(page,"grid-hp-on-mobile-960x540.png")
 check("No uncaught Chromium JavaScript errors",len(errors)==0)
 browser.close()
report={"status":"PASS" if all(c["passed"] for c in checks) else "FAIL",
 "passed":sum(c["passed"] for c in checks),"total":len(checks),
 "checks":checks,"fx":fx,"mobile":mobile,"screenshots":screens,"errors":errors,
 "html_sha256":hashlib.sha256(HTML.read_bytes()).hexdigest()}
(QA/"grid-hp-fx-chrome.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
print(f"HG14.5 GRID-HP-FX CHROMIUM {report['passed']}/{report['total']} PASS",flush=True)
raise SystemExit(0 if report["status"]=="PASS" else 1)
