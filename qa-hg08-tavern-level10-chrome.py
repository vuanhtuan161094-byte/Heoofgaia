"""Installed Chrome file:// gameplay acceptance for the level-10 Tavern sample model."""
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
SHOT = EVIDENCE / "tavern-level10-sampled-candidates-chrome.png"
SHOT_REFRESH = EVIDENCE / "tavern-level10-hourly-refresh-chrome.png"
REPORT = QA / "tavern-level10-sampled-candidates-chrome.json"
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
    check("Offline build title is Anh Hùng Thời Loạn", page.title() == "Anh Hùng Thời Loạn", page.title())
    page.locator('[data-action="start"]').click()
    page.locator('#nav [data-tab="heroes"]').click()
    prepared = page.evaluate("""(()=>{
      const s=HOG_APP_DEBUG.getState();s.buildings.tavern=10;s.tavern.round=0;
      HOG_ENGINE.refreshTavern(s);HOG_APP_DEBUG.save();HOG_APP_DEBUG.render();
      const offers=s.tavern.offers.map(h=>({id:h.id,name:h.name,quality:h.quality,value:h.heroValue,atk:h.atk,def:h.def,spd:h.spd,int:h.int,
        statColors:h.statColors}));
      const stats=offers.flatMap(h=>[h.atk,h.def,h.spd,h.int]);
      return {version:s.version,round:s.tavern.round,offers,stats,valid:HOG_ENGINE.strictSave(s),
        colorChecks:offers.every(h=>h.quality===HOG_ENGINE.heroNameColor(h)&&
          ['atk','def','spd','int'].every(k=>h.statColors[k]===HOG_ENGINE.heroStatColor(h[k])))};
    })()""")
    hint = page.locator("#main").inner_text()
    check("Tavern disclosure cites sample status and rejects server-odds claims",
          "SRC21" in hint and "98,03%" in hint and "không phải xác suất server" in hint,
          hint[hint.find("Tavern —"):hint.find("Tavern —") + 550].replace("\n", " | "))
    check("Level-10 refresh produces eight valid four-stat offers from the cited ranges",
          prepared["version"] == 7 and prepared["round"] == 1 and len(prepared["offers"]) == 8 and
          all(20 <= n <= 70 for n in prepared["stats"]) and prepared["colorChecks"] and prepared["valid"],
          json.dumps(prepared, ensure_ascii=False))
    page.screenshot(path=str(SHOT), full_page=True)
    first = prepared["offers"][0]
    page.locator('[data-action="hirecandidate"]').first.click()
    hired = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),h=s.heroes.at(-1);return {version:s.version,heroes:s.heroes.length,
      offers:s.tavern.offers.length,hero:{name:h.name,atk:h.atk,def:h.def,spd:h.spd,int:h.int},valid:HOG_ENGINE.strictSave(s)}})()""")
    check("Live hire recruits the exact displayed candidate and removes one slot",
          hired["version"] == 7 and hired["heroes"] == 2 and hired["offers"] == 7 and
          hired["hero"] == {k:first[k] for k in ("name","atk","def","spd","int")} and hired["valid"],
          json.dumps(hired, ensure_ascii=False))
    page.locator("#save").click()
    page.reload(wait_until="load")
    page.locator('#nav [data-tab="heroes"]').click()
    restored = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),h=s.heroes.at(-1);return {version:s.version,heroes:s.heroes.length,
      offers:s.tavern.offers.length,hero:{name:h.name,atk:h.atk,def:h.def,spd:h.spd,int:h.int},valid:HOG_ENGINE.strictSave(s)}})()""")
    check("v07 Save/Reload preserves hired stats and all seven remaining sampled offers",
          restored == hired, json.dumps(restored, ensure_ascii=False))
    refreshed = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState(),before=s.tavern.round;
      s.lastTick=Date.now()-60000;HOG_ENGINE.tick(s,Date.now());HOG_APP_DEBUG.save();HOG_APP_DEBUG.render();
      const offers=s.tavern.offers,stats=offers.flatMap(h=>[h.atk,h.def,h.spd,h.int]);
      return {before,round:s.tavern.round,count:offers.length,valid:HOG_ENGINE.strictSave(s),
        ranges:stats.every(n=>Number.isSafeInteger(n)&&n>=20&&n<=70)};})()""")
    check("One in-game hour refreshes eight new L10 candidates through the real engine",
          refreshed["round"] == refreshed["before"] + 1 and refreshed["count"] == 8 and refreshed["valid"] and refreshed["ranges"],
          json.dumps(refreshed, ensure_ascii=False))
    page.screenshot(path=str(SHOT_REFRESH), full_page=True)
    page.reload(wait_until="load")
    page.locator('#nav [data-tab="heroes"]').click()
    final = page.evaluate("""(()=>{const s=HOG_APP_DEBUG.getState();return {version:s.version,round:s.tavern.round,
      count:s.tavern.offers.length,valid:HOG_ENGINE.strictSave(s)}})()""")
    check("The new hourly candidate set survives another v07 browser reload",
          final["version"] == 7 and final["round"] == refreshed["round"] and final["count"] == 8 and final["valid"],
          json.dumps(final, ensure_ascii=False))
    check("No page errors during offline Tavern refresh, hire and Save/Reload", not errors, "\n".join(errors))
    browser.close()

receipt = {"suite": "HG-08 Tavern 10 sample-based candidate gameplay", "game": "Anh Hùng Thời Loạn",
           "browser": "Installed Chrome, actual file://", "source": "SRC21: living Fandom Hero quality page; exact build/revision date unknown",
           "modelDisclosure": "Each L10 stat samples from the page's 6,708-attribute table: 6,576 white/blue draws map to uniform 20-50, 130 yellow to 51-60, 2 green to 61-70, and no purple was observed. This empirical sample is not an original server probability. Fixture sets Tavern level 10 directly; refresh, visible candidate hire, v07 Save/Reload, in-game-hour refresh and reload use the actual runtime/UI.",
           "htmlSha256": hashlib.sha256(HTML.read_bytes()).hexdigest().upper(), "checks": checks, "errors": errors,
           "screenshots": [str(SHOT.relative_to(ROOT)), str(SHOT_REFRESH.relative_to(ROOT))]}
REPORT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"CHROME TOTAL {sum(c['passed'] for c in checks)}/{len(checks)} PASS; JS exceptions={len(errors)}; HTML SHA256={receipt['htmlSha256']}")
if not all(c["passed"] for c in checks) or errors:
    raise SystemExit(1)