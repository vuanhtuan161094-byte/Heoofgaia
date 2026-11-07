"""Real file:// Chromium acceptance for 2009-inspired scenic battlefield and controls."""
from pathlib import Path
import hashlib, json, os, sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
ROOT=Path(__file__).resolve().parent
HTML=ROOT/"Play-Heoofgaia-HG11.html"
SHOTDIR=Path(os.environ.get("HOG_HG09_EVIDENCE_ROOT",ROOT/"docs"/"evidence"/"hg09"))
REPORT=Path(os.environ.get("HOG_HG09_REPORT",ROOT/"docs"/"qa"/"hg09"/"fullscreen-combat-chrome.json"))
SHOTDIR.mkdir(parents=True,exist_ok=True)
REPORT.parent.mkdir(parents=True,exist_ok=True)
results=[]
errors=[]
def check(label,condition):
    passed=bool(condition)
    results.append({"name":label,"passed":passed})
    print(("PASS " if passed else "FAIL ")+label,flush=True)

def click_troop_upper_body(page, label):
    # Real mouse events: the illustrated upper torso AND its nameplate are
    # selectable. Both points must be outside the canonical foot-anchor radius.
    point=page.evaluate("""() => {
      const c=document.querySelector('#battle-canvas'),r=c.getBoundingClientRect(),
        P=HOG_PAINTER,E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),
        entries=P.battleUnitLayout(s.battle,P.battleProjection(c,E),c.width,c.height)
          .filter(q=>q.u.side==='enemy'&&q.u.pool>0).sort((a,b)=>a.y-b.y);
      if(!entries.length)throw new Error('No living enemy for upper-body hit test');
      const e=entries[0],footAnchorRadius=Math.max(16,c.width*.019),
        project=(x,y)=>{const clientX=r.left+x/c.width*r.width,
          clientY=r.top+y/c.height*r.height;
          return {clientX,clientY,hit:P.battleHit(c,x,y,E,s)?.id||null,
            onCanvas:document.elementFromPoint(clientX,clientY)===c,
            fromFoot:Math.hypot(x-e.x,y-e.y)}};
      return {id:e.id,footAnchorRadius,
        torso:project(e.sprite.x+e.sprite.w*.5,e.sprite.y+e.sprite.h*.04),
        plate:project(e.label.x+e.label.w*.5,e.label.y+e.label.h*.5)};
    }""")
    print("HITBOX DEBUG",label,json.dumps(point,ensure_ascii=False),flush=True)
    torso=point["torso"]
    check(label+" sprite upper-body hitbox",torso["hit"]==point["id"] and
          torso["fromFoot"]>point["footAnchorRadius"]+2 and torso["onCanvas"])
    page.mouse.click(torso["clientX"],torso["clientY"])
    check(label+" real upper-body click selects the enemy",
          page.evaluate("HOG_APP_DEBUG.getState().battle?.focused")==point["id"])
    plate=point["plate"]
    check(label+" distant nameplate is a genuine selectable hitbox",
          plate["hit"]==point["id"] and
          plate["fromFoot"]>point["footAnchorRadius"] and plate["onCanvas"])
    page.mouse.click(plate["clientX"],plate["clientY"])
    check(label+" real nameplate click selects the enemy",
          page.evaluate("HOG_APP_DEBUG.getState().battle?.focused")==point["id"])

with sync_playwright() as p:
    launch={"headless":True,"args":["--no-sandbox","--disable-dev-shm-usage","--allow-file-access-from-files"]}
    chrome=os.environ.get("HOG_CHROME_PATH")
    if chrome: launch["executable_path"]=chrome
    browser=p.chromium.launch(**launch)
    page=browser.new_page(viewport={"width":1280,"height":720},device_scale_factor=1)
    page.set_default_timeout(10000)
    page.on("pageerror",lambda e: errors.append(str(e)))
    page.goto(HTML.as_uri(),wait_until="load")
    page.locator('[data-action="start"]').click()
    page.locator('#nav [data-tab="map"]').click()
    # HG39 moved dispatch into the target card/planner. Recenter only the view
    # so a real reachable NPC tile is visible, then select and dispatch through
    # actual canvas and UI events instead of the removed direct-March control.
    target=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,P=HOG_PAINTER,
        home=E.activeCity(s),npc=E.NPC_CAMPS_2009.filter(q=>q.stars===1&&E.pathfind(home.key,q.key))
          .sort((a,b)=>E.pathfind(home.key,a.key).length-E.pathfind(home.key,b.key).length)[0];
      if(!npc)throw new Error('No reachable one-star NPC for combat viewport gate');
      Object.assign(P.mapCamera(),{centerX:npc.x,centerY:npc.y,zoom:1.3});HOG_APP_DEBUG.render();
      const c=document.querySelector('#world-canvas'),r=c.getBoundingClientRect(),tile=E.getTile(npc.key),m=P.mapCamera(),scale=m.zoom*48,
        x=c.width/2-m.centerX*scale+(tile.x+.5)*scale,
        y=c.height/2-m.centerY*scale+(tile.y+.5)*scale;
      c.scrollIntoView({block:'center',inline:'nearest'});
      const rect=c.getBoundingClientRect();
      return {key:npc.key,x:rect.left+x/c.width*rect.width,y:rect.top+y/c.height*rect.height};
    }""")
    page.mouse.click(target["x"],target["y"])
    page.locator('.hg39-map-target [data-action="dispatch-open"]').click()
    page.locator('.hg39-dispatch').wait_for(state='visible')
    page.locator('[data-action="dispatch-auto"]').click()
    page.locator('[data-action="dispatch-confirm"]').wait_for(state='visible')
    if not page.locator('[data-action="dispatch-confirm"]').is_enabled():
        raise AssertionError('Real dispatch planner did not produce an enabled formation')
    page.locator('[data-action="dispatch-confirm"]').click()
    page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();
      HOG_ENGINE.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);
      HOG_APP_DEBUG.render();
    }""")
    page.locator("#battle-canvas").wait_for(state="visible")
    state=page.evaluate("""() => {
      const c=document.querySelector('#battle-canvas'),r=c.getBoundingClientRect(),
        stage=document.querySelector('.battle-stage'),sr=stage.getBoundingClientRect(),
        dock=document.querySelector('.battle-command-dock'),q=dock.getBoundingClientRect();
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,p=HOG_PAINTER;
      const x=5,y=4,pt=p.battleProjection(c,E).point(x+.5,y+.5),px=pt.x,py=pt.y;
      return {inBattle:!!s.battle,combatMode:document.body.classList.contains('combat-mode'),
        width:r.width,height:r.height,vw:innerWidth,vh:innerHeight,
        sidebarHidden:getComputedStyle(document.querySelector('.sidebar')).display==='none',
        navHidden:getComputedStyle(document.querySelector('#nav')).display==='none',
        commandVisible:dock.open&&q.top<innerHeight-10&&q.bottom>0,
        stageWidth:sr.width,rightDock:q.left>=r.right-1&&q.right<=sr.right+1,grid:E.BATTLE_GRID,
        projectedCell:p.battleCellAt(c,px,py,E),scrollWidth:document.documentElement.scrollWidth};
    }""")
    stage=page.evaluate("""() => {
      const c=document.getElementById('battle-canvas'),E=HOG_ENGINE,P=HOG_PAINTER,
       g=E.BATTLE_GRID,cam=P.battleProjection(c,E),ctx=c.getContext('2d');
      const ally=cam.point(1.5,.5),foe=cam.point(10.5,2.5);
      const units=[...HOG_APP_DEBUG.getState().battle.allies,...HOG_APP_DEBUG.getState().battle.enemies].filter(u=>u.pool>0);
      const sample=(x,y)=>[...ctx.getImageData(Math.round(x),Math.round(y),1,1).data];
      return {width:c.width,height:c.height,ally,foe,
        horizontal:cam.center(1,0).x>cam.center(0,0).x&&Math.abs(cam.center(1,0).y-cam.center(0,0).y)<.001,
        depth:cam.center(0,1).y>cam.center(0,0).y,
        stagger:cam.center(0,1).x>cam.center(0,0).x,
        shallow:Math.abs(cam.center(1,0).y-cam.center(0,0).y)<.001&&Math.abs((cam.center(0,1).x-cam.center(0,0).x)/(cam.center(0,1).y-cam.center(0,0).y))<.65,
        edge:Array.from({length:g.cols},(_,x)=>Array.from({length:g.rows},(_,y)=>cam.corners(x,y))).flat(2).every(pt=>pt.x>0&&pt.y>0&&pt.x<c.width&&pt.y<c.height),
        everyCell:Array.from({length:g.cols},(_,x)=>Array.from({length:g.rows},(_,y)=>{
          const pt=cam.point(x+.5,y+.5),hit=P.battleCellAt(c,pt.x,pt.y,E);
          return hit?.x===x&&hit?.y===y;
        }).every(Boolean)).every(Boolean),
        everyFoot:units.every(u=>{const p=cam.point(u.x+.5,u.y+.5);
         return p.x>90&&p.x<c.width-90&&p.y>c.height*.10&&p.y<c.height*.96}),
        floorSource:!!document.getElementById('battlefield-human-meadow')?.naturalWidth,
        noPlatform:!P.battleGround.toString().includes('poly('),
        gridSupported:typeof P.battleGridOverlay==='function'&&P.battleGridCells(cam).length===108,
        grass0:sample(c.width*.46,c.height*.53),
        grass1:sample(c.width*.54,c.height*.73)
      };
    }""")
    check("HG14.2 armies are staged at left and right",stage["horizontal"] and stage["depth"] and stage["stagger"] and stage["foe"]["x"]-stage["ally"]["x"]>stage["width"]*.20)
    check("HG33 odd-r hex axes and projected battlefield remain shallow and on canvas",stage["shallow"] and stage["edge"])
    check("HG33 all 108 pointy-top hex cells round-trip through Chromium hit tests",stage["everyCell"])
    check("HG33 all living troop foot pivots remain in the hex battlefield",stage["everyFoot"])
    check("HG14.2 meadow is full-field without floating platform",stage["floorSource"] and stage["noPlatform"])
    check("HG14.5 tactical overlay reuses canonical 108-cell projection",stage["gridSupported"])
    check("HG14.2 natural terrain texture remains visible",stage["grass0"]!=stage["grass1"])
    check("HG14.2 desktop troops retain legible sprite scale",page.evaluate("""() => {
      const c=document.getElementById('battle-canvas'),P=HOG_PAINTER;
      const k=P.battleSpriteScale(c.height,0,9);
       const rendered=Math.max(64,Math.min(125,113*k));
       return rendered>=64&&rendered<=110;
    }"""))
    check("HG14.4 desktop troop HUD has separate nonoverlapping name/HP cards",page.evaluate("""() => {
      const c=document.querySelector('#battle-canvas'),P=HOG_PAINTER,E=HOG_ENGINE,
       b=HOG_APP_DEBUG.getState().battle,layout=P.battleUnitLayout(b,P.battleProjection(c,E),c.width,c.height);
      return layout.every(e=>!layout.some(o=>
       (o!==e&&P.battleRectOverlap(e.label,o.label,2))||
       P.battleRectOverlap(e.label,o.sprite,1)));
    }"""))
    check("Entering combat resets previous map page scroll",page.evaluate("window.scrollY")<2)
    check("Actual NPC March reaches combat",state["inBattle"])
    check("Illustrated combat troop sprites load from the offline HTML",page.evaluate("""() => ['battle-unit-human-spear','battle-unit-npc-beast','battle-unit-npc-archer','battle-unit-npc-guard'].every(id=>{const img=document.getElementById(id);return img&&img.complete&&img.naturalWidth===512&&img.naturalHeight===512})"""))
    check("Canvas pixels have the same aspect ratio as its CSS size",page.evaluate("""() => {const c=document.querySelector('#battle-canvas'),r=c.getBoundingClientRect();return Math.abs(c.width/r.width-c.height/r.height)<.008}"""))
    check("Roster cards are hidden and field actions stay in the right command dock",page.evaluate("""() => {
      const c=document.querySelector('#battle-canvas').getBoundingClientRect(),dock=document.querySelector('.battle-command-dock'),r=dock.getBoundingClientRect(),
        oldRoster=document.querySelector('.battle-ui'),oldBar=document.querySelector('.command-bar'),
        actions=[...dock.querySelectorAll('.battle-action-grid button')];
      return (!oldRoster||getComputedStyle(oldRoster).display==='none')&&
        (!oldBar||getComputedStyle(oldBar).display==='none')&&dock.open&&
        r.left>=c.right-1&&actions.some(b=>b.dataset.cmd==='attack')&&actions.some(b=>b.dataset.action==='auto');
    }"""))
    check("Old march toast no longer blocks combat commands",page.evaluate("""() => !document.querySelector('#toast')?.classList.contains('show')"""))
    check("Battle-only viewport mode activates",state["combatMode"] and state["sidebarHidden"] and state["navHidden"])
    check("Field-first stage fills the viewport and the hex board stays wide beside the dock",state["stageWidth"]>=state["vw"]*.96 and state["width"]>=state["vw"]*.75 and state["rightDock"])
    check("Battle canvas uses at least 60 percent of desktop height",state["height"]>=state["vh"]*.60)
    check("Commands are present in the initial viewport",state["commandVisible"])
    check("HG33 pointy-top camera round-trips saved 12 by 9 cells",state["grid"]["cols"]==12 and state["grid"]["rows"]==9 and state["projectedCell"]=={"x":5,"y":4})
    check("No horizontal desktop overflow",state["scrollWidth"]<=state["vw"]+1)
    desktop=SHOTDIR/"fullscreen-combat-desktop-chrome.png"
    page.screenshot(path=str(desktop),full_page=False)
    expanded_width=page.locator('#battle-canvas').evaluate("e=>e.getBoundingClientRect().width")
    page.locator('.battle-command-dock>summary').click()
    page.wait_for_function("document.querySelector('.battle-stage').classList.contains('battle-stage-collapsed')")
    page.evaluate("HOG_APP_DEBUG.render()")
    collapsed_width=page.locator('#battle-canvas').evaluate("e=>e.getBoundingClientRect().width")
    check("Right command dock collapses and returns screen space to the battlefield",not page.locator('.battle-command-dock').evaluate("e=>e.open") and collapsed_width>expanded_width+30)
    page.locator('.battle-command-dock>summary').click()
    page.wait_for_function("!document.querySelector('.battle-stage').classList.contains('battle-stage-collapsed')")
    page.evaluate("HOG_APP_DEBUG.render()")
    check("Right command dock reopens with the field-first layout restored",page.locator('.battle-command-dock').evaluate("e=>e.open") and abs(page.locator('#battle-canvas').evaluate("e=>e.getBoundingClientRect().width")-expanded_width)<2)
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
    click_troop_upper_body(page, "1280x720")
    page.locator('[data-action="save-combat"]').click()
    check("Visible combat Save writes v07 state",bool(page.evaluate("localStorage.getItem('heoofgaia_hg_only_v07')")))
    page.reload(wait_until="load")
    check("Reload restores in-progress battle and viewport mode",page.evaluate("!!HOG_APP_DEBUG.getState()?.battle && document.body.classList.contains('combat-mode')"))
    page.set_viewport_size({"width":960,"height":540})
    page.evaluate("HOG_APP_DEBUG.render()")
    mobile=page.evaluate("""() => {
      const c=document.querySelector('#battle-canvas'),r=c.getBoundingClientRect(),dock=document.querySelector('.battle-command-dock').getBoundingClientRect();
      return {width:r.width,canvasRight:r.right,vw:innerWidth,scrollWidth:document.documentElement.scrollWidth,sidebar:getComputedStyle(document.querySelector('.sidebar')).display,dockX:dock.x,dockY:dock.y,dockWidth:dock.width};
    }""")
    check("Landscape canvas pixels preserve the rendered aspect ratio",page.evaluate("""() => {const c=document.querySelector('#battle-canvas'),r=c.getBoundingClientRect();return Math.abs(c.width/r.width-c.height/r.height)<.008}"""))
    check("HG14.4 mobile sprites are readable and all nameplates avoid silhouettes",page.evaluate("""() => {
      const c=document.getElementById('battle-canvas'),P=HOG_PAINTER,E=HOG_ENGINE,
        b=HOG_APP_DEBUG.getState().battle,cam=P.battleProjection(c,E),
        layout=P.battleUnitLayout(b,cam,c.width,c.height);
      const k=P.battleSpriteScale(c.height,0,9);
       const rendered=Math.max(64,Math.min(125,113*k));
       return rendered>=64&&rendered<=110&&layout.every(e=>
       e.label.y>=60&&e.label.x>=12&&e.label.x+e.label.w<=c.width-12&&
        !layout.some(o=>P.battleRectOverlap(e.label,o.sprite,1))&&
       !layout.some(o=>o!==e&&P.battleRectOverlap(e.label,o.label,2)));
    }"""))
    check("HG14.2 mobile stage spreads troops on scenic meadow",page.evaluate("""() => {
      const c=document.getElementById('battle-canvas'),E=HOG_ENGINE,cam=HOG_PAINTER.battleProjection(c,E);
      const a=cam.point(1.5,.5),b=cam.point(10.5,2.5);
      const p0=cam.center(0,0),pc=cam.center(1,0),pr=cam.center(0,1),rowDx=pr.x-p0.x,rowDy=pr.y-p0.y;
      return pc.x>p0.x&&Math.abs(pc.y-p0.y)<.001&&rowDy>0&&rowDx>0&&Math.abs(rowDx/rowDy)<.65
       &&b.x-a.x>c.width*.20&&a.y>c.height*.10&&b.y<c.height*.7;
    }"""))
    check("Landscape keeps roster cards hidden and right dock actionable",page.evaluate("""() => {
      const c=document.querySelector('#battle-canvas').getBoundingClientRect(),dock=document.querySelector('.battle-command-dock'),r=dock.getBoundingClientRect(),
        oldRoster=document.querySelector('.battle-ui'),oldBar=document.querySelector('.command-bar'),
        actions=[...dock.querySelectorAll('.battle-action-grid button')];
      return (!oldRoster||getComputedStyle(oldRoster).display==='none')&&
        (!oldBar||getComputedStyle(oldBar).display==='none')&&dock.open&&
        r.left>=c.right-1&&actions.some(b=>b.dataset.cmd==='attack')&&actions.some(b=>b.dataset.action==='auto');
    }"""))
    check("Landscape 960 by 540 keeps a wide battlefield beside the right dock",mobile["width"]>=mobile["vw"]*.75 and mobile["sidebar"]=="none" and mobile["dockX"]>=mobile["canvasRight"]-1 and mobile["dockX"]+mobile["dockWidth"]<=mobile["vw"]+1)
    check("Landscape viewport has no horizontal overflow",mobile["scrollWidth"]<=mobile["vw"]+1)
    click_troop_upper_body(page, "960x540")
    check("HG14.4 click targets follow visually spaced troop positions",page.evaluate("""() => {
      const c=document.querySelector('#battle-canvas'),P=HOG_PAINTER,E=HOG_ENGINE,
       s=HOG_APP_DEBUG.getState(),layout=P.battleUnitLayout(s.battle,P.battleProjection(c,E),c.width,c.height);
      return layout.every(e=>P.battleHit(c,e.x,e.y,E,s)?.id===e.id);
    }"""))
    landscape=SHOTDIR/"fullscreen-combat-landscape-chrome.png"
    page.screenshot(path=str(landscape),full_page=False)
    check("No JavaScript runtime errors",len(errors)==0)
    browser.close()
report={"htmlSha256":hashlib.sha256(HTML.read_bytes()).hexdigest().upper(),
        "passed":sum(r["passed"] for r in results),"total":len(results),"checks":results,
        "desktop":state,"continuousGround":stage,"landscape":mobile,"clickDebug":click_debug,"errors":errors,"screenshots":[str(desktop.relative_to(ROOT)),str(landscape.relative_to(ROOT))]}
REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
print("HG09 Chrome viewport:",report["passed"],"/",report["total"],"PASS",flush=True)
raise SystemExit(0 if report["passed"]==report["total"] else 1)
