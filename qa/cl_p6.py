"""Chromium flows for CL-P6 diplomacy, climate, siege engines and parallel armies."""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa"
HTML = ROOT / "index.html"
CHECKS: list[dict] = []
sys.stdout.reconfigure(encoding="utf-8")


def check(name: str, condition: object, evidence: dict | None = None) -> bool:
    passed = bool(condition)
    CHECKS.append({"name": name, "pass": passed, "evidence": evidence or {}})
    print(("PASS" if passed else "FAIL") + " " + name, flush=True)
    return passed


def fixture(page) -> dict:
    state = page.evaluate("window.__P2_QA__.getGame()")
    ids = page.evaluate("window.__CLTQ_P4_QA__.allHeroIds()")
    state["roster"] = ids
    for hero_id in ids:
        state["hero"][hero_id] = {"level": 35, "xp": 0, "troops": 1500}
    state["cltq"]["commanders"] = ids[:5]
    state["cltq"]["selectedArmy"] = ids[:5]
    state["cltq"]["owners"] = {"capital": "player"}
    state["cltq"]["garrisons"] = {}
    state["cltq"]["marches"] = []
    state["cltq"]["activeMarchId"] = None
    state["cltq"]["receipts"] = []
    state["cltq"]["captureReceipts"] = []
    state["cltq"]["p6"] = {
        "schema": 1,
        "turn": 0,
        "nextSeq": 1,
        "relations": {"wei": -1, "shu": 0, "wu": -1, "qun": 0},
        "pacts": [],
        "armies": {"wing": {"id": "wing", "name": "Đạo quân cánh", "commanders": ids[5:10], "location": "capital"}},
        "marches": [],
        "siegeEngines": 0,
        "turnEvents": [],
    }
    state["silver"], state["grain"], state["wood"], state["iron"] = 100000, 100000, 100000, 100000
    page.evaluate("s=>window.__P2_QA__.setGame(s)", state)
    return state


def open_world(page) -> None:
    page.add_init_script("window.__P2_ENABLE_QA__=true;")
    page.goto(HTML.as_uri(), wait_until="domcontentloaded", timeout=30000)
    page.wait_for_function("window.__CLTQ_P6_QA__ && window.__P2_QA__", timeout=30000)
    fixture(page)
    page.locator('[data-tab="world"]').click()
    page.wait_for_selector(".cl-p6-panel", timeout=10000)


def main() -> None:
    errors: list[str] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        page = browser.new_page(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
        page.on("pageerror", lambda error: errors.append(str(error)))
        open_world(page)
        initial = page.evaluate("window.__P2_QA__.getGame()")
        state = page.evaluate("window.__CLTQ_P6_QA__.getState()")
        main_ids = set(initial["cltq"]["commanders"])
        wing_ids = set(state["armies"]["wing"]["commanders"])
        check("P6 adds nested strategy state without changing Save schema 5 or key", initial["version"] == 5 and "p6" in initial["cltq"] and page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1')!==null"))
        check("second army starts with at least three unique commanders", len(wing_ids & main_ids) == 0 and len(wing_ids) >= 3 and page.locator("[data-p6-slot]").count() == 5, {"wing": sorted(wing_ids), "main": sorted(main_ids)})
        factions = page.evaluate("window.__CLTQ_QA__.nodes().map(n=>n.faction)")
        check("province NPCs have explicit Wei, Shu, Wu and Qun diplomacy ownership", {"wei", "shu", "wu", "qun"}.issubset(set(factions)))
        climate = page.evaluate("window.__CLTQ_P6_QA__.climate(0)")
        terms = page.evaluate("window.__CLTQ_P6_QA__.marchTerms(100,10,{weather:'rain'})")
        check("season and weather forecasts are deterministic and affect route cost and ETA", climate["season"] == "Xuân" and climate["weather"] == "clear" and terms["grain"] == 118 and terms["seconds"] == 12, {"climate": climate, "rainTerms": terms})

        before = page.evaluate("window.__P2_QA__.getGame()")
        page.locator('[data-p6-envoy="wei"]').click()
        after1 = page.evaluate("window.__P2_QA__.getGame()")
        check("sending an envoy spends silver and grain and improves Wei relation once", after1["cltq"]["p6"]["relations"]["wei"] == 0 and before["silver"]-after1["silver"] == 650 and before["grain"]-after1["grain"] == 180)
        page.locator('[data-p6-envoy="wei"]').click()
        page.locator('[data-p6-envoy="wei"]').click()
        check("additional envoys improve relations one step at a time and advance the season clock", page.evaluate("window.__CLTQ_P6_QA__.getState().relations.wei===2 && window.__CLTQ_P6_QA__.climate().turn===3"))
        before_pact = page.evaluate("window.__P2_QA__.getGame()")
        page.locator('[data-p6-pact="wei"]').click()
        pact_state = page.evaluate("window.__CLTQ_P6_QA__.getState()")
        after_pact = page.evaluate("window.__P2_QA__.getGame()")
        check("signing the pact has a real cost, a trade bonus and protected territory", "wei" in pact_state["pacts"] and pact_state["relations"]["wei"] == 2 and before_pact["silver"]-after_pact["silver"] == 1200 and before_pact["iron"]-after_pact["iron"] == 260 and page.evaluate("window.__CLTQ_P6_QA__.tradeBonus()") == 1.04)
        blocked_before = page.evaluate("window.__P2_QA__.getGame().grain")
        page.evaluate("window.__CLTQ_QA__.debugState().owners.outpost='player';window.__CLTQ_QA__.render()")
        page.evaluate("window.__P2_QA__.getGame()")
        page.evaluate("window.__CLTQ_QA__.debugState().selectedNode='mine';window.__CLTQ_QA__.render()")
        page.locator('[data-cl-march="mine"]').click(timeout=1000) if page.locator('[data-cl-march="mine"]').count() else page.evaluate("window.__CLTQ_QA__.startMarch('mine')")
        check("pact blocks attacks on allied Wei nodes without spending grain", page.evaluate("window.__P2_QA__.getGame().grain") == blocked_before and page.evaluate("window.__CLTQ_QA__.getState().marches.length") == 0)
        page.locator('[data-p6-break="wei"]').click()
        check("breaking a pact removes its trade bonus and lowers relation by two", "wei" not in page.evaluate("window.__CLTQ_P6_QA__.getState().pacts") and page.evaluate("window.__CLTQ_P6_QA__.getState().relations.wei===0 && window.__CLTQ_P6_QA__.tradeBonus()===1"))

        page.evaluate("window.__CLTQ_QA__.debugState().owners={capital:'player'};window.__CLTQ_P6_QA__.setState({turn:1});window.__CLTQ_QA__.render()")
        page.locator('[data-cl-node="outpost"]').click()
        route_text = page.locator(".cl-map-panel .cl-map-status").first.inner_text()
        expected = page.evaluate("window.__CLTQ_P6_QA__.marchTerms(948,20,window.__CLTQ_P6_QA__.climate())")
        check("primary army route preview includes rain-proportioned provisions and delay", f"{expected['grain']}" in route_text and f"{expected['seconds']} giây" in route_text, {"preview": route_text, "expected": expected})
        main_before = page.evaluate("window.__P2_QA__.getGame().grain")
        page.locator('[data-cl-march="outpost"]').click()
        main_march = page.evaluate("window.__CLTQ_QA__.getState().marches.at(-1)")
        check("primary army pays the weather-adjusted cost and saves its dispatch forecast", main_before-page.evaluate("window.__P2_QA__.getGame().grain") == expected["grain"] and main_march["weather"] == "rain" and main_march["seconds"] == expected["seconds"])
        page.evaluate("window.__CLTQ_P6_QA__.setState({turn:1})")
        page.locator('[data-cl-node="farm"]').click()
        second_before = page.evaluate("window.__P2_QA__.getGame().grain")
        page.locator('[data-p6-march="farm"]').click()
        secondary = page.evaluate("window.__CLTQ_P6_QA__.activeMarch()")
        check("second army marches to another province while the primary army is still marching", secondary["status"] == "marching" and page.evaluate("window.__CLTQ_QA__.getState().marches.at(-1).status==='marching'") and secondary["to"] == "farm" and second_before > page.evaluate("window.__P2_QA__.getGame().grain"))

        resource_before = page.evaluate("window.__P2_QA__.getGame()")
        page.locator('[data-p6-siege-build="1"]').click()
        built = page.evaluate("window.__CLTQ_P6_QA__.getState().siegeEngines")
        resource_after = page.evaluate("window.__P2_QA__.getGame()")
        check("building a siege engine consumes silver, wood and iron", built == 1 and resource_before["silver"]-resource_after["silver"] == 550 and resource_before["wood"]-resource_after["wood"] == 700 and resource_before["iron"]-resource_after["iron"] == 420)
        page.evaluate("window.__CLTQ_P6_QA__.advanceWing()")
        check("second army reaches its own saved arrival state", page.evaluate("window.__CLTQ_P6_QA__.activeMarch().status==='arrived'"))
        page.locator('[data-p6-attack="farm"]').click()
        battle = page.evaluate("window.__P2_QA__.getBattle()")
        base_attack = page.evaluate("id=>window.__P2_QA__.makeUnit(id,'p',1,1).atk", battle["p"][0]["id"])
        check("wing siege uses real combat, applies its saved rain forecast and reserves the machine", battle["cltq"]["kind"] == "p6_siege" and battle["cltq"]["armyId"] == "wing" and battle["cltq"]["weather"] == "rain" and battle["p"][0]["atk"] < base_attack and battle["cltq"]["usesSiegeEngine"] and {u["id"] for u in battle["p"]} == wing_ids)
        page.screenshot(path=str(OUT / "cl-p6-battle.png"))
        page.evaluate("""()=>{const b=window.__P2_QA__.debugBattle();for(const u of b.p){u.speed=2000;u.atk=u.catk=u.matk=12000;u.crit=.95;u.morale=100;}for(const u of b.e){u.hp=1;u.maxHp=1;u.alive=true;}window.__P2_QA__.skipBattle();}""")
        settled = page.evaluate("window.__P2_QA__.getGame()")
        receipt_count = len(settled["cltq"]["receipts"])
        check("wing victory captures the farm, advances its garrison location and consumes one machine", settled["cltq"]["owners"].get("farm") == "player" and settled["cltq"]["p6"]["armies"]["wing"]["location"] == "farm" and settled["cltq"]["p6"]["siegeEngines"] == 0)
        check("wing receipt identifies the second army, weather and captured battle once", settled["battleReports"][-1]["cltqOutcome"]["kind"] == "p6_siege" and settled["battleReports"][-1]["cltqOutcome"]["armyId"] == "wing" and settled["battleReports"][-1]["cltqOutcome"]["siegeEngine"] and receipt_count >= 1)
        page.evaluate("window.__P2_QA__.finishBattle()")
        check("repeated settlement cannot duplicate wing troop-loss receipts", page.evaluate("window.__P2_QA__.getGame().cltq.receipts.length") == receipt_count)
        page.locator('[data-end-battle="1"]').click()
        page.locator('[data-cl-node="outpost"]').click()
        page.locator('[data-cl-retreat]').click()
        check("main army can return independently after the parallel wing siege", page.evaluate("window.__CLTQ_QA__.getState().marches.at(-1).status==='retreated' && !window.__CLTQ_QA__.getState().activeMarchId"))
        locked = page.locator("[data-p6-endgame]").is_disabled()
        page.evaluate("window.__CLTQ_QA__.debugState().owners.capital2='player';window.__CLTQ_QA__.render()")
        resource_before_wonder = page.evaluate("window.__P2_QA__.getGame()")
        page.locator('[data-p6-wonder-build="1"]').click()
        wonder = page.evaluate("window.__CLTQ_P6_QA__.getState().wonderLevel")
        resource_after_wonder = page.evaluate("window.__P2_QA__.getGame()")
        check("Lạc Thành unlocks a paid Cửu Đỉnh wonder and the late-game gate", locked and wonder == 1 and resource_before_wonder["silver"]-resource_after_wonder["silver"] == 2200 and resource_before_wonder["wood"]-resource_after_wonder["wood"] == 1800 and resource_before_wonder["iron"]-resource_after_wonder["iron"] == 1000 and not page.locator("[data-p6-endgame]").is_disabled())
        page.locator('[data-p6-endgame="1"]').click()
        endgame = page.evaluate("window.__P2_QA__.getBattle()")
        check("endgame opens a persistent PvE tier in the real CL battle engine", endgame["cltq"]["kind"] == "p6_endgame" and endgame["cltq"]["endgameTier"] == 1 and len(endgame["p"]) >= 3 and len(endgame["e"]) >= 3 and "Chinh Phạt Vô Tận" in page.locator(".battle-head h2").inner_text())
        super_before = page.evaluate("window.__P2_QA__.getGame()")
        player_atk = page.evaluate("window.__P2_QA__.debugBattle().p[0].atk")
        event_count = len(endgame["events"])
        page.locator('[data-p6-super="1"]').click()
        super_after = page.evaluate("window.__P2_QA__.getGame()")
        super_battle = page.evaluate("window.__P2_QA__.getBattle()")
        super_atk = page.evaluate("window.__P2_QA__.debugBattle().p[0].atk")
        super_evidence = {
            "grainSpent": super_before["grain"]-super_after["grain"],
            "ironSpent": super_before["iron"]-super_after["iron"],
            "atkBefore": player_atk,
            "atkAfter": super_atk,
            "eventsBefore": event_count,
            "eventsAfter": len(super_battle["events"]),
            "lastSkill": super_battle["events"][-1].get("skill") if super_battle["events"] else None,
        }
        check("Thiên Hạ Hiệu Lệnh spends resources, buffs living troops and records replay state", super_evidence["grainSpent"] == 600 and super_evidence["ironSpent"] == 220 and super_atk > player_atk and super_evidence["eventsAfter"] == event_count + 1 and "Thiên Hạ Hiệu Lệnh" in (super_evidence["lastSkill"] or ""), super_evidence)
        skill_grain = super_after["grain"]
        page.locator('[data-p6-super="1"]').click(force=True)
        check("one-time battle super-skill cannot be charged twice", page.evaluate("window.__P2_QA__.getGame().grain") == skill_grain)
        page.evaluate("""()=>{const b=window.__P2_QA__.debugBattle();for(const u of b.p){u.hp=u.maxHp=1000000000;u.speed=2000;u.atk=u.catk=u.matk=12000;}for(const u of b.e){u.hp=1;u.maxHp=1;u.alive=true;}window.__P2_QA__.skipBattle();}""")
        endgame_state = page.evaluate("window.__CLTQ_P6_QA__.getState()")
        endgame_report = page.evaluate("window.__P2_QA__.getGame().battleReports[0]")
        after_endgame = page.evaluate("window.__P2_QA__.getGame()")
        end_receipts = len(after_endgame["cltq"]["receipts"])
        check("endgame victory awards once, advances tier and persists wonder progression", endgame_state["pve"]["tier"] == 2 and endgame_state["pve"]["clears"] == 1 and endgame_state["pve"]["receipts"][-1] == endgame_report["cltqOutcome"]["receiptId"] and endgame_report["cltqOutcome"]["kind"] == "p6_endgame" and sum(endgame_report["rewards"].values()) > 0 and after_endgame["cltq"]["p6"]["wonderLevel"] == 1)
        page.evaluate("window.__P2_QA__.finishBattle()")
        check("repeated endgame settlement cannot duplicate reward or troop receipts", page.evaluate("window.__P2_QA__.getGame().cltq.receipts.length") == end_receipts and page.evaluate("window.__CLTQ_P6_QA__.getState().pve.clears===1 && window.__CLTQ_P6_QA__.getState().pve.tier===2"))
        page.locator('[data-end-battle="1"]').click()
        page.reload(wait_until="domcontentloaded")
        page.locator('[data-tab="world"]').click()
        reloaded = page.evaluate("window.__P2_QA__.getGame()")
        check("P6 relationship, season, wonder, endgame tier and army location survive reload", reloaded["cltq"]["p6"]["turn"] > 0 and reloaded["cltq"]["owners"].get("farm") == "player" and reloaded["cltq"]["owners"].get("capital2") == "player" and reloaded["cltq"]["p6"]["armies"]["wing"]["location"] == "farm" and reloaded["cltq"]["p6"]["wonderLevel"] == 1 and reloaded["cltq"]["p6"]["pve"]["tier"] == 2 and reloaded["cltq"]["marches"][-1]["status"] == "retreated")
        page.locator(".cl-p6-panel").scroll_into_view_if_needed()
        page.screenshot(path=str(OUT / "cl-p6-world-desktop.png"), full_page=False)
        page.locator(".cl-p6-panel").screenshot(path=str(OUT / "cl-p6-panel-desktop.png"))
        page.locator('[data-p6-endgame="1"]').click()
        page.evaluate("""()=>{const b=window.__P2_QA__.debugBattle();for(const u of b.p){u.hp=1;u.maxHp=1;u.speed=1;}for(const u of b.e){u.hp=u.maxHp=1000000000;u.atk=u.catk=u.matk=10000000;u.def=u.tdef=u.mdef=1000000000;u.speed=100000;}window.__P2_QA__.skipBattle();}""")
        loss_report = page.evaluate("window.__P2_QA__.getGame().battleReports[0]")
        loss_state = page.evaluate("window.__CLTQ_P6_QA__.getState()")
        loss_receipts = page.evaluate("window.__P2_QA__.getGame().cltq.receipts.length")
        check("endgame defeat preserves its tier, records loss and settles casualties without a reward", loss_report["won"] is False and loss_report["rewards"] == {} and loss_report["cltqOutcome"]["endgameTier"] == 2 and loss_state["pve"]["tier"] == 2 and loss_state["pve"]["losses"] == 1 and loss_receipts >= 2)
        page.evaluate("window.__P2_QA__.finishBattle()")
        check("repeat endgame defeat cannot duplicate casualty or loss receipts", page.evaluate("window.__P2_QA__.getGame().cltq.receipts.length") == loss_receipts and page.evaluate("window.__CLTQ_P6_QA__.getState().pve.losses===1"))

        mobile = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
        mobile.on("pageerror", lambda error: errors.append(str(error)))
        open_world(mobile)
        mobile.locator(".cl-p6-panel").scroll_into_view_if_needed()
        p6_box = mobile.locator(".cl-p6-panel").bounding_box()
        mobile_width = mobile.evaluate("document.documentElement.scrollWidth")
        mobile.screenshot(path=str(OUT / "cl-p6-mobile-390x844.png"), full_page=True)
        mobile.locator(".cl-p6-panel").screenshot(path=str(OUT / "cl-p6-panel-mobile-390.png"))
        check("390px Chromium keeps P6 diplomacy and army controls inside the viewport", bool(p6_box and p6_box["width"] <= 390 and mobile_width <= 390), {"panel": p6_box, "documentWidth": mobile_width})
        check("P6 desktop and mobile interactions produce no JavaScript errors", not errors, {"pageErrors": errors})
        browser.close()

    result = {"milestone": "CL-P6", "sourceSha256": hashlib.sha256(HTML.read_bytes()).hexdigest(), "checksPassed": sum(c["pass"] for c in CHECKS), "checksTotal": len(CHECKS), "checks": CHECKS}
    (OUT / "CL_P6.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"CL-P6 CHROMIUM {result['checksPassed']}/{result['checksTotal']}", flush=True)
    if result["checksPassed"] != result["checksTotal"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
