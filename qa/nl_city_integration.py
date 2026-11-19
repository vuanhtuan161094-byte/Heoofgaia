#!/usr/bin/env python3
"""CHAT03 canonical offline city integration: Chromium UI, receipts, Save-v5 and reload."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
SAVE_KEY = "muu_dinh_tam_quoc_v1"
STUB = """<script>window.__P2_ENABLE_QA__=true;const __store=__NL_STORE__;
Object.defineProperty(window,'localStorage',{configurable:true,value:{
getItem:k=>Object.prototype.hasOwnProperty.call(__store,k)?__store[k]:null,
setItem:(k,v)=>__store[k]=String(v),removeItem:k=>delete __store[k],
clear:()=>Object.keys(__store).forEach(k=>delete __store[k])}});</script>"""

checks = []
errors = []

def check(name, value):
    ok = bool(value)
    checks.append({"name": name, "pass": ok})
    print(("PASS " if ok else "FAIL ") + name, flush=True)

def page_for(browser, saved=None, width=1280):
    page = browser.new_page(viewport={"width": width, "height": 720 if width > 600 else 844})
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    payload = {} if saved is None else {SAVE_KEY: saved}
    markup = HTML.replace("<script>", STUB.replace("__NL_STORE__",
        json.dumps(payload, ensure_ascii=False)) + "<script>", 1)
    page.set_content(markup, wait_until="domcontentloaded")
    return page

def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"])
        page = page_for(browser)
        ready = page.evaluate("""()=>({
          loaded:!!window.__NL_CITY_QA__,
          coverage:window.__NL_CITY_QA__?.coverage || null,
          saveVersion:window.__P2_QA__?.getGame()?.version,
          city:!!window.__P2_QA__?.getGame()?.nlCity
        })""")
        check("single-game CHAT03 runtime registers with Save v5",
              ready["loaded"] and ready["saveVersion"] == 5 and ready["city"])
        check("CHAT03 catalog exposes 31 city + 7 legacy + 8 research",
              ready["coverage"] == {"cityBuildings":31,"legacyBuildings":7,"techs":8})
        tactics = page.evaluate("window.__NL_TACTICS_QA__?.summary() || null")
        check("CHAT02/05 registers 25 troop contracts, 28 PvE plans and 8 Boss plans",
              tactics is not None and tactics.get("projectTroops") == 25 and
              tactics.get("stagePlans") == 28 and tactics.get("bossPlans") == 8)
        check("Wiki IDs remain unverified and native P2 keeps rewards",
              tactics is not None and tactics.get("officialWikiTroopBindings") == 0 and
              tactics.get("liveV2CombatEnabled") is True and
              tactics.get("rewardAuthority") == "native-p2")
        page.locator('.nav[data-tab="campaign"]').click()
        check("stage-one V2 tactical data appears inside the real campaign UI",
              page.locator('[data-nl-v2-intel="1"]').count() == 1)
        check("Boss 28 authored tactical dossier comes from the same source pack",
              "final-war-drum" in page.evaluate("window.__NL_TACTICS_QA__.renderStage(28)"))
        page.locator('.nav[data-tab="city"]').click()
        check("native city and new live building panel coexist",
              page.locator('[data-nl-command]').count() == 1 and
              page.locator('[data-nl-city-panel]').count() == 1 and
              page.locator('[data-nl-city-kind="select"]').count() == 38)
        check("existing four original legacy resources remain visible",
              all(x in page.locator('[data-nl-city-panel]').inner_text()
                  for x in ["Bạc","Lương","Sắt","Uy danh"]))
        # Supply test resources through the existing QA state authority, not the city engine.
        original = page.evaluate("window.__P2_QA__.getGame()")
        original.update({"silver":100000,"grain":50000,"iron":20000})
        page.evaluate("g=>window.__P2_QA__.setGame(g)", original)
        page.locator('.nav[data-tab="city"]').click()
        page.locator('[data-nl-city-kind="select"][data-nl-city-id="nl_city_ironworks"]').click()
        upgrade = page.locator('[data-nl-city-kind="build"][data-nl-city-id="nl_city_ironworks"]')
        check("new building exposes executable paid construction button",
              upgrade.count() == 1 and upgrade.is_enabled())
        upgrade.click()
        after = page.evaluate("window.__P2_QA__.getGame()")
        receipt = after["nlCity"]["receipts"]
        check("construction reserves one job and debits actual game resources",
              after["nlCity"].get("construction",{}).get("id") == "nl_city_ironworks" and
              after["silver"] < original["silver"] and
              after["grain"] < original["grain"] and
              after["iron"] < original["iron"] and len(receipt) == 1)
        check("single persisted city receipt and schema-v5 authority",
              after["version"] == 5 and
              len(after["nlCity"]["receiptIndex"]) == 1 and
              receipt[0]["kind"] == "build")
        saved = page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1')")
        check("construction immediately saved in original save key",
              isinstance(saved,str) and '"nlCity"' in saved and '"version":5' in saved)
        page.locator('.nav[data-tab="heroes"]').click()
        page.locator('.nav[data-tab="city"]').click()
        check("city panel unmounts and rebinds after native renderer replacement",
              page.locator('[data-nl-city-panel]').count() == 1)
        reopened = page_for(browser, saved)
        reloaded = reopened.evaluate("window.__P2_QA__.getGame()")
        check("reload preserves construction, costs and one-time receipt",
              reloaded["silver"] == after["silver"] and
              reloaded["nlCity"]["receiptIndex"] == after["nlCity"]["receiptIndex"] and
              reloaded["nlCity"].get("construction",{}).get("id") == "nl_city_ironworks")
        mobile = page_for(browser, saved, 390)
        mobile.locator('.nav[data-tab="city"]').click()
        check("mobile 390px shows city tiles and no horizontal overflow",
              mobile.locator('[data-nl-city-kind="select"]').count() == 38 and
              mobile.evaluate("document.documentElement.scrollWidth <= innerWidth + 4"))
        check("no new Chromium exceptions", not errors)
        for tab in (page, reopened, mobile):
            tab.close()
        browser.close()
    report = {"name":"NL_CITY_CHAT03_CANONICAL","total":len(checks),
              "passed":sum(x["pass"] for x in checks),
              "failed":[x["name"] for x in checks if not x["pass"]],
              "pageErrors":errors}
    (ROOT / "qa/NL_CITY_INTEGRATION.json").write_text(
        json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False), flush=True)
    return 0 if not report["failed"] else 1

if __name__ == "__main__":
    sys.exit(main())
