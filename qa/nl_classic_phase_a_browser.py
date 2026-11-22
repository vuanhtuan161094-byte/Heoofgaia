#!/usr/bin/env python3
"""Phase A Chromium gate: named recruiting, resources, taxation, merit, Save v5.

Runs against the one canonical HTML *after* the UI V2 adapter is injected.
No test bypass in release code. Tests use a localhost origin and real localStorage.
"""
from __future__ import annotations
import argparse
import json
import threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright


def check(condition, message):
    if not condition:
        raise AssertionError(message)
    print("PASS", message, flush=True)


def select_visible_pane(page, selector):
    el = page.locator(selector).first
    check(el.count() > 0, f"{selector} exists in live HTML")
    chooser = page.locator("#nl-screen-select")
    if chooser.count():
        for n in range(page.locator("#nl-screen-select option").count()):
            chooser.select_option(str(n))
            if el.is_visible():
                return el
    check(el.is_visible(), f"{selector} visible and actionable")
    return el


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", type=Path, default=Path("index.html"))
    args = parser.parse_args()
    src = args.html.resolve()
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=str(src.parent), **kw)
        def log_message(self, fmt, *a):
            return
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
            try:
                page = browser.new_page(viewport={"width": 390, "height": 844})
                page.add_init_script("window.__P2_ENABLE_QA__=true")
                errors = []
                page.on("pageerror", lambda e: errors.append(str(e)))
                page.goto(f"http://127.0.0.1:{server.server_port}/{src.name}", wait_until="domcontentloaded")
                page.wait_for_timeout(350)
                labels = page.locator("#resources .res span").all_text_contents()
                check(len(labels) == 5, "exactly five Ngọa Long WEB main resources")
                check(all(any(name in x for x in labels) for name in
                          ["Bạc", "Lương", "Uy danh", "Chiến công", "Quân lệnh"]),
                      "Bạc/Lương/Uy danh/Chiến công/Quân lệnh visible")
                check(not any("Gỗ" in x or "Sắt" in x or "Đồng" in x for x in labels),
                      "wood/iron/coin are not WEB core currencies")
                base = json.loads(page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1')"))
                check(base["version"] == 5 and "iron" in base, "Save v5 retains legacy iron without deletion")
                check(len(base["roster"]) == 3 and base["nlClassicA"]["merit"] == 180,
                      "three starting heroes, initial SIMULATED strategy merit")
                check(page.locator("[data-nla-tax]").count() == 1, "single Thành Chính tax control")
                page.locator('.nav[data-tab="heroes"]').click()
                button = select_visible_pane(page, '[data-nla-recruit="zhao"]')
                check(button.is_enabled(), "explicit starter recruitment available")
                check(page.locator('[data-recruit="1"]').count() == 0,
                      "legacy 1800-silver random recruitment button removed")
                button.click()
                page.wait_for_timeout(150)
                owned = json.loads(page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1')"))
                check(owned["roster"].count("zhao") == 1 and len(owned["roster"]) == 4,
                      "starter Zhaoyun grant exactly once, no random hero draw")
                check(owned["silver"] == base["silver"] and not owned["freeRecruit"],
                      "one free legacy recruitment voucher consumed without charge")
                page.locator('.nav[data-tab="heroes"]').click()
                check(not page.evaluate("window.__NL_CLASSIC_A_QA__.recruit('zhao')"),
                      "cannot recruit same hero twice")
                after_dup = json.loads(page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1')"))
                check(after_dup["silver"] == owned["silver"] and len(after_dup["roster"]) == 4,
                      "duplicate recruitment does not debit silver or duplicate hero")
                check(not page.evaluate("window.__NL_CLASSIC_A_QA__.recruit('huang')"),
                      "locked story hero cannot be recruited early")
                check(not page.evaluate("window.__NL_CLASSIC_A_QA__.recruit('zhuge')"),
                      "renown hero cannot bypass threshold")
                check(not page.evaluate("window.__NL_CLASSIC_A_QA__.recruit('sun')"),
                      "tavern hero cannot bypass stage gate")
                # Project-only fixture models gameplay-earned stage & renown conditions.
                seeded = json.loads(page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1')"))
                seeded["cleared"] = [1, 2, 3, 4, 5]
                seeded["prestige"] = 350
                # The game auto-saves its in-memory state on beforeunload.
                # Update the authoritative state before page.reload(), otherwise
                # beforeunload overwrites a localStorage-only fixture with old data.
                page.evaluate("data=>window.__P2_QA__.setGame(data)", seeded)
                page.evaluate("data=>localStorage.setItem('muu_dinh_tam_quoc_v1',JSON.stringify(data))", seeded)
                page.reload(wait_until="domcontentloaded")
                page.wait_for_timeout(200)
                probe = page.evaluate("""() => {
                    const q=window.__NL_CLASSIC_A_QA__,g=window.__P2_QA__.getGame();
                    return {cleared:g.cleared,roster:g.roster,prestige:g.prestige,
                        silver:g.silver,heroDefined:!!g.hero,huangDefined:typeof window.__NL_CLASSIC_A_QA__ !== 'undefined',
                        canHuang:q.canRecruit('huang'),canZhuge:q.canRecruit('zhuge'),
                        canSun:q.canRecruit('sun'),receipt:q.snapshot().recruitReceipts};
                }""")
                print("NL_CLASSIC_A_SEEDED_PROBE", json.dumps(probe,ensure_ascii=False), flush=True)
                check(page.evaluate("window.__NL_CLASSIC_A_QA__.recruit('huang')"),
                      "stage-gated hero claim works on authoritative roster")
                check(page.evaluate("window.__NL_CLASSIC_A_QA__.recruit('zhuge')"),
                      "renown-gated hero claim checks actual prestige")
                check(page.evaluate("window.__NL_CLASSIC_A_QA__.recruit('sun')"),
                      "tavern dialogue consumes a gated talk attempt")
                states = json.loads(page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1')"))
                check(all(states["roster"].count(id) == 1 for id in ["zhao", "huang", "zhuge", "sun"]),
                      "all three recruitment channels persist a unique hero ID")
                check(states["nlClassicA"]["talkUsed"] == 1 and len(states["nlClassicA"]["recruitReceipts"]) == 4,
                      "talk quota and recruitment ledger persisted")
                # Economy: first tax click and 11 remaining calls (max 12/day).
                page.locator('.nav[data-tab="city"]').click()
                tax_button = select_visible_pane(page, '[data-nla-tax]')
                silver_before = json.loads(page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1')"))["silver"]
                tax_button.click()
                page.wait_for_timeout(100)
                check(page.evaluate("window.__NL_CLASSIC_A_QA__.snapshot().taxUsed") == 1,
                      "first tax click debits one daily use")
                for _ in range(11):
                    check(page.evaluate("window.__NL_CLASSIC_A_QA__.tax()"), "additional tax within daily budget")
                check(not page.evaluate("window.__NL_CLASSIC_A_QA__.tax()"),
                      "13th tax action blocked after 12/day")
                state = json.loads(page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1')"))
                check(state["nlClassicA"]["taxUsed"] == 12 and len(state["nlClassicA"]["taxReceipts"]) == 12,
                      "tax uses/receipts are unique")
                check(state["silver"] > silver_before and state["nlClassicA"]["merit"] == 180,
                      "tax increases silver but cannot mint unlimited merit")
                # Tech progression uses real merit instead of hidden iron currency.
                page.locator('.nav[data-tab="tech"]').click()
                research_button = select_visible_pane(page, '[data-research="arms"]')
                check(research_button.is_enabled(), "first technology is unlocked")
                research_button.click()
                page.wait_for_timeout(120)
                post = json.loads(page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1')"))
                check(post["technology"]["arms"] >= 1 and post["nlClassicA"]["meritSpent"] >= 35,
                      "technology consumes simulated merit and upgrades existing combat consumer")
                check(post["iron"] == state["iron"], "old iron unaffected by classic technology research")
                page.reload(wait_until="domcontentloaded")
                page.wait_for_timeout(200)
                restored = json.loads(page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1')"))
                check(restored["version"] == 5 and restored["nlClassicA"]["taxUsed"] == 12
                      and restored["roster"].count("sun") == 1,
                      "Save v5 reload retains tax usage and unique recruited heroes")
                check(not errors, "zero Chromium page errors: " + "; ".join(errors[:3]))
                print("NL_CLASSIC_PHASE_A: PASS", flush=True)
            finally:
                browser.close()
    finally:
        server.shutdown()
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
