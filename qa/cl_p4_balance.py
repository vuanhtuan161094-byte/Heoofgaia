"""Deterministic 5v5 difficulty sweep across CL-P4 campaign stages and army profiles."""
from __future__ import annotations

import copy
import hashlib
import json
from collections import defaultdict
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa"
HTML_PATH = ROOT / "index.html"
TRIALS = 6
PROFILES = {
    "recruit": {"ids": ["liu", "guan", "zhang", "dian", "sunquan"], "level": 5, "troops": 420},
    "balanced": {"ids": ["liu", "guan", "zhang", "zhao", "sunquan"], "level": 15, "troops": 1050},
    "mixed": {"ids": ["cao", "zhou", "taishi_ci", "xu_shu", "deng_ai"], "level": 27, "troops": 1800},
    "veteran": {"ids": ["cao", "guan", "zhuge", "deng_ai", "lingyun"], "level": 42, "troops": 2850},
}


def make_state(base, profile, stage):
    state = copy.deepcopy(base)
    ids = profile["ids"]
    state["roster"] = ids[:]
    state["hero"] = {
        hero_id: {"level": profile["level"], "xp": 0, "troops": profile["troops"]}
        for hero_id in ids
    }
    state["cltq"]["commanders"] = ids[:]
    state["cltq"]["selectedArmy"] = ids[:]
    state["cltq"]["garrisons"] = {}
    state["cltq"]["wounded"] = {}
    state["cltq"]["killed"] = {}
    state["cltq"]["owners"] = {"capital": "player"}
    state["cltq"]["marches"] = []
    state["cltq"]["activeMarchId"] = None
    state["cltq"]["seq"] = 1
    state["cltq"]["receipts"] = []
    state["cltq"]["p4"] = {
        "schema": 1,
        "progress": stage - 1,
        "rewardedStages": list(range(1, stage)),
        "wins": stage - 1,
        "losses": 0,
    }
    state["silver"], state["grain"], state["wood"], state["iron"] = 100000, 100000, 100000, 100000
    return state


def run_trial(page, base, profile, stage, seed):
    args = {"state": make_state(base, profile, stage), "stage": stage, "seed": seed}
    return page.evaluate("""x=>{
      window.requestAnimationFrame=()=>0;
      window.__P2_QA__.setGame(x.state);
      window.__CLTQ_P4_QA__.start(x.stage);
      const b=window.__P2_QA__.debugBattle();
      if(!b)return {started:false,stage:x.stage,seed:x.seed};
      b.seed=x.seed>>>0;
      let steps=0;while(!b.finished&&steps<600){window.__P2_QA__.stepBattle();steps++;}
      const result={started:true,finished:b.finished,won:b.won,stage:x.stage,seed:x.seed,rounds:b.round,actions:b.turns,steps,
        playerAlive:b.p.filter(u=>u.hp>0).length,enemyAlive:b.e.filter(u=>u.hp>0).length,
        remainingTroops:b.p.reduce((s,u)=>s+(u.troops||0),0),boss:!!b.cltq.boss};
      window.__P2_QA__.closeBattle('world');
      return result;
    }""", args)


def main():
    errors = []
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.add_init_script("window.__P2_ENABLE_QA__=true;")
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(HTML_PATH.as_uri(), wait_until="domcontentloaded", timeout=30000)
        page.wait_for_function("window.__CLTQ_P4_QA__?.stages().length===15", timeout=30000)
        base = page.evaluate("window.__P2_QA__.getGame()")

        for stage in range(1, 16):
            for profile_name, profile in PROFILES.items():
                for trial in range(TRIALS):
                    seed = (0xC1A0 + stage * 1009 + list(PROFILES).index(profile_name) * 313 + trial * 97) & 0xFFFFFFFF
                    result = run_trial(page, base, profile, stage, seed)
                    result.update({"profile": profile_name, "trial": trial})
                    results.append(result)
                    print(f"{profile_name:8s} stage={stage:02d} trial={trial+1} {'WIN' if result.get('won') else 'LOSS'} rounds={result.get('rounds')} actions={result.get('actions')}", flush=True)

        # Same seed and fixture must settle identically on repeated Chromium runs.
        repeat_a = run_trial(page, base, PROFILES["balanced"], 8, 445566)
        repeat_b = run_trial(page, base, PROFILES["balanced"], 8, 445566)
        deterministic = (repeat_a.get("won"), repeat_a.get("rounds"), repeat_a.get("actions"), repeat_a.get("playerAlive"), repeat_a.get("enemyAlive")) == (repeat_b.get("won"), repeat_b.get("rounds"), repeat_b.get("actions"), repeat_b.get("playerAlive"), repeat_b.get("enemyAlive"))
        browser.close()

    by_stage = defaultdict(lambda: {"wins": 0, "trials": 0})
    for row in results:
        if row.get("won"):
            by_stage[row["stage"]]["wins"] += 1
        by_stage[row["stage"]]["trials"] += 1
    profile_stage_wins = {
        name: {
            str(stage): sum(1 for row in results if row["profile"] == name and row["stage"] == stage and row.get("won"))
            for stage in range(1, 16)
        }
        for name in PROFILES
    }
    stage_rates = {stage: data["wins"] / data["trials"] for stage, data in by_stage.items()}
    monotone_profiles = {
        name: all(int(profile_stage_wins[name][str(stage)]) >= int(profile_stage_wins[name][str(stage + 1)]) for stage in range(1, 15))
        for name in PROFILES
    }
    early_accessible = stage_rates.get(1) == 1 and stage_rates.get(2) == 1
    final_boss_is_harder = stage_rates.get(15, 1) <= 0.5 and stage_rates.get(15, 1) < stage_rates.get(1, 0)
    summary = {
        "sha256": hashlib.sha256(HTML_PATH.read_bytes()).hexdigest(),
        "trials": len(results),
        "profiles": {name: {"level": profile["level"], "troops": profile["troops"], "commanders": profile["ids"]} for name, profile in PROFILES.items()},
        "stages": {str(stage): {"wins": data["wins"], "trials": data["trials"], "winRate": round(data["wins"] / data["trials"], 3)} for stage, data in sorted(by_stage.items())},
        "profileStageWins": profile_stage_wins,
        "profileDifficultyMonotonic": monotone_profiles,
        "earlyEncountersAccessible": early_accessible,
        "finalBossWinRateAtMost50Percent": final_boss_is_harder,
        "repeatSeedDeterministic": deterministic,
        "pageErrors": errors,
        "results": results,
    }
    (OUT / "CL_P4_BALANCE.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("CL-P4 balance sweep:", json.dumps({k: v for k, v in summary.items() if k not in ("results", "profiles", "profileStageWins")}, ensure_ascii=False), flush=True)
    if len(results) != 360 or any(not row.get("started") or not row.get("finished") for row in results) or not deterministic or errors or not early_accessible or not final_boss_is_harder or not all(monotone_profiles.values()):
        raise SystemExit("CL-P4 balance sweep failed to complete deterministically")


if __name__ == "__main__":
    main()
