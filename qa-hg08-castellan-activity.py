"""Installed Chrome file:// acceptance for Castellan construction/research EXP."""
import hashlib
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent
HTML = ROOT / "Play-Heoofgaia-HG11.html"
EVIDENCE = ROOT / "docs" / "evidence" / "hg08"
QA = ROOT / "docs" / "qa" / "hg08"
EVIDENCE.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
SHOT = EVIDENCE / "castellan-activity-chrome.png"
REPORT = QA / "castellan-activity-chrome.json"
checks, errors = [], []

def check(name, passed, detail=""):
    checks.append({"name": name, "passed": bool(passed), "detail": detail})
    print(("PASS" if passed else "FAIL"), name, detail)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe", headless=True,
                                args=["--no-sandbox", "--disable-dev-shm-usage"])
    context = browser.new_context(viewport={"width": 1440, "height": 1100}, device_scale_factor=1)
    page = context.new_page()
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.goto(HTML.as_uri(), wait_until="load")
    check("Offline HTML has the requested game title", page.title() == "Anh Hùng Thời Loạn", page.title())
    page.locator('#app [data-action="start"]').click()
    prepared = page.evaluate("""(()=>{
      const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,C=HOG_CATALOG;
      s.buildings.hall=10;s.buildings.warehouse=10;s.buildings.heroTower=4;s.buildings.magicTower=10;
      for(const key of C.keys)s.res[key]=E.limits(s)[key];
      E.syncCityState(s);HOG_APP_DEBUG.save();HOG_APP_DEBUG.render();
      return {version:s.version,castellan:s.castellan,valid:E.strictSave(s),title:document.title};
    })()""")
    page.locator('#nav [data-tab="heroes"]').click()
    page.locator('#main [data-action="castellan"][data-id="1"]').click()
    appointed = page.evaluate("HOG_APP_DEBUG.getState().castellan")
    check("Live hero action appoints the Castellan", appointed == 1, str(appointed))
    page.locator('#nav [data-tab="city"]').click()
    page.locator('#main [data-action="building"][data-key="market"]').click()
    before_build = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,h=s.heroes.find(x=>x.id===1);
      const lifetime=x=>{let v=x.xp;for(let level=1;level<x.level;level++)v+=E.experienceToNext(level);return v};
      const cost=E.buildCost(s,'market');return {xp:lifetime(h),cost,expected:E.castellanExperienceFromResources(cost)*(1+E.heroTowerExperienceBonus(s)/100)};})()""")
    page.locator('#main [data-action="upgrade"][data-key="market"]').click()
    queued_build = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),h=s.heroes.find(x=>x.id===1),E=HOG_ENGINE;
      const lifetime=x=>{let v=x.xp;for(let level=1;level<x.level;level++)v+=E.experienceToNext(level);return v};
      return {queue:s.buildingQueue&&{...s.buildingQueue},xp:lifetime(h),valid:E.strictSave(s)};})()""")
    check("The real City upgrade button starts a paid construction queue with no early XP",
          prepared["version"] == 7 and queued_build["queue"] and queued_build["valid"] and queued_build["xp"] == before_build["xp"],
          json.dumps(queued_build, ensure_ascii=False))
    page.locator('#save').click()
    page.reload(wait_until="load")
    page.locator('#nav [data-tab="city"]').click()
    restored_build = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {version:s.version,queue:s.buildingQueue?.key,
      castellan:s.castellan,valid:HOG_ENGINE.strictSave(s),src49:document.querySelector('#main')?.innerText.includes('SRC49')};})()""")
    check("v07 Save/Reload retains the paid construction queue and assigned Castellan",
          restored_build["version"] == 7 and restored_build["queue"] == "market" and restored_build["castellan"] == 1 and restored_build["valid"],
          json.dumps(restored_build, ensure_ascii=False))
    page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),q=s.buildingQueue;HOG_ENGINE.tick(s,s.lastTick+q.remaining/s.speed*1000+1000);
      HOG_APP_DEBUG.save();HOG_APP_DEBUG.render();})()""")
    completed_build = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),h=s.heroes.find(x=>x.id===1),E=HOG_ENGINE;
      const lifetime=x=>{let v=x.xp;for(let level=1;level<x.level;level++)v+=E.experienceToNext(level);return v};
      return {level:s.buildings.market,queue:s.buildingQueue,gained:lifetime(h)-arguments[0],expected:arguments[1],
        log:s.log.slice(0,4),valid:E.strictSave(s)};})()""".replace("arguments[0]", str(before_build["xp"])).replace("arguments[1]", str(before_build["expected"])))
    build_pass = completed_build["level"] == 1 and completed_build["queue"] is None and completed_build["valid"] and abs(completed_build["gained"]-completed_build["expected"]) < 1e-7 and any("EXP khi làm Castellan" in line and "mô hình C" in line for line in completed_build["log"])
    check("Construction completion grants the modeled XP once and clears its real queue", build_pass,
          json.dumps(completed_build, ensure_ascii=False))
    page.locator('#nav [data-tab="magic"]').click()
    magic_text = page.locator("#main").inner_text()
    before_research = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,h=s.heroes.find(x=>x.id===1);
      const lifetime=x=>{let v=x.xp;for(let level=1;level<x.level;level++)v+=E.experienceToNext(level);return v};
      const cost=E.spellCost(s,'bootcamp');return {xp:lifetime(h),cost,expected:E.castellanExperienceFromResources(cost)*(1+E.heroTowerExperienceBonus(s)/100)};})()""")
    page.locator('#main [data-action="learn"][data-id="bootcamp"]').click()
    queued_research = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {key:s.researchQueue?.key,level:s.spells.bootcamp||0,
      valid:HOG_ENGINE.strictSave(s)};})()""")
    check("The real Military Research button starts Bootcamp research", queued_research["key"] == "bootcamp" and queued_research["level"] == 0 and queued_research["valid"],
          json.dumps(queued_research, ensure_ascii=False))
    check("Magic Tower UI discloses dated trigger and modeled XP formula", "SRC49" in magic_text and "mô hình C" in magic_text and "không phải công thức gốc" in magic_text,
          magic_text[magic_text.find("SRC49"):magic_text.find("SRC49")+300].replace("\n", " | "))
    page.locator('#save').click()
    page.reload(wait_until="load")
    page.locator('#nav [data-tab="magic"]').click()
    restored_research = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {version:s.version,key:s.researchQueue?.key,
      castellan:s.castellan,valid:HOG_ENGINE.strictSave(s)};})()""")
    check("v07 Save/Reload retains pending research without duplicating rewards", restored_research["version"] == 7 and restored_research["key"] == "bootcamp" and restored_research["castellan"] == 1 and restored_research["valid"],
          json.dumps(restored_research, ensure_ascii=False))
    page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),q=s.researchQueue;HOG_ENGINE.tick(s,s.lastTick+q.remaining/s.speed*1000+1000);
      HOG_APP_DEBUG.save();HOG_APP_DEBUG.render();})()""")
    completed_research = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),h=s.heroes.find(x=>x.id===1),E=HOG_ENGINE;
      const lifetime=x=>{let v=x.xp;for(let level=1;level<x.level;level++)v+=E.experienceToNext(level);return v};
      return {level:s.spells.bootcamp,queue:s.researchQueue,gained:lifetime(h)-arguments[0],expected:arguments[1],
        log:s.log.slice(0,4),valid:E.strictSave(s)};})()""".replace("arguments[0]", str(before_research["xp"])).replace("arguments[1]", str(before_research["expected"])))
    research_pass = completed_research["level"] == 1 and completed_research["queue"] is None and completed_research["valid"] and abs(completed_research["gained"]-completed_research["expected"]) < 1e-7 and any("EXP khi làm Castellan" in line and "mô hình C" in line for line in completed_research["log"])
    check("Research completion grants the modeled XP once and clears its real queue", research_pass,
          json.dumps(completed_research, ensure_ascii=False))
    page.locator('#nav [data-tab="heroes"]').click()
    page.screenshot(path=str(SHOT), full_page=True)
    final_state = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {version:s.version,castellan:s.castellan,
      hero:s.heroes.find(h=>h.id===1)?.name,xp:s.heroes.find(h=>h.id===1)?.xp,valid:HOG_ENGINE.strictSave(s)};})()""")
    check("Final playable state remains a valid v07 Save after both activities", final_state["version"] == 7 and final_state["castellan"] == 1 and final_state["valid"],
          json.dumps(final_state, ensure_ascii=False))
    check("No JavaScript exceptions during real offline UI actions, completion, or reload", not errors, "\n".join(errors))
    browser.close()

receipt = {"suite": "HG-08 Castellan construction and research activity EXP", "game": "Anh Hùng Thời Loạn",
           "browser": "Installed Chrome, actual file://", "source": "SRC49 (17173, 2009-12-28); SRC17 formula is an explicitly labeled C model",
           "fixtureDisclosure": "The QA fixture sets a high Town Hall, Warehouse, Hero Tower, Magic Tower and resources, then uses the actual UI buttons for Castellan appointment, construction and research. The real engine tick completes queues; pending v07 saves are reloaded between actions.",
           "htmlSha256": hashlib.sha256(HTML.read_bytes()).hexdigest().upper(), "checks": checks, "errors": errors,
           "screenshots": [str(SHOT.relative_to(ROOT))]}
REPORT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"CHROME TOTAL {sum(c['passed'] for c in checks)}/{len(checks)} PASS; JS exceptions={len(errors)}; HTML SHA256={receipt['htmlSha256']}")
if not all(c["passed"] for c in checks) or errors:
    raise SystemExit(1)
