#!/usr/bin/env python3
"""Capture 14 Muu Dinh Tam Quoc UI V2 views in an authorized Playwright Chromium.

Does not modify the HTML, game state, credentials, or browser policies.
Run where local URLs are permitted (for example, a standard GitHub Actions runner).
"""
from __future__ import annotations
import argparse
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--html", type=Path, default=Path(__file__).with_name("Muu_Dinh_Tam_Quoc_NgoaLong_UI_V2.html"))
    ap.add_argument("--out", type=Path, default=Path(__file__).with_name("QA_UI_V2_Screenshots"))
    ap.add_argument("--executable", default=None, help="Optional approved Chromium executable")
    args = ap.parse_args()
    path = args.html.resolve()
    if not path.is_file():
        raise SystemExit(f"HTML not found: {path}")
    args.out.mkdir(parents=True, exist_ok=True)

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *params, **kwargs):
            super().__init__(*params, directory=str(path.parent), **kwargs)
        def log_message(self, fmt, *params):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    url = f"http://127.0.0.1:{server.server_port}/{path.name}"
    results = {"html": path.name, "screens": [], "errors": [], "status": "PENDING"}
    try:
        with sync_playwright() as pw:
            opts = {"headless": True, "args": ["--no-sandbox", "--disable-dev-shm-usage"]}
            if args.executable:
                opts["executable_path"] = args.executable
            browser = pw.chromium.launch(**opts)
            try:
                for width, height in [(1280, 720), (390, 844)]:
                    page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
                    # Enable the game's own read-only QA state bridge, as used by
                    # canonical premerge tests; it survives a page.reload().
                    page.add_init_script("window.__P2_ENABLE_QA__=true;")
                    page_errors = []
                    page.on("pageerror", lambda err: page_errors.append(str(err)))
                    try:
                        page.goto(url, wait_until="domcontentloaded", timeout=20000)
                        page.wait_for_timeout(500)
                        tabs = page.locator('.nav[data-tab]').evaluate_all(
                            '(els) => els.map(x=>({id:x.dataset.tab,label:(x.textContent||"").trim()}))'
                        )
                        if not tabs:
                            results["errors"].append(f"{width}x{height}: no tabs found")
                        for tab in tabs:
                            button = page.locator(f'.nav[data-tab="{tab["id"]}"]')
                            button.click(timeout=5000)
                            page.wait_for_timeout(200)
                            metrics = page.evaluate("""() => ({
                                bodyScroll: document.body.scrollHeight,
                                innerH: window.innerHeight,
                                docW: document.documentElement.scrollWidth,
                                innerW: window.innerWidth,
                                navCount: document.querySelectorAll('.nav[data-tab]').length,
                                pageCounter: document.querySelector('#nl-screen-count')?.textContent || '',
                                contentLen: (document.querySelector('#view')?.innerText || '').length,
                                active: document.querySelector('.nav.active[data-tab]')?.dataset.tab || '',
                                windowTitle: (document.querySelector('#nl-screen-title')?.textContent || '').trim(),
                                screenControl: Boolean(document.querySelector('#nl-screen-select')),
                                bodyOverflow: getComputedStyle(document.body).overflow,
                                cityMapVisible: (() => {
                                    const map=document.querySelector('#view .city-visual');
                                    return Boolean(map && map.getClientRects().length && map.getBoundingClientRect().width > 100);
                                })(),
                                formationBoardVisible: Boolean(document.querySelector('#view .formation-board')?.getClientRects().length),
                                formationRosterVisible: Boolean(document.querySelector('#view .roster-list')?.getClientRects().length),
                                visiblePaneCount: Array.from(document.querySelector('#view')?.children || []).filter(
                                    node => !node.classList.contains('head')
                                        && getComputedStyle(node).display !== 'none'
                                        && node.getClientRects().length > 0
                                ).length,
                            })""")
                            name = f"{width}x{height}_{tab['id']}.png"
                            page.screenshot(path=str(args.out / name), full_page=False)
                            results["screens"].append({"viewport": f"{width}x{height}", "screen": tab["id"],
                                                       "label": tab["label"], "image": name, **metrics})
                            # QA must detect a blank screen and accidental document scroll, not only no JS exceptions.
                            if metrics["docW"] > width + 2 or metrics["bodyScroll"] > height + 2:
                                results["errors"].append(f"{width}x{height}/{tab['id']}: document overflow: {metrics}")
                            if metrics["active"] != tab["id"] or not metrics["screenControl"]:
                                results["errors"].append(f"{width}x{height}/{tab['id']}: window navigation inactive: {metrics}")
                            if metrics["contentLen"] < 24 or metrics["visiblePaneCount"] < 1:
                                results["errors"].append(f"{width}x{height}/{tab['id']}: screen appears blank: {metrics}")
                            if tab["id"] == "city" and not metrics["cityMapVisible"]:
                                results["errors"].append(f"{width}x{height}/city: city map is not the initial visible window")
                            if tab["id"] == "formation" and width <= 650:
                                if not metrics["formationBoardVisible"] or metrics["formationRosterVisible"]:
                                    results["errors"].append(f"{width}x{height}/formation: board/picker not separated on first window")
                                else:
                                    page.locator("#nl-screen-select").select_option("1")
                                    picker_visible = page.locator("#view .roster-list").is_visible()
                                    board_hidden = not page.locator("#view .formation-board").is_visible()
                                    if not picker_visible or not board_hidden:
                                        results["errors"].append(f"{width}x{height}/formation: picker subwindow not accessible")
                                    page.locator("#nl-screen-select").select_option("0")
                            # Check that page selectors actually reveal content; previous QA only
                            # checked first page and missed hidden controls in later windows.
                            if tab["id"] in {"city", "heroes", "campaign", "equipment", "formation"}:
                                pane_count = page.locator("#nl-screen-select option").count()
                                if pane_count < 1 or pane_count > 80:
                                    results["errors"].append(f"{width}x{height}/{tab['id']}: invalid pane count {pane_count}")
                                else:
                                    for index in range(pane_count):
                                        page.locator("#nl-screen-select").select_option(str(index))
                                        visible = page.evaluate("""() => {
                                            const v=document.querySelector('#view');
                                            return Array.from(v?.children || []).some(el =>
                                                !el.classList.contains('head')
                                                && getComputedStyle(el).display !== 'none'
                                                && el.getBoundingClientRect().height > 8);
                                        }""")
                                        if not visible:
                                            results["errors"].append(f"{width}x{height}/{tab['id']}: blank subwindow {index + 1}/{pane_count}")
                                    page.locator("#nl-screen-select").select_option("0")
                        if width <= 650:
                            # Real end-to-end UI interaction, not a screenshot-only assertion:
                            # choose an existing hero on subwindow 2, return to the board,
                            # assign to an empty slot, and verify Save v5 persists reload.
                            page.locator('.nav[data-tab="formation"]').click()
                            page.wait_for_function("""() =>
                                document.querySelector('.nav.active[data-tab="formation"]')
                                && (document.querySelector('#nl-screen-title')?.textContent || '').includes('Bày Trận')
                            """, timeout=3000)
                            page.wait_for_timeout(80)
                            hero_btn = page.locator(".roster-list [data-choose-hero]").first
                            picker_found = False
                            for picker_page in range(page.locator("#nl-screen-select option").count()):
                                page.locator("#nl-screen-select").select_option(str(picker_page))
                                page.wait_for_timeout(60)
                                if hero_btn.count() and hero_btn.is_visible():
                                    picker_found = True
                                    break
                            hero_id = hero_btn.get_attribute("data-choose-hero") if picker_found else None
                            if not picker_found or not hero_id:
                                page_labels = page.locator("#nl-screen-select option").all_text_contents()
                                results["errors"].append(f"Mobile formation: hero chooser not accessible in any subwindow: {page_labels}")
                            else:
                                hero_btn.click()
                                page.wait_for_timeout(150)
                                if not page.locator("#view .formation-board").is_visible():
                                    results["errors"].append("Mobile formation: hero selection did not return to board")
                                else:
                                    page.locator('#view [data-slot="0"]').click()
                                    saved = page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1')")
                                    game = json.loads(saved) if saved else {}
                                    if game.get("version") != 5 or game.get("slots", [None])[0] != hero_id:
                                        results["errors"].append("Mobile formation: hero slot was not saved under v5")
                                    else:
                                        page.reload(wait_until="domcontentloaded")
                                        page.locator('.nav[data-tab="formation"]').click()
                                        page.wait_for_timeout(150)
                                        # Visible game cards show a localized hero NAME, not the internal
                                        # hero ID. Verify both the persisted Save v5 state and the
                                        # actual runtime state instead of searching the rendered label.
                                        restored = page.evaluate("""() => {
                                            const raw=localStorage.getItem('muu_dinh_tam_quoc_v1');
                                            const saved=raw?JSON.parse(raw):null;
                                            const live=window.__P2_QA__?.getGame?.() ?? null;
                                            return {saveVersion:saved?.version,saveHero:saved?.slots?.[0],
                                                    liveHero:live?.slots?.[0]};
                                        }""")
                                        slot_node = page.locator('#view [data-slot="0"]')
                                        slot_display = slot_node.inner_text()
                                        slot_markup = slot_node.evaluate("(e)=>e.outerHTML.slice(0,650)")
                                        slot_occupied = "occupied" in (slot_node.get_attribute("class") or "").split()
                                        if (restored["saveVersion"] != 5
                                                or restored["saveHero"] != hero_id
                                                or restored["liveHero"] != hero_id
                                                or not slot_occupied):
                                            results["errors"].append(
                                                f"Mobile formation: persisted and visible board disagree: "
                                                f"{restored}; occupied={slot_occupied}; display={slot_display[:80]}; "
                                                f"markup={slot_markup}"
                                            )
                                        else:
                                            results.setdefault("interactions", []).append({
                                                "viewport": f"{width}x{height}",
                                                "flow": "hero-pick -> formation-slot -> Save v5 -> reload",
                                                "result": "PASS",
                                            })
                        results["errors"].extend([f"{width}x{height}: {e}" for e in page_errors])
                    except Exception as exc:
                        results["errors"].append(f"{width}x{height}: {type(exc).__name__}: {exc}")
                    finally:
                        page.close()
            finally:
                browser.close()
    except Exception as exc:
        results["errors"].append(f"Browser launch: {type(exc).__name__}: {exc}")
    finally:
        server.shutdown()
        server.server_close()

    results["status"] = "PASS" if len(results["screens"]) >= 28 and not results["errors"] else "BLOCKED_OR_FAIL"
    (args.out / "results.json").write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print("status:", results["status"], "screenshots:", len(results["screens"]))
    for e in results["errors"]:
        print("ERROR:", e[:350])
    return 0 if results["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
