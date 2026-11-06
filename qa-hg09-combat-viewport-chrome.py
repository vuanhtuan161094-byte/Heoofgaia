"""Real file:// Chromium acceptance for 2009-inspired scenic battlefield and controls."""
from pathlib import Path
import hashlib, json, os, sys
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

def click_troop_upper_body(page, label):
    # Drive a real mouse event well above the foot-radius selection zone.
    point=page.evaluate("""() => {
      const c=document.querySelector('#battle-canvas'),r=c.getBoundingClientRect(),
        P=HOG_PAINTER,E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),
        entries=P.battleUnitLayout(s.battle,P.battleProjection(c,E),c.width,c.height)
          .filter(q=>q.u.side==='enemy'&&q.u.pool>0).sort((a,b)=>a.y-b.y);
      if(!entries.length)throw new Error('No living enemy for upper-body hit test');
      const e=entries[0],x=e.sprite.x+e.sprite.w*.5,y=e.sprite.y+e.sprite.h*.18,
        hit=P.battleHit(c,x,y,E,s),clientX=r.left+x/c.width*r.width,
        clientY=r.top+y/c.height*r.height;
      return {id:e.id,hit:hit?.id||null,clientX,clientY,
        fromFoot:e.y-y,legacyRadius:Math.max(38,c.width*.055),
        onCanvas:document.elementFromPoint(clientX,clientY)===c};
    }""")
    check(label+" sprite upper-body hitbox",point["hit"]==point["id"] and
          point["fromFoot"]>point["legacyRadius"] and point["onCanvas"])
    page.mouse.click(point["clientX"],point["clientY"])
    check(label+" real upper-body click selects the enemy",
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
    # The rookie progress panel adds vertical content ahead of the map.
    # Mouse coordinates must be computed after scrolling the real map canvas
    # into the visible viewport; otherwise clicks can land below the screen.
    point=page.evaluate("""() => {
      const c=document.querySelector('#world-canvas');
      if(!c)throw new Error('Map canvas detached before NPC dispatch');
      c.scrollIntoView({block:'center',inline:'nearest'});
      const r=c.getBoundingClientRect(),m=HOG_PAINTER.miniBounds(c),pad=9;
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
    stage=page.evaluate("""() => {
      const c=document.getElementById('battle-canvas'),E=HOG_ENGINE,P=HOG_PAINTER,
       g=E.BATTLE_GRID,cam=P.battleProjection(c,E),ctx=c.getContext('2d');
      const ally=cam.point(1.5,.5),foe=cam.point(10.5,2.5);
      const units=[...HOG_APP_DEBUG.getState().battle.allies,...HOG_APP_DEBUG.getState().battle.enemies].filter(u=>u.pool>0);
      const sample=(x,y)=>[...ctx.getImageData(Math.round(x),Math.round(y),1,1).data];
      return {width:c.width,height:c.height,ally,foe,
        horizontal:cam.col.x>cam.row.x*10,depth:cam.row.y>cam.col.y*12,
        shallow:Math.abs(cam.col.y/cam.col.x)<.09,
        edge:cam.point(0,0).x>0&&cam.point(g.cols,g.rows).x<c.width,
        everyCell:Array.from({length:g.cols},(_,x)=>Array.from({length:g.rows},(_,y)=>{
          const pt=cam.point(x+.5,y+.5),hit=P.battleCellAt(c,pt.x,pt.y,E);
          return hit?.x===x&&hit?.y===y;
        }).every(Boolean)).every(Boolean),
        everyFoot:units.every(u=>{const p=cam.point(u.x+.5,u.y+.5);
         return p.x>90&&p.x<c.width-90&&p.y>c.height*.36&&p.y<c.height*.96}),
        floorSource:!!document.getElementById('battlefield-human-meadow')?.naturalWidth,
        noPlatform:!P.battleGround.toString().includes('poly('),
        gridSupported:typeof P.battleGridOverlay==='function'&&P.battleGridCells(cam).length===108,
        grass0:sample(c.width*.46,c.height*.53),
        grass1:sample(c.width*.54,c.height*.73)
      };
    }""")
    check("HG14.2 armies are staged at left and right",stage["horizontal"] and stage["depth"] and stage["foe"]["x"]-stage["ally"]["x"]>stage["width"]*.6)
    check("HG14.2 shallow camera matches natural clearing",stage["shallow"] and stage["edge"])
    check("HG14.2 all 108 invisible logical cells remain clickable",stage["everyCell"])
    check("HG14.2 real foot pivots fit the clearing",stage["everyFoot"])
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
    click_troop_upper_body(page, "1280x720")
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
    check("HG14.4 mobile sprites are readable and all nameplates avoid silhouettes",page.evaluate("""() => {
      const c=document.getElementById('battle-canvas'),P=HOG_PAINTER,E=HOG_ENGINE,
        b=HOG_APP_DEBUG.getState().battle,cam=P.battleProjection(c,E),
        layout=P.battleUnitLayout(b,cam,c.width,c.height);
      const k=P.battleSpriteScale(c.height,0,9);
       const rendered=Math.max(64,Math.min(125,113*k));
       return rendered>=64&&rendered<=110&&layout.every(e=>
       e.label.y>=60&&e.label.x>=12&&e.label.x+e.label.w<=c.width-12&&
        !layout.some(o=>P.battleRectOverlap(e.label,o.sprite,1))&&
        !P.battleRectOverlap(e.label,{x:c.width-190,y:58,w:184,h:38},1)&&
       !layout.some(o=>o!==e&&P.battleRectOverlap(e.label,o.label,2)));
    }"""))
    check("HG14.2 mobile stage spreads troops on scenic meadow",page.evaluate("""() => {
      const c=document.getElementById('battle-canvas'),E=HOG_ENGINE,cam=HOG_PAINTER.battleProjection(c,E);
      const a=cam.point(1.5,.5),b=cam.point(10.5,2.5);
      return cam.col.x>cam.row.x*10&&cam.row.y>cam.col.y*12
       &&b.x-a.x>c.width*.6&&a.y>c.height*.36&&b.y<c.height*.7;
    }"""))
    check("Landscape command bar does not overlap troop cards",page.evaluate("""() => {const a=document.querySelector('.battle-ui').getBoundingClientRect(),b=document.querySelector('.command-bar').getBoundingClientRect();return b.top>=a.bottom-1&&b.bottom<=innerHeight+1}"""))
    check("Landscape 960 by 540 remains wide with hidden sidebar",mobile["width"]>=mobile["vw"]*.90 and mobile["sidebar"]=="none")
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
(QADIR/"fullscreen-combat-chrome.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
print("HG09 Chrome viewport:",report["passed"],"/",report["total"],"PASS",flush=True)
raise SystemExit(0 if report["passed"]==report["total"] else 1)
