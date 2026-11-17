"""Deterministic 30-minute simulated onboarding through real NL economy and combat APIs.

This is an accelerated browser simulation, not a human play session. It deliberately
uses the saved game's real resource ticks, troop assignment, battle, and settlement.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "index.html"
SAVE_KEY = "muu_dinh_tam_quoc_v1"
PROFILES = {
    "steady": ("spear", 8675309),
    "defensive": ("turtle", 120261117),
    "fast": ("goose", 220261117),
}
checks: list[dict[str, object]] = []
page_errors: list[str] = []


def check(name: str, condition: object) -> None:
    passed = bool(condition)
    checks.append({"name": name, "pass": passed})
    print(("PASS " if passed else "FAIL ") + name, flush=True)


def run() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    summaries: dict[str, dict[str, object]] = {}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        for profile, (formation, seed_base) in PROFILES.items():
            context = browser.new_context(viewport={"width": 1280, "height": 720})
            context.add_init_script("window.__P2_ENABLE_QA__=true;let __nlRandom=8675309;Math.random=()=>{__nlRandom=(Math.imul(__nlRandom,1664525)+1013904223)>>>0;return __nlRandom/4294967296}")
            page = context.new_page()
            page.on("pageerror", lambda error: page_errors.append(str(error)))
            page.goto(HTML.as_uri(), wait_until="domcontentloaded")
            page.wait_for_timeout(50)
            state = page.evaluate("window.__P2_QA__.getGame()")
            page.locator('.nav[data-tab="heroes"]').click()
            page.locator('[data-recruit]').click()
            recruited_state = page.evaluate("window.__P2_QA__.getGame()")
            recruited = next(hero for hero in recruited_state["roster"] if hero not in state["roster"])
            page.locator('.nav[data-tab="formation"]').click()
            page.locator(f'[data-choose-hero="{recruited}"]').click()
            empty_slot = next(index for index, hero in enumerate(recruited_state["slots"]) if hero is None)
            page.locator(f'[data-slot="{empty_slot}"]').click()
            state = page.evaluate("window.__P2_QA__.getGame()")
            check(f"{profile}: free tavern recruit is placed into a real empty formation slot", len(state["roster"]) == 4 and not state["freeRecruit"] and state["slots"][empty_slot] == recruited and state["silver"] == 14000)
            heroes = state["roster"]
            page.evaluate("({formation})=>{const q=window.__P2_QA__;let g=q.getGame();g.formation=formation;g.lastTick=Date.now();q.setGame(g)}", {"formation": formation})
            minutes = 0
            wins = losses = retries = recoveries = blocked_actions = 0
            unlocked: set[int] = set()
            recruited_fifth = False
            training_actions = 0
            history: list[dict[str, object]] = []

            def advance_five_minutes() -> None:
                nonlocal minutes
                page.evaluate("()=>{let g=window.__P2_QA__.getGame();g.lastTick=Date.now()-5*60000;window.__P2_QA__.setGame(g);window.__NL_R03_QA__.tick()}")
                minutes += 5

            def recover_frontline() -> bool:
                nonlocal recoveries
                g = page.evaluate("window.__P2_QA__.getGame()")
                available = 0
                for hero_id in heroes:
                    unit = g["hero"][hero_id]
                    if unit["troops"] < 220 and g["reserve"] < 80 and g["silver"] >= 600 and g["grain"] >= 450:
                        before = g["reserve"]
                        page.evaluate("window.__P2_QA__.enlist()")
                        g = page.evaluate("window.__P2_QA__.getGame()")
                        if g["reserve"] > before:
                            recoveries += 1
                    while g["hero"][hero_id]["troops"] < 220 and g["reserve"] >= 80:
                        before = g["reserve"]
                        page.evaluate("id=>window.__P2_QA__.giveTroops(id)", hero_id)
                        g = page.evaluate("window.__P2_QA__.getGame()")
                        if g["reserve"] == before:
                            break
                    available += g["hero"][hero_id]["troops"]
                return available >= 360 and len([h for h in heroes if page.evaluate("id=>window.__P2_QA__.getGame().hero[id].troops", h) >= 30]) >= 3

            receipts_valid = True
            for _ in range(6):
                advance_five_minutes()
                g = page.evaluate("window.__P2_QA__.getGame()")
                stage = len(g["cleared"]) + 1
                grain_cost = 100 + stage * 25
                if g["grain"] < grain_cost:
                    blocked_actions += 1
                    history.append({"minute": minutes, "stage": stage, "event": "wait-grain", "grain": g["grain"], "needed": grain_cost})
                    continue
                if not recover_frontline():
                    blocked_actions += 1
                    history.append({"minute": minutes, "stage": stage, "event": "wait-recruit", "grain": g["grain"], "silver": g["silver"], "reserve": g["reserve"]})
                    continue
                g = page.evaluate("window.__P2_QA__.getGame()")
                if g["formation"] != formation:
                    page.evaluate("f=>{let g=window.__P2_QA__.getGame();g.formation=f;window.__P2_QA__.setGame(g)}", formation)
                page.evaluate("s=>window.__P2_QA__.beginBattle(s,'campaign')", stage)
                battle = page.evaluate("window.__P2_QA__.getBattle()")
                if not battle:
                    blocked_actions += 1
                    history.append({"minute": minutes, "stage": stage, "event": "battle-start-blocked"})
                    continue
                deterministic_seed = (seed_base + stage * 1009 + minutes * 7919) & 0xFFFFFFFF
                page.evaluate("seed=>{window.__P2_QA__.debugBattle().seed=seed}", deterministic_seed)
                page.evaluate("window.__P2_QA__.skipBattle()")
                settled = page.evaluate("window.__P2_QA__.getGame()")
                report = settled["battleReports"][0]
                rows = report.get("troopLosses") or []
                receipts_valid = receipts_valid and report.get("seed") is not None and len(rows) == len(battle["p"]) and all(row.get("initial", -1) - row.get("casualties", -1) == row.get("remaining", -2) and row.get("provenance") == "SIMULATED" for row in rows)
                event = {"minute": minutes, "stage": stage, "seed": deterministic_seed, "formation": formation, "event": "win" if report["won"] else "loss", "troops": sum(settled["hero"][hero]["troops"] for hero in heroes), "grain": settled["grain"], "silver": settled["silver"]}
                history.append(event)
                if report["won"]:
                    wins += 1
                    unlocked.add(stage)
                else:
                    losses += 1
                    retries += 1
                page.evaluate("window.__P2_QA__.closeBattle('city')")
                if not report["won"] and stage == 5 and minutes < 30 and len(heroes) < 5 and settled["silver"] >= 1800:
                    before_silver = settled["silver"]
                    page.locator('.nav[data-tab="heroes"]').click()
                    page.locator('[data-recruit]').click()
                    recruited_state = page.evaluate("window.__P2_QA__.getGame()")
                    fifth = next((hero for hero in recruited_state["roster"] if hero not in heroes), None)
                    if fifth:
                        page.locator('.nav[data-tab="formation"]').click()
                        page.locator(f'[data-choose-hero="{fifth}"]').click()
                        open_slot = next(index for index, hero in enumerate(recruited_state["slots"]) if hero is None)
                        page.locator(f'[data-slot="{open_slot}"]').click()
                        page.locator('[data-p3-preset="spear-van"]').click()
                        recruited_fifth = True
                        heroes = recruited_state["roster"]
                        formation = "spear"
                        page.locator('.nav[data-tab="heroes"]').click()
                        before_training_silver = page.evaluate("window.__P2_QA__.getGame().silver")
                        for hero in heroes:
                            for _ in range(4):
                                if page.evaluate("window.__P2_QA__.getGame().silver") >= 700:
                                    page.locator(f'[data-train="{hero}"]').click()
                                    training_actions += 1
                        after_training = page.evaluate("window.__P2_QA__.getGame()")
                        history.append({"minute": minutes, "stage": stage, "event": "paid-recruit-train-and-spear-van", "hero": fifth, "silverSpentRecruit": before_silver - recruited_state["silver"], "silverSpentTraining": before_training_silver - after_training["silver"], "trainingActions": training_actions})

            final = page.evaluate("window.__P2_QA__.getGame()")
            all_reports_valid = receipts_valid
            summaries[profile] = {
                "minutesSimulated": minutes,
                "freeRecruit": recruited,
                "paidFifthRecruit": recruited_fifth,
                "trainingActions": training_actions,
                "wins": wins,
                "losses": losses,
                "retries": retries,
                "blockedActions": blocked_actions,
                "recruitBatches": recoveries,
                "stagesCleared": sorted(unlocked),
                "resources": {key: final[key] for key in ("silver", "grain", "iron", "reserve")},
                "troopsByHero": {hero: final["hero"][hero]["troops"] for hero in heroes},
                "reportsValid": all_reports_valid,
                "history": history,
            }
            check(f"{profile}: 30 accelerated game-minutes use real production and persist v5 state", minutes == 30 and final["version"] == 5)
            check(f"{profile}: player can progress and recover after losses without a softlock", wins > 0 and len(unlocked) > 0 and blocked_actions <= 2)
            reported_battles = sum(row["event"] in ("win", "loss") for row in history)
            check(f"{profile}: every simulated battle has valid deterministic settlement receipts", all_reports_valid and wins + losses == reported_battles)
            check(f"{profile}: no resource underflow or negative troop counts", min(final["silver"], final["grain"], final["iron"], final["reserve"], *(final["hero"][hero]["troops"] for hero in heroes)) >= 0)
            serialized = page.evaluate(f"localStorage.getItem('{SAVE_KEY}')")
            page.reload(wait_until="domcontentloaded")
            restored = page.evaluate("window.__P2_QA__.getGame()")
            check(f"{profile}: reload preserves unlocks, troop casualties, reports and v5 Save", restored["version"] == 5 and restored["cleared"] == final["cleared"] and restored["battleReports"] == final["battleReports"] and restored["hero"] == final["hero"] and serialized is not None)
            page.locator('.nav[data-tab="campaign"]').click()
            if page.locator('[data-stage="5"]').count() and not page.locator('[data-stage="5"]').is_disabled():
                page.locator('[data-stage="5"]').click()
            recommendation_visible = page.locator('[data-nl-preparation="5"]').count() == 1 and "cấp trung bình khoảng 12" in page.locator('[data-nl-preparation="5"]').inner_text()
            check(f"{profile}: stage 5 shows its simulated preparation hint in the live campaign UI", recommendation_visible)
            page.screenshot(path=str(ROOT / "qa" / f"nl-onboarding-{profile}.png"))
            context.close()
        browser.close()

    check("Chromium produced no page exceptions", not page_errors)
    report = {"milestone": "NL-GAP-12-ONBOARDING-30MIN-SIMULATED", "method": "accelerated deterministic Chromium simulation; not a human session", "profiles": summaries, "total": len(checks), "passed": sum(bool(row["pass"]) for row in checks), "failed": [row["name"] for row in checks if not row["pass"]], "pageErrors": page_errors, "checks": checks}
    (ROOT / "qa" / "NL_ONBOARDING_30MIN.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"total": report["total"], "passed": report["passed"], "failed": report["failed"]}, ensure_ascii=False))
    return 0 if report["passed"] == report["total"] else 1


if __name__ == "__main__":
    sys.exit(run())
