"""HG33-H1: real pointy-top odd-r battlefield, Bosses and 3 commanders x 2 stacks.
Chromium file:// screenshots, live battle source, canonical 12x9 cells, no fake rewards.
"""
from pathlib import Path
import os
import hashlib
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
HTML=ROOT/"Play-Heoofgaia-HG11.html"
OUT=Path(os.environ.get("HOG_HG33_H1_OUTPUT",ROOT/"docs/evidence/hg33/after"))
REPORT=Path(os.environ.get("HOG_HG33_H1_REPORT",ROOT/"docs/qa/hg33/H1-chromium.json"))
OUT.mkdir(parents=True,exist_ok=True)
REPORT.parent.mkdir(parents=True,exist_ok=True)
checks=[]
images=[]
errors=[]

def check(name,ok,detail=None):
    checks.append({"check":name,"pass":bool(ok),"detail":detail})
    print(("PASS " if ok else "FAIL ")+name+" "+str(detail or ""),flush=True)
    if not ok:
        raise AssertionError(name+": "+str(detail))

def capture(page,name):
    path=OUT/name
    page.screenshot(path=str(path),animations="disabled")
    images.append({"path":str(path.relative_to(ROOT)),
                   "sha256":hashlib.sha256(path.read_bytes()).hexdigest()})

def inspect(page):
    return page.evaluate("""() => {
      const E=HOG_ENGINE,P=HOG_PAINTER,s=HOG_APP_DEBUG.getState(),b=s.battle;
      const c=document.getElementById('battle-canvas'),r=c.getBoundingClientRect();
      const camera=P.battleProjection(c,E),layout=P.battleUnitLayout(b,camera,c.width,c.height);
      const cards=[...document.querySelectorAll('.battle-ui .stack-card')],dock=document.querySelector('.battle-command-dock'),
        dockRect=dock?.getBoundingClientRect(),stage=document.querySelector('.battle-stage'),stageRect=stage?.getBoundingClientRect(),
        heading=document.querySelector('.scene-title h1');
      const actionFlags={attack:!!dock?.querySelector('[data-action="battle"][data-cmd="attack"]'),
        advance:!!dock?.querySelector('[data-action="battle"][data-cmd="advance"]'),
        move:!!dock?.querySelector('[data-action="move-mode"]'),
        defend:!!dock?.querySelector('[data-action="battle"][data-cmd="defend"]'),
        focus:!!dock?.querySelector('[data-action="battle"][data-cmd="focus"]'),
        retreat:!!dock?.querySelector('[data-action="battle"][data-cmd="retreat"]'),
        auto:!!dock?.querySelector('[data-action="auto"]'),grid:!!dock?.querySelector('[data-action="battle-grid"]'),
        hp:!!dock?.querySelector('[data-action="battle-hp"]')};
      const visibleControls=[...dock?.querySelectorAll('.battle-action-grid button')||[]].every(q=>{
        const x=q.getBoundingClientRect();return x.width>0&&x.top>=0&&x.bottom<=innerHeight});
      const roster={cards:cards.length,rowsAbsent:!document.querySelector('.battle-ui')&&cards.length===0};
      const alive=layout.filter(q=>q.u.pool>0),foes=alive.filter(q=>q.u.side==='enemy');
      const area=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*
                          Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
      let bossMax=0,bossOverlap=0;
      for(let i=0;i<foes.length;i++)for(let j=i+1;j<foes.length;j++){
        const x=foes[i].sprite,y=foes[j].sprite;
        const fraction=area(x,y)/Math.min(x.w*x.h,y.w*y.h);
        bossMax=Math.max(bossMax,fraction);bossOverlap+=fraction>0?1:0;
      }
      const labelConflicts=alive.filter(a=>a.label).flatMap(a=>alive.filter(b=>a!==b&&
          (b.label&&area(a.label,b.label)>0||area(a.label,b.sprite)>0||area(a.label,b.countBox)>0))).length;
      // The redundant round badge was removed; only the compact troop-total
      // counter still overlays the battlefield. Hex/HP are in the right dock.
      const huds=[{x:c.width-200,y:14,w:186,h:42}];
      const hudConflicts=alive.flatMap(a=>huds.filter(q=>
        (a.label&&area(q,a.label)>0)||area(q,a.sprite)>0||area(q,a.countBox)>0)).length;
      const cells=P.battleGridCells(camera),corners=cells.flatMap(cell=>cell.corners),sampleNow=performance.now();
      P.drawBattle(c,E,s,sampleNow,{showGrid:true,showHP:true});
      const hitAll=alive.every(e=>P.battleHit(c,e.x,e.y,E,s,sampleNow+2000)?.id===e.id);
      const cellsInvert=cells.every(e=>{const h=P.battleCellAt(c,e.center.x,e.center.y,E);return h?.x===e.x&&h?.y===e.y});
      const allActions=Object.values(actionFlags).every(Boolean),dockVisible=!!dockRect&&dockRect.top>=0&&dockRect.bottom<=innerHeight&&visibleControls;
      return {valid:E.strictSave(s),inCombat:!!b,cols:camera.g.cols,rows:camera.g.rows,
        owners:alive.filter(e=>e.u.side==='player').map(e=>e.u.heroId),allUnits:alive.length,bossCount:foes.length,
        foeLabels:foes.map(e=>e.u.name),bossMax,bossOverlap,labelConflicts,hudConflicts,
        bossCenters:foes.map(e=>({id:e.id,x:e.x,y:e.y})),hexOrientation:camera.hex.orientation,hexLayout:camera.hex.layout,
        hexRadius:camera.radius,cellCount:cells.length,gridShown:HOG_APP_DEBUG.battleViewPrefs().grid,roster,
        headingFits:heading.scrollWidth<=heading.clientWidth+1,actionFlags,allActions,dockVisible,
        stage:{x:stageRect?.x,y:stageRect?.y,w:stageRect?.width,h:stageRect?.height},
        dock:{x:dockRect?.x,y:dockRect?.y,w:dockRect?.width,h:dockRect?.height},
        cornersInside:corners.every(p=>p.x>=0&&p.x<=c.width&&p.y>=0&&p.y<=c.height),
        cellsInvert,hitAll,aspect:Math.abs(c.width/r.width-c.height/r.height),
        overflow:document.documentElement.scrollWidth>innerWidth+1,canvas:{width:c.width,height:c.height,screenX:r.x,screenWidth:r.width,screenHeight:r.height},
        bossSpriteInside:foes.every(e=>e.sprite.x>=0&&e.sprite.x+e.sprite.w<=c.width&&
          e.sprite.y>=0&&e.sprite.y+e.sprite.h<=c.height)};
    }""")

def start(page):
    page.goto(HTML.as_uri(),wait_until="load")
    page.locator('[data-action="start"]').click()

def pose(page,width,height,title):
    page.set_viewport_size({"width":width,"height":height})
    page.evaluate("window.dispatchEvent(new Event('resize'))")
    page.evaluate("HOG_APP_DEBUG.render()")
    d=inspect(page)
    key=f"{title} {width}x{height}"
    check(key+" uses the real reversible pointy-top odd-r hex grid",d["inCombat"] and d["valid"] and
          d["cols"]==12 and d["rows"]==9 and d["cellsInvert"] and d["cornersInside"] and
          d["cellCount"]==108 and d["hexOrientation"]=="pointy-top" and
          d["hexLayout"]=="odd-r" and d["hexRadius"]>8 and d["gridShown"],d)
    check(key+" keeps image and pointer aligned",d["hitAll"] and d["aspect"]<.008 and
          not d["overflow"],d)
    check(key+" removes duplicate stack cards and keeps field commands in the right dock",
          d["roster"]["cards"]==0 and d["roster"]["rowsAbsent"] and d["allActions"] and
          d["dockVisible"] and d["dock"]["x"]>=d["canvas"]["screenX"]+d["canvas"]["screenWidth"]-2 and
          d["canvas"]["height"]>=height-75 and d["headingFits"],d)
    check(key+" keeps all sixteen live Boss stacks legible at their real hexes",
          d["bossCount"]==16 and d["bossMax"]<=.16 and d["bossSpriteInside"] and
          d["labelConflicts"]==0 and d["hudConflicts"]==0,d)
    capture(page,f"{title}-{width}x{height}.png")
    before_width=d["canvas"]["screenWidth"]
    page.locator('.battle-command-dock>summary').click()
    page.wait_for_timeout(80)
    collapsed=page.evaluate("""() => ({open:document.querySelector('.battle-command-dock').open,
      canvas:document.querySelector('#battle-canvas').getBoundingClientRect().width,
      classSet:document.querySelector('.battle-stage').classList.contains('battle-stage-collapsed')})""")
    check(key+" collapses the right dock and returns width to battlefield",
          not collapsed["open"] and collapsed["classSet"] and collapsed["canvas"]>before_width+100,collapsed)
    page.locator('.battle-command-dock>summary').click()
    page.wait_for_timeout(80)
    ally=page.evaluate("""() => {const E=HOG_ENGINE,P=HOG_PAINTER,s=HOG_APP_DEBUG.getState(),c=document.querySelector('#battle-canvas'),r=c.getBoundingClientRect(),u=s.battle.allies.find(x=>x.pool>0),e=P.battleUnitLayout(s.battle,P.battleProjection(c,E),c.width,c.height).find(x=>x.u.id===u.id);return {id:u.id,hitId:P.battleHit(c,e.x,e.y,E,s,performance.now()+2000)?.id,x:r.x+e.x/c.width*r.width,y:r.y+e.y/c.height*r.height}}""")
    # In HG41 dense 3x2 PvE the label can move across hexes, but the foot
    # pivot belongs to one real actor and remains selectable after dock reflow.
    check(key+" actual friendly foot hex resolves to the intended live stack",
          ally["hitId"]==ally["id"],ally)
    page.mouse.click(ally["x"],ally["y"])
    check(key+" selects a friendly stack directly on the hex field",
          page.evaluate("id=>HOG_APP_DEBUG.getState().battle?.selected===id",ally["id"]),ally)
    return d

with sync_playwright() as pw:
    launch={"headless":True,"args":["--no-sandbox","--disable-dev-shm-usage","--allow-file-access-from-files"]}
    if os.environ.get("HOG_CHROME_PATH"):
        launch["executable_path"]=os.environ["HOG_CHROME_PATH"]
    browser=pw.chromium.launch(**launch)
    page=browser.new_page(viewport={"width":1280,"height":720})
    page.set_default_timeout(11000)
    page.on("pageerror",lambda e:errors.append(str(e)))
    start(page)
    encounter=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
      s.army.human_1=16;E.setFormation(s,[{unitId:'human_1',count:16}]);
      const azrael=E.TILES.find(t=>t.kind==='npc'&&t.value==='Azrael');
      if(!azrael)throw new Error('Azrael Boss NPC is missing');
      E.startMarch(s,azrael.key);
      E.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);
      HOG_APP_DEBUG.render();
      return {valid:E.strictSave(s),enemies:s.battle?.enemies.map(u=>u.name)};
    }""")
    check("Actual map march enters canonical Azrael sixteen-stack combat",
          encounter["valid"] and len(encounter["enemies"])==16 and
          set(encounter["enemies"])=={"Azrael","Demonlord Samurai","Cyclop Tyrant"} and
          encounter["enemies"][0:3]==["Azrael","Demonlord Samurai","Cyclop Tyrant"],encounter)
    for w,h in ((1280,720),(960,540)):
        pose(page,w,h,"boss-sixteen")
        # Click the first visible Boss by its real nameplate, not by a forced
        # debug state change or a centered invisible grid coordinate.
        point=page.evaluate("""() => {
          const c=document.getElementById('battle-canvas'),r=c.getBoundingClientRect(),
            P=HOG_PAINTER,E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),
            layout=P.battleUnitLayout(s.battle,P.battleProjection(c,E),c.width,c.height),
            e=layout.find(q=>q.u.side==='enemy');
          const x=e.x,y=e.y,hit=P.battleHit(c,x,y,E,s,performance.now()+2000);
          return {id:e.id,hitId:hit?.id,x:r.left+x/c.width*r.width,y:r.top+y/c.height*r.height};
        }""")
        page.mouse.click(point["x"],point["y"])
        check(f"Actual pointer selects first boss by real foot hex {w}x{h}",
              point["hitId"]==point["id"] and
              page.evaluate("HOG_APP_DEBUG.getState().battle?.focused")==point["id"],point)
    page.close()

    # True HG26.1 joint Boss expedition: six owner-bound stacks are sent by
    # three heroes; only the two extra hero records are a labeled QA fixture.
    page=browser.new_page(viewport={"width":1280,"height":720})
    page.on("pageerror",lambda e:errors.append(str(e)))
    start(page)
    setup=page.evaluate("""() => {
      const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),base=JSON.parse(JSON.stringify(s.heroes[0]));
      for(let id=2;id<=3;id++)s.heroes.push({...base,id,name:'QA commander '+id});
      for(let id=1;id<=3;id++)E.hg20SetHeroPlan(s,id,[
        {unitId:'human_1',count:2},{unitId:'human_1',count:2}]);
      const choices=E.hg24RecommendBoss(s).filter(x=>!x.privateBoss)
        .sort((a,b)=>a.stars-b.stars||a.distance-b.distance);
      if(!choices.length)throw new Error('No real joint Boss destination');
      const target=choices[0],team=[1,2,3].map(heroId=>({heroId,slots:[0,1]}));
      E.hg26Start(s,{target:target.key,heroId:null,maxRuns:1,
        keepAP:0,minUnits:12,minCoverage:100,maxLossPercent:100,
        autoHeal:false,autoRecruit:false,stopOnLoss:true,team});
      const departure=E.hg26Step(s);
      E.tick(s,s.lastTick+Math.ceil((s.march.remaining+1)/s.speed*1000));
      const arrive=E.hg26Step(s);
      HOG_APP_DEBUG.render();
      return {valid:E.strictSave(s),departure:departure.type,arrive:arrive.type,
        joint:!!s.battle?.hg261Joint,heroes:s.battle?.allies.map(u=>u.heroId),
        enemies:s.battle?.enemies.map(u=>u.name)};
    }""")
    check("3 real commanders enter one joint Boss battle with 2 stacks each",
          setup["valid"] and setup["departure"]=="dispatched" and
          setup["arrive"]=="battle_open" and setup["joint"] and
          setup["heroes"]==[1,1,2,2,3,3] and
          # HG41 has 16 actual hostile stack actors, derived from the
          # original 3 canonical Boss troop archetypes. The old expectation
          # of exactly 3 targetable enemies was obsolete after deployment V2.
          len(setup["enemies"])==16 and
          len(set(setup["enemies"]))==3,setup)
    for w,h in ((1280,720),(960,540)):
        d=pose(page,w,h,"joint-three-heroes-six-stacks")
        check(f"Six stacks keep 3 distinct hero owners at {w}x{h}",
              d["owners"]==[1,1,2,2,3,3],d["owners"])
    page.locator('[data-action="save-combat"]').click()
    before=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
      return {valid:E.strictSave(s),joint:s.battle.hg261Joint,
        owners:s.battle.allies.map(u=>u.heroId)};
    }""")
    page.reload(wait_until="load")
    after=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
      return {valid:E.strictSave(s),joint:s.battle?.hg261Joint,
        owners:s.battle?.allies.map(u=>u.heroId)};
    }""")
    check("Cold Save v07 restores joint 3x2 owner-bound battle",before==after and after["valid"],after)
    check("No uncaught Chromium JavaScript errors",not errors,errors)
    browser.close()
receipt={"status":"PASS" if all(c["pass"] for c in checks) else "FAIL",
    "checks":checks,"screenshots":images,"errors":errors,
    "html_sha256":hashlib.sha256(HTML.read_bytes()).hexdigest(),
    "fixture":"Two extra hero records only; paid AP, troop dispatch, six owner-bound allied and sixteen live Boss stacks use real engine"}
REPORT.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
print("HG28 PvE2 projection/joint Boss Chromium",len(checks),"/",len(checks),"PASS",flush=True)
