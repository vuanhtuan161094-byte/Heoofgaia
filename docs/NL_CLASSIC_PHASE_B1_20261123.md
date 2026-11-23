# Mưu Định Tam Quốc — Phase B1 native combat fidelity (2026-11-23)

## Source boundaries
Ngọa Long web 2011–2012 is the gameplay reference; the VNG current Mobile Wiki is not automatically identical.

Historic sources:
- 100 morale to trigger combat skills: https://www.lequ.com/wly/201105/14910.html
- Morale build from drums: https://www.lequ.com/wly/201105/14931.html
- Spear–cavalry–infantry counter triangle: https://web.17173.com/content/2011-07-20/20110720181144162.shtml
- Classic formations and drum-team strategy: https://www.lequ.com/wly/201108/16544.html

## Implemented B1
1. Fixed a concrete native AI bug: the reverse counter's `multiplier` >1 was checked as if it were a defense multiplier <1, so disadvantage was always neutral. Now the target score uses `disadvantageMultiplier` from canonical JSON (0.82, **SIMULATED**).
2. Boss target scoring for stages 2, 5, 8, 12, 16, 20 and 24 prioritizes legal support/drum targets near or above 100 morale. The target remains in the native legal column: **no new attack, morale grant, HP adjustment, RNG, receipt or reward**. Stage 28 is frozen by the existing R03 late-campaign contract.
3. Read-only tactical matchup adviser on Chinh Phạt: actual deployed 3x3 slots, actual stage NPC troop families, counter/tactic hints and a button back to Bày Trận. Native battle HUD shows each team's actual ready-to-skill unit count at 100 morale.
4. Do not claim original numeric formula parity. The 1.22/0.82 damage coefficients remain project simulations. No force-merge, no Codex Cloud, no Save v5 migration.

## Gate
`node --test qa/nl_classic_phase_b1.test.cjs` + `python qa/nl_classic_phase_b1_browser.py` + existing Combat/Save/Item tests, accelerated onboarding 30/60, 28 desktop/mobile screenshots, A1–A3 tests, Pages exact-SHA. Every failure blocks deployment.

## Remaining Phase B
- B2: reproduce first-class soldier-specific drum/dancer/morale behaviors only after measured native P2 event trace; never double grant 25/45 morale.
- B3: compare all 6 formation families / 24 plans and 25 project troops to historic references. Unlock/progression and real side-by-side battle art require separate acceptance.
- B4: crosswalk 28 stages and 8 Boss skill data, then batch-map the 249 Wiki Mobile maps/4903 NPC references without pretending they are classic-web entities.
