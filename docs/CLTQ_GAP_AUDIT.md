# CLTQ gameplay pivot and compatibility audit

Date: 2026-11-16

Repository/branch: `vuanhtuan161094-byte/Heoofgaia` / `main-ngoalong`

Audited base: `39111d435f0aa6d059240dc36a81fc9be9d46225`

Master task: [GitHub Issue #4](https://github.com/vuanhtuan161094-byte/Heoofgaia/issues/4)

## Product direction and evidence classes

Chiến Loạn Tam Quốc (CMN Online, 2025) is the primary gameplay reference. Mưu Định Tam Quốc remains an original, offline game. Ngọa Long is only historical influence for legacy systems; the source project, user interface and existing artwork remain in place. No reference game's code, art, audio, font or distinctive text is imported.

- **OBSERVED:** official CMN pages describe five-versus-five teams, hero roles, skills, progression, territory and guild activity. Links and retrieved date are recorded in `CLTQ_REFERENCE_MATRIX.md`.
- **DERIVED:** tank/damage/support role mix and tactical objectives adapted to this standalone game.
- **SIMULATED:** all damage, troop attrition, march durations, food costs, NPC garrisons, yields, recovery and territory rules in this offline implementation.
- **UNKNOWN:** proprietary damage formulas, exact marching gesture in the 2025 game, real server state and PvP. The current build makes no online/PvP claim.

The official sources are the [newcomer guide](https://chienloantamquoc.vn/tin-tuc/huong-dan-tan-thu-chien-loan-tam-quoc), [five-hero formation guide](https://chienloantamquoc.vn/tin-tuc/gioi-thieu-doi-hinh-dac-sac) and [release announcement](https://chienloantamquoc.vn/tin-tuc/chinh-thuc-ra-mat-ngay-20-08-2025). Owner's select-army-then-click-city interaction is retained as a **desired control**, not asserted as a verified original-game gesture.

## Baseline compatibility inventory

| Baseline system | Existing evidence/state | CL decision | Status |
|---|---|---|---|
| Offline canonical game | Single `index.html`; no separate game bundle | Keep one file and keep it playable from `file://` | Preserved; Chromium reload tested |
| Save data | `muu_dinh_tam_quoc_v1`, v1–v4 migration | Keep key; use schema v5 with nested `cltq` and P3 economy ledger | Implemented; migration fixtures v1–v4 and file reload pass |
| 3×3 formation | Nine slots and 24 original presets | Keep as a separate formation system | Preserved; exact nine slots tested |
| Existing combat/replay | P2/P3 deterministic turn-based engine and immutable replay | Reuse battle event and report pipeline; append troop receipt once | Adapted; CL report/casualty and loss idempotence tested |
| Economy and city | Original buildings, recruitment, technology, shop, quests and patrol | Keep; CL territory and battle costs use existing resource ledger | Partially integrated; CL outpost yield is first-capture/harvest-once |
| Hero assets | Project's own embedded P4/P4.1 art plus CL-P4 roster masters | Reuse existing owned assets and add provenance-tracked original generated portraits; no CMN/NgoaLong downloads | Preserved; CL-P4 adds source PNG, WebP derivatives and manifest |
| QA | Smoke, P2/P3 regression, P4/P4.1 Chromium and Actions | Keep every legacy gate; add CL browser flow and runtime evidence | P1/P2–P6 full exact-SHA Actions runs passed; CL-P6 Chromium 30/30 locally |
| Hero branch/application | Separate codebase and branch | Do not modify, merge or force-push it | Not accessed by implementation |

## CL-P0 through CL-P2 implementation evidence

`index.html` stores five CL commander slots and selected army in `game.cltq` without replacing the old 3×3 formation. A ten-node original SVG/CSS map provides connected-road path checks, displayed ETA/food cost, march state, NPC siege, capture ownership, harvest-once, garrison, defense battle, retreat and reload. A CL battle uses the existing combat engine, exposes automatic/manual skill controls and renders multiple existing project troop sprites per living squad. Troop count changes with the squad's remaining strength and damage uses the simulated multiplier `0.28 + 0.72 × current/initial troops`; combat closes with a unique receipt, casualties are divided into 72% wounded and 28% killed, and wounded troops can be recovered in the barracks. The save retains its existing key and nine legacy formation slots and migrates to v5.

Local evidence command: `python qa/cl_p1_p2.py` in Chromium. The test exercises five commanders, minimum-three-soldier display and troop-count scaling, lower troop count → lower measured hit damage, manual skill order, three field fights including the boss, a forced deterministic loss, troop-loss receipt idempotence, map route restrictions, food payment, march arrival, NPC capture, one-time harvest, garrison/defense/recovery, schema-v5 reload, old formation preservation, desktop 1280×720, mobile 390×844, screenshot capture and a rendered gameplay WebM. Latest recorded result is maintained in `qa/CL_P1_P2.json`. This is automated browser evidence, not physical-device or owner art approval.

## CL-P3 city and strategic-economy evidence

The current city reuses the original project-owned city illustration and has nine clickable functional categories: palace, farm, market, mine, barracks, academy, tavern, walls and lumberyard. The existing technology, recruitment, shop/forge, quest and training systems remain active. The lumberyard produces wood and requires wood for upgrades. Connected, player-owned provinces contribute silver, grain, wood and iron on saved 10-second ticks. Garrisoned troop counts consume grain; shortage is recorded without allowing negative grain and lowers the defense supply factor. The wall level raises garrison HP/defense. Each catch-up batch has a monotonic receipt, fractional remainder and saved time cursor; at most four hours of offline production is settled per return, and a repeated cursor cannot settle it twice.

Local evidence command: `python qa/cl_p3_economy.py` in Chromium, 31/31 after the wood expansion. It verifies nine controls, actual lumberyard and wall costs, connected-road production, all four resources, paid garrison upkeep, shortage/recovery, 30 accelerated 1-minute transactions, duplicate/backward-clock protection, four-hour offline cap, v1–v4 migration, safe JSON re-import cursor reset, reload and mobile layout. The 30-minute loop is deterministic time-accelerated coverage; a human 30–45-minute session and balance review have not been performed. Screenshots are captured in `qa/cl-p3-city.png`, `qa/cl-p3-city-mobile.png` and `qa/cl-p3-territory.png`.

## Remaining gaps against Issue #4 / master spec

- CL-P2 browser coverage includes pause/resume across reload, retreat/retry, siege defeat then successful retry, duplicate command protection, backward clock skew and v1–v4 migration. Deterministic replay of a full campaign from each imported legacy fixture remains open.
- CL-P3's four-resource economy and 30 accelerated transaction loop pass locally. The real-time 30–45-minute usability/balance session and owner review remain open.
- CL-P4 code now provides 49 recruitable commanders (46 historical figures plus 3 original alignment heroes), 30 unique illustrated historical characters, seven alignment groups, skill descriptors, real 6% three-commander faction synergy, five chapters/15 staged encounters, 5v5 NPC general lineups, named bosses, progression, resource costs/rewards and exactly-once first-clear receipts. Chromium `qa/cl_p4.py` passes 23/23 locally, including failed boss attempt, successful retry, duplicate settlement, file-save reload, actual tavern clicks and mobile 390px. `qa/cl_p4_balance.py` resolves 360 seeded 5v5 battles across four troop/level profiles; win rates are monotonic per profile and the first two stages stay accessible while the final boss's aggregate win rate is 25%. These are simulated balance sweeps, not a human 30–45 minute play session. Exact-SHA P4 Actions passed on commit `243a0d382957abc04bfc5d0a82616824143e9137`, run [43923305781](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43923305781).
- CL-P5 adds one original generated 1536×1024 regional landscape as a single scenic background; interactive nodes, roads, selection and route preview remain live DOM/SVG. The 286 KB WebP is embedded offline and has matching source/derivative/HTML hashes. Asset gate 4/4 and desktop/mobile Chromium flow 9/9 pass; exact-SHA Actions run [43926009183](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43926009183) passed and published the P5 playable artifact. A new `cl-p5-infantry-scout-v1` contributes five original 4-direction, 4-frame actions; idle/attack/hurt/death are live in infantry combat and the walk loop is packed but not yet connected to map marches. Its local exact-source and Chromium gate passes 45/45; the latest pushed SHA/Actions/artifact will be recorded in the current checkpoint after CI. This remains a one-unit slice, not a full roster animation pass or layered map/animated city-prop set. Remaining gates include other troop classes, owner visual approval, physical Windows/Android play/performance, licensed new audio, and video generation. P4.1 sprite/video regression remains in the exact-SHA workflow.
- CL-P6 code adds four simulated NPC faction groups, envoys/pacts and trade production, a deterministic seasonal weather cycle that adjusts movement and combat, an independent five-commander wing army, one-use siege engines, a three-level Cửu Đỉnh wonder at Lạc Thành, replay-recorded Thiên Hạ Hiệu Lệnh and a saved PvE tier ladder with one-time rewards. Focused local Chromium evidence `qa/cl_p6.py` passes 30/30, including concurrent marches, actual wing siege/capture, skill cost/effect, tier victory and defeat, receipt idempotence and reload. Exact-SHA Actions passed on `71cf5a6ae35a35f0e470e2f160c2b409557c1224` in run [43934332430](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43934332430), which published the P6 playable and evidence artifacts.
- CL-P6 limitations: diplomacy is offline NPC-only, four NPC groups map to existing nodes rather than real persistent factions, and PvE enemy scaling caps at +180% while rewards/tier continue. There is no online server/PvP/guild war. Physical device QA, owner visual/balance review, full CL-specific animation coverage beyond the infantry slice, licensed new audio and generated video remain pending.
- V3 exact-SHA Actions passed for P1/P2 at commit `934775fc020f48d2a84894ce921f50a945d8e9de`, run [43909024419](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43909024419); P3 at `7a43cc650d77bbceef800994e6491d5694f2a8ec`, run [43915734348](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43915734348); P4 at `243a0d382957abc04bfc5d0a82616824143e9137`, run [43923305781](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43923305781); P5 at `54c1b8591de76ac83f38ee0330f7343e4f4917cc`, run [43926009183](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43926009183); and P6 at `71cf5a6ae35a35f0e470e2f160c2b409557c1224`, run [43934332430](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43934332430). P6 playable/evidence artifacts are published.

No merge, force-push or Hero edit is part of this milestone.
