#!/usr/bin/env python3
"""Group08 real Chromium focused gate: item UI, combat bonus, Save v5 and receipts.

Run AFTER tools/build_ngoa_long_items_v1.py. Never substitutes for full
legacy regression, real device QA or publisher-source provenance.
"""
from __future__ import annotations

import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SAVE_KEY = "muu_dinh_tam_quoc_v1"
STUB = """<script>window.__P2_ENABLE_QA__=true;
const __nlStore=__NL_STORE__;
Object.defineProperty(window,'localStorage',{configurable:true,value:{
getItem:k=>Object.prototype.hasOwnProperty.call(__nlStore,k)?__nlStore[k]:null,
setItem:(k,v)=>__nlStore[k]=String(v),
removeItem:k=>delete __nlStore[k],
clear:()=>Object.keys(__nlStore).forEach(k=>delete __nlStore[k])
}});</script>"""
checks: list[tuple[str,bool]] = []
errors: list[str] = []


def check(name: str, result: bool) -> None:
    status = bool(result)
    checks.append((name, status))
    print(("PASS " if status else "FAIL ") + name, flush=True)


def open_page(browser, stored: str | None = None, width: int = 1280):
    page = browser.new_page(viewport={"width": width, "height": 720 if width > 500 else 850})
    page.on("pageerror", lambda error: errors.append(str(error)))
    script = STUB.replace("__NL_STORE__", json.dumps(
        {} if stored is None else {SAVE_KEY: stored}, ensure_ascii=False))
    page.set_content(HTML.replace("<script>", script + "<script>", 1),
                     wait_until="domcontentloaded")
    return page


def state(page):
    return page.evaluate("window.__P2_QA__.getGame()")


def main() -> None:
    if "NL-ITEMS-INJECTED-BY-BUILDER" not in HTML:
        raise RuntimeError("NL item integration block missing from built canonical HTML")
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        page = open_page(browser)
        counts = page.evaluate("window.__NL_ITEM_QA__.getCounts()")
        check("411 playable + 392 reference gear, single-file runtime", counts ==
              {"playable": 411, "references": 392})
        original = state(page)
        check("Save schema v5 preserved and new item ledger exists",
              original["version"] == 5 and
              isinstance(original.get("nlItemsV1", {}).get("receipts"), dict))
        page.locator('.nav[data-tab="equipment"]').click()
        check("group 04 seven-slot equipment interface mounted",
              page.locator('[data-nl-item-bridge]').count() == 1 and
              page.locator('.nli-slot').count() == 7)
        check("legacy shop remains available for previous 19 project gear",
              page.locator('[data-buy]').count() == 19)
        page.locator('[data-nli-shop="1"]').click()
        purchase = page.locator('[data-nli-action="buy"][data-item="mdt-equip02-1"]')
        check("new project equipment is purchasable from real game screen",
              purchase.count() == 1 and purchase.is_enabled())
        purchase.click()
        bought = state(page)
        selected = next((x for x in bought["items"] if x["base"] == "mdt-equip02-1"), None)
        check("purchase debits Bạc/Lương exactly once and retains historical Sắt",
              selected is not None and original["silver"] - bought["silver"] == 920+154*4 and
              original["grain"] - bought["grain"] == (154+1)//2 and
              original["iron"] == bought["iron"])
        page.locator('[data-nli-shop="0"]').click()
        if selected:
            # Fail fast with a state/UI snapshot rather than waiting 30 seconds
            # for a locator that is absent after rerender.
            snap = page.evaluate("""uid=>({
                hero:window.__P2_QA__.getGame().roster[0],
                items:window.__P2_QA__.getGame().items.filter(x=>x.uid===uid),
                equipButtons:[...document.querySelectorAll('[data-nli-action="equip"]')]
                  .map(x=>({uid:x.getAttribute('data-uid'),disabled:x.disabled})),
                bridgeCount:document.querySelectorAll('[data-nl-item-bridge]').length,
                shopButton0:document.querySelector('[data-nli-shop="0"]')?.outerHTML,
                itemCards:[...document.querySelectorAll('.nli-gear')].slice(0,5)
                  .map(x=>x.outerHTML.slice(0,500))
              })""", selected["uid"])
            print("NL_ITEM_UI_AFTER_SHOP_SWITCH " + json.dumps(snap,ensure_ascii=False), flush=True)
            target = page.locator('[data-nli-action="equip"][data-uid="' + selected["uid"] + '"]')
            check("newly bought item visible in real bag UI after shop switch",
                  target.count() == 1)
            if target.count() == 1:
                target.click(timeout=1500)
        equipped = state(page)
        hero = equipped["roster"][0]
        actual_bonus = page.evaluate("h=>window.__NL_ITEM_QA__.bonus(h)", hero)
        legacy_qa_bonus = page.evaluate("h=>window.__NL_R03_QA__.equipmentStats(h)", hero)
        check("battle equipment bonuses resolve through new single authoritative resolver",
              selected is not None and
              equipped["gear"][hero]["weapon"] == selected["uid"] and
              actual_bonus["weaponAtk"] == 8 and actual_bonus == legacy_qa_bonus)
        if selected:
            page.locator('[data-nli-action="reinforce"][data-uid="' + selected["uid"] + '"]').click()
        enhanced = state(page)
        bonus_after = page.evaluate("h=>window.__NL_ITEM_QA__.bonus(h)", hero)
        check("enhance spends game resources and raises actual battle stats",
              selected is not None and
              next(x for x in enhanced["items"] if x["uid"] == selected["uid"])["lv"] == 2
              and bonus_after["weaponAtk"] > actual_bonus["weaponAtk"]
              and enhanced["silver"] == equipped["silver"] - 770
              and enhanced["grain"] == equipped["grain"] - 53
              and enhanced["iron"] == equipped["iron"])

        # QA-only semantic test: run the same settlement adapter twice, then reload
        # without granting extra items. This is NOT evidence of full 28-stage combat QA.
        award1 = page.evaluate("window.__NL_ITEM_QA__.settleStage(4)")
        post_award = state(page)
        award2 = page.evaluate("window.__NL_ITEM_QA__.settleStage(4)")
        repeated = state(page)
        check("one campaign reward receipt; duplicate settlement has no loot",
              award1 and not award2 and post_award["items"] == repeated["items"] and
              post_award["nlItemsV1"]["receipts"].get("nli:stage:4") is not None)
        # Persist to real fixture backing localStorage before reloading.
        saved = page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1')")
        page2 = open_page(browser, saved)
        restored = state(page2)
        check("Save/reload preserves item UID, bonus, receipts and v5 key",
              restored["version"] == 5 and
              restored["items"] == repeated["items"] and
              restored["gear"][hero] == repeated["gear"][hero] and
              restored["nlItemsV1"]["receipts"] == repeated["nlItemsV1"]["receipts"])
        no_regrant = page2.evaluate("window.__NL_ITEM_QA__.settleStage(4)")
        check("replay/repeated settlement after reload remains exactly-once",
              not no_regrant and len(state(page2)["items"]) == len(restored["items"]))

        # A pre-Group04 Save v5 with already-cleared stages must NOT retro-grant loot.
        old = dict(restored)
        old.pop("nlItemsV1", None)
        old["cleared"] = [1, 2, 3, 4]
        old_page = open_page(browser, json.dumps(old, ensure_ascii=False))
        legacy = state(old_page)
        check("v5 migration preserves cleared stages and snapshots historic baseline",
              legacy["version"] == 5 and legacy["cleared"] == [1, 2, 3, 4]
              and set(legacy["nlItemsV1"]["rewardBaseline"]) == {1, 2, 3, 4})
        before = len(legacy["items"])
        check("old completed stages do not pay retroactive duplicate equipment",
              not old_page.evaluate("window.__NL_ITEM_QA__.settleStage(4)") and
              len(state(old_page)["items"]) == before)

        mobile = open_page(browser, saved, width=390)
        mobile.locator('.nav[data-tab="equipment"]').click()
        mobile.locator('[data-nli-shop="1"]').click()
        check("mobile shop paginates 411 gear without rendering a huge list",
              mobile.locator('[data-nli-action="buy"]').count() == 30 and
              mobile.locator('[data-nli-page="1"]').count() == 1)
        mobile.locator('[data-nli-page="1"]').click()
        check("mobile equipment next page navigates within current panel",
              'Trang 2/' in mobile.locator('.nli-pages').inner_text())
        mobile.locator('[data-nli-search]').fill('Thanh Cương Kiếm')
        check("mobile equipment search filters the current shop",
              mobile.locator('.nli-gear').count() >= 1 and
              all('Thanh Cương Kiếm' in text for text in
                  mobile.locator('.nli-gear header strong').all_inner_texts()))
        mobile.locator('[data-nli-shop="0"]').click()
        mobile.locator('[data-nli-search]').fill('')
        mobile.locator('[data-nli-item-mode="wiki"]').click()
        mobile.locator('[data-nli-item-search]').fill('khong-co-san-pham-nay')
        check("mobile warehouse Wiki browser search remains read-only",
              mobile.locator('[data-nli-items-results="0"]').count() == 1 and
              mobile.locator('[data-nli-item-action]').count() == 0)
        overflow = mobile.evaluate("""() => ({
            viewport: innerWidth,
            document: document.documentElement.scrollWidth,
            body: document.body.scrollWidth,
            culprits: [...document.querySelectorAll('body *')].map(e => ({
                tag: e.tagName, className: typeof e.className==='string'?e.className:'',
                scrollWidth:e.scrollWidth, clientWidth:e.clientWidth,
                right:Math.round(e.getBoundingClientRect().right),
                left:Math.round(e.getBoundingClientRect().left)
            })).filter(e => e.right > innerWidth + 1 || e.left < -1)
               .sort((a,b)=>b.right-a.right).slice(0,15)
        })""")
        print("NL_ITEM_MOBILE_OVERFLOW " + json.dumps(overflow,ensure_ascii=False),flush=True)
        print("NL_ITEM_PAGE_ERRORS " + json.dumps(errors,ensure_ascii=False),flush=True)
        print("NL_ITEM_MOBILE_PANEL " + json.dumps({
            "slots": mobile.locator(".nli-slot").count(),
            "bridge": mobile.locator("[data-nl-item-bridge]").count(),
            "documentWidth": overflow["document"],
            "viewport": overflow["viewport"]
        }),flush=True)
        check("mobile 390px seven-slot panel has no sideways document overflow",
              mobile.locator('.nli-slot').count() == 7 and
              mobile.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"))
        check("no uncaught page errors", not errors)
        browser.close()
    passed = sum(int(ok) for _, ok in checks)
    print(f"NL_ITEM_INTEGRATION {passed}/{len(checks)}", flush=True)
    if passed != len(checks):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
