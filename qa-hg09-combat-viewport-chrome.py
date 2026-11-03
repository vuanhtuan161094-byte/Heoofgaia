"""Real file:// Chromium acceptance for HG14.1 2:1 isometric battlefield and controls."""
from pathlib import Path
import hashlib, json, sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
ROOT=Path(__file__).resolve().parent
HTML=ROOT/"Play-Heoofgaia-HG11.html"
SHOTDIR=ROOT/"docs"/"evidence"/"hg09"
QADIR=ROOT/"docs"/"qa"/"hg09"
SHOTDIR.mkdir(parents=True,exist_ok=True)
QADIR.mkdir(parents=True,exist_ok=True)
results=[]
errors=[]
def check(label,condition):
    passed=bool(condition)
    results.append({"name":label,"passed":passed})
    print(("PASS " if passed else "FAIL ")+label,flush=True)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage","--allow-file-access-from-files"])
    page=browser.new_page(viewport={"width":1280,"height":720},device_scale_factor=1)
    page.set_default_timeout(10000)
    page.on("pageerror",lambda e: errors.append(str(e)))
    page.goto(HTML.as_uri(),wait_until="load")
    page.locator('[data-action="start"]').click()
    page.locator('#nav [data-tab="map"]').click()
    point=page.evaluate("""() => {
      const c=document.querySelector('#world-canvas'),r=c.getBoundingClientRect(),m=HOG_PAINTER.miniBounds(c),pad=9;
      return {x:r.left+(m.x+pad+6.5*(m.w-2*pad)/100)/c.width*r.width,
              y:r.top+(m.y+pad+3.5*(m.h-2*pad)/100)/c.height*r.height};
    }""")
    page.mouse.click(point["x"],point["y"])
    page.locator('[data-action="march"]').click()
    page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();
      HOG_ENGINE.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);
      HOG_APP_DEBUG.render();
    }""")
    page.locator("#battle-canvas").wait_for(state="visible")
    state=page.evaluate("""() => {
      const c=document.querySelector('#battle-canvas'),r=c.getBoundingClientRect(),cmd=document.querySelector('.command-bar'),q=cmd.getBoundingClientRect();
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,p=HOG_PAINTER;
      const x=5,y=4,pt=p.battleProjection(c,E).point(x+.5,y+.5),px=pt.x,py=pt.y;
      return {inBattle:!!s.battle,combatMode:document.body.classList.contains('combat-mode'),
        width:r.width,height:r.height,vw:innerWidth,vh:innerHeight,
        sidebarHidden:getComputedStyle(document.querySelector('.sidebar')).display==='none',
        navHidden:getComputedStyle(document.querySelector('#nav')).display==='none',
        commandVisible:q.top<innerHeight-10&&q.bottom>0,grid:E.BATTLE_GRID,
        projectedCell:p.battleCellAt(c,px,py,E),scrollWidth:document.documentElement.scrollWidth};
    }""")
    check("Entering combat resets previous map page scroll",page.evaluate("window.scrollY")<2)
    check("Actual NPC March reaches combat",state["inBattle"])
    check("Illustrated combat troop sprites load from the offline HTML",page.evaluate("""() => ['battle-unit-human-spear','battle-unit-npc-beast','battle-unit-npc-archer','battle-unit-npc-guard'].every(id=>{const img=document.getElementById(id);return img&&img.complete&&img.naturalWidth===512&&img.naturalHeight===512})"""))
    check("Canvas pixels have the same aspect ratio as its CSS size",page.evaluate("""() => {const c=document.querySelector('#battle-canvas'),r=c.getBoundingClientRect();return Math.abs(c.width/r.width-c.height/r.height)<.008}"""))
    check("Battle orders do not overlay the troop selection cards",page.evaluate("""() => {const a=document.querySelector('.battle-ui').getBoundingClientRect(),b=document.querySelector('.command-bar').getBoundingClientRect();return b.top>=a.bottom-1&&b.bottom<=innerHeight+1}"""))
    check("Old march toast no longer blocks combat commands",page.evaluate("""() => !document.querySelector('#toast')?.classList.contains('show')"""))
    check("Battle-only viewport mode activates",state["combatMode"] and state["sidebarHidden"] and state["navHidden"])
    check("Battle canvas uses at least 90 percent of desktop width",state["width"]>=state["vw"]*.90)
    check("Battle canvas uses at least 60 percent of desktop height",state["height"]>=state["vh"]*.60)
    check("Commands are present in the initial viewport",state["commandVisible"])
    check("Isometric camera retains square logical 12 by 9 cells",state["grid"]["cols"]==12 and state["grid"]["rows"]==9 and state["projectedCell"]=={"x":5,"y":4})
    check("No horizontal desktop overflow",state["scrollWidth"]<=state["vw"]+1)
    desktop=SHOTDIR/"fullscreen-combat-desktop-chrome.png"
    page.screenshot(path=str(desktop),full_page=False)
    enemy=page.evaluate("""() => {
      const b=HOG_APP_DEBUG.getState().battle,u=b.enemies.find(q=>q.pool>0),c=document.querySelector('#battle-canvas'),r=c.getBoundingClientRect();
      const pt=HOG_PAINTER.battleProjection(c,HOG_ENGINE).point(u.x+.5,u.y+.5),x=pt.x,y=pt.y;
      return {id:u.id,x:r.left+x/c.width*r.width,y:r.top+y/c.height*r.height};
    }""")
    before_click=page.evaluate("""({x,y,id}) => {
      const c=document.querySelector('#battle-canvas'),r=c.getBoundingClientRect(),s=HOG_APP_DEBUG.getState(),q=document.elementFromPoint(x,y);
      const hit=HOG_PAINTER.battleHit(c,(x-r.left)*c.width/r.width,(y-r.top)*c.height/r.height,HOG_ENGINE,s);
      return {expected:id,hit:hit?.id||null,element:q?.tagName+'#'+(q?.id||''),
        canvasTarget:q===c,onclick:!!c.onclick,focusBefore:s.battle?.focused||null,
        viewScroll:window.scrollY,toast:document.querySelector('#toast')?.innerText||''};
    }""",enemy)
    page.mouse.click(enemy["x"],enemy["y"])
    after_click=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();return {focus:s.battle?.focused||null,selected:s.battle?.selected||null,
      toast:document.querySelector('#toast')?.innerText||''};
    }""")
    click_debug={"before":before_click,"after":after_click}
    print("CHROME CLICK DEBUG",json.dumps(click_debug,ensure_ascii=False),flush=True)
    check("Real projected canvas click selects enemy unit",after_click["focus"]==enemy["id"])
    page.locator('[data-action="save-combat"]').click()
    check("Visible combat Save writes v07 state",bool(page.evaluate("localStorage.getItem('heoofgaia_hg_only_v07')")))
    page.reload(wait_until="load")
    check("Reload restores in-progress battle and viewport mode",page.evaluate("!!HOG_APP_DEBUG.getState()?.battle && document.body.classList.contains('combat-mode')"))
    page.set_viewport_size({"width":960,"height":540})
    page.evaluate("HOG_APP_DEBUG.render()")
    mobile=page.evaluate("""() => {
      const c=document.querySelector('#battle-canvas'),r=c.getBoundingClientRect(),bar=document.querySelector('.command-bar').getBoundingClientRect();
      return {width:r.width,vw:innerWidth,scrollWidth:document.documentElement.scrollWidth,sidebar:getComputedStyle(document.querySelector('.sidebar')).display,barY:bar.y};
    }""")
    check("Landscape canvas pixels preserve the rendered aspect ratio",page.evaluate("""() => {const c=document.querySelector('#battle-canvas'),r=c.getBoundingClientRect();return Math.abs(c.width/r.width-c.height/r.height)<.008}"""))
    check("Landscape command bar does not overlap troop cards",page.evaluate("""() => {const a=document.querySelector('.battle-ui').getBoundingClientRect(),b=document.querySelector('.command-bar').getBoundingClientRect();return b.top>=a.bottom-1&&b.bottom<=innerHeight+1}"""))
    check("Landscape 960 by 540 remains wide with hidden sidebar",mobile["width"]>=mobile["vw"]*.90 and mobile["sidebar"]=="none")
    check("Landscape viewport has no horizontal overflow",mobile["scrollWidth"]<=mobile["vw"]+1)
    landscape=SHOTDIR/"fullscreen-combat-landscape-chrome.png"
    page.screenshot(path=str(landscape),full_page=False)
    check("No JavaScript runtime errors",len(errors)==0)
    browser.close()
report={"htmlSha256":hashlib.sha256(HTML.read_bytes()).hexdigest().upper(),
        "passed":sum(r["passed"] for r in results),"total":len(results),"checks":results,
        "desktop":state,"landscape":mobile,"clickDebug":click_debug,"errors":errors,"screenshots":[str(desktop.relative_to(ROOT)),str(landscape.relative_to(ROOT))]}
(QADIR/"fullscreen-combat-chrome.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
print("HG09 Chrome viewport:",report["passed"],"/",report["total"],"PASS",flush=True)
raise SystemExit(0 if report["passed"]==report["total"] else 1)
