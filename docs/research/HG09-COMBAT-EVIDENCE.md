# HG-09 Combat Evidence and Rule Ledger

Research/access date: 2026-11-02. Target snapshot: Chinese *英雄之城* during 2009, cross-checked against the English community wiki where explicitly noted. This is documentary evidence, not access to the original server or client runtime.

## Evidence register

| Feature | Region / edition | Source URL | Published | Accessed | Observable evidence | Confidence / status |
|---|---|---|---|---|---|---|
| Seven deployed stacks and formation | China, 2009-09 guide | [Sina: 勇敢的心 英雄之城全攻略](https://games.sina.com.cn/o/z/yxzc/2009-09-21/1726350254.shtml) | 2009-09-21 | 2026-11-02 | Seven-group examples; four ranged groups placed behind and three melee groups in front; guide gives concrete NPC formation/counter examples and manual attack priorities. | B, specific to the described build and player guide. |
| Automatic initiative and target selection | China, 2009-10 player Q&A | [17173: 玩家必看问题百科](https://web.17173.com/content/2009-10-25/1256486243.shtml) | 2009-10-25 | 2026-11-02 | Lines 73–84 say automatic units act from higher speed to lower speed; equal-speed order follows the first/left column top-to-bottom and then the next column top-to-bottom. It describes enemy automation prioritizing the group it judges to have the highest military power and recommends manual focus on enemy ranged groups. | B, player-authored strategy; not server code. |
| NPC unit damage approximation | English wiki, community experiment | [Fandom: Combat mechanics](https://heroesofgaia.fandom.com/wiki/Combat_mechanics) | Page history includes 2010 experiment | 2026-11-02 | Gives `UATK² / (UATK + UDEF) × HeroFactor × modifiers × attacking unit count`; explicitly says PvP is unresolved and includes a section marked as a wrong formula. | C, estimate only; not treated as canonical or as proof of PvP behavior. |
| Manual controls and original battle visuals | English/international archived references | [MobyGames screenshot gallery](https://www.mobygames.com/game/45732/heroes-of-gaia/screenshots/browser/452230/) · [GameGami archive](https://www.gamegami.com/index.php/projects/heroes-of-gaia) | 2010-era captures | 2026-11-02 | Historical screenshots are visual reference. The package contains no rights-cleared original combat art and no playable original client for direct comparative execution. | Reference only; original-client comparison BLOCKED / NOT TESTED. |

## Implemented rule ledger

| Rule | Implementation | Evidence link | Test oracle | State |
|---|---|---|---|---|
| Speed-first initiative | Sort living stacks by speed descending. Equal speed uses battlefield x ascending, then y ascending, then stable ID. | 17173 2009-10, above | Equal-speed fixture expects first column top-to-bottom, then next column; `out.order` and saved `lastActOrder` agree. | PARTIAL, source-backed for tie order in this Chinese edition. |
| Ranged attacks | Community combat guide says ranged stacks fire at the strongest enemy at the start of their turn; 2009 player guidance describes fast ranged stacks attacking enemy ranged stacks. Neither publishes a numeric map range. | [Fandom battle screen guide](https://heroesofgaia.fandom.com/wiki/Newbie_Guide) · 17173 2009-10, above | Browser scenario marches 40 Archers into battle and confirms an Attack turn lowers enemy HP without advancing the archer. | DERIVED/PARTIAL: uses 20 cells (the current grid's maximum Manhattan span) as a board-wide playable reach; the original numeric range is MISSING. |
| Actual group stacks and positions | Army formation produces up to seven stacks; each stack has count, HP pool, stats, range and a battlefield position. | Sina 2009-09, above | Existing formation and combat browser checks. | PARTIAL; formation shape is supported, but grid, movement and unit visual scale are approximations. |
| Manual action and focus | Attack/defend/focus/retreat commands change the simulation; selected focus target applies to the selected group. | 17173 2009-10 and earlier HG evidence | Deterministic replay, casualty fixture, actual browser click through march → battle → Attack. | PARTIAL; Stand By/focus numeric effects are SIMULATED. |
| Damage, targeting, NPC composition and encounter scaling | Existing formula/model is kept explicitly approximate. Ranged priority uses estimated attack power; melee priority uses proximity, with stable ID tie-break. | Community formula page and 17173 strategy; incomplete oracle | 1,000 seeded replay pairs assert identical outcomes and valid ledgers, but do not establish historical parity. | SIMULATED / PARTIAL. |
| Losses and Arena wounds | Casualties reduce the home army when damage crosses stack HP thresholds; Arena records a 75% wounded share with fractional remainder. | Earlier HG evidence register | Exact 2-unit casualty fixture expects 8 survivors, 1 wounded and 0.5 carried wound fraction; no army count below zero. | Implemented behavior PASS; source distribution/cost still needs validation. |
| Victory settlement | A win clears an NPC target or records a captured mine; subsequent ordinary marching to the same completed target is rejected before AP changes. | Existing engine path guard | Win, then repeat battle command and march attempt; reward ledger unchanged. | Local exact-once gate PASS; reward values remain SIMULATED. |

## Limits and next work

- No source found here establishes a complete 2009 international combat formula, morale rule, numeric ranged reach, exact melee movement distance, target-selection algorithm for every command, Stand By defense multiplier, focus damage multiplier, NPC stat table, battle clock, or complete reward/XP rules.
- The current implementation has no morale system. It must not be reported as original parity.
- The included screenshot is captured from this reconstruction running in Chromium. It is not a screenshot of the original game. Original-client side-by-side review remains BLOCKED / NOT TESTED.
- Next: find a version-stamped combat recording or authorized data source; add observed battle fixtures; implement supported rules only; then repeat desktop/mobile rendering and save/load mid-battle checks.
