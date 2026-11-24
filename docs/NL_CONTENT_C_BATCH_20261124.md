# Content C — full-source data projection, native P2 expansion (2026-11-24)

Branch: feature/nl-web-review-20261122. Starting HEAD: 8b9f6b823fdd072dbbe9bd172d2aea41eb5f707a. No merge, no Codex Cloud, no alternate game.

## Code scope

- 249 Mobile Wiki maps and 4,903 NPC records from all 21 checked-in shards. Source IDs, names, observed slots and skill names stay as reference. Missing/partial formations use a nearest same-map peer where available; a single center unit only when no peer/observed unit exists. Numeric troop source IDs are NOT official bindings. Native combat statistics, lane effects, progression, reward and balancing are PROJECT_SIMULATED. Do not claim Mobile-to-WEB parity.
- Preserve all 28 original stages and their old Save fields. C launches a cleared native stage-1 shell, substitutes actual projected 3×3 enemy slots/units before animation, resets native order, and records the opening snapshot. The native finishBattle branch resolves only C-specific rewards for these objectives (no base campaign loot); native losses, XP, credit, turn engine and report still apply. First-win C NPCs progress sequentially within the map. Maps are gated by project stage 1–28; original stage-clear list stays unchanged.
- 364 source hero identities: retain 207 existing source IDs and uniquely alias 10 original names; 147 added recruit designs plus 14 original and 207 existing = 368 project runtime identities. Four original identities outside the Wiki 364 remain. The unresolved same-name variants remain distinct source IDs. Available historic WEB attributes, base skill names and tower recruitment gates are used for additional heroes where an unambiguous historical record exists. Otherwise design values are simulated. Dated Mobile stage skill labels/targets for 44 heroes are projected to safe native P2 descriptors on A7 awakening; no source effect percentages or current equipped-skill parity claimed.
- 40 tier-four WEB troop names and six reference coefficients from https://www.lequ.com/wly/201109/17213.html (five families of eight); retains B4 55 and old 25 project troop models. 10 rebirths and the floor-40 prerequisite use historical/cross-edition inspiration, costs simulated. Shared B4 assignment and native unit/target/skill/hit paths. Some exotic normal-attack effects (retaliation, multi-hit, exact no-morale rules) remain unimplemented or approximated, not 40 exact effect kits.
- 18 seal models: acquisition requirements and magnitude are scaled for this project using https://www.lequ.com/wly/201211/41820.html as reference. Claim once, equip up to three, affect native player-unit stats. No promise of all original seals or formation-specific effect parity.
- Tower: retain original 20 floors, extend to floor 100 with 80 project-simulated encounters, same daily attempt count and native P2. No claim that the original WEB game ended at 100. Reward currencies and Tướng Hồn simulated, existing floor 1–20 rules preserved. Historic tower recruit gates referenced for available added heroes; not every original tower reward implemented.
- New panels in Chinh Phạt, Võ Tướng, Doanh Trại, Tháp and Bày Trận. One canonical HTML generator, no new save key or schema.

## Evidence

- Read all 21 shard blobs directly from GitHub, counted 249 maps and 4,903 NPCs; per-shard IDs unique, no empty maps and no nonobject skill records. Full cross-shard identity and projection invariants are asserted by the new build/QA script, not yet run in this environment.
- Read actual hero catalogue (364), alpha (14 + 207), exact unique-name alias candidates (10) and skills handoff (44 profiles with dated stage facts). 147 new identities calculated.
- Read native index blob and confirmed each of the three patch anchors occurs exactly once. 16/16 isolated JS runtime checks passed with a synthetic full-size map/NPC fixture; real tier-four catalogue used. These checks exercise native-owner stubs, not Chromium or the real save serializer.
- Added qa/nl_content_c_projection_test.py and qa/nl_content_c_browser.py to existing Web Review workflow; exact SHA CI / canonical generated HTML / live Web Review not yet confirmed.
- Remaining: full browser acceptance, cross-shard generated projection, actual repeated gameplay and performance, source-vs-runtime balance, exact skill passives and lord/stage skills, remaining seals/tower reward types, original art and multiplayer. No merge before approval.

## Sources

- Current Mobile source: https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban ; https://ngoalong.vnggames.com/ngoa-long-wiki/vo-tuong
- 2011 WEB tier four, source coefficients: https://www.lequ.com/wly/201109/17213.html
- WEB 2011 feature release: https://web.17173.com/content/2011-09-15/20110915150339178.shtml
- 2012 WEB military seals: https://www.lequ.com/wly/201211/41820.html
- 2012 WEB tower recruits: https://ngoalong.zing.vn/tin-tuc/huong-dan/vo-tuong-tu-thap-thi-luyen-nuoc-thuc.html ; https://ngoalong.zing.vn/tin-tuc/huong-dan/vo-tuong-tu-thap-thi-luyen-nuoc-ngo.html
