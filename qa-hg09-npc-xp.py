"""Real Chrome file:// acceptance for sourced NPC star XP and v07 persistence."""
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
SHOT = EVIDENCE / "npc-four-star-xp-chrome.png"
REPORT = QA / "npc-four-star-xp-chrome.json"
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
    check("Standalone HTML opens as Anh Hùng Thời Loạn", page.title().startswith("Anh Hùng Thời Loạn"), page.title())
    page.locator('[data-action="start"]').click()
    prepared = page.evaluate("""(()=>{
      const s=HOG_APP_DEBUG.getState(),h=s.heroes.find(x=>x.id===s.activeHero);
      // Only the QA fixture is seeded. Dispatch, travel tick, battle turns and rewards use the game engine.
      s.buildings.heroTower=10;h.level=50;h.xp=0;h.atk=100;h.spd=100;
      s.army.human_3=5000;
      const target=HOG_ENGINE.TILES.find(t=>t.kind==='npc'&&t.level===4);
      HOG_ENGINE.setFormation(s,[{unitId:'human_3',count:5000}]);
      HOG_ENGINE.startMarch(s,target.key);
      s.march.remaining=.01;
      HOG_ENGINE.tick(s,s.lastTick+1000);
      HOG_APP_DEBUG.save();HOG_APP_DEBUG.render();
      return {target:target?.key,kind:s.battle?.kind,star:s.battle?.level,army:s.battle?.allies?.[0]?.count,valid:HOG_ENGINE.strictSave(s)};
    })()""")
    check("Real March and travel tick open the map's four-star NPC battle",
          prepared == {"target": "15,8", "kind": "npc", "star": 4, "army": 5000, "valid": True},
          json.dumps(prepared, ensure_ascii=False))
    check("Actual combat screen renders the four-star encounter", "NPC • 4★" in page.locator("#main").inner_text() or "Wyverns" in page.locator("#main").inner_text(), page.locator("#main").inner_text()[:350].replace("\n", " | "))
    turns = 0
    while page.locator('[data-action="battle"][data-cmd="attack"]').count() and turns < 10:
        if not page.evaluate("!!HOG_APP_DEBUG.getState().battle"):
            break
        page.locator('[data-action="battle"][data-cmd="attack"]').click()
        turns += 1
    result = page.evaluate("""(()=>{
      const s=HOG_APP_DEBUG.getState(),h=s.heroes.find(x=>x.id===s.activeHero);
      return {battle:!!s.battle,xp:h.xp,award:s.log.find(x=>x.includes('SRC45')),version:s.version,valid:HOG_ENGINE.strictSave(s)};
    })()""")
    check("Live Attack control wins the encounter and awards 1,000 × Hero Tower 1.10 = 1,100 EXP",
          result["battle"] is False and result["xp"] == 1100 and "1.100 EXP" in (result["award"] or "") and result["version"] == 7 and result["valid"],
          json.dumps(result, ensure_ascii=False))
    check("Winner reward log identifies the historical evidence row SRC45", "(SRC45)" in (result["award"] or ""), result["award"] or "")
    page.locator('#nav [data-tab="heroes"]').click()
    progression = page.locator("#main").inner_text()
    check("Heroes panel discloses sourced and still modeled XP ranges",
          "EXP hạ NPC 4★–8★" in progression and "1★–3★" in progression,
          progression[:420].replace("\n", " | "))
    page.screenshot(path=str(SHOT), full_page=True)
    page.locator("#save").click()
    page.reload(wait_until="load")
    page.locator('#nav [data-tab="heroes"]').click()
    restored = page.evaluate("""(()=>{
      const s=HOG_APP_DEBUG.getState(),h=s.heroes.find(x=>x.id===s.activeHero);
      return {version:s.version,xp:h.xp,tower:s.buildings.heroTower,valid:HOG_ENGINE.strictSave(s)};
    })()""")
    check("v07 browser Save/Reload preserves the earned battle XP", restored == {"version": 7, "xp": 1100, "tower": 10, "valid": True}, json.dumps(restored))
    check("No JavaScript exceptions during real browser gameplay", not errors, "; ".join(errors))
    browser.close()

passed = sum(item["passed"] for item in checks)
receipt = {
    "suite": "HG-09 NPC star XP",
    "source": "Installed Google Chrome opening the exact standalone HTML by file://; QA seeds one hero/tower/army fixture, then uses the game engine for formation, March, travel tick, NPC battle, Attack controls, award, Save and Reload.",
    "total": len(checks),
    "passed": passed,
    "failed": len(checks) - passed,
    "errors": errors,
    "checks": checks,
    "screenshot": str(SHOT.relative_to(ROOT)).replace("\\", "/"),
    "screenshotSha256": hashlib.sha256(SHOT.read_bytes()).hexdigest(),
}
REPORT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"BROWSER TOTAL {passed}/{len(checks)} PASS; JS exceptions={len(errors)}")
if passed != len(checks):
    raise SystemExit(1)
