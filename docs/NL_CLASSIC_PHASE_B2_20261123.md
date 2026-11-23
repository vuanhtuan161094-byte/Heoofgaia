# B2 — Kỳ Cổ Thủ, Vũ Nữ and native morale timing
**Date:** 2026-11-23. Runtime is project-authored, not VNG IP.

Classic WEB sources:
- https://www.lequ.com/wly/201105/14931.html (drummer +25 morale on normal action; hit gains)
- https://www.lequ.com/wly/201105/14910.html (100 morale threshold and Vũ Nữ decreases enemy morale)
- https://www.lequ.com/wly/201106/15428.html (soldier drum action differs from general's morale skill)
- https://ngoalong.vnggames.com/tin-tuc-2022/tinh-nang/trai-nghiem-ngoa-long-890.html (later Mobile: dancer -45, own +34; not a WEB 2011 verification)

Native single-authority implementation:
- Canonical generator transforms original `p2Perform`, `p2Unit`, `renderFormation`, `changeTroopMode`, and `p2ApplyFrame` through `tools/nl_classic_phase_b2_native.py`. No shadow battle solver, timer, damage or rewards.
- Stage 1–24 campaign drummer: ordinary +25 morale to allies, no enemy drain or actor bonus +7. At 100 morale native skill +45 to allies and -100 to drummer. Optional R03 branch bonus remains applied once. Explicit PROJECT_SIMULATED exception: veteran NPC drummer on exactly six author-tagged stage encounters (5–10) retains an additional +9 ordinary aura and enemy disruption from the project's earlier approved balancing; this keeps the fixed 30/60-minute progression gates without altering the generic Kỳ Cổ Thủ rule.
- A support/strategist can choose Vũ Nữ as a role via existing Save v5 `troopModes`: its ordinary action targets one legal enemy, drains 45 morale and gives +34 to actor, without damage or defender morale; native skill at 100 uses existing hero descriptor.
- 25 project troop identities are unchanged. Original R03 stage 25–28 drum interactions and CLTQ/arena/tower remain unchanged.
- The source-backed part is the distinction of troop roles, 25 ordinary drum, 100 morale threshold; 45 special drum, 45 dancer and 34 dancer self are cross-edition/project calibrations and are `SIMULATED` for this 2011 WEB recreation.

QA: B2 native patch contracts; real Chromium 25/45/drain, Save/reload; A1/B1/A3 combat/gear; 30- and 60-minute accelerated onboarding; 28 screenshot/Pages exact SHA.
Open B3: full 25-unit troop mechanisms and 6x4 formations, and B4: 28-stage/8-boss classic-web crosswalk.