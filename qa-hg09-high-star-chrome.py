"""Real Chrome acceptance of source-coordinate 5-star NPC gameplay and XP."""
import hashlib
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent
HTML = ROOT / "Play-Heoofgaia-HG11.html"
EVIDENCE = ROOT / "docs" / "evidence" / "hg09"
QA = ROOT / "docs" / "qa" / "hg09"
BATTLE_SHOT = EVIDENCE / "npc-five-star-battle-chrome.png"
HERO_SHOT = EVIDENCE / "npc-five-star-xp-chrome.png"
REPORT = QA / "npc-five-star-sites-chrome.json"
EVIDENCE.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
checks = []
errors = []


def check(name, passed, detail=""):
    checks.append({"name": name, "passed": bool(passed), "detail": detail})
    print(("PASS" if passed else "FAIL"), name, detail)


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        args=["--no-sandbox", "--disable-dev-shm-usage"],
    )
    page = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.goto(HTML.as_uri(), wait_until="load")
    check("Offline page opens under Anh Hùng Thời Loạn", page.title().startswith("Anh Hùng Thời Loạn"), page.title())
    page.locator('[data-action="start"]').click()
    seeded = page.evaluate("""(()=>{
      const s=HOG_APP_DEBUG.getState(),h=s.heroes.find(x=>x.id===s.activeHero);
      // Deterministic QA fixture only. The target selection, march, battle,
      // XP settlement and Save/Reload still run through the actual game UI/engine.
      s.buildings.heroTower=10;h.level=50;h.xp=0;h.atk=100;h.spd=100;
      s.army.human_3=5000;HOG_ENGINE.setFormation(s,[{unitId:'human_3',count:5000}]);
      HOG_APP_DEBUG.render();
      return {version:s.version,force:HOG_ENGINE.troopValue(s),camps:HOG_ENGINE.NPC_CAMPS_2009.filter(q=>q.stars>=5).length};
    })()""")
    check("QA fixture retains v07 and exposes all 33 sourced high-star sites",
          seeded == {"version": 7, "force": 1250000, "camps": 33}, json.dumps(seeded, ensure_ascii=False))
    site = page.locator('[data-action="select"][data-key="98,27"]')
    check("5-star camp at (98,27) is directly selectable from the world panel", site.count() == 1, site.inner_text() if site.count() else "missing")
    site.click()
    info = page.locator("#main").inner_text()
    check("Selected camp reports its dated star and force guidance", "5★" in info and "150.000" in info and "300.000" in info and "roster NPC gốc" in info,
          info[:500].replace("\n", " | "))
    march = page.locator('[data-action="march"]')
    check("Selected source-coordinate 5-star camp enables real March", march.is_enabled(), march.inner_text())
    ap_before = page.evaluate("HOG_APP_DEBUG.getState().ap")
    march.click()
    dispatch = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {target:s.march?.target,phase:s.march?.phase,army:s.expedition?.army.human_3,ap:s.ap,valid:HOG_ENGINE.strictSave(s)}})()""")
    check("March sends the formation to (98,27) and applies the existing NPC AP price",
          dispatch == {"target": "98,27", "phase": "outbound", "army": 5000, "ap": ap_before - 8, "valid": True},
          json.dumps(dispatch, ensure_ascii=False))
    page.locator("#save").click()
    page.reload(wait_until="load")
    restored_march = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {version:s.version,target:s.march?.target,army:s.expedition?.army.human_3,valid:HOG_ENGINE.strictSave(s)}})()""")
    check("v07 Save/Reload preserves the exact high-star outbound target and dispatched army",
          restored_march == {"version": 7, "target": "98,27", "army": 5000, "valid": True},
          json.dumps(restored_march, ensure_ascii=False))
    page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();HOG_ENGINE.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);HOG_APP_DEBUG.render()})()""")
    opened = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),b=s.battle;return {tab:HOG_APP_DEBUG.getTab?.(),target:b?.target,kind:b?.kind,star:b?.level,allies:b?.allies?.[0]?.count,enemies:b?.enemies?.length,valid:HOG_ENGINE.strictSave(s)}})()""")
    check("Travel tick opens a real five-star tactical encounter from the historical map tile",
          opened.get("target") == "98,27" and opened.get("kind") == "npc" and opened.get("star") == 5 and opened.get("allies") == 5000 and opened.get("enemies", 0) >= 3 and opened.get("valid"),
          json.dumps(opened, ensure_ascii=False))
    check("Real tactical UI labels the live encounter as five-star", "5★" in page.locator("#main").inner_text() and "Quái vật" in page.locator("#main").inner_text(),
          page.locator("#main").inner_text()[:330].replace("\n", " | "))
    page.screenshot(path=str(BATTLE_SHOT), full_page=True)
    turns = 0
    while page.evaluate("!!HOG_APP_DEBUG.getState().battle") and turns < 70:
        page.locator('[data-action="battle"][data-cmd="attack"]').click()
        turns += 1
    won = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),h=s.heroes.find(x=>x.id===s.activeHero);return {battle:!!s.battle,xp:h.xp,cleared:s.cleared.includes('98,27'),award:s.log.find(x=>x.includes('SRC45')),version:s.version,valid:HOG_ENGINE.strictSave(s)}})()""")
    check("Actual Attack turn wins the five-star battle and settles 4,000 × Hero Tower 1.10 = 4,400 XP",
          not won["battle"] and won["xp"] == 4400 and won["cleared"] and "4.400 EXP" in (won["award"] or "") and won["version"] == 7 and won["valid"],
          json.dumps({**won, "attackTurns": turns}, ensure_ascii=False))
    check("Battle receipt names SRC45 while the site location/force source remains SRC46",
          "(SRC45)" in (won["award"] or "") and page.evaluate("HOG_ENGINE.getTile('98,27').source") == "SRC46",
          json.dumps({"award": won["award"], "siteSource": page.evaluate("HOG_ENGINE.getTile('98,27').source")}, ensure_ascii=False))
    page.locator('#nav [data-tab="heroes"]').click()
    page.screenshot(path=str(HERO_SHOT), full_page=True)
    page.locator("#save").click()
    page.reload(wait_until="load")
    page.locator('#nav [data-tab="heroes"]').click()
    restored_xp = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),h=s.heroes.find(x=>x.id===s.activeHero);return {version:s.version,xp:h.xp,tower:s.buildings.heroTower,valid:HOG_ENGINE.strictSave(s)}})()""")
    check("v07 Save/Reload preserves the source-backed five-star award", restored_xp == {"version": 7, "xp": 4400, "tower": 10, "valid": True},
          json.dumps(restored_xp, ensure_ascii=False))
    check("No JavaScript exceptions during 5-star selection, dispatch, battle and reload", not errors, "; ".join(errors))
    browser.close()

passed = sum(item["passed"] for item in checks)
receipt = {
    "suite": "HG-09 five-star NPC site and XP",
    "source": "Installed Google Chrome opening the exact offline standalone HTML with file://. QA seeds only hero/tower/army values; high-star site selection, March action/AP, v07 persistence, travel tick, NPC battle, Attack action, source reward and reload use the game UI/runtime. Enemy roster and battle stats remain modeled and are not validated against original data.",
    "total": len(checks),
    "passed": passed,
    "failed": len(checks) - passed,
    "errors": errors,
    "checks": checks,
    "screenshots": [
        {"path": str(path.relative_to(ROOT)).replace("\\", "/"), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
        for path in [BATTLE_SHOT, HERO_SHOT] if path.exists()
    ],
}
REPORT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"BROWSER TOTAL {passed}/{len(checks)} PASS; JS exceptions={len(errors)}")
if passed != len(checks):
    raise SystemExit(1)
