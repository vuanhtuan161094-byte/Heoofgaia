"""Chromium evidence for CL-P3 territory income, upkeep, buildings and save migration."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa"
HTML_PATH = ROOT / "index.html"
RESULT = []


def check(name, condition):
    ok = bool(condition)
    RESULT.append({"name": name, "pass": ok})
    print(("PASS" if ok else "FAIL") + " " + name, flush=True)
    return ok


def economy_fixture(page, owned, garrisons, grain=10000, minutes=10):
    state = page.evaluate("window.__P2_QA__.getGame()")
    now = page.evaluate("Date.now()")
    state["lastTick"] = now + 86400000
    state["silver"], state["grain"], state["wood"], state["iron"] = 0, grain, 0, 0
    state["cltq"]["owners"] = {"capital": "player", **{n: "player" for n in owned}}
    state["cltq"]["garrisons"] = garrisons
    for hero_id in {hero for group in garrisons.values() for hero in group}:
        state["hero"][hero_id]["troops"] = 1500
    state["cltq"]["selectedArmy"] = [
        h for h in state["cltq"]["selectedArmy"]
        if h not in {hero for group in garrisons.values() for hero in group}
    ]
    state["cltq"]["economy"] = {
        "schema": 1,
        "lastAt": now - minutes * 60000,
        "productionRemainder": {"silver": 0, "grain": 0, "iron": 0},
        "upkeepRemainder": 0,
        "supply": 100,
        "shortageTicks": 0,
        "seq": 1,
        "receipts": [],
        "totals": {"silver": 0, "grain": 0, "iron": 0, "upkeep": 0, "shortage": 0},
    }
    page.evaluate("s => window.__P2_QA__.setGame(s)", state)
    return state, now


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        page.add_init_script("window.__P2_ENABLE_QA__=true;const __clP3Interval=window.setInterval.bind(window);window.setInterval=(fn,delay,...args)=>delay===1000?0:__clP3Interval(fn,delay,...args);")
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(HTML_PATH.as_uri(), wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(250)

        game = page.evaluate("window.__P2_QA__.getGame()")
        check("CL-P3 QA interfaces initialize from canonical offline game", page.evaluate("typeof window.__CLTQ_P3_QA__==='object'"))
        check("v1-v4-compatible save migrates to v5 without changing save key", game["version"] == 5 and "cltq" in game and page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1')!==null"))
        check("nine functional city building categories exist", page.evaluate("window.__CLTQ_P3_QA__.buildingCount()===9"))
        check("city renders nine selectable buildings including walls and lumberyard", page.locator("[data-focus-building]").count() == 9 and page.locator('[data-focus-building="lumberyard"]').count() == 1)
        check("city shows live territory economy and supply status", page.locator(".cl-p3-economy").count() == 1 and "Sản lượng cập nhật mỗi 10 giây" in page.locator(".cl-p3-economy").inner_text())
        page.screenshot(path=str(OUT / "cl-p3-city.png"), full_page=True)

        before = page.evaluate("window.__P2_QA__.getGame()")
        page.locator('[data-focus-building="walls"]').click()
        check("wall detail opens through the actual city control", page.locator('[data-upgrade="walls"]').count() == 1)
        page.locator('[data-upgrade="walls"]').click()
        page.evaluate("document.getElementById('toast-mount').innerHTML=''")
        after = page.evaluate("window.__P2_QA__.getGame()")
        check("building improvement debits its real silver and iron cost once", after["buildings"]["walls"] == before["buildings"]["walls"] + 1 and before["silver"] - after["silver"] == 900 and before["iron"] - after["iron"] == 160)
        before_lumber = after
        page.locator('[data-focus-building="lumberyard"]').click()
        check("lumberyard shows its wood construction cost", "120" in page.locator("#detail-building").inner_text() and page.locator('[data-upgrade="lumberyard"]').count() == 1)
        page.locator('[data-upgrade="lumberyard"]').click()
        after_lumber = page.evaluate("window.__P2_QA__.getGame()")
        check("lumberyard consumes silver, iron and wood exactly once", after_lumber["buildings"]["lumberyard"] == 2 and before_lumber["silver"] - after_lumber["silver"] == 700 and before_lumber["iron"] - after_lumber["iron"] == 80 and before_lumber["wood"] - after_lumber["wood"] == 120)
        fort = page.evaluate("id=>{let g=window.__P2_QA__.getGame();g.buildings.walls=1;window.__P2_QA__.setGame(g);const low=window.__CLTQ_P3_QA__.defenseUnit(id);g=window.__P2_QA__.getGame();g.buildings.walls=2;window.__P2_QA__.setGame(g);const high=window.__CLTQ_P3_QA__.defenseUnit(id);return {low,high}}", game["roster"][0])
        check("wall level raises actual defending-unit health and defenses", fort["high"]["maxHp"] > fort["low"]["maxHp"] and fort["high"]["def"] > fort["low"]["def"] and fort["high"]["tdef"] > fort["low"]["tdef"] and fort["high"]["mdef"] > fort["low"]["mdef"])

        hero_ids = game["cltq"]["commanders"][:3]
        for hero_id in hero_ids:
            game["hero"][hero_id]["troops"] = 1500
        _, now = economy_fixture(page, ["outpost", "fort"], {"outpost": [hero_ids[0]]}, grain=10000, minutes=10)
        check("only owned provinces connected by owned roads produce", page.evaluate("window.__CLTQ_P3_QA__.connected().map(n=>n.id)") == ["outpost"])
        receipt = page.evaluate("now=>window.__CLTQ_P3_QA__.process(now)", now)
        econ = page.evaluate("window.__P2_QA__.getGame()")
        check("ten-minute province and lumberyard output credits all four resources", receipt["ticks"] == 60 and receipt["produced"] == {"silver": 120, "grain": 180, "wood": 1200, "iron": 35} and econ["silver"] == 120 and econ["wood"] == 1200 and econ["iron"] == 35)
        check("garrison upkeep is charged from grain once per economy interval", receipt["upkeep"] == 180 and receipt["paid"] == 180 and econ["grain"] == 10000)
        check("replaying the same economy cursor cannot duplicate resources or receipts", page.evaluate("now=>window.__CLTQ_P3_QA__.process(now)", now) is None and page.evaluate("window.__P2_QA__.getGame().cltq.economy.receipts.length") == 1)

        shortage_state, now = economy_fixture(page, [], {"capital": hero_ids}, grain=1, minutes=10)
        for hero_id in hero_ids:
            shortage_state["hero"][hero_id]["troops"] = 3000
        page.evaluate("s=>window.__P2_QA__.setGame(s)", shortage_state)
        shortage = page.evaluate("now=>window.__CLTQ_P3_QA__.process(now)", now)
        poor = page.evaluate("window.__P2_QA__.getGame()")
        check("supply shortage never creates negative grain and records unpaid upkeep", poor["grain"] == 0 and shortage["shortage"] > 0 and poor["cltq"]["economy"]["totals"]["shortage"] == shortage["shortage"])
        weak_supply = poor["cltq"]["economy"]["supply"]
        poor["grain"] = 5000
        page.evaluate("s=>window.__P2_QA__.setGame(s)", poor)
        recovery = page.evaluate("now=>window.__CLTQ_P3_QA__.process(now)", now + 610000)
        check("funded garrison resumes upkeep and recovers supply", recovery["paid"] > 0 and page.evaluate("window.__P2_QA__.getGame().cltq.economy.supply") > weak_supply)

        page.evaluate("window.__P2_QA__.selectTab('heroes')")
        state, now = economy_fixture(page, ["outpost"], {"outpost": [hero_ids[0]]}, grain=50000, minutes=0)
        start = now
        receipts = page.evaluate("start=>{let ids=[];for(let i=1;i<=30;i++){let r=window.__CLTQ_P3_QA__.process(start+i*60000);ids.push(r?.id)}return ids}", start)
        loop_state = page.evaluate("window.__P2_QA__.getGame()")
        check("simulated 30-minute strategy loop completes 30 paid transactions", len(receipts) == 30 and len(set(receipts)) == 30 and loop_state["cltq"]["economy"]["receipts"][0]["ticks"] == 6)
        check("long-loop ledger totals equal actual delivered outputs and upkeep", all(loop_state["cltq"]["economy"]["totals"][k] == sum((r["produced"][k] if k in ("silver", "grain", "wood", "iron") else r["paid"]) for r in loop_state["cltq"]["economy"]["receipts"]) for k in ("silver", "grain", "wood", "iron", "upkeep")))
        same_time = page.evaluate("t=>window.__CLTQ_P3_QA__.process(t)", start + 1800000)
        backward = page.evaluate("t=>window.__CLTQ_P3_QA__.process(t)", start - 86400000)
        check("duplicate and backwards clock calls cannot farm province income", same_time is None and backward is None)

        state = page.evaluate("window.__P2_QA__.getGame()")
        now = page.evaluate("Date.now()")
        state["lastTick"] = now + 86400000
        state["cltq"]["economy"]["lastAt"] = now - 72 * 3600000
        state["cltq"]["economy"]["receipts"] = []
        state["cltq"]["economy"]["seq"] = 1
        page.evaluate("s=>window.__P2_QA__.setGame(s)", state)
        capped = page.evaluate("t=>window.__CLTQ_P3_QA__.process(t)", now)
        check("offline production is capped at four hours and cursor advances to now", capped["ticks"] == 1440 and capped["to"] == now)
        check("repeated poll after offline cap cannot mint another four hours", page.evaluate("t=>window.__CLTQ_P3_QA__.process(t)", now) is None)

        for legacy_version in (1, 2, 3, 4):
            legacy = page.evaluate("window.__P2_QA__.getGame()")
            legacy["version"] = legacy_version
            legacy.pop("wood", None)
            legacy["buildings"].pop("walls", None)
            legacy["buildings"].pop("lumberyard", None)
            legacy["cltq"].pop("economy", None)
            page.evaluate("s=>window.__P2_QA__.setGame(s)", legacy)
            migrated = page.evaluate("window.__P2_QA__.getGame()")
            check(f"v{legacy_version} save migration adds defaults without clearing game state", migrated["version"] == 5 and migrated["buildings"]["walls"] == 1 and migrated["buildings"]["lumberyard"] == 1 and migrated["wood"] == 1000 and migrated["silver"] == legacy["silver"] and migrated["cltq"]["economy"]["supply"] == 100)

        import_state = page.evaluate("()=>{const g=window.__P2_QA__.getGame(),now=Date.now();g.silver=1234;g.wood=567;g.lastTick=now-60000;g.cltq.economy.lastAt=now-60000;g.cltq.economy.seq=77;g.cltq.economy.receipts=[];return g}")
        import_file = OUT / "cl-p3-import-fixture.json"
        import_file.write_text(json.dumps(import_state, ensure_ascii=False), encoding="utf-8")
        import_started = page.evaluate("Date.now()")
        page.evaluate("window.__P2_QA__.selectTab('journal')")
        page.locator("#import-save").set_input_files(str(import_file))
        page.wait_for_function("window.__P2_QA__.getGame().cltq.economy.seq===77", timeout=5000)
        imported = page.evaluate("window.__P2_QA__.getGame()")
        check("JSON import preserves inventory but resets offline cursor to prevent replay farming", imported["silver"] == 1234 and imported["wood"] == 567 and imported["cltq"]["economy"]["lastAt"] >= import_started and imported["cltq"]["economy"]["lastAt"] > import_state["cltq"]["economy"]["lastAt"])
        import_file.unlink(missing_ok=True)

        final = page.evaluate("window.__P2_QA__.getGame()")
        page.evaluate("window.scrollTo(0,0);document.getElementById('toast-mount').innerHTML=''")
        page.locator('[data-tab="world"]').click()
        page.screenshot(path=str(OUT / "cl-p3-territory.png"), full_page=True)
        check("territory panel renders live production and upkeep after migration", page.locator(".cl-p3-economy").count() == 1 and page.locator(".cl-node[data-cl-node]").count() == 10)
        page.set_viewport_size({"width": 390, "height": 844})
        check("mobile province economy has no horizontal page overflow", page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
        page.evaluate("window.scrollTo(0,0)")
        page.locator('[data-tab="city"]').click()
        check("mobile city retains nine reachable building controls", page.locator("[data-focus-building]").count() == 9 and page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
        page.screenshot(path=str(OUT / "cl-p3-city-mobile.png"), full_page=True)
        page.set_viewport_size({"width": 1280, "height": 720})
        page.reload(wait_until="domcontentloaded")
        page.wait_for_timeout(200)
        saved = page.evaluate("window.__P2_QA__.getGame()")
        check("file reload retains schema v5 building and strategic economy ledger", saved["version"] == 5 and saved["buildings"]["walls"] == 1 and saved["cltq"]["economy"]["receipts"] == final["cltq"]["economy"]["receipts"])
        check("Chromium run has no page errors", not errors)
        browser.close()

    passed = sum(1 for row in RESULT if row["pass"])
    payload = {"suite": "CL-P3 strategic economy", "sourceSha256": hashlib.sha256(HTML_PATH.read_bytes()).hexdigest(), "passed": passed, "total": len(RESULT), "checks": RESULT, "pageErrors": errors}
    (OUT / "CL_P3_ECONOMY.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nCL-P3 ECONOMY: {passed}/{len(RESULT)} PASS", flush=True)
    if passed != len(RESULT):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
