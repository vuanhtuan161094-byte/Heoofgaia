"""NL-REBUILD-01: real Chromium QA for new Ngọa Long-first game entrance.

This test runs against CI-assembled canonical index.html; no mock screenshots.
"""
from pathlib import Path
import json
import os
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
STUB = """<script>window.__P2_ENABLE_QA__=true;const __store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>__store[k]??null,setItem:(k,v)=>__store[k]=String(v),removeItem:k=>delete __store[k]}});</script>"""

def main():
    checks = []
    errors = []
    def check(name, condition):
        passed = bool(condition)
        checks.append({"name": name, "pass": passed})
        print(("PASS " if passed else "FAIL ") + name)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path=os.environ.get("CHROMIUM_BIN") or None, args=["--no-sandbox"])
        for width, height, label in [(1280, 720, "desktop"), (390, 844, "mobile")]:
            page = browser.new_page(viewport={"width": width, "height": height})
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.set_content(HTML.replace("<script>", STUB + "<script>", 1), wait_until="domcontentloaded")
            check(f"{label}: Ngọa Long command hub displayed", page.locator("[data-nl-command]").count() == 1)
            check(f"{label}: nine real formation slots displayed", page.locator("[data-nl-command] .nl-slot").count() == 9)
            check(f"{label}: active generals shown in formation", page.locator("[data-nl-command] .nl-slot.occupied").count() >= 1)
            check(f"{label}: next stage has live battle action", page.locator("[data-nl-command] [data-battle]").count() == 1)
            check(f"{label}: old save/engine remains live", page.evaluate('typeof window.__P2_QA__ === "object" && window.__P2_QA__.getGame().slots.length===9'))
            check(f"{label}: 3x3 formation button opens real screen", (page.locator("[data-nl-command] [data-nl-route=formation]").click() or "Bày Binh Bố Trận" in page.locator("#view").inner_text()))
            page.locator(".nav[data-tab=city]").click()
            check(f"{label}: stages button opens live campaign", (page.locator("[data-nl-command] [data-nl-route=campaign]").click() or "Chinh Phạt" in page.locator("#view").inner_text()))
            page.locator(".nav[data-tab=city]").click()
            check(f"{label}: battle click triggers real combat", (page.locator("[data-nl-command] [data-battle]").click() or page.evaluate('!!window.__P2_QA__.getBattle()')))
            page.screenshot(path=str(ROOT / "qa" / f"nl-rebuild-{label}.png"), full_page=False)
            if label == "mobile":
                check("mobile: hub does not overflow horizontal document", page.evaluate("document.documentElement.scrollWidth <= innerWidth + 2"))
            page.close()
        check("no Chromium runtime errors", not errors)
        browser.close()
    report = {"total": len(checks), "passed": sum(c["pass"] for c in checks), "failed": [c["name"] for c in checks if not c["pass"]], "pageErrors": errors, "checks": checks}
    (ROOT / "qa" / "NL_REBUILD_01.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"total": report["total"], "passed": report["passed"], "failed": report["failed"]}, ensure_ascii=False))
    return 0 if report["passed"] == report["total"] else 1

if __name__ == "__main__":
    sys.exit(main())
