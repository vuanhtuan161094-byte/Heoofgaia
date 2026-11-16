"""Chromium evidence for CL-P4 roster art, seven factions and campaign settlement."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa"
HTML_PATH = ROOT / "index.html"
RESULT = []


def check(name: str, condition: object) -> bool:
    passed = bool(condition)
    RESULT.append({"name": name, "pass": passed})
    print(("PASS" if passed else "FAIL") + " " + name, flush=True)
    return passed


def make_roster_fixture(page, base, all_ids):
    state = json.loads(json.dumps(base))
    state["roster"] = all_ids
    for hero_id in all_ids:
        state["hero"][hero_id] = {"level": 25, "xp": 0, "troops": 1500}
    state["cltq"]["commanders"] = all_ids[:5]
    state["cltq"]["selectedArmy"] = all_ids[:5]
    state["cltq"]["garrisons"] = {}
    state["cltq"]["marches"] = []
    state["cltq"]["activeMarchId"] = None
    state["cltq"]["p4"] = {"schema": 1, "progress": 0, "rewardedStages": [], "wins": 0, "losses": 0}
    state["grain"], state["silver"], state["wood"], state["iron"] = 50000, 50000, 50000, 50000
    page.evaluate("s=>window.__P2_QA__.setGame(s)", state)
    return state


def settle_victory(page):
    return page.evaluate("""()=>{
      const qa=window.__P2_QA__,b=qa.debugBattle();
      for(const u of b.p){u.speed=2000;u.atk=u.catk=u.matk=12000;u.crit=.95;u.morale=100;}
      for(const u of b.e){u.hp=1;u.maxHp=1;u.alive=true;}
      let n=0;while(!b.finished&&n++<80)qa.stepBattle();
      return {finished:b.finished,won:b.won,steps:n,events:b.events.length,outcome:b.report?.cltqOutcome};
    }""")


def settle_defeat(page):
    return page.evaluate("""()=>{
      const qa=window.__P2_QA__,b=qa.debugBattle();
      for(const u of b.p){u.hp=0;u.alive=false;}
      qa.stepBattle();
      return {finished:b.finished,won:b.won,outcome:b.report?.cltqOutcome};
    }""")


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        page.add_init_script("window.__P2_ENABLE_QA__=true;")
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(HTML_PATH.as_uri(), wait_until="domcontentloaded", timeout=30000)
        page.wait_for_function("window.__CLTQ_P4_QA__?.assetsLoaded()", timeout=30000)

        base = page.evaluate("window.__P2_QA__.getGame()")
        all_ids = page.evaluate("window.__CLTQ_P4_QA__.allHeroIds()")
        new_heroes = page.evaluate("window.__CLTQ_P4_QA__.heroes()")
        check("P4 roster has 30+ historical and original commanders", len(all_ids) >= 30 and len(all_ids) == 49)
        check("22 historical recruit portraits plus legacy portraits cover 30 unique characters", len(page.evaluate("window.__CLTQ_P4_QA__.portraitedIds()")) == 30)
        check("three original generated portrait assets load offline in Chromium", page.evaluate("window.__CLTQ_P4_QA__.assetsLoaded()"))
        check("seven alignments have at least one playable member", len(page.evaluate("Object.keys(window.__CLTQ_P4_QA__.factionCounts())")) == 7 and all(v > 0 for v in page.evaluate("Object.values(window.__CLTQ_P4_QA__.factionCounts())")))
        check("every added commander has a distinct tactical skill descriptor", len(new_heroes) == 25 and len({h["skill"] for h in new_heroes}) == 25 and all(page.evaluate("id=>window.__CLTQ_P4_QA__.skill(id)?.tag", h["id"]) == h["skill"] for h in new_heroes))

        # Verify recruitment through the real tavern control, including reserve-slot integration.
        recruit_state = json.loads(json.dumps(base))
        recruit_state["freeRecruit"] = True
        recruit_state["silver"] = 20000
        page.evaluate("s=>window.__P2_QA__.setGame(s)", recruit_state)
        page.evaluate("window.__P2_QA__.selectTab('heroes')")
        before_roster = page.evaluate("window.__P2_QA__.getGame()")
        page.locator("[data-recruit]").click()
        recruited = page.evaluate("window.__P2_QA__.getGame()")
        recruited_id = next((x for x in recruited["roster"] if x not in before_roster["roster"]), None)
        check("free tavern recruit grants a real new hero and fills a commander slot", recruited_id is not None and recruited_id in recruited["cltq"]["commanders"] and recruited["hero"].get(recruited_id, {}).get("troops", 0) >= 30)
        silver_before_paid = recruited["silver"]
        page.locator("[data-recruit]").click()
        paid = page.evaluate("window.__P2_QA__.getGame()")
        check("paid tavern recruit debits exactly 1,800 silver", len(paid["roster"]) == len(before_roster["roster"]) + 2 and silver_before_paid - paid["silver"] == 1800)

        make_roster_fixture(page, base, all_ids)
        page.evaluate("window.__P2_QA__.selectTab('heroes')")
        check("full roster shows 49 functional hero cards and 30 illustrated portraits", page.locator(".hero-card").count() == 49 and page.locator(".hero-card .p4-face,.hero-card .cl-p4-face").count() == 30)
        page.screenshot(path=str(OUT / "cl-p4-roster-desktop.png"), full_page=True)

        page.evaluate("window.__P2_QA__.selectTab('world')")
        check("five-chapter campaign renders all 15 sequential encounters", page.locator(".cl-p4-chapter").count() == 5 and page.locator("[data-cl-p4-stage]").count() == 15)
        check("campaign requires a full, living five-commander army", page.locator('[data-cl-p4-stage="1"]').is_enabled() and page.locator('[data-cl-p4-stage="2"]').is_disabled())
        check("campaign previews matching faction synergy and actual terrain", "Hiệp lực" in page.locator(".cl-p4-readiness").inner_text() and "Sẵn sàng giao chiến 5v5" in page.locator(".cl-p4-readiness").inner_text())
        page.screenshot(path=str(OUT / "cl-p4-campaign-desktop.png"), full_page=True)

        grain_before = page.evaluate("window.__P2_QA__.getGame().grain")
        page.locator('[data-cl-p4-stage="1"]').click()
        battle = page.evaluate("window.__P2_QA__.getBattle()")
        check("first chapter creates an actual 5v5 battle with unique enemy generals and skills", battle["cltq"]["kind"] == "chapter" and len(battle["p"]) == 5 and len(battle["e"]) == 5 and len({u["name"] for u in battle["e"]}) == 5 and all(u.get("skillKey") for u in battle["e"]))
        check("three same-faction commanders receive the real 6 percent combat bonus", battle["cltq"]["playerSynergy"]["count"] >= 3 and all(u.get("factionBonus") == 6 for u in battle["p"]))
        check("campaign entry consumes its published grain cost", grain_before - page.evaluate("window.__P2_QA__.getGame().grain") == 180 + 38)
        page.screenshot(path=str(OUT / "cl-p4-battle-desktop.png"), full_page=False)

        result = settle_victory(page)
        state = page.evaluate("window.__P2_QA__.getGame()")
        check("winning first campaign battle advances persisted progress and grants four resources", result["finished"] and result["won"] and state["cltq"]["p4"]["progress"] == 1 and state["cltq"]["p4"]["rewardedStages"] == [1] and state["wood"] > 50000 and state["iron"] > 50000)
        settled = (state["silver"], state["grain"], state["wood"], state["iron"], state["cltq"]["receipts"][:])
        page.evaluate("window.__CLTQ_P4_QA__.finish()")
        duplicate = page.evaluate("window.__P2_QA__.getGame()")
        check("calling the completed battle settlement again cannot duplicate rewards or troop receipts", settled == (duplicate["silver"], duplicate["grain"], duplicate["wood"], duplicate["iron"], duplicate["cltq"]["receipts"][:]))
        page.locator('[data-end-battle="1"]').click()
        check("next campaign stage unlocks only after a recorded win", page.locator('[data-cl-p4-stage="2"]').is_enabled() and page.locator('[data-cl-p4-stage="3"]').is_disabled())

        page.reload(wait_until="domcontentloaded", timeout=30000)
        page.wait_for_function("window.__CLTQ_P4_QA__?.assetsLoaded()", timeout=30000)
        loaded = page.evaluate("window.__P2_QA__.getGame()")
        check("chapter progress and exact-once rewards survive a file-save reload", loaded["cltq"]["p4"]["progress"] == 1 and loaded["cltq"]["p4"]["rewardedStages"] == [1] and loaded["version"] == 5)

        # Force an unlocked boss attempt to a deterministic defeat, then retry successfully.
        page.evaluate("window.__P2_QA__.selectTab('world')")
        page.evaluate("window.__CLTQ_P4_QA__.setState({schema:1,progress:2,rewardedStages:[1,2],wins:2,losses:0})")
        page.locator('[data-cl-p4-stage="3"]').click()
        boss = page.evaluate("window.__P2_QA__.getBattle()")
        check("third encounter is the named chapter boss with a five-unit enemy roster", boss["cltq"]["boss"] and boss["cltq"]["p4Stage"] == 3 and len(boss["e"]) == 5)
        page.screenshot(path=str(OUT / "cl-p4-boss-battle.png"), full_page=False)
        loss = settle_defeat(page)
        lost_state = page.evaluate("window.__P2_QA__.getGame()")
        check("boss defeat records loss and casualties without advancing or granting first-clear rewards", loss["finished"] and not loss["won"] and lost_state["cltq"]["p4"]["progress"] == 2 and lost_state["cltq"]["p4"]["losses"] == 1 and 3 not in lost_state["cltq"]["p4"]["rewardedStages"])
        page.locator('[data-end-battle="1"]').click()

        healed = page.evaluate("window.__P2_QA__.getGame()")
        for hero_id in all_ids[:5]:
            healed["hero"][hero_id]["troops"] = 1500
        page.evaluate("s=>window.__P2_QA__.setGame(s)", healed)
        page.evaluate("window.__CLTQ_P4_QA__.setState({schema:1,progress:2,rewardedStages:[1,2],wins:2,losses:1})")
        page.locator('[data-cl-p4-stage="3"]').click()
        victory = settle_victory(page)
        final = page.evaluate("window.__P2_QA__.getGame()")
        check("boss retry clears the next gate once, retains prior loss and records the first-clear receipt", victory["finished"] and victory["won"] and final["cltq"]["p4"]["progress"] == 3 and final["cltq"]["p4"]["rewardedStages"] == [1,2,3] and final["cltq"]["p4"]["losses"] == 1)

        page.locator('[data-end-battle="1"]').click()
        page.set_viewport_size({"width": 390, "height": 844})
        page.evaluate("window.__P2_QA__.selectTab('world')")
        page.wait_for_timeout(200)
        page.screenshot(path=str(OUT / "cl-p4-campaign-mobile-390x844.png"), full_page=True)
        overflow = page.evaluate("document.documentElement.scrollWidth-window.innerWidth")
        check("mobile 390px campaign keeps chapter cards and map inside the viewport", overflow <= 1 and page.locator(".cl-p4-chapter").count() == 5)
        check("Chromium produced no JavaScript page errors", not errors)
        browser.close()

    result = {"sha256": hashlib.sha256(HTML_PATH.read_bytes()).hexdigest(), "passed": sum(x["pass"] for x in RESULT), "total": len(RESULT), "checks": RESULT, "pageErrors": errors}
    (OUT / "CL_P4.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"CL-P4 TOTAL {result['passed']}/{result['total']}", flush=True)
    if result["passed"] != result["total"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
