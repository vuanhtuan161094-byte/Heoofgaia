"""Acceptance: Fandom Hero Tasks from actual offline HTML, real click-to-combat and v07 reload."""
from pathlib import Path
import json, hashlib, sys
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
    browser=pw.chromium.launch(headless=True,args=["--no-sandbox","--disable-dev-shm-usage","--allow-file-access-from-files"])
    page=browser.new_page(viewport={"width":1280,"height":720})
    page.on("pageerror",lambda error:errors.append(str(error)))
    page.set_default_timeout(15000)
    page.goto(HTML.as_uri(),wait_until="load")
    page.locator('[data-action="start"]').click()
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
    before_ap=page.evaluate("HOG_APP_DEBUG.getState().ap")
    page.locator('[data-action="march"]').click()
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
    page.set_viewport_size({"width":960,"height":540})
    landscape=OUT/"hero-task-landscape-chrome.png"
    page.screenshot(path=str(landscape),full_page=False)
    check("Task UI fits landscape width",page.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1"))
    check("No JavaScript page exceptions",len(errors)==0)
    browser.close()

report={"passed":sum(x["passed"] for x in checks),"total":len(checks),"checks":checks,
        "errors":errors,"htmlSha256":hashlib.sha256(HTML.read_bytes()).hexdigest().upper(),
        "screenshots":[str(desktop.relative_to(ROOT)),str(landscape.relative_to(ROOT))]}
(QA/"hero-task-chrome.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
print(f"HERO TASK FILE CHROME {report['passed']}/{report['total']} PASS",flush=True)
raise SystemExit(0 if report["passed"]==report["total"] else 1)
