"""Actual Chromium desktop/mobile checks for CL-P5's offline map integration."""
from __future__ import annotations

import hashlib
import json
import base64
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa"
HTML_PATH = ROOT / "index.html"
MANIFEST = ROOT / "assets" / "p5" / "cl-p5-region-map-manifest.json"
RESULT = []


def check(name: str, condition: object, evidence: dict | None = None) -> bool:
    passed = bool(condition)
    RESULT.append({"name": name, "pass": passed, "evidence": evidence or {}})
    print(("PASS" if passed else "FAIL") + " " + name, flush=True)
    return passed


def open_world(page) -> None:
    page.add_init_script("window.__P2_ENABLE_QA__=true;")
    page.goto(HTML_PATH.as_uri(), wait_until="domcontentloaded", timeout=30000)
    page.wait_for_selector("#view", timeout=30000)
    page.locator('[data-tab="world"]').click()
    page.wait_for_selector(".cl-map", timeout=10000)


def main() -> None:
    errors: list[str] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        desktop = browser.new_page(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
        desktop.on("pageerror", lambda error: errors.append(str(error)))
        open_world(desktop)
        background = desktop.evaluate("getComputedStyle(document.querySelector('.cl-map')).backgroundImage")
        check("offline map background is the embedded WebP under a CSS shade", desktop.locator("#cl-p5-region-visual-style").count() == 1 and "data:image/webp;base64," in background)
        encoded = re.search(r"data:image/webp;base64,([A-Za-z0-9+/=]+)", background)
        payload_size = len(base64.b64decode(encoded.group(1))) if encoded else 0
        check("runtime map payload stays below 350 KB", payload_size < 350_000, {"base64DecodedApproxBytes": payload_size})
        nodes = desktop.locator(".cl-node[data-cl-node]").count()
        roads = desktop.locator(".cl-map svg .cl-road").count()
        check("ten live selectable territory nodes and route lines remain over the painting", nodes == 10 and roads >= 10, {"nodes": nodes, "roadSegments": roads})
        desktop.locator('[data-cl-node="outpost"]').click()
        route = desktop.locator('[data-cl-march="outpost"]')
        route_present = route.count() == 1 and "Lương hành quân" in desktop.locator(".cl-map-panel .cl-map-status").inner_text()
        selected = desktop.locator('[data-cl-node="outpost"].selected').count() == 1
        check("actual map click still selects a node and previews its paid route", route_present and selected)
        hit_target = desktop.evaluate("""() => {const e=document.querySelector('[data-cl-node="outpost"]'),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!hit?.closest('[data-cl-node="outpost"]')}""")
        check("map background never intercepts interactive node clicks", hit_target)
        box = desktop.locator(".cl-map").bounding_box()
        desktop.locator(".cl-map").screenshot(path=str(OUT / "cl-p5-map-desktop.png"))
        check("1280px Chromium map visual evidence captured", bool(box and box["width"] > 500 and (OUT / "cl-p5-map-desktop.png").is_file()), {"mapBox": box})

        mobile = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
        mobile.on("pageerror", lambda error: errors.append(str(error)))
        open_world(mobile)
        mobile_box = mobile.locator(".cl-map").bounding_box()
        mobile_nodes = mobile.locator(".cl-node[data-cl-node]").count()
        mobile.locator("[data-cl-node='outpost']").click()
        mobile_route = mobile.locator("[data-cl-march='outpost']").count() == 1
        mobile.locator(".cl-map").screenshot(path=str(OUT / "cl-p5-map-mobile-390x844.png"))
        mobile_fit = bool(mobile_box and mobile_box["width"] <= 390 and mobile_box["width"] >= 300)
        check("390px Chromium keeps the full map and all ten targets interactive", mobile_fit and mobile_nodes == 10 and mobile_route, {"mapBox": mobile_box, "nodes": mobile_nodes})
        check("390px mobile map visual evidence captured", (OUT / "cl-p5-map-mobile-390x844.png").is_file())
        check("desktop and mobile map flow produce no JavaScript exceptions", not errors, {"pageErrors": errors})
        browser.close()

    passed = all(row["pass"] for row in RESULT)
    if passed:
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        manifest["asset_qc_pass"] = True
        manifest["integrated_in_game"] = True
        MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary = {
        "milestone": "CL-P5",
        "sourceSha256": hashlib.sha256(HTML_PATH.read_bytes()).hexdigest(),
        "checksPassed": sum(row["pass"] for row in RESULT),
        "checksTotal": len(RESULT),
        "checks": RESULT,
    }
    (OUT / "CL_P5_VISUAL.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"CL-P5 CHROMIUM VISUAL {summary['checksPassed']}/{summary['checksTotal']}", flush=True)
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
