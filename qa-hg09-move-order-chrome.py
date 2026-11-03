"""Real Chrome regression for a saved multi-turn battlefield move order and auto battle."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib, json, os, sys, tempfile

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
ROOT=Path(__file__).resolve().parent
HTML=ROOT/"Play-Heoofgaia-HG11.html"
SHOT=ROOT/"docs/evidence/hg09/multi-turn-move-order-chrome.png"
RECEIPT=ROOT/"docs/qa/hg09/multi-turn-move-order-chrome.json"
SHOT.parent.mkdir(parents=True,exist_ok=True)
RECEIPT.parent.mkdir(parents=True,exist_ok=True)
checks=[];page_errors=[];console_errors=[]
def check(name,passed,detail=None):
    row={"name":name,"passed":bool(passed)}
    if detail is not None: row["detail"]=detail
    checks.append(row);print(("PASS" if passed else "FAIL"),name,detail or "")
def browser_path():
    configured=os.environ.get("HOG_CHROMIUM_PATH")
    options=[Path(configured)] if configured else [
        Path(os.environ.get("PROGRAMFILES","C:/Program Files"))/"Google/Chrome/Application/chrome.exe",
        Path(os.environ.get("PROGRAMFILES(X86)","C:/Program Files (x86)"))/"Microsoft/Edge/Application/msedge.exe",
    ]
    return next((str(p) for p in options if p and p.is_file()),None)
browser=browser_path()
if not browser: raise SystemExit("Chrome/Edge not found")
if not HTML.is_file(): raise SystemExit("Build the standalone HTML first")

with sync_playwright() as p:
    profile=tempfile.TemporaryDirectory(prefix="hog-hg09-move-order-")
    ctx=p.chromium.launch_persistent_context(profile.name,headless=True,executable_path=browser,
        args=["--no-sandbox","--disable-dev-shm-usage"],viewport={"width":1440,"height":900},device_scale_factor=1)
    page=ctx.new_page();page.set_default_timeout(6000)
    page.on("pageerror",lambda e:page_errors.append(str(e)))
    page.on("console",lambda m:console_errors.append(m.text) if m.type=="error" else None)
    page.goto(HTML.as_uri(),wait_until="load")
    check("Standalone game title",page.title()=="Anh Hùng Thời Loạn",page.title())
    page.locator('[data-action="start"]').click()
    page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();s.army.human_3=40;HOG_ENGINE.setFormation(s,[{unitId:'human_3',count:40}]);const t=HOG_ENGINE.NPC_CAMPS_2009.find(c=>c.stars===1&&HOG_ENGINE.pathfind('3,4',c.key));HOG_ENGINE.startMarch(s,t.key);HOG_ENGINE.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);for(const e of s.battle.enemies){e.hp=400;e.pool=400;e.count=1;e.initial=1;e.atk=0;e.def=0;e.range=20}HOG_APP_DEBUG.render()})()""")
    check("Actual March and travel open a live NPC battle",page.evaluate("(()=>{const s=HOG_APP_DEBUG.getState();return !!s.battle&&s.battle.kind==='npc'&&HOG_ENGINE.strictSave(s)})()"))
    page.locator('[data-action="stack"][data-id="p0"]').click()
    page.locator('[data-action="move-mode"]').click()
    canvas=page.locator("#battle-canvas");box=canvas.bounding_box()
    point=page.evaluate("""(()=>{const c=document.querySelector('#battle-canvas'),g=HOG_ENGINE.BATTLE_GRID,h=(c.height-g.top-g.bottom)/g.rows;return {x:6.5/g.cols,y:(g.top+.5*h)/c.height}})()""")
    before=page.evaluate("(()=>HOG_APP_DEBUG.getState().battle.enemies.reduce((n,u)=>n+u.pool,0))()")
    page.mouse.click(box["x"]+point["x"]*box["width"],box["y"]+point["y"]*box["height"])
    first=page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),b=s.battle;return {turn:b.turn,position:{x:b.allies[0].x,y:b.allies[0].y},target:b.moveTargets?.p0||null,order:b.orders.p0,playerTarget:b.lastTargets?.p0||null,enemyHp:b.enemies.reduce((n,u)=>n+u.pool,0),strict:HOG_ENGINE.strictSave(s)}})()""")
    check("Clicked move advances one cell and retains the distant destination",first["position"]=={"x":2,"y":0} and first["target"]=={"x":6,"y":0} and first["order"]=="move" and first["playerTarget"] is None and first["enemyHp"]==before and first["strict"],first)
    page.locator("#save").click();page.reload(wait_until="load")
    restored=page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),b=s.battle;return {version:s.version,position:{x:b?.allies[0].x,y:b?.allies[0].y},target:b?.moveTargets?.p0||null,order:b?.orders?.p0,strict:HOG_ENGINE.strictSave(s)}})()""")
    check("v07 Save/Reload keeps the live move target and cell",restored["version"]==7 and restored["position"]=={"x":2,"y":0} and restored["target"]=={"x":6,"y":0} and restored["order"]=="move" and restored["strict"],restored)
    page.locator('[data-action="auto"]').click()
    page.wait_for_function("""()=>{const s=HOG_APP_DEBUG.getState(),b=s.battle;return !!b&&s.battleAuto&&b.turn>=4&&b.allies[0].x===4&&b.moveTargets?.p0?.x===6}""",timeout=8000)
    moving=page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),b=s.battle;return {turn:b.turn,position:{x:b.allies[0].x,y:b.allies[0].y},target:b.moveTargets.p0,auto:s.battleAuto,valid:HOG_ENGINE.strictSave(s)}})()""")
    check("Automatic mode repeats real turns and continues the saved path",moving["position"]=={"x":4,"y":0} and moving["target"]=={"x":6,"y":0} and moving["auto"] and moving["valid"],moving)
    page.screenshot(path=str(SHOT),full_page=True)
    page.locator("#save").click();page.reload(wait_until="load")
    second_load=page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),b=s.battle;return {version:s.version,position:{x:b?.allies[0].x,y:b?.allies[0].y},target:b?.moveTargets?.p0||null,strict:HOG_ENGINE.strictSave(s)}})()""")
    check("A second v07 reload keeps the in-progress path",second_load["version"]==7 and second_load["position"]=={"x":4,"y":0} and second_load["target"]=={"x":6,"y":0} and second_load["strict"],second_load)
    page.locator('[data-action="auto"]').click()
    page.wait_for_function("""()=>{const s=HOG_APP_DEBUG.getState(),b=s.battle;return !!b&&s.battleAuto&&b.allies[0].x===6&&!b.moveTargets?.p0}""",timeout=8000)
    reached=page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),b=s.battle;return {turn:b.turn,x:b.allies[0].x,target:b.moveTargets?.p0||null,lastMove:b.lastMoves?.find(m=>m.unitId==='p0')||null,auto:s.battleAuto}})()""")
    check("Move order clears only after the actual unit reaches its destination",reached["x"]==6 and reached["target"] is None and reached["lastMove"]["to"]=={"x":6,"y":0} and reached["auto"],reached)
    page.wait_for_function("()=>!HOG_APP_DEBUG.getState().battle",timeout=20000)
    outcome=page.evaluate("(()=>{const s=HOG_APP_DEBUG.getState();return {battle:!!s.battle,cleared:s.cleared.length,army:s.expedition?.army?.human_3||0,valid:HOG_ENGINE.strictSave(s),auto:s.battleAuto}})()")
    check("Continuous automatic battle reaches natural NPC settlement",not outcome["battle"] and outcome["cleared"]>0 and outcome["valid"] and not outcome["auto"],outcome)
    check("No browser JavaScript exceptions or console errors",not page_errors and not console_errors,{"page":page_errors[:3],"console":console_errors[:3]})
    ctx.close();profile.cleanup()

receipt={"suite":"HG-09 persistent battlefield movement order and continuous auto battle","browser":browser,
    "build":HTML.name,"fixtureDisclosure":"A real file:// game begins as Human, seeds only 40 Archers to skip recruitment, marches and advances actual travel into a dated 1-star NPC battle. Enemy HP is seeded at 400 and enemy attack is set to zero only to keep the movement order observable for multiple turns; the engine resolves movement, automatic actions, attacks, casualties and settlement naturally. No position, win or reward is injected.",
    "checks":checks,"pageErrors":page_errors,"consoleErrors":console_errors,
    "passed":sum(c["passed"] for c in checks),"total":len(checks),
    "screenshot":str(SHOT.relative_to(ROOT)).replace("\\","/")}
RECEIPT.write_text(json.dumps(receipt,indent=2,ensure_ascii=False),encoding="utf-8")
print("TOTAL",receipt["passed"],"/",receipt["total"],"PASS")
print("SCREENSHOT",SHOT)
print("SCREENSHOT SHA256",hashlib.sha256(SHOT.read_bytes()).hexdigest().upper() if SHOT.exists() else "MISSING")
raise SystemExit(0 if receipt["passed"]==receipt["total"] else 1)
