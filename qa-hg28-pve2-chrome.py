"""HG28-PvE2: real oblique battlefield, boss silhouettes and 3 commanders x 2 stacks.
Chromium file:// screenshots, live battle source, canonical 12x9 cells, no fake rewards.
"""
from pathlib import Path
import hashlib
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
HTML=ROOT/"Play-Heoofgaia-HG11.html"
OUT=ROOT/"docs/evidence/hg28/pve2"
REPORT=ROOT/"docs/qa/hg28/pve2-oblique-chrome.json"
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
      const alive=layout.filter(q=>q.u.pool>0);
      const foes=alive.filter(q=>q.u.side==='enemy');
      const area=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*
                          Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
      let bossMax=0,bossOverlap=0;
      for(let i=0;i<foes.length;i++)for(let j=i+1;j<foes.length;j++){
        const x=foes[i].sprite,y=foes[j].sprite;
        const fraction=area(x,y)/Math.min(x.w*x.h,y.w*y.h);
        bossMax=Math.max(bossMax,fraction);
        bossOverlap+=fraction>0?1:0;
      }
      const labelConflicts=alive.flatMap(a=>alive.filter(b=>a!==b&&
          (area(a.label,b.label)>0||area(a.label,b.sprite)>0))).length;
      const corners=[camera.point(0,0),camera.point(12,0),
                     camera.point(0,9),camera.point(12,9)];
      const cells=P.battleGridCells(camera);
      const hitAll=alive.every(e=>P.battleHit(c,e.x,e.y,E,s)?.id===e.id);
      const cellsInvert=cells.every(e=>{const h=P.battleCellAt(c,e.center.x,e.center.y,E);
        return h?.x===e.x&&h?.y===e.y});
      return {valid:E.strictSave(s),inCombat:!!b,cols:camera.g.cols,rows:camera.g.rows,
        owners:alive.filter(e=>e.u.side==='player').map(e=>e.u.heroId),
        allUnits:alive.length,bossCount:foes.length,
        foeLabels:foes.map(e=>e.u.name),bossMax,bossOverlap,labelConflicts,
        bossCenters:foes.map(e=>({id:e.id,x:e.x,y:e.y})),
        staggerX:camera.row.x,staggerY:camera.col.y,
        cornersInside:corners.every(p=>p.x>=0&&p.x<=c.width&&p.y>=0&&p.y<=c.height),
        cellsInvert,hitAll,aspect:Math.abs(c.width/r.width-c.height/r.height),
        overflow:document.documentElement.scrollWidth>innerWidth+1,
        canvas:{width:c.width,height:c.height},
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
    check(key+" uses correct reversible 2.5D grid",d["inCombat"] and d["valid"] and
          d["cols"]==12 and d["rows"]==9 and d["cellsInvert"] and d["cornersInside"] and
          d["staggerX"]>d["canvas"]["width"]*.02 and d["staggerY"]<0,d)
    check(key+" keeps image and pointer aligned",d["hitAll"] and d["aspect"]<.008 and
          not d["overflow"],d)
    check(key+" keeps three live Boss silhouettes individually readable",
          d["bossCount"]==3 and d["bossMax"]<=.16 and d["bossSpriteInside"] and
          d["labelConflicts"]==0,d)
    capture(page,f"{title}-{width}x{height}.png")
    return d

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=[
        "--no-sandbox","--disable-dev-shm-usage","--allow-file-access-from-files"])
    page=browser.new_page(viewport={"width":1280,"height":720})
    page.set_default_timeout(11000)
    page.on("pageerror",lambda e:errors.append(str(e)))
    start(page)
    encounter=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
      s.army.human_1=16;E.setFormation(s,[{unitId:'human_1',count:16}]);
      const azrael=E.TILES.find(t=>t.kind==='npc'&&t.value==='Azrael');
      if(!azrael)throw new Error('Azrael 3-Boss NPC is missing');
      E.startMarch(s,azrael.key);
      E.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);
      HOG_APP_DEBUG.render();
      return {valid:E.strictSave(s),enemies:s.battle?.enemies.map(u=>u.name)};
    }""")
    check("Actual map march enters canonical Azrael 3-Boss combat",
          encounter["valid"] and encounter["enemies"]==
          ["Azrael","Demonlord Samurai","Cyclop Tyrant"],encounter)
    for w,h in ((1280,720),(960,540)):
        pose(page,w,h,"boss-three")
        # Click the first visible Boss by its real nameplate, not by a forced
        # debug state change or a centered invisible grid coordinate.
        point=page.evaluate("""() => {
          const c=document.getElementById('battle-canvas'),r=c.getBoundingClientRect(),
            P=HOG_PAINTER,E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),
            layout=P.battleUnitLayout(s.battle,P.battleProjection(c,E),c.width,c.height),
            e=layout.find(q=>q.u.side==='enemy');
          const x=e.label.x+e.label.w*.5,y=e.label.y+e.label.h*.5;
          return {id:e.id,x:r.left+x/c.width*r.width,y:r.top+y/c.height*r.height};
        }""")
        page.mouse.click(point["x"],point["y"])
        check(f"Actual pointer selects first boss {w}x{h}",
              page.evaluate("HOG_APP_DEBUG.getState().battle?.focused")==point["id"])
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
          setup["heroes"]==[1,1,2,2,3,3] and len(setup["enemies"])==3,setup)
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
    "fixture":"Two extra hero records only; paid AP, troop dispatch and 3 Boss fight use real engine"}
REPORT.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
print("HG28 PvE2 projection/joint Boss Chromium",len(checks),"/",len(checks),"PASS",flush=True)
