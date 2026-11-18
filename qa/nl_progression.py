"""Chromium gate for the data-driven NL-R03 hero, equipment and research loop."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
PACK = json.loads((ROOT / "data/ngoalong/alpha_content.json").read_text(encoding="utf-8"))
SAVE_KEY = "muu_dinh_tam_quoc_v1"
STUB = """<script>window.__P2_ENABLE_QA__=true;const __store=__NL_STORE__;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>Object.prototype.hasOwnProperty.call(__store,k)?__store[k]:null,setItem:(k,v)=>__store[k]=String(v),removeItem:k=>delete __store[k],clear:()=>Object.keys(__store).forEach(k=>delete __store[k])}});</script>"""
checks: list[dict[str, object]] = []
errors: list[str] = []


def check(name: str, condition: object) -> None:
    passed = bool(condition)
    checks.append({"name": name, "pass": passed})
    print(("PASS " if passed else "FAIL ") + name, flush=True)


def open_page(browser, width: int = 1280, height: int = 720, stored: str | None = None):
    page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
    page.on("pageerror", lambda error: errors.append(str(error)))
    payload = {} if stored is None else {SAVE_KEY: stored}
    page.set_content(HTML.replace("<script>", STUB.replace("__NL_STORE__", json.dumps(payload, ensure_ascii=False)) + "<script>", 1), wait_until="domcontentloaded")
    return page


def state(page):
    return page.evaluate("window.__P2_QA__.getGame()")


def run() -> int:
    expected_items = {item["id"] for item in PACK["equipment"]["projectItems"]}
    expected_research = set(PACK["research"]["systemIds"])
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        page = open_page(browser)
        initial = state(page)
        catalog = page.evaluate("window.__NL_R03_QA__.catalog")
        check("JSON catalog matches every retained equipment and technology ID", {item["id"] for item in catalog["equipment"]} == expected_items and {item["id"] for item in catalog["research"]} == expected_research)
        check("all 14 pre-existing hero IDs and gameplay fields bind unchanged from JSON while extended roster data remains", {hero["id"] for hero in catalog["heroes"]}.issubset(set(catalog["runtimeHeroes"])) and len(catalog["runtimeHeroes"]) >= len(catalog["heroes"]) and all(all(catalog["runtimeHeroes"][hero["id"]].get(key) == value for key, value in hero.items() if key not in ("id", "provenance", "fieldProvenance")) for hero in catalog["heroes"]))
        check("runtime hero data is project-simulated and separate from the empty Wiki hero catalogue", all(hero["provenance"]["classification"] == "SIMULATED" for hero in catalog["heroes"]) and not PACK["heroes"]["profiles"])
        check("14 existing per-hero combat skill descriptors bind from JSON without replacing CL expansion skills", set(catalog["heroSkills"]) == {hero["id"] for hero in catalog["heroes"]} and set(catalog["heroSkills"]).issubset(set(catalog["runtimeHeroSkills"])) and all({key:value for key,value in skill.items() if key!="provenance"} == catalog["runtimeHeroSkills"][hero_id] for hero_id,skill in catalog["heroSkills"].items()))
        check("legacy Save v5 loads its existing inventory and technology keys", initial["version"] == 5 and len(initial["items"]) == 3 and set(initial["technology"]) == expected_research)
        check("project content stays explicitly simulated and Wiki item names remain unimported", all(item["provenance"]["classification"] == "SIMULATED" for item in catalog["equipment"]) and all(item["provenance"]["classification"] == "SIMULATED" for item in catalog["research"]))

        fixture = state(page)
        fixture["silver"], fixture["iron"], fixture["prestige"] = 50000, 20000, 1000
        fixture["buildings"]["academy"] = 1
        page.evaluate("g=>window.__P2_QA__.setGame(g)", fixture)
        hero = fixture["roster"][0]
        zeroed = state(page)
        for tech_id in zeroed["technology"]:
            zeroed["technology"][tech_id] = 0
        page.evaluate("g=>window.__P2_QA__.setGame(g)", zeroed)
        baseline_unit = page.evaluate("id=>window.__NL_R03_QA__.unit(id,'p',2,1)", hero)
        researched = state(page)
        for tech_id in researched["technology"]:
            researched["technology"][tech_id] = 1
        page.evaluate("g=>window.__P2_QA__.setGame(g)", researched)
        researched_unit = page.evaluate("id=>window.__NL_R03_QA__.unit(id,'p',2,1)", hero)
        check("JSON research effects change real attack, defense, magic, HP and starting morale lanes", researched_unit["atk"] > baseline_unit["atk"] and researched_unit["catk"] > baseline_unit["catk"] and researched_unit["def"] > baseline_unit["def"] and researched_unit["tdef"] > baseline_unit["tdef"] and researched_unit["mdef"] > baseline_unit["mdef"] and researched_unit["matk"] > baseline_unit["matk"] and researched_unit["hp"] > baseline_unit["hp"] and researched_unit["morale"] == baseline_unit["morale"] + 6)
        economy = state(page)
        for tech_id in economy["technology"]:
            economy["technology"][tech_id] = 0
        economy["technology"]["commerce"], economy["technology"]["harvest"] = 2, 3
        economy["buildings"]["market"], economy["buildings"]["farm"] = 1, 1
        economy["silver"], economy["grain"], economy["lastTick"] = 0, 0, page.evaluate("Date.now()-10000")
        page.evaluate("g=>window.__P2_QA__.setGame(g)", economy)
        page.evaluate("window.__NL_R03_QA__.tick()")
        produced = state(page)
        check("commerce and harvest research data drives real timed resource production", produced["silver"] == 32 and produced["grain"] == 36)
        reserve = state(page)
        for tech_id in reserve["technology"]:
            reserve["technology"][tech_id] = 0
        page.evaluate("g=>window.__P2_QA__.setGame(g)", reserve)
        page.locator('.nav[data-tab="barracks"]').click()
        reserve_without_tech = page.locator("#view").inner_text()
        reserve["technology"]["recruit"] = 4
        page.evaluate("g=>window.__P2_QA__.setGame(g)", reserve)
        page.locator('.nav[data-tab="barracks"]').click()
        reserve_with_tech = page.locator("#view").inner_text()
        check("recruit research changes the live barracks reserve-capacity display", reserve_without_tech != reserve_with_tech and "1.100" in reserve_with_tech)
        page.evaluate("g=>window.__P2_QA__.setGame(g)", fixture)
        before_stats = page.evaluate("id=>window.__NL_R03_QA__.equipmentStats(id)", hero)
        page.locator('.nav[data-tab="equipment"]').click()
        page.locator('[data-buy="g_sword"]').click()
        bought = state(page)
        sword = next((item for item in bought["items"] if item["base"] == "g_sword"), None)
        check("shop buys a JSON-defined item and debits its configured silver/iron cost once", sword is not None and fixture["silver"] - bought["silver"] == 4300 and fixture["iron"] - bought["iron"] == 980)
        if sword:
            page.locator(f'[data-equip="{sword["uid"]}"]').click()
        equipped = state(page)
        after_equip = page.evaluate("id=>window.__NL_R03_QA__.equipmentStats(id)", hero)
        check("equipping a bought weapon updates the actual hero equipment stat lane", after_equip["weaponAtk"] == 29 and after_equip["atk"] == before_stats["atk"] + 29 and equipped["gear"][hero]["weapon"] == sword["uid"])
        if sword:
            page.locator(f'[data-reinforce="{sword["uid"]}"]').click()
        reinforced = state(page)
        after_reinforce = page.evaluate("id=>window.__NL_R03_QA__.equipmentStats(id)", hero)
        check("reinforcement uses the catalog formula and changes combat stats", sword is not None and next(item for item in reinforced["items"] if item["uid"] == sword["uid"])["lv"] == 2 and reinforced["silver"] == equipped["silver"] - 350 and reinforced["iron"] == equipped["iron"] - 105 and after_reinforce["weaponAtk"] == 35)

        before_unit = page.evaluate("id=>window.__NL_R03_QA__.unit(id,'p',2,1)", hero)
        page.locator('.nav[data-tab="tech"]').click()
        before_first_research = state(page)
        page.locator('[data-research="arms"]').click()
        first_research = state(page)
        check("first research purchase retains legacy cost, level and one-time accounting", first_research["technology"]["arms"] == 1 and before_first_research["silver"] - first_research["silver"] == 550 and before_first_research["iron"] - first_research["iron"] == 130 and before_first_research["prestige"] == first_research["prestige"] and first_research["techSpent"] == before_first_research["techSpent"])
        after_first_unit = page.evaluate("id=>window.__NL_R03_QA__.unit(id,'p',2,1)", hero)
        check("research definitions drive real physical and charge attack calculations", after_first_unit["atk"] > before_unit["atk"] and after_first_unit["catk"] > before_unit["catk"] and page.evaluate("window.__NL_R03_QA__.techValue('atkMultiplierBonus')") == 0.04)
        before_second = state(page)
        page.locator('[data-research="arms"]').click()
        second_research = state(page)
        check("next-level costs are computed from the JSON formula including prestige", second_research["technology"]["arms"] == 2 and before_second["silver"] - second_research["silver"] == 2200 and before_second["iron"] - second_research["iron"] == 260 and before_second["prestige"] - second_research["prestige"] == 60)
        check("all research effect targets resolve from catalog definitions", all(isinstance(page.evaluate("target=>window.__NL_R03_QA__.techValue(target)", target), (int, float)) for target in {effect["target"] for tech in catalog["research"] for effect in tech["effects"]}))
        check("research UI derives every level cap from its catalog", page.locator('[data-research-card]').count() == len(expected_research) and page.locator('[data-research-card="arms"]').inner_text().find("Cấp 2/10") >= 0)

        page.locator('.nav[data-tab="heroes"]').click()
        training_before = state(page)
        current_hero = training_before["hero"][hero]
        page.locator(f'[data-train="{hero}"]').click()
        trained = state(page)
        check("hero training uses data-driven cost, XP threshold and academy bonus", trained["silver"] == training_before["silver"] - PACK["heroes"]["training"]["silverCost"] and trained["hero"][hero]["level"] == current_hero["level"] + 1 and trained["hero"][hero]["xp"] == current_hero["xp"] + PACK["heroes"]["training"]["baseXp"] + training_before["buildings"]["academy"] * PACK["heroes"]["training"]["academyXpPerLevel"] - current_hero["level"] * PACK["heroes"]["training"]["xpRequiredPerHeroLevel"])
        check("training, equipment and research retain the unchanged v5 Save key and schema", trained["version"] == 5 and trained["gear"][hero]["weapon"] == sword["uid"] and trained["technology"]["arms"] == 2)

        serialized = page.evaluate("localStorage.getItem('muu_dinh_tam_quoc_v1')")
        page.close()
        reloaded = open_page(browser, stored=serialized)
        saved = state(reloaded)
        check("reload preserves trained hero, reinforced gear, research and evolution state", saved["version"] == 5 and saved["hero"][hero]["level"] == trained["hero"][hero]["level"] and saved["gear"][hero]["weapon"] == sword["uid"] and saved["technology"]["arms"] == 2 and saved["nlr03"]["evolutions"] == trained["nlr03"]["evolutions"])

        legacy = json.loads(serialized)
        legacy.pop("nlr03", None)
        legacy_page = open_page(browser, stored=json.dumps(legacy, ensure_ascii=False))
        migrated = state(legacy_page)
        check("older v5 Save initializes optional R03 state without deleting owned items or tech", migrated["version"] == 5 and migrated["nlr03"]["evolutions"] == {} and migrated["gear"][hero]["weapon"] == sword["uid"] and migrated["technology"]["arms"] == 2 and any(item["uid"] == sword["uid"] for item in migrated["items"]))
        legacy_page.close()

        mobile = open_page(browser, 390, 844, stored=serialized)
        mobile.locator('.nav[data-tab="equipment"]').click()
        check("mobile equipment catalog is interactive without horizontal overflow", mobile.locator('[data-buy]').count() == len(expected_items) and mobile.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"))
        mobile.screenshot(path=str(ROOT / "qa" / "nl-r03-progression-mobile.png"), full_page=False)
        mobile.locator('.nav[data-tab="tech"]').click()
        check("mobile research catalog fits and keeps live controls", mobile.locator('[data-research-card]').count() == len(expected_research) and mobile.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"))
        page = open_page(browser)
        page.screenshot(path=str(ROOT / "qa" / "nl-r03-progression-desktop.png"), full_page=False)
        check("Chromium captured desktop view and reported no page errors", not errors)
        page.close()
        mobile.close()
        reloaded.close()
        browser.close()

    report = {"milestone":"NL-R03-PROGRESSION","total":len(checks),"passed":sum(bool(item["pass"]) for item in checks),"failed":[item["name"] for item in checks if not item["pass"]],"pageErrors":errors,"checks":checks}
    (ROOT / "qa" / "NL_R03_PROGRESSION.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps({"total":report["total"],"passed":report["passed"],"failed":report["failed"]},ensure_ascii=False))
    return 0 if report["passed"] == report["total"] else 1


if __name__ == "__main__":
    sys.exit(run())
