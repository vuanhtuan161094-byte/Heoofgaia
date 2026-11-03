"""Actual offline Chrome acceptance of the Undead community daily task."""
from pathlib import Path
import hashlib
import json
import struct
import sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent
HTML = ROOT / "Play-Heoofgaia-HG11.html"
EVIDENCE = ROOT / "docs" / "evidence" / "hg08"
QA = ROOT / "docs" / "qa" / "hg08"
EVIDENCE.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
BATTLE_SHOT = EVIDENCE / "undead-daily-lichking-3star-battle-chrome.png"
CLAIM_SHOT = EVIDENCE / "undead-daily-lichking-claimed-chrome.png"
REPORT = QA / "undead-daily-lichking-chrome.json"
checks, errors = [], []


def check(name, passed, detail=""):
    checks.append({"name": name, "passed": bool(passed), "detail": detail})
    print(("PASS " if passed else "FAIL ") + name + (f" — {detail}" if detail else ""))


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        headless=True,
        args=["--no-sandbox", "--disable-dev-shm-usage"],
    )
    page = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.goto(HTML.as_uri(), wait_until="load")
    check("Offline HTML opens as Anh Hùng Thời Loạn", page.title() == "Anh Hùng Thời Loạn", page.title())
    page.locator('[data-action="race"][data-race="undead"]').click()
    page.locator('[data-action="start"]').click()
    fixture = page.evaluate("""(()=>{
      const s=HOG_APP_DEBUG.getState(),h=s.heroes.find(x=>x.id===s.activeHero);
      // Skip Fame progression and earlier unit grinding only. The selected NPC, March,
      // battle, win, task claim, and v07 persistence use the real game.
      s.fame=2199;s.speed=60;s.army.undead_8=7;
      HOG_ENGINE.setFormation(s,[{unitId:'undead_8',count:7}]);
      HOG_APP_DEBUG.save();HOG_APP_DEBUG.render();
      return {version:s.version,race:s.race,task:HOG_ENGINE.dailyTasks(s).find(t=>t.id==='clean_up_remnants'),
        target:HOG_ENGINE.NPC_CAMPS_2009.find(c=>c.stars===3)?.key,lichKings:s.army.undead_8};
    })()""")
    check("Undead task appears but stays Fame-locked below 2,200", fixture["task"] is not None and not fixture["task"]["available"] and fixture["target"] and fixture["lichKings"] == 7,
          json.dumps(fixture, ensure_ascii=False))
    page.locator('#nav [data-tab="tasks"]').click()
    task_button = page.locator('[data-action="acceptdaily"][data-id="clean_up_remnants"]')
    check("Task UI shows the source-listed 3-star objective and reward", task_button.count() == 1 and "3★" in page.locator("#main").inner_text() and "Lich King" in page.locator("#main").inner_text(), page.locator("#main").inner_text()[:420].replace("\n", " | "))
    check("Task acceptance is disabled below Fame 2,200", task_button.is_disabled())
    page.evaluate("(()=>{const s=HOG_APP_DEBUG.getState();s.fame=2200;HOG_APP_DEBUG.save();HOG_APP_DEBUG.render()})()")
    task_button = page.locator('[data-action="acceptdaily"][data-id="clean_up_remnants"]')
    check("The 2,200-Fame task becomes available for the Undead main city", task_button.is_enabled())
    task_button.click()
    accepted = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),t=HOG_ENGINE.dailyTasks(s).find(x=>x.id==='clean_up_remnants');return {accepted:t.accepted,claimed:t.claimed,race:s.cities.find(c=>c.main)?.race,valid:HOG_ENGINE.strictSave(s)}})()""")
    check("Task acceptance uses the real daily ledger", accepted == {"accepted": True, "claimed": False, "race": "undead", "valid": True}, json.dumps(accepted, ensure_ascii=False))

    page.locator('#nav [data-tab="map"]').click()
    target = fixture["target"]
    point = page.evaluate("""key=>{const canvas=document.querySelector('#world-canvas'),tile=HOG_ENGINE.getTile(key),m=HOG_PAINTER.miniBounds(canvas),r=canvas.getBoundingClientRect(),pad=9;
      const x=m.x+pad+(tile.x+.5)*(m.w-2*pad)/HOG_ENGINE.WIDTH,y=m.y+pad+(tile.y+.5)*(m.h-2*pad)/HOG_ENGINE.HEIGHT;
      return {x:r.left+x*r.width/canvas.width,y:r.top+y*r.height/canvas.height}}""", target)
    page.mouse.click(point["x"], point["y"])
    selected_text = page.locator("#main").inner_text()
    check("A real dated 3-star NPC target is selected by clicking its world minimap tile", target in selected_text and "3★" in selected_text and "Trại" in selected_text, f"{target}: {selected_text[:280].replace(chr(10), ' | ')}")
    march = page.locator('[data-action="march"]')
    check("The actual March control accepts the saved Lich King formation", march.is_enabled())
    ap_before = page.evaluate("HOG_APP_DEBUG.getState().ap")
    march.click()
    dispatch = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {target:s.march?.target,unit:s.expedition?.army.undead_8,count:s.expedition?.army.undead_8,ap:s.ap,valid:HOG_ENGINE.strictSave(s)}})()""")
    check("March dispatches the real formation and charges 8 AP", dispatch.get("target") == target and dispatch.get("count") == 7 and dispatch.get("ap") == ap_before - 8 and dispatch.get("valid"), json.dumps(dispatch, ensure_ascii=False))
    page.evaluate("(()=>{const s=HOG_APP_DEBUG.getState();HOG_ENGINE.tick(s,s.lastTick+s.march.remaining/s.speed*1000+1000);HOG_APP_DEBUG.render()})()")
    opened = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),b=s.battle;return {target:b?.target,kind:b?.kind,stars:b?.level,allies:b?.allies?.[0]?.count,enemies:b?.enemies?.length,valid:HOG_ENGINE.strictSave(s)}})()""")
    check("Natural travel arrival opens the modeled 3-star NPC battle", opened.get("target") == target and opened.get("kind") == "npc" and opened.get("stars") == 3 and opened.get("allies") == 7 and opened.get("enemies", 0) >= 2 and opened.get("valid"), json.dumps(opened, ensure_ascii=False))
    page.screenshot(path=str(BATTLE_SHOT), full_page=True)

    turns, result = 0, None
    while page.evaluate("!!HOG_APP_DEBUG.getState().battle") and turns < 20:
        page.locator('[data-action="battle"][data-cmd="attack"]').click()
        turns += 1
    won = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {battle:!!s.battle,cleared:s.cleared.includes(arguments[0]),accepted:s.dailyTaskState.accepted.includes('clean_up_remnants'),ready:HOG_ENGINE.dailyTasks(s).find(t=>t.id==='clean_up_remnants')?.ready,valid:HOG_ENGINE.strictSave(s)}})()""".replace("arguments[0]", json.dumps(target)))
    check("Real Attack actions win, clear the selected site and complete the daily objective", not won["battle"] and won["cleared"] and won["accepted"] and won["ready"] and won["valid"], json.dumps({**won, "attackTurns": turns}, ensure_ascii=False))
    page.locator('#nav [data-tab="tasks"]').click()
    claim = page.locator('[data-action="claimdaily"][data-id="clean_up_remnants"]')
    check("Completed task exposes its real claim control", claim.count() == 1 and claim.is_enabled())
    before = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {gold:s.res.gold,ap:s.ap,lichKings:s.army.undead_8}})()""")
    claim.click()
    reward = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),t=HOG_ENGINE.dailyTasks(s).find(x=>x.id==='clean_up_remnants');return {gold:s.res.gold,ap:s.ap,lichKings:s.army.undead_8,claimed:t.claimed,notice:s.log.find(x=>x.includes('Clean Up Remnants')),valid:HOG_ENGINE.strictSave(s)}})()""")
    check("Claim grants 800 Gold, up to 9 AP, and exactly one Lich King", reward["gold"] == before["gold"] + 800 and reward["ap"] == min(200, before["ap"] + 9) and reward["lichKings"] == before["lichKings"] + 1 and reward["claimed"] and reward["valid"], json.dumps(reward, ensure_ascii=False))
    page.screenshot(path=str(CLAIM_SHOT), full_page=True)
    page.locator("#save").click()
    page.reload(wait_until="load")
    page.locator('#nav [data-tab="tasks"]').click()
    restored = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),t=HOG_ENGINE.dailyTasks(s).find(x=>x.id==='clean_up_remnants');return {version:s.version,unit:s.army.undead_8,claimed:t.claimed,valid:HOG_ENGINE.strictSave(s)}})()""")
    check("v07 Save/Reload preserves the claimed task and awarded unit", restored == {"version": 7, "unit": reward["lichKings"], "claimed": True, "valid": True}, json.dumps(restored, ensure_ascii=False))
    check("No JavaScript exceptions during the real task flow", not errors, "; ".join(errors))
    browser.close()

passed = sum(row["passed"] for row in checks)
screenshots = []
for path in (BATTLE_SHOT, CLAIM_SHOT):
    if path.exists():
        content = path.read_bytes()
        screenshots.append({"path": str(path.relative_to(ROOT)).replace("\\", "/"), "sha256": hashlib.sha256(content).hexdigest(),
                           "resolution": f"{struct.unpack('>II', content[16:24])[0]}x{struct.unpack('>II', content[16:24])[1]}", "bytes": len(content)})
receipt = {
    "suite": "HG-08 Undead Clean Up Remnants daily task gameplay",
    "source": "Local standalone file:// HTML in installed Google Chrome. Fixture seeds only 2,199/2,200 Fame and 7 tier-8 Lich Kings (exactly within the hero's 11,500-point command limit) to skip progression/grinding. Task acceptance, map selection, March, natural travel arrival, actual Attack actions and NPC win, claim and v07 persistence use the real application. The 2009 guide supports a daily tier-8 ranged reward in general; the exact task name, 3-star objective, Fame gate and reward amounts are from the living mixed-edition Fandom page and remain C-confidence, not confirmed 2009 server data. The 3-star enemy roster/stats are modeled.",
    "total": len(checks), "passed": passed, "failed": len(checks) - passed, "errors": errors, "checks": checks, "screenshots": screenshots
}
REPORT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"CHROME TOTAL {passed}/{len(checks)} PASS; JavaScript exceptions={len(errors)}")
if passed != len(checks):
    raise SystemExit(1)
