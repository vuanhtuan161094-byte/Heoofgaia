"""Installed-Chrome file:// acceptance for the evidence-aligned Tavern L6 blue-candidate model."""
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
SHOT = EVIDENCE / "tavern-level-six-blue-chrome.png"
SHOT_REFRESH = EVIDENCE / "tavern-level-six-hourly-blue-chrome.png"
REPORT = QA / "tavern-level-six-blue-chrome.json"
checks = []
errors = []

def check(name, passed, detail=""):
    checks.append({"name": name, "passed": bool(passed), "detail": detail})
    print(("PASS" if passed else "FAIL"), name, detail)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe", headless=True,
                                args=["--no-sandbox", "--disable-dev-shm-usage"])
    page = browser.new_page(viewport={"width": 1440, "height": 1100}, device_scale_factor=1)
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.goto(HTML.as_uri(), wait_until="load")
    check("Offline build opens with the Anh Hùng Thời Loạn product name", page.title() == "Anh Hùng Thời Loạn | Heroes of Gaia", page.title())
    page.locator('[data-action="start"]').click()
    page.locator('#nav [data-tab="heroes"]').click()
    prepared = page.evaluate("""(()=>{
      const s=HOG_APP_DEBUG.getState();s.buildings.tavern=6;s.tavern.round=0;
      HOG_ENGINE.refreshTavern(s);HOG_APP_DEBUG.save();HOG_APP_DEBUG.render();
      const blue=s.tavern.offers.map((h,i)=>({h,i})).filter(x=>x.h.quality==='blue');
      return {version:s.version,offers:s.tavern.offers.length,blue:blue.length,index:blue[0]?.i,
        heroValue:blue[0]?.h.heroValue,stats:blue[0]?{atk:blue[0].h.atk,def:blue[0].h.def,spd:blue[0].h.spd,int:blue[0].h.int}:null,
        colorMatches:blue.length===1&&blue[0].h.quality===HOG_ENGINE.heroNameColor(blue[0].h),valid:HOG_ENGINE.strictSave(s)};
    })()""")
    hint = page.locator("#main").inner_text()
    check("Tavern UI cites SRC48 and discloses the blue-candidate model", "SRC48" in hint and "không phải xác suất gốc" in hint, hint[hint.find("Tavern —"):hint.find("Tavern —") + 420].replace("\n", " | "))
    check("Level-6 Tavern creates five candidates and one source-band Blue offer",
          prepared["version"] == 7 and prepared["offers"] == 5 and prepared["blue"] == 1 and 126 <= prepared["heroValue"] <= 160 and prepared["colorMatches"] and prepared["valid"] and all(20 <= v <= 50 for v in prepared["stats"].values()),
          json.dumps(prepared, ensure_ascii=False))
    page.screenshot(path=str(SHOT), full_page=True)
    page.locator(f'#main .tavern-offers .card:nth-child({prepared["index"] + 1}) [data-action="hirecandidate"]').click()
    hired = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),h=s.heroes.at(-1);return {heroes:s.heroes.length,offers:s.tavern.offers.length,
      quality:h.quality,heroValue:h.atk+h.def+h.spd+h.int-h.level+1,valid:HOG_ENGINE.strictSave(s)}})()""")
    check("Live hire button recruits the displayed Blue hero and removes only that offer",
          hired["heroes"] == 2 and hired["offers"] == 4 and hired["quality"] == "blue" and hired["valid"], json.dumps(hired, ensure_ascii=False))
    page.locator("#save").click()
    page.reload(wait_until="load")
    page.locator('#nav [data-tab="heroes"]').click()
    restored = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),h=s.heroes.at(-1);return {version:s.version,heroes:s.heroes.length,
      quality:h.quality,offers:s.tavern.offers.length,round:s.tavern.round,valid:HOG_ENGINE.strictSave(s)}})()""")
    check("v07 Save/Reload retains hired Blue hero and remaining candidates",
          restored["version"] == 7 and restored["heroes"] == 2 and restored["quality"] == "blue" and restored["offers"] == 4 and restored["round"] == 1 and restored["valid"],
          json.dumps(restored, ensure_ascii=False))
    refreshed = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),start=s.tavern.round;
      HOG_ENGINE.tick(s,s.lastTick+60_000);HOG_APP_DEBUG.save();HOG_APP_DEBUG.render();
      const blue=s.tavern.offers.filter(h=>h.quality==='blue');return {start,round:s.tavern.round,offers:s.tavern.offers.length,
        blue:blue.length,heroValue:blue[0]?.heroValue,valid:HOG_ENGINE.strictSave(s)};})()""")
    check("A real 60-minute game tick refreshes the Tavern and produces the next modeled Blue offer",
          refreshed["round"] == refreshed["start"] + 1 and refreshed["offers"] == 5 and refreshed["blue"] == 1 and 126 <= refreshed["heroValue"] <= 160 and refreshed["valid"],
          json.dumps(refreshed, ensure_ascii=False))
    page.screenshot(path=str(SHOT_REFRESH), full_page=True)
    page.reload(wait_until="load")
    page.locator('#nav [data-tab="heroes"]').click()
    after_reload = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {round:s.tavern.round,blue:s.tavern.offers.filter(h=>h.quality==='blue').length,
      offers:s.tavern.offers.length,heroes:s.heroes.length,valid:HOG_ENGINE.strictSave(s)}})()""")
    check("Hourly refresh and candidate list persist through another browser reload",
          after_reload["round"] == refreshed["round"] and after_reload["blue"] == 1 and after_reload["offers"] == 5 and after_reload["heroes"] == 2 and after_reload["valid"],
          json.dumps(after_reload, ensure_ascii=False))
    check("No JavaScript exceptions during offline Tavern hire, refresh and Save/Reload", not errors, "\n".join(errors))
    browser.close()

receipt = {"suite": "HG-08 Tavern L6–L9 qualitative quality slice", "game": "Anh Hùng Thời Loạn",
           "browser": "Installed Chrome, actual file://", "source": "SRC48 (17173, 2009-10-25)",
           "modelDisclosure": "SRC48 reports that Tavern above level 5 almost always offers at least one blue hero, without exact odds/stat distributions. L6–L9 implementation deterministically creates exactly one blue offer per refresh; its 20–50 stats and 126–160 hero-value band are a playable model, not recovered probabilities. Fixture directly sets Tavern level 6; subsequent hire, 60-minute tick, UI and v07 Save/Reload use the real engine/UI.",
           "htmlSha256": hashlib.sha256(HTML.read_bytes()).hexdigest().upper(), "checks": checks, "errors": errors,
           "screenshots": [str(SHOT.relative_to(ROOT)), str(SHOT_REFRESH.relative_to(ROOT))]}
REPORT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"CHROME TOTAL {sum(c['passed'] for c in checks)}/{len(checks)} PASS; JS exceptions={len(errors)}; HTML SHA256={receipt['htmlSha256']}")
if not all(c["passed"] for c in checks) or errors:
    raise SystemExit(1)
