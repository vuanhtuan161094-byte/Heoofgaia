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
| Save data | `muu_dinh_tam_quoc_v1`, v1/v2/v3 migration | Keep key and migrate to schema v4; add nested `cltq` namespace | Implemented; old-save migration remains in P2 full QA |
| 3×3 formation | Nine slots and 24 original presets | Keep as a separate formation system | Preserved; exact nine slots tested |
| Existing combat/replay | P2/P3 deterministic turn-based engine and immutable replay | Reuse battle event and report pipeline; append troop receipt once | Adapted; CL report/casualty and loss idempotence tested |
| Economy and city | Original buildings, recruitment, technology, shop, quests and patrol | Keep; CL territory and battle costs use existing resource ledger | Partially integrated; CL outpost yield is first-capture/harvest-once |
| Hero assets | Project's own embedded P4/P4.1 art | Reuse only existing project-owned assets; no CMN/NgoaLong downloads | Preserved; no new art source introduced |
| QA | Smoke, P2/P3 regression, P4/P4.1 Chromium and Actions | Keep every legacy gate; add CL browser flow and runtime evidence | New local gate added; exact-SHA Actions pending push |
| Hero branch/application | Separate codebase and branch | Do not modify, merge or force-push it | Not accessed by implementation |

## CL-P0 through CL-P2 implementation evidence

`index.html` now stores five CL commander slots and selected army in `game.cltq` without replacing the old 3×3 formation. A ten-node original SVG/CSS map provides connected-road path checks, displayed ETA/food cost, march state, NPC siege, capture ownership, harvest-once, garrison, defense battle, retreat and reload. A CL battle uses the existing combat engine, exposes automatic/manual skill controls and renders multiple existing project troop sprites per living squad. Troop count changes with the squad's remaining strength and damage uses the simulated multiplier `0.28 + 0.72 × current/initial troops`; combat closes with a unique receipt, casualties are divided into 72% wounded and 28% killed, and wounded troops can be recovered in the barracks.

Local evidence command: `python qa/cl_p1_p2.py` in Chromium. The test exercises five commanders, minimum-three-soldier display and troop-count scaling, lower troop count → lower measured hit damage, manual skill order, three field fights including the boss, a forced deterministic loss, troop-loss receipt idempotence, map route restrictions, food payment, march arrival, NPC capture, one-time harvest, garrison/defense/recovery, schema-v4 reload, old formation preservation, desktop 1280×720, mobile 390×844, screenshot capture and a rendered gameplay WebM. Latest recorded result is maintained in `qa/CL_P1_P2.json`. This is automated browser evidence, not physical-device or owner art approval.

## Remaining gaps against Issue #4 / master spec

- CL-P2 browser coverage now includes pause/resume across reload, retreat/retry, siege defeat then successful retry, duplicate command protection and backward clock skew. Still needs a deterministic repeated campaign run starting from each imported v1/v2/v3 save fixture.
- CL-P3 must connect province production and garrison upkeep to city economy, complete an eight-building strategy loop, and exercise anti-duplication over long play.
- CL-P4 needs 30+ authorized/original character content and balance sweeps across deeper campaign chapters; current roster and existing historical systems are smaller.
- CL-P5 remains pending owner visual approval and real Windows/Android device playtest. Current CL map uses original project UI shapes, CSS/SVG roads and Unicode node icons, not finished isometric region/city art. CI/video cannot substitute for art approval.
- CL-P6 alliance diplomacy, seasons/weather, siege engines, multiple armies and PvE endgame are not implemented. Network PvP is out of scope without a separate owner-approved server.
- V3 exact-SHA GitHub Actions and playable artifact remain pending until the new commit is pushed normally to `main-ngoalong` and that exact run succeeds.

No merge, force-push or Hero edit is part of this milestone.
