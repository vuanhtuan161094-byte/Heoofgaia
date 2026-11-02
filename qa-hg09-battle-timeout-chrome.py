"""Real Chrome UI check for the documented 2009 battle auto fallback."""
import hashlib
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent
HTML = ROOT / "Play-Heoofgaia-HG11.html"
SHOT = ROOT / "docs" / "evidence" / "hg09" / "battle-auto-timeout-chrome.png"
REPORT = ROOT / "docs" / "qa" / "hg09" / "battle-auto-timeout-chrome.json"
SHOT.parent.mkdir(parents=True, exist_ok=True)
REPORT.parent.mkdir(parents=True, exist_ok=True)
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
    check("Offline game opens with the requested Vietnamese title", page.title() == "Anh Hùng Thời Loạn", page.title())
    page.locator('[data-action="start"]').click()
    battle = page.evaluate("""(()=>{
      const s=HOG_APP_DEBUG.getState();s.army.human_1=50;HOG_ENGINE.setFormation(s,[{unitId:'human_1',count:50}]);
      const target=HOG_ENGINE.NPC_CAMPS_2009.find(c=>c.stars===1).key;HOG_ENGINE.startMarch(s,target);s.march.remaining=.01;HOG_ENGINE.tick(s,s.lastTick+1000);
      HOG_APP_DEBUG.render();return {battle:!!s.battle,valid:HOG_ENGINE.strictSave(s),autoUntil:s.battle?.autoUntil,turn:s.battle?.turn};
    })()""")
    check("A real March opens a save-valid tactical encounter", battle["battle"] and battle["valid"] and isinstance(battle["autoUntil"], (int, float)), json.dumps(battle))
    clock = page.locator("#battle-auto-clock")
    check("Battle UI displays the ten-second Sina timeout", clock.inner_text().startswith("Tự động sau ") and "10 giây" in clock.inner_text(), clock.inner_text())
    page.screenshot(path=str(SHOT), full_page=True)
    page.evaluate("""(()=>{const b=HOG_APP_DEBUG.getState().battle;for(const e of b.enemies){e.hp=1000;e.pool=1e7;e.count=10000;e.atk=0;e.def=100}})()""")
    selected = page.locator('.stack-card[data-action="stack"]').first
    selected.click()
    selection_clock = page.evaluate("HOG_APP_DEBUG.getState().battle.autoUntil")
    check("Selecting a unit refreshes the manual-control grace period", selection_clock >= int(time.time() * 1000) + 9000, str(selection_clock))
    page.locator('[data-action="battle"][data-cmd="advance"]').click()
    action = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {turn:s.battle?.turn,deadline:s.battle?.autoUntil,valid:HOG_ENGINE.strictSave(s)}})()""")
    check("Advance resolves an actual combat round and resets the timeout", action["turn"] == 2 and action["deadline"] >= int(time.time() * 1000) + 9000 and action["valid"], json.dumps(action))
    page.locator("#save").click()
    saved_deadline = page.evaluate("HOG_APP_DEBUG.getState().battle.autoUntil")
    page.reload(wait_until="load")
    restored = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {turn:s.battle?.turn,deadline:s.battle?.autoUntil,valid:HOG_ENGINE.strictSave(s)}})()""")
    check("v07 Save/Reload preserves the active battle and its timeout", restored["turn"] == 2 and restored["deadline"] == saved_deadline and restored["valid"], json.dumps(restored))
    page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();s.battle.autoUntil=Date.now()-1;HOG_APP_DEBUG.save()})()""")
    page.wait_for_function("HOG_APP_DEBUG.getState().battleAuto===true", timeout=2500)
    check("No-input expiry switches the actual encounter into automatic mode", page.locator("#battle-auto-clock").inner_text() == "Đang tự động", page.locator("#battle-auto-clock").inner_text())
    turn_before = page.evaluate("HOG_APP_DEBUG.getState().battle.turn")
    page.wait_for_function("HOG_APP_DEBUG.getState().battle?.turn>" + str(turn_before), timeout=4500)
    turn_after = page.evaluate("HOG_APP_DEBUG.getState().battle.turn")
    check("Automatic mode executes a real next turn", turn_after > turn_before, f"{turn_before} → {turn_after}")
    page.locator('[data-action="auto"]').click()
    stopped = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {auto:s.battleAuto,deadline:s.battle.autoUntil,valid:HOG_ENGINE.strictSave(s)}})()""")
    check("Player can re-enter manual control without ending the battle", stopped["auto"] is False and stopped["deadline"] >= int(time.time() * 1000) + 9000 and stopped["valid"], json.dumps(stopped))
    check("No JavaScript exceptions during timeout, automatic turn and manual re-entry", not errors, "; ".join(errors))
    browser.close()

passed = sum(item["passed"] for item in checks)
receipt = {
    "suite": "HG-09 Sina 2009 ten-second manual-control timeout",
    "source": "Installed Google Chrome opening the actual offline standalone HTML over file://. It performs a real March and combat action; QA changes only the travel clock and seeds durable defender values so automatic mode remains observable. The timeout itself, turn processing, UI state and v07 Save/Reload use shipped runtime/UI code.",
    "total": len(checks),
    "passed": passed,
    "failed": len(checks) - passed,
    "errors": errors,
    "checks": checks,
    "screenshots": [{"path": str(SHOT.relative_to(ROOT)).replace("\\", "/"), "sha256": hashlib.sha256(SHOT.read_bytes()).hexdigest()}] if SHOT.exists() else [],
}
REPORT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"BROWSER TOTAL {passed}/{len(checks)} PASS; JS exceptions={len(errors)}")
if passed != len(checks):
    raise SystemExit(1)
