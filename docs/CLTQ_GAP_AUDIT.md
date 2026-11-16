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
| Hero assets | Project's own embedded P4/P4.1 art | Reuse only existing project-owned assets; no CMN/NgoaLong downloads | Preserved; no new art source introduced |
| QA | Smoke, P2/P3 regression, P4/P4.1 Chromium and Actions | Keep every legacy gate; add CL browser flow and runtime evidence | P1/P2 exact-SHA run passed; P3 exact-SHA run pending push |
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
- CL-P4 needs 30+ authorized/original character content and balance sweeps across deeper campaign chapters; current roster and existing historical systems are smaller.
- CL-P5 remains pending owner visual approval and real Windows/Android device playtest. Current CL map uses original project UI shapes, CSS/SVG roads and Unicode node icons, not finished isometric region/city art. CI/video cannot substitute for art approval.
- CL-P6 alliance diplomacy, seasons/weather, siege engines, multiple armies and PvE endgame are not implemented. Network PvP is out of scope without a separate owner-approved server.
- V3 exact-SHA Actions and the P1/P2 playable artifact succeeded at commit `934775fc020f48d2a84894ce921f50a945d8e9de`, run [43909024419](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43909024419). The P3 changes are local pending their own exact-SHA CI run and playable artifact.

No merge, force-push or Hero edit is part of this milestone.
