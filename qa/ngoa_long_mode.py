"""NL-REBUILD-01: real Chromium checks for the single-file strategy hub."""
from pathlib import Path
import json
import os
import sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
STUB = """<script>window.__P2_ENABLE_QA__=true;const __store={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>__store[k]??null,setItem:(k,v)=>__store[k]=String(v),removeItem:k=>delete __store[k]}});</script>"""


def main():
    checks = []
    errors = []

    def check(name, condition):
        passed = bool(condition)
        checks.append({"name": name, "pass": passed})
        print(("PASS " if passed else "FAIL ") + name, flush=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path=os.environ.get("CHROMIUM_BIN") or None,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        for width, height, label in [(1280, 720, "desktop"), (390, 844, "mobile")]:
            page = browser.new_page(viewport={"width": width, "height": height})
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.set_content(HTML.replace("<script>", STUB + "<script>", 1), wait_until="domcontentloaded")
            check(f"{label}: Quân Cơ Phủ is rendered", page.locator("[data-nl-command]").count() == 1)
            check(f"{label}: all nine real formation cells are shown", page.locator("[data-nl-command] .nl-slot").count() == 9)
            check(f"{label}: deployed generals come from game state", page.locator("[data-nl-command] .nl-slot.occupied").count() == 3)
            check(f"{label}: next-stage action is available", page.locator("[data-nl-command] [data-battle]").count() == 1)
            check(f"{label}: save engine and 3x3 state remain live", page.evaluate('typeof window.__P2_QA__ === "object" && window.__P2_QA__.getGame().slots.length===9'))

            for route, heading in [
                ("formation", "Bày Binh Bố Trận"),
                ("heroes", "Danh Sách Võ Tướng"),
                ("barracks", "Doanh Trại"),
                ("equipment", "Kho · Trang Bị"),
                ("tech", "Khoa Kỹ"),
                ("campaign", "Chinh Phạt"),
            ]:
                page.locator(f'[data-nl-command] [data-nl-route="{route}"]').click()
                check(f"{label}: {route} opens its functional screen", heading in page.locator("#view").inner_text())
                page.locator('.nav[data-tab="city"]').click()

            page.locator('[data-nl-command] [data-battle]').click()
            check(f"{label}: battle action creates real combat state", page.evaluate('!!window.__P2_QA__.getBattle() && window.__P2_QA__.getBattle().p.length===3'))
            check(f"{label}: battlefield canvas is mounted", page.locator("#battle-canvas").count() == 1)
            if label == "mobile":
                check("mobile: document has no horizontal overflow", page.evaluate("document.documentElement.scrollWidth <= innerWidth + 2"))
            page.screenshot(path=str(ROOT / "qa" / f"nl-r01-{label}.png"), full_page=False)
            page.close()

        check("no Chromium runtime errors", not errors)
        browser.close()

    report = {
        "total": len(checks),
        "passed": sum(item["pass"] for item in checks),
        "failed": [item["name"] for item in checks if not item["pass"]],
        "pageErrors": errors,
        "checks": checks,
    }
    (ROOT / "qa" / "NL_REBUILD_01.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"total": report["total"], "passed": report["passed"], "failed": report["failed"]}, ensure_ascii=False))
    return 0 if report["passed"] == report["total"] else 1


if __name__ == "__main__":
    sys.exit(main())
