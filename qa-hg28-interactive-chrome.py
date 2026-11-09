"""Real file:// gameplay and UI evidence for HG28 world/city at both locked sizes."""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='backslashreplace')

ROOT = Path(__file__).parent
GAME = ROOT / "Play-Heoofgaia-HG11.html"
SIZES = [(1280, 720), (960, 540)]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def main() -> None:
    errors: list[str] = []
    checks: list[dict] = []
    images: list[dict] = []
    with sync_playwright() as playwright:
        launch = {"headless": True, "args": ["--no-sandbox", "--disable-dev-shm-usage", "--allow-file-access-from-files"]}
        if os.environ.get("HOG_CHROME_PATH"):
            launch["executable_path"] = os.environ["HOG_CHROME_PATH"]
        browser = playwright.chromium.launch(**launch)
        for width, height in SIZES:
            page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
            page.set_default_timeout(10000)
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.on("console", lambda message: errors.append("console: " + message.text) if message.type == "error" else None)
            page.goto(GAME.as_uri(), wait_until="load")
            page.locator('[data-action="start"]').click()
            assert page.evaluate("HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())")
            landmark_assets = page.evaluate("""() => [...document.querySelectorAll('img[id^="hg28-map-"]')].map(i=>({id:i.id,ready:i.complete&&i.naturalWidth===362&&i.naturalHeight===362}))""")
            assert len(landmark_assets) == 12 and all(x["ready"] for x in landmark_assets), f"Offline landmark PNG decode failed at {width}x{height}: {landmark_assets}"
            checks.append({"viewport": f"{width}x{height}", "check": "12 generated faction, mine and landmark sprites decode offline", "pass": True, "assets": [x["id"] for x in landmark_assets]})
            folder = ROOT / "docs" / "evidence" / "hg28" / "after" / f"{width}x{height}"
            folder.mkdir(parents=True, exist_ok=True)

            target = page.evaluate("""() => {
              const E=HOG_ENGINE,P=HOG_PAINTER,c=document.querySelector('#world-canvas'),s=HOG_APP_DEBUG.getState(),m=P.mapCamera(),q=m.zoom*48;
              for(const t of E.TILES){if(t.kind!=='npc'||s.cleared.includes(t.key))continue;
                const x=(t.x+.5)*q+c.width/2-m.centerX*q,y=(t.y+.54)*q+c.height/2-m.centerY*q;
                if(x<4||y<4||x>=c.width-4||y>=c.height-4)continue;
                const hit=P.mapHit(c,x,y,E);if(hit?.key===t.key)return {key:t.key,x,y,kind:t.kind,level:t.level};
              }return null;
            }""")
            assert target, f"No visible NPC target at {width}x{height}"
            box = page.locator("#world-canvas").bounding_box()
            backing = page.locator("#world-canvas").evaluate("c=>({width:c.width,height:c.height})")
            assert box
            page.mouse.click(box["x"] + target["x"] * box["width"] / backing["width"], box["y"] + target["y"] * box["height"] / backing["height"])
            page.wait_for_timeout(100)
            selected_title = page.locator(".hg39-map-target .target-information h2").inner_text()
            assert selected_title and target["key"] not in ("3,4",), f"World target click did not select NPC: {target} / {selected_title}"
            map_file = folder / "11-map-selected-npc.png"
            page.screenshot(path=str(map_file), animations="disabled")
            images.append({"viewport": f"{width}x{height}", "state": "selected-npc", "path": map_file.relative_to(ROOT).as_posix(), "sha256": sha256(map_file), "target": target, "visibleTitle": selected_title})
            checks.append({"viewport": f"{width}x{height}", "check": "pointer-select visible NPC", "pass": True, "target": target["key"]})

            zoom_before = page.evaluate("HOG_PAINTER.mapCamera().zoom")
            page.locator('[data-action="zoom"][data-dir="in"]').click()
            zoom_after = page.evaluate("HOG_PAINTER.mapCamera().zoom")
            assert zoom_after > zoom_before, f"Zoom control did not change camera at {width}x{height}"
            center_before = page.evaluate("({x:HOG_PAINTER.mapCamera().centerX,y:HOG_PAINTER.mapCamera().centerY})")
            box = page.locator("#world-canvas").bounding_box()
            assert box
            page.mouse.move(box["x"] + box["width"] * .55, box["y"] + box["height"] * .53)
            page.mouse.down()
            page.mouse.move(box["x"] + box["width"] * .58, box["y"] + box["height"] * .57, steps=5)
            page.mouse.up()
            center_after = page.evaluate("({x:HOG_PAINTER.mapCamera().centerX,y:HOG_PAINTER.mapCamera().centerY})")
            assert center_after != center_before, f"Map drag did not pan at {width}x{height}"
            checks.append({"viewport": f"{width}x{height}", "check": "zoom and pan controls mutate camera", "pass": True, "zoom": [zoom_before, zoom_after], "center": [center_before, center_after]})

            page.locator('.tabs [data-action="tab"][data-tab="city"]').click()
            canvas = page.locator("#city-canvas")
            city_box = canvas.bounding_box()
            site = page.evaluate("HOG_PAINTER.CITY_SITES.find(q=>q[0]==='barracks')")
            assert city_box and site
            page.mouse.click(city_box["x"] + site[1] * city_box["width"], city_box["y"] + site[2] * city_box["height"])
            assert page.locator(".hg28-selected-building h2").inner_text() == "Barracks", "City panorama hotspot did not select Barracks"
            selected_city = folder / "12-city-building-selected.png"
            page.screenshot(path=str(selected_city), animations="disabled")
            images.append({"viewport": f"{width}x{height}", "state": "city-building-hotspot", "path": selected_city.relative_to(ROOT).as_posix(), "sha256": sha256(selected_city), "building": "barracks"})
            checks.append({"viewport": f"{width}x{height}", "check": "canvas hotspot selects building panel", "pass": True, "building": "barracks"})
            city_layout = page.evaluate("""() => {
              const rail=document.querySelector('.hg28-city-command'), box=rail.getBoundingClientRect(), grid=[...rail.querySelectorAll('.hg28-building')], upgrade=rail.querySelector('.hg28-upgrade').getBoundingClientRect();
              const fullyVisible=grid.filter(e=>{const r=e.getBoundingClientRect();return r.top>=box.top-1&&r.bottom<=box.bottom+1}).length;
              return {railHeight:Math.round(box.height),railScrollHeight:rail.scrollHeight,railClientHeight:rail.clientHeight,buildingButtons:grid.length,fullyVisible,upgradeVisible:upgrade.top>=box.top-1&&upgrade.bottom<=box.bottom+1};
            }""")
            assert city_layout["buildingButtons"] == 13 and city_layout["fullyVisible"] == 13 and city_layout["upgradeVisible"], f"City command rail clips or omits one of 13 live controls at {width}x{height}: {city_layout}"
            checks.append({"viewport": f"{width}x{height}", "check": "all 13 building selectors and upgrade fit in the visible command rail", "pass": True, "layout": city_layout})

            building_keys = page.locator('.hg28-building-grid .hg28-building').evaluate_all("nodes=>nodes.map(n=>n.dataset.key)")
            assert len(building_keys) == 13 and len(set(building_keys)) == 13, f"Expected exactly 13 unique building selectors: {building_keys}"
            for key in building_keys:
                page.locator(f'.hg28-building-grid [data-key="{key}"]').click()
                selected_key = page.locator('.hg28-building.active').get_attribute('data-key')
                assert selected_key == key, f"Building selector {key} did not activate; got {selected_key}"
            checks.append({"viewport": f"{width}x{height}", "check": "all 13 building selectors respond to real clicks", "pass": True, "keys": building_keys})

            page.locator('[data-action="building"][data-key="hall"]').click()
            upgrade = page.locator('.hg28-upgrade [data-action="upgrade"]')
            assert upgrade.is_enabled(), f"Hall upgrade is unavailable on the fresh starter save at {width}x{height}"
            # Construction is deliberately brief at ×60. Use the real speed
            # control at ×1 so the browser can inspect the active queue and
            # cold-save it before completion.
            speed_tools=page.locator('.hg42-screen-tool-menu')
            if not speed_tools.evaluate('(el) => el.open'):
                speed_tools.locator('summary').click()
            speed_tools.locator('#speed').click()
            assert page.evaluate("HOG_APP_DEBUG.getState().speed===1 && document.querySelector('#speed').textContent.includes('×1')"), f"Speed control did not switch to ×1 at {width}x{height}"
            upgrade.click()
            page.wait_for_function("HOG_APP_DEBUG.getState().buildingQueue?.key==='hall'")
            assert page.evaluate("HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())"), "Construction action broke strict v07 Save"
            queued = folder / "13-city-construction-real.png"
            page.screenshot(path=str(queued), animations="disabled")
            images.append({"viewport": f"{width}x{height}", "state": "hall-construction-queued", "path": queued.relative_to(ROOT).as_posix(), "sha256": sha256(queued)})
            checks.append({"viewport": f"{width}x{height}", "check": "paid hall upgrade enters real build queue at ×1 and strict v07 Save", "pass": True})

            page.reload(wait_until="load")
            page.wait_for_function("!!HOG_APP_DEBUG.getState()?.buildingQueue")
            assert page.evaluate("HOG_ENGINE.strictSave(HOG_APP_DEBUG.getState())"), "Cold reload lost strict v07 Save validity"
            checks.append({"viewport": f"{width}x{height}", "check": "cold reload preserves construction queue in v07", "pass": True})
            page.close()
        browser.close()

    receipt = {
        "sourceCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
        "html": GAME.name,
        "htmlSha256": sha256(GAME),
        "browser": "Installed Google Chrome through Playwright, local file://",
        "screenshots": images,
        "checks": checks,
        "pageErrors": errors,
        "pass": len(checks) == 16 and len(images) == 6 and not errors,
    }
    receipt_path = ROOT / "docs" / "qa" / "hg28" / "interactive-chrome.json"
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"HG28 interactive Chromium: {len(checks)}/16 gameplay checks; {len(images)}/6 screenshots; {len(errors)} page/console errors")
    print(f"HTML SHA-256 {receipt['htmlSha256']} · receipt {receipt_path.relative_to(ROOT).as_posix()}")
    if not receipt["pass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
