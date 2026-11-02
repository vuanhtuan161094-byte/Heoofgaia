"""Installed Chrome file:// acceptance for derived Elf/Orc Barracks tiers."""
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
checks, errors = [], []


def check(name, passed, detail=""):
    checks.append({"name": name, "passed": bool(passed), "detail": detail})
    print(("PASS" if passed else "FAIL"), name, detail)


def exercise_race(browser, race, unit_id, unit_name, building_level, expected_checks, screenshot):
    context = browser.new_context(viewport={"width": 1440, "height": 1050}, device_scale_factor=1)
    page = context.new_page()
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.goto(HTML.as_uri(), wait_until="load")
    page.locator(f'[data-action="race"][data-race="{race}"]').click()
    page.locator('[data-action="start"]').click()
    page.evaluate(f"""(()=>{{const s=HOG_APP_DEBUG.getState(),E=HOG_ENGINE,C=HOG_CATALOG;
      s.buildings.hall=10;s.buildings.warehouse=10;s.buildings.barracks={building_level};
      s.spells.scouting=1;for(const k of C.keys)s.res[k]=E.limits(s)[k];
      s.lastTick=Date.now();HOG_APP_DEBUG.save();HOG_APP_DEBUG.render();}})()""")
    page.locator('#nav [data-tab="army"]').click()
    card = page.locator(".unitrow").filter(has_text=unit_name).first
    card_text = card.inner_text()
    check(f"{race} unit page keeps the product title", page.title() == "Anh Hùng Thời Loạn", page.title())
    snapshot = page.evaluate(f"""(()=>{{const s=HOG_APP_DEBUG.getState(),u=Object.values(HOG_CATALOG.units).flat().find(x=>x.id==='{unit_id}');
      return HOG_ENGINE.troopPrerequisites(s,u)}})()""")
    scout_scope_ok = race != "elf" or ("Trung Quốc 2010" in card_text and "wiki tiếng Anh 2009" in card_text)
    check(f"{race} {unit_name} exposes B-derived Barracks tier and disclosed source gap",
          snapshot["status"] == "DERIVED_TROOP_BUILDING_TIER" and snapshot["confidence"] == "B" and
          [c["key"] for c in snapshot["checks"]] == expected_checks and
          "suy luận B*" in card_text and ("chưa xác minh từng cổng phụ gốc" in card_text or "cổng phụ chưa xác minh" in card_text) and scout_scope_ok,
          json.dumps(snapshot, ensure_ascii=False) + " | " + card_text[-260:].replace("\n", " | "))
    check(f"{race} {unit_name} has an enabled real recruitment action",
          card.locator(f'[data-action="recruit"][data-id="{unit_id}"]').is_enabled(),
          card.locator(f'[data-action="recruit"][data-id="{unit_id}"]').inner_text())
    page.screenshot(path=str(EVIDENCE / screenshot), full_page=True)
    before = page.evaluate("HOG_APP_DEBUG.getState().res.gold")
    card.locator(f"#q_{unit_id}").fill("1")
    card.locator(f'[data-action="recruit"][data-id="{unit_id}"]').click()
    queued = page.evaluate(f"""(()=>{{const s=HOG_APP_DEBUG.getState();return {{queue:s.training[0],gold:s.res.gold,
      valid:HOG_ENGINE.strictSave(s),unit:s.training[0]?.unitId,count:s.training[0]?.count}}}})()""")
    expected_gold = HOG_CATALOG_GOLD[unit_id]
    check(f"{race} {unit_name} recruitment spends resources and creates a real queue",
          queued["unit"] == unit_id and queued["count"] == 1 and queued["gold"] == before - expected_gold and queued["valid"],
          json.dumps(queued, ensure_ascii=False))
    page.locator("#save").click()
    page.reload(wait_until="load")
    page.locator('#nav [data-tab="army"]').click()
    restored = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {version:s.version,queue:s.training[0],valid:HOG_ENGINE.strictSave(s)}})()""")
    check(f"{race} queued recruitment survives v07 Save/Reload",
          restored["version"] == 7 and restored["queue"]["unitId"] == unit_id and restored["queue"]["count"] == 1 and restored["valid"],
          json.dumps(restored, ensure_ascii=False))
    context.close()


# Unit catalog gold prices are read by this script from the known 2009 unit rows.
HOG_CATALOG_GOLD = {"elf_2": 68, "orc_3": 117}
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe", headless=True,
                                args=["--no-sandbox", "--disable-dev-shm-usage"])
    exercise_race(browser, "elf", "elf_2", "Elf Scout", 2, ["barracks", "scouting"], "elf-scout-derived-gate-chrome.png")
    exercise_race(browser, "orc", "orc_3", "Axe Thrower", 3, ["barracks"], "orc-axe-thrower-derived-gate-chrome.png")
    browser.close()

receipt = {"suite": "HG-08 Elf/Orc derived Barracks tiers through real offline UI", "game": "Anh Hùng Thời Loạn",
           "browser": "Installed Chrome, actual file://", "fixtureDisclosure": "The fixture selects each race through the game's intro, seeds prerequisite buildings/research and warehouse-capped resources, then uses the real recruit control and v07 Save/Reload. Barracks tier gates are B* derivations from SRC02/SRC03/SRC11, not original server tables; support gates remain unresolved.",
           "htmlSha256": hashlib.sha256(HTML.read_bytes()).hexdigest().upper(), "checks": checks, "errors": errors,
           "screenshots": ["docs/evidence/hg08/elf-scout-derived-gate-chrome.png", "docs/evidence/hg08/orc-axe-thrower-derived-gate-chrome.png"]}
REPORT = QA / "faction-gate-ui-chrome.json"
REPORT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
passed = sum(item["passed"] for item in checks)
print(f"CHROME TOTAL {passed}/{len(checks)} PASS; JS exceptions={len(errors)}; HTML SHA256={receipt['htmlSha256']}")
if passed != len(checks) or errors:
    raise SystemExit(1)
