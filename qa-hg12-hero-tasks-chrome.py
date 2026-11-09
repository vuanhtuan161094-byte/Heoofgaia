"""Acceptance: Fandom Hero Tasks from actual offline HTML, real click-to-combat and v07 reload."""
from pathlib import Path
import json, hashlib, sys, os
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
ROOT=Path(__file__).resolve().parent
HTML=ROOT/"Play-Heoofgaia-HG11.html"
OUT=ROOT/"docs"/"evidence"/"hg12"
QA=ROOT/"docs"/"qa"/"hg12"
OUT.mkdir(parents=True,exist_ok=True)
QA.mkdir(parents=True,exist_ok=True)
checks=[]
errors=[]
def check(title,value):
    result=bool(value)
    checks.append({"name":title,"passed":result})
    print(("PASS " if result else "FAIL ")+title,flush=True)

with sync_playwright() as pw:
    launch={"headless":True,"args":["--no-sandbox","--disable-dev-shm-usage","--allow-file-access-from-files"]}
    if os.environ.get("HOG_CHROME_PATH"):launch["executable_path"]=os.environ["HOG_CHROME_PATH"]
    browser=pw.chromium.launch(**launch)
    page=browser.new_page(viewport={"width":1280,"height":720})
    page.on("pageerror",lambda error:errors.append(str(error)))
    page.set_default_timeout(15000)
    page.goto(HTML.as_uri(),wait_until="load")
    page.locator('[data-action="start"]').click()
    quickstart_drawer=page.locator('.hg39-map-dock .hg39-map-details').filter(has_text="Tác vụ nhanh")
    check("Playable world exposes the compact quickstart drawer",quickstart_drawer.is_visible())
    quickstart_drawer.locator("summary").click()
    check("Three-action quickstart opens in the real map dock",page.locator(".quickstart-strip").is_visible())
    page.wait_for_timeout(1200)
    check("Expanded quickstart survives the normal game-tick rerender",
          quickstart_drawer.evaluate("el=>el.open") and page.locator(".quickstart-strip").is_visible())
    check("Starter has no explicit formation before guided action",page.evaluate("HOG_APP_DEBUG.getState().formation.length===0"))
    page.locator('.quickstart-strip [data-action="autoformation"]').click()
    formed=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
      return {groups:s.formation.length,points:E.troopValue(s),
       limit:E.heroLimit(s.heroes.find(h=>h.id===s.activeHero).level),valid:E.strictSave(s)};
    }""")
    check("Quickstart button saves legal army under hero capacity",formed["groups"]>0 and formed["points"]<=formed["limit"] and formed["valid"])
    page.reload(wait_until="load")
    check("Cold reload keeps smart formation while troops are still in castle",
          page.evaluate("HOG_APP_DEBUG.getState().formation.length>0"))
    # HG41 fields six real NPC stacks at 1-star. Starter 16 Spear Militia
    # can legitimately lose. Recruit using actual paid UI before accepting
    # the Hero Task; never mint soldier counts/loot or downgrade PvE.
    page.locator('#nav [data-tab="army"]').click()
    speed_tools=page.locator('.hg42-screen-tool-menu')
    if not speed_tools.evaluate('el=>el.open'):speed_tools.locator('summary').click()
    speed_tools.locator('#speed').click()
    check('HG41 paid Hero Task recruiting uses real 1x control to observe the queue',
          page.evaluate('HOG_APP_DEBUG.getState().speed===1'))
    prebuy=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();
      return {gold:s.res.gold,army:s.army.human_1,save:HOG_ENGINE.strictSave(s)};
    }""")
    page.locator('.game-window-body #q_human_1').fill('45')
    page.locator('.game-window-body [data-action="recruit"][data-id="human_1"]').click()
    receipt=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),q=s.training.find(q=>q.unitId==='human_1');
      return {gold:s.res.gold,count:q?.count,remaining:q?.remaining,save:HOG_ENGINE.strictSave(s)};
    }""")
    check("HG41 Hero Task preparation charges real gold and queues 45 troops",
          prebuy["army"]==16 and receipt["gold"]<prebuy["gold"] and
          receipt["count"]==45 and receipt["save"])
    supplied=page.evaluate("""() => {
      const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),q=s.training.find(q=>q.unitId==='human_1');
      if(!q)throw Error('Paid Hero Task recruitment queue was lost');
      E.tick(s,s.lastTick+(q.remaining+2)*1000/s.speed);HOG_APP_DEBUG.render();
      return {troops:s.army.human_1,pending:s.training.length,valid:E.strictSave(s)};
    }""")
    check("HG41 paid Hero Task squad receives 61 troops exactly once",
          supplied["troops"]==61 and supplied["pending"]==0 and supplied["valid"])
    page.locator('.game-window-body [data-action="autoformation"]').click()
    roster=page.evaluate("""() => {
      const E=HOG_ENGINE,s=HOG_APP_DEBUG.getState(),p=E.hg20HeroPlan(s,s.activeHero);
      return {troops:p.reduce((n,g)=>n+g.count,0),garrison:s.army.human_1,
        valid:E.strictSave(s)};
    }""")
    check("HG41 real auto-formation assigns only paid and owned troops",
          roster["troops"]==61 and roster["garrison"]==61 and roster["valid"])
    page.locator('#nav [data-tab="map"]').click()
    quickstart_drawer=page.locator('.hg39-map-dock .hg39-map-details').filter(has_text="Tác vụ nhanh")
    if not quickstart_drawer.evaluate("el=>el.open"):quickstart_drawer.locator("summary").click()
    page.locator('.quickstart-strip [data-action="findnpc"]').click()
    check("Quickstart selects actual NPC level 1 without dispatching","1★" in page.locator(".target-information h2").inner_text() and page.evaluate("HOG_APP_DEBUG.getState().march===null"))
    quickshot=OUT/"hero-task-quickstart-desktop-chrome.png"
    page.screenshot(path=str(quickshot),full_page=False)
    page.locator('#nav [data-tab="tasks"]').click()
    initial=page.evaluate("HOG_ENGINE.heroTaskStatus(HOG_APP_DEBUG.getState())")
    check("Hero Task accept button shown in task UI",page.locator('[data-action="acceptherotask"]').is_visible())
    check("First mission is 1-star for 1200 EXP",initial["stars"]==1 and initial["exp"]==1200)
    page.locator('[data-action="acceptherotask"]').click()
    accepted=page.evaluate("HOG_ENGINE.heroTaskStatus(HOG_APP_DEBUG.getState())")
    check("UI accepts task for selected hero",accepted["active"] is not None and accepted["active"]["heroId"]==initial["heroId"])
    page.locator('[data-action="findherotask"]').click()
    check("Find target opens playable world map",page.locator("#world-canvas").is_visible())
    check("World target panel selects NPC camp","Trại" in page.locator(".target-information h2").inner_text())
    dispatch_button=page.locator('.hg39-map-target [data-action="dispatch-open"]')
    check("Hero-task target enables the actual dispatch planner",dispatch_button.is_enabled())
    before_ap=page.evaluate("HOG_APP_DEBUG.getState().ap")
    dispatch_button.click()
    page.locator(".hg39-dispatch").wait_for(state="visible")
    page.locator('[data-action="dispatch-auto"]').click()
    confirm=page.locator('[data-action="dispatch-confirm"]')
    confirm.wait_for(state="visible")
    if not confirm.is_enabled():raise AssertionError("Hero-task NPC did not produce a valid army formation")
    confirm.click()
    dispatch=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),tile=HOG_ENGINE.getTile(s.march?.target);
      return {ap:s.ap,kind:tile?.kind,stars:tile?.level};
    }""")
    check("NPC dispatch uses real AP",dispatch["ap"]<before_ap and dispatch["kind"]=="npc" and dispatch["stars"]==1)
    battle=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState();
      HOG_ENGINE.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);
      HOG_APP_DEBUG.render();
      return !!s.battle;
    }""")
    check("Real march enters tactical combat",battle)
    verdict=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE;
      let result=null,turns=0;
      while(s.battle&&turns++<50)result=E.battleAct(s,'attack').type;
      const status=E.heroTaskStatus(s,s.lastTick),saved=HOG_APP_DEBUG.save();
      HOG_APP_DEBUG.render();
      return {result,turns,ready:status.active?.ready,saved};
    }""")
    check("Real NPC win completes same hero task",verdict["result"]=="win" and verdict["ready"])
    check("Combat and quest progress save in v07",verdict["saved"])
    page.locator('#nav [data-tab="tasks"]').click()
    check("Reward claim button appears after real victory",page.locator('[data-action="claimherotask"]').is_visible())
    page.locator('[data-action="claimherotask"]').click()
    completed=page.evaluate("""() => {
      const s=HOG_APP_DEBUG.getState(),q=HOG_ENGINE.heroTaskStatus(s);
      return {completed:q.completed,next:q.exp,active:q.active,valid:HOG_ENGINE.strictSave(s)};
    }""")
    check("Claim advances to second mission exactly once",completed["completed"]==1 and completed["next"]==1300 and completed["active"] is None)
    check("Claimed state passes strict Save validator",completed["valid"])
    desktop=OUT/"hero-task-desktop-chrome.png"
    page.screenshot(path=str(desktop),full_page=False)
    page.reload(wait_until="load")
    page.locator('#nav [data-tab="tasks"]').click()
    check("Cold reload preserves first claimed task",page.evaluate("HOG_ENGINE.heroTaskStatus(HOG_APP_DEBUG.getState()).completed===1"))
    check("Cold reload keeps deployed army out of castle formation",
          page.evaluate("HOG_APP_DEBUG.getState().formation.length===0"))
    page.set_viewport_size({"width":960,"height":540})
    page.locator('#nav [data-tab="map"]').click()
    quickstart_drawer=page.locator('.hg39-map-dock .hg39-map-details').filter(has_text="Tác vụ nhanh")
    if not quickstart_drawer.evaluate("el=>el.open"):quickstart_drawer.locator("summary").click()
    check("Compact quickstart exposes three working buttons at landscape width",page.locator(".quickstart-actions button:visible").count()==3 and page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
    landscape=OUT/"hero-task-landscape-chrome.png"
    page.screenshot(path=str(landscape),full_page=False)
    check("Task UI fits landscape width",page.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"))
    check("No JavaScript page exceptions",len(errors)==0)
    browser.close()

report={"passed":sum(x["passed"] for x in checks),"total":len(checks),"checks":checks,
        "errors":errors,"htmlSha256":hashlib.sha256(HTML.read_bytes()).hexdigest().upper(),
        "screenshots":[str(quickshot.relative_to(ROOT)),str(desktop.relative_to(ROOT)),str(landscape.relative_to(ROOT))]}
(QA/"hero-task-chrome.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
print(f"HERO TASK FILE CHROME {report['passed']}/{report['total']} PASS",flush=True)
raise SystemExit(0 if report["passed"]==report["total"] else 1)
