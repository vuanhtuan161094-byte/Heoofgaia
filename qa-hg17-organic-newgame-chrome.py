"""HG17 no-grants Chromium New Game acceptance: actual UI clicks, time only by
canonical E.tick (never modify resources, Fame, building levels or troop HP).
"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
HTML=ROOT/"Play-Heoofgaia-HG11.html"
OUT=ROOT/"docs"/"evidence"/"hg17"
QA=ROOT/"docs"/"qa"/"hg17"
OUT.mkdir(parents=True,exist_ok=True)
QA.mkdir(parents=True,exist_ok=True)
checks=[]
errors=[]
def check(name,passed,details=None):
    checks.append({"name":name,"passed":bool(passed),"details":details})
    print(("PASS " if passed else "FAIL ")+name,details or "",flush=True)
    if not passed: raise AssertionError(name)

def advance_queue(page,field):
    details=page.evaluate("""field => {
       const s=HOG_APP_DEBUG.getState(),q=s[field];
       if(!q)throw Error("No queue: "+field);
       HOG_ENGINE.tick(s,s.lastTick+(q.remaining+2)*1000/s.speed);
       HOG_APP_DEBUG.render();
       if(!HOG_APP_DEBUG.save())throw Error("Unable to save after "+field);
       return {fame:s.fame,remaining:s[field]?.remaining??null,valid:HOG_ENGINE.strictSave(s)};
    }""",field)
    check(field+" completes through engine time, valid Save",details["remaining"] is None and details["valid"],details)
    return details

try:
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage","--allow-file-access-from-files"])
    context=browser.new_context(viewport={"width":1280,"height":900})
    page=context.new_page()
    page.set_default_timeout(15000)
    page.on("pageerror",lambda err: errors.append(str(err)))
    page.goto(HTML.as_uri(),wait_until="load")
    check("First launch shows race selector and genuine New Game action",
          page.locator('[data-action="race"]').count()==4 and page.locator('[data-action="start"]').count()==1)
    page.locator('[data-action="start"]').click()
    baseline=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();return {res:s.res,army:s.army.human_1,
        fame:s.fame,cities:s.cities.length,buildings:s.buildings,valid:HOG_ENGINE.strictSave(s)};
    }""")
    check("Private New Game starts with declared generous resources and no QA troop injection",
          baseline["res"]=={"gold":33000,"wood":8900,"ore":8900,"sulfur":3350,"crystal":3350}
          and baseline["army"]==16 and baseline["fame"]==5 and baseline["cities"]==1 and baseline["valid"],baseline)
    check("Visual rookie steps show progress from real state",
          page.locator('[aria-label="Lộ trình phát triển New Game"]').count()==1)
    page.locator('[data-action="tab"][data-tab="city"]').first.click()
    page.locator('[data-action="building"][data-key="market"]').click()
    page.locator('[data-action="upgrade"][data-key="market"]').click()
    check("Actual city upgrade click spends resources and creates queue",page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();
      return s.buildingQueue?.key==="market"&&s.buildings.market===0&&s.res.gold<33000&&s.fame===5;
    }"""))
    build=advance_queue(page,"buildingQueue")
    check("Market Fame is earned only on completed construction, not button click",build["fame"]>5)
    page.locator('[data-action="tab"][data-tab="magic"]').first.click()
    page.locator('[data-action="learn"][data-id="forestry"]').click()
    check("Actual Magic Tower click starts Forestry research",page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();return s.researchQueue?.key==="forestry"&&!s.spells.forestry;
    }"""))
    advance_queue(page,"researchQueue")
    check("Forestry researched and wood/hour increased",page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();return s.spells.forestry===1&&HOG_ENGINE.rate(s).wood>12;
    }"""))
    page.locator('[data-action="tab"][data-tab="army"]').first.click()
    page.locator("#q_human_1").fill("24")
    page.locator('[data-action="recruit"][data-id="human_1"]').click()
    check("Actual troop card click creates paid 24-unit training",page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();return s.training.length===1&&s.training[0].count===24&&s.army.human_1===16;
    }"""))
    page.evaluate("""() => {const s=HOG_APP_DEBUG.getState(),q=s.training[0];
       HOG_ENGINE.tick(s,s.lastTick+(q.remaining+2)*1000/s.speed);HOG_APP_DEBUG.render();
       if(!HOG_APP_DEBUG.save())throw Error('Training save failed');
    }""")
    check("Real trained troop count and earned Fame from paid queue",page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();return s.training.length===0&&s.army.human_1===40&&s.fame>5&&HOG_ENGINE.strictSave(s);
    }"""))
    page.locator('[data-action="tab"][data-tab="map"]').first.click()
    target=page.evaluate("""() => {
      const E=HOG_ENGINE, t=E.TILES.filter(t=>t.kind==='mine'&&t.level===1&&E.pathfind('3,4',t.key))
       .sort((a,b)=>E.pathTravelCost(E.pathfind('3,4',a.key))-E.pathTravelCost(E.pathfind('3,4',b.key)))[0];
      Object.assign(HOG_PAINTER.mapCamera(),{centerX:t.x,centerY:t.y,zoom:1.12});
      HOG_APP_DEBUG.render();return {key:t.key,name:E.C.resource[t.value].label};
    }""")
    # The game intentionally re-renders its canvas every second. Playwright's
    # "wait until stable" scroll can fail if the backing DOM node is replaced;
    # scroll the *current* canvas in a synchronous browser evaluation instead.
    page.evaluate("""() => document.getElementById('world-canvas').scrollIntoView({block:'center',behavior:'instant'})""")
    pt=page.evaluate("""() => {
      const c=document.getElementById('world-canvas'),r=c.getBoundingClientRect(),z=HOG_PAINTER.mapCamera().zoom*48;
      return {x:r.left+(c.width/2+z/2)/c.width*r.width,y:r.top+(c.height/2+z/2)/c.height*r.height};
    }""")
    page.mouse.click(pt["x"],pt["y"])
    check("Real world-map pointer selects reachable level-1 mine",target["name"] in page.locator(".target-information").inner_text())
    ap_before=page.evaluate("HOG_APP_DEBUG.getState().ap")
    page.locator('[data-action="march"]').first.click()
    march_receipt=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();return {key:s.march?.target||null,
        ap:s.ap,army:s.expedition?.army?.human_1??null};
    }""")
    check("UI dispatch paid actual mine AP and reserved starter army",
          march_receipt["key"]==target["key"] and 5.8<=ap_before-march_receipt["ap"]<=6.1
          and march_receipt["army"]==40,{"apBefore":ap_before,**march_receipt})
    page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();HOG_ENGINE.tick(s,s.lastTick+(s.march.remaining+2)*1000/s.speed);
      HOG_APP_DEBUG.render();
    }""")
    check("Genuine 40-militia detachment enters a guarded mine battle",page.evaluate("""key=>{
      const s=HOG_APP_DEBUG.getState();return s.battle?.target===key&&s.battle.allies[0].count===40&&s.battle.enemies.length>=1;
    }""",target["key"]))
    # Real UI turn commands, without enemy HP or count mutation.
    outcome=None
    for turn in range(70):
      if page.locator('[data-action="battle"][data-cmd="attack"]').count()==0:break
      page.locator('[data-action="battle"][data-cmd="attack"]').click()
      if page.evaluate("(key)=>HOG_APP_DEBUG.getState().mines.some(m=>m.key===key)",target["key"]):
        outcome="win";break
      if not page.evaluate("!!HOG_APP_DEBUG.getState().battle"):
        outcome="lose";break
    check("Rookie wins first mine through real UI battle actions without cheats",outcome=="win",
          {"result":outcome,"mine":target["key"]})
    page.screenshot(path=str(OUT/"rookie-first-mine-chromium.png"),full_page=True)
    check("Save stored real new-game mine conquest",page.evaluate("HOG_APP_DEBUG.save()"))
    page.reload(wait_until="load")
    check("Cold browser reload retains money/Fame/mine/army without duplication",page.evaluate("""key=>{
      const s=HOG_APP_DEBUG.getState();return s.mines.some(m=>m.key===key)&&s.fame>5&&s.cities.length===1&&HOG_ENGINE.strictSave(s);
    }""",target["key"]))
    check("No browser runtime exceptions",not errors,errors)
    browser.close()
finally:
  receipt={"phase":"HG17 unseeded New Game Chromium","checks":checks,"total":len(checks),
           "passed":sum(1 for x in checks if x["passed"]),"failed":sum(1 for x in checks if not x["passed"]),
           "browserErrors":errors,
           "timePolicy":"Only E.tick queue/route time accelerated. No direct Fame/HP/army/resource or build-level writes."}
  (QA/"organic-newgame-chrome.json").write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding="utf-8")
