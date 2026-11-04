# HG-16 G4 — Foundation-first combat, production and march QA
Date: 2026-11-04
Branch: `feature/hog1-research-to-playable-20261102` (do not merge main).
Status: **G4 core-regression CI PASS**, based on run [41795946648](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/41795946648); later new tests must pass before the corresponding HEAD is accepted.
Principle: stabilize existing playable systems before adding fog, offensive AI, diplomacy or more content.

## P0 fixes made in this stage

### 1. Real damage receipts, no phantom overkill
Previously `engine.js:strike` returned computed raw damage although the target's HP could be far below that amount. For example a target with **250 remaining HP** could make the battle summary show thousands of damage, while the canvas `lastEvents.damage` correctly reflected 250 HP lost.

**Fixed:** `appliedDamage = min(target.pool, rawDamage)`; HP, return value, turn total and visual effects all use `appliedDamage`. Counts and wound ledgers are deducted according to `ceil(remainingPool / unitHP)`. Zero-ATK units remain incapable of chipping damage. Positive-ATK base and the modeled armor floor remain as frozen in G2.

### 2. Six-city offline Save v07 corruption after 16 days
`hg10.js:tickOtherCity` stored `globals.log` by shared reference. `E.note` mutates the old array using `unshift` before replacing `s.log` with a 100-line slice; the old snapshot therefore grew without bounds while processing secondary cities. At **day 16** of a six-city, 24h-step stress run, the save strict validator rejected the log.

**Fixed:** snapshot log by value, preserve secondary-city completion messages once, restore the global log with a separate `slice(0,100)`. The regression checks journal bounds each day over 30 days and requires valid v07 Save/Reload at five-day checkpoints.

This was a gameplay data-integrity bug, not a change in economic balance.

## G4 dedicated tests (`qa-hg16-g4-stress.cjs`)

| QA gate | Test contract | Coverage and caveats |
| --- | --- | --- |
| D1 Applied damage | Overkill 250 remaining HP, same combat result / canvas / battle report | Exact deterministic receipt |
| D2 Catalog numeric | 1,000 *completed two-turn encounters* spanning four races and all 40 unit IDs | Unit counts obey real Lv100 Hero command cap; replay/Save checks every 25 fights |
| D3 Numeric extreme | 100,000 soldiers in a directly built synthetic battle | Explicitly **not a legal player dispatch**; command-cap rejection is verified |
| D4 Group tactics | 32 scenarios with seven allied and seven enemy groups, four races | Up to 30 turns per encounter, legal positions, HP/count conservation, battle Save/Reload |
| P1 Economy isolation | Six separately owned cities, five resource fields, 36 AI settlements | 30 consecutive 24h offline steps at speed 1×; exact output, caps and six intermediate Save/Reload checkpoints |
| P2 Production ledger | Market construction, source resource debit, sale and warehouse overflow rejection | Payment atomicity, five independent warehouse caps |
| P3 Four-race playable loop | Real Market build, Bootcamp research, tier-one troop training, one hour of production, Market sale | Human, Elf, Orc, Undead; verify actual completion times and persistent money/unit counts |
| M1 Travel graph | All 60 world castles, from home 3,4 | 59 destinations beyond home, four-way legal links, no water, Dijkstra repeatability and monotone unit-speed ETA |

**Important:** Thirty separate one-day ticks are *not* the same as 30 days from a single offline catch-up. The engine intentionally caps one missed-time interval at **24 wall-clock hours**; this test does not change that policy.

The 100,000-troop battle checks numeric overflow handling separately from Hero-command capacity. It does **not** assert that one real Hero can deploy 100,000 of an expensive unit.

## Existing regression and browser acceptance gates

- The existing `qa-engine.cjs` covers the G1/G2/G3 DMG formula, ranged Manhattan reach 1/11/12, movement and invalid occupied cells, spell cooldown/expiry, hero equipment/defense, wounded fraction, World Dijkstra and weighted ETA, mine rewards, production, day-bounded offline, convoy and v07 migration.
- The workflow runs `qa-hg09-combat-viewport.cjs` and Chromium on the actual offline HTML, including world AI castle pointer interaction, outbound battle, ETA/AP UI and Save/Reload, four-race sprite motion and HG14.5 tactical grid/HP FX.
- All stress checks must pass *as a CI job* before calling G4 complete. Evidence is a JSON artifact under `docs/qa/hg16/g4-stress-receipt.json`; workflow uploads it separately even when the stress gate fails.

## Scope boundary and next engineering decisions

**Baseline foundation:** damage receipts, legal attack ranges, attack-vs-defend, four-faction units, 5-resource income and costs, individual city warehouses, offline settlement, pathfinding, march AP/ETA and Save/Reload have runnable focused regression gates.

**Not claimed complete:** historical 2009 exact PvP/march coefficients, 30-day single-call offline catch-up, AI-to-AI wars, offensive 36-AI behavior, fog/scouting, network multiplayer, true 7v7 visual readability on every Android device, 30-day organic campaign balance from a fresh account, and direct owner device playtest. G4 is a *technical core hardening pass*, not a blanket game-complete release.

**Owner priority:** do not add noncore systems until a later full playable production loop, troop roster, and on-device UI acceptance exposes no blocking P0.
