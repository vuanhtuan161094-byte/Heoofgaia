# HG-08 Evidence Register

**Research cut-off / access date:** 2026-11-02. **Target:** 2009–2010 *Heroes of Gaia* / *Castle of Heroes* / *英雄之城*. The sources below describe different regional builds; exact cross-region patch parity is unknown. Tests verify this implementation, not the historical client.

## Source records

| ID | Variant, date and publisher | Direct evidence used | Confidence and limits |
|---|---|---|---|
| SRC02 | English community wiki, page revision 2009-12-06 | The 40-unit catalog: names, tier, combat stats, resource cost, load and base training duration. | A for the documented table. Wiki is community authored; it is not original server data. |
| SRC03 | English community wiki, page revision 2009-12-09 | Building roles and broad unlock rules: Barracks levels unlock units; Magic Tower research; Tavern refresh/slot milestones. | B. Some entries are community notes, and the page does not give a complete race-by-race unlock matrix. |
| SRC04 | English community wiki, page revision 2009-12-22 | Castle spells: Manufacturing reduces unit gold cost by 2%/level; Scouting 1 is required for scouting units; Bootcamp reduces unit training time by 2%/level and is needed for higher-tier units. | B. The page itself notes some race coverage is uncertain. |
| SRC09 | Chinese strategy guide, Sina, 2009-09-21 | Chinese-era tactical layout and four-race gameplay context. | B for the described Chinese build; beta and later-build differences remain. |
| SRC11 | Chinese race-building catalogs, Sina, 2009-08-24 | Elf Magic Pool/Nature Tower, Orc Beast Pen/Blacksmith, Undead Dark Hall/Soul Tower roles. | B for building purpose. These pages do not map exact building levels to each unit. |
| SRC17 | English community Fandom “Heroes” page, living page with later expansion material | Hero attribute points on level-up, experience chart, command limits, and Castellan unit-value XP formula. | C/B: useful quantitative community reference, but it includes later Babel-era features and may not match every 2009 regional build. |
| SRC19 | Chinese publisher-hosted Lequ guide, URL section `/201011/` (2010-11) | Human T1 and T3–T10 exact building and technology prerequisites. | A for the printed table in this 2010 publisher-hosted guide; not evidence for an earlier build. |
| SRC20 | Chinese player-submitted 17173 guide, dated 2009-12-27 | Independently corroborates the same Human T1 and T3–T10 gate table. | B/A for its dated table; author is a player, not the server-data source. |
| SRC21 | English community Fandom “Hero quality” page, living page with later expansion material | Hero name color formula and individual-stat color bands; level-10 Tavern’s eight low-quality candidates/hour and common stat ranges. | C/B: derived from community wiki; rare-stat probability remains a stated hypothesis and is not implemented. |

## Evidence-to-rule ledger

| Rule ID | Rule used by HG-08 | Exact source statement / derivation | Status in build | Confidence |
|---|---|---|---|---|
| R01 | Unit names, tiers, costs, stats and base training time | The full English community 40-unit table is used as the canonical catalog. Training duration scales with count. | Implemented from catalog; balancing against regional client remains open. | A for the table; parity B |
| R02 | Human T1, T3–T10 building and tech gates | The Chinese table lists Town Hall, Barracks, Blacksmith, Stables and training/manufacturing technology levels for each listed unit. SRC20 corroborates SRC19. | Enforced row by row in `hg08.js` and exposed in UI. | A for those two guides |
| R03 | Human Scout gate | SRC04 says Scouting 1 is required for scouting units; SRC03 describes Barracks-level unlocks. The cited Human troop table omits Scout. | Enforces Barracks 2 + Scouting 1 as a partial gate. Does not claim an exact standalone Town Hall gate. | B / partial |
| R04 | Chinese “练兵技术” to English “Bootcamp” label | The Chinese guide names a training technology; the English wiki describes Bootcamp as the higher-tier training prerequisite and gives a training-time effect. The shared role is a cross-language mapping, not a source-provided equivalence. | Uses canonical `spells.bootcamp`; visible as a derived alias. | DERIVED, medium confidence |
| R05 | Manufacturing effect and gate | Same-name research appears in SRC04 and SRC19/SRC20. 2% per level is source documented; the research cost curve, research time, effective level cap and any top-end cap are not source documented; the prototype's level-10 ceiling and reduction cap are implementation limits. | One spell state `spells.manufacturing`; legacy v06 values are retained. Research cost/time are simulated. | B for effect; SIM for queue values |
| R06 | Non-Human generic Barracks gate | SRC03 says Barracks levels unlock units. SRC11 identifies special buildings by faction but does not specify which tier needs which level. | Barracks tier is enforced; race-specific per-unit gates remain partial and are not guessed. | B / partial |
| R07 | Race-specific structure identity | SRC11 describes Elf Magic Pool/Nature Tower, Orc Beast Pen/Blacksmith, Undead Dark Hall/Soul Tower roles. | Buildable only by the matching race. No unsupported unit-to-building gate is applied. | B for role; missing for exact unit gate |
| R08 | Hero XP thresholds through level 100 | SRC17 provides a threshold table. Code uses its exact listed values through level 19, then its stated formula `120 × (level² − 300)` from level 20. | Implemented; level cap 100. Later-edition drift is disclosed. | B/C |
| R09 | One unspent attribute point per hero level | SRC17 says a hero gets one attribute point at each level. | Implemented; allocation changes the selected hero stat and is blocked during march/battle. | B/C |
| R10 | Castellan training XP | SRC17 gives `[(Lumber + Ore)×5 + (Sulfur + Crystal)×10 + Gold] / 3`. This equals `unitValue / 3` when the catalog's resource weights are used. | Applied to troops when their queue completes; reduced costs are not used in XP. | B/C |
| R11 | Combat XP | SRC17 explicitly says the exact formula needs more testing. | Existing `30 × encounter level` reward remains SIMULATED. | SIM |
| R12 | Tavern slot milestones and hourly refresh | SRC03 describes 2 at L1, 3 at L2, 4 at L4, 7 at L9, 8 at L10, and roughly hourly refresh. | Those cited milestones are implemented; other level counts and exact odds remain simulated. | B for milestones; SIM elsewhere |
| R13 | Tavern hero colors | SRC21 gives `ATK+DEF+SPD+INT−CL+1`, plus name/stat color bands. | Formula and bands implemented; candidate generation/distribution is not recovered. | B/C |
| R14 | Level-10 Tavern common stat range and count | SRC21 describes eight low-quality heroes/hour and common stats in a 20–50 range; rare-stat probability is not settled. | Eight offers, deterministic common-range stats. The implementation does not invent a rare 2% roll. | C; generator SIM |
| R15 | Research queue timing/cost | No cited source provides the exact research cost curve or queue duration used here. | One real, saveable, completing research queue for all Castle Spells; costs and times explicitly SIMULATED. | SIM |
| R16 | Historical art rights | Screenshots and galleries in SRC15/SRC16 are references. Public availability does not grant redistribution rights. | No original commercial sprite/SWF is redistributed in this HG-08 slice. | Rights not established |
| R17 | Vietnamese-language evidence | Search on 2026-11-02 for Vietnamese guides matching the original game name did not yield a credible, version-dated primary or contemporary guide. | No gameplay rule is attributed to an unrelated Vietnamese game. Search remains open. | No usable source |

## Verification boundary

- HG-08 Node/browser tests prove only deterministic behavior in this standalone implementation.
- The human table is Chinese localization evidence, not proof that an English client used identical labels or patch timing.
- Elf/Orc/Undead unit-specific support-building tiers, exact spell-research prices/times, battle XP, Tavern rare-stat odds, physical Android behavior, and original-client screenshot comparison remain **MISSING / BLOCKED**.
- Assets added to this stage must have an owner/license record in `docs/ASSET-PROVENANCE.md`; historical web images are reference-only unless rights are established.

## Linked sources

- [SRC02 — 2009 English unit catalog](https://heroesofgaia.wikidot.com/game-units)
- [SRC03 — 2009 English building guide](https://heroesofgaia.wikidot.com/game-buildings)
- [SRC04 — 2009 English Castle Spell guide](https://heroesofgaia.wikidot.com/game-spells)
- [SRC09 — Sina Chinese strategy guide (2009-09-21)](https://games.sina.com.cn/o/z/yxzc/2009-09-21/1726350254.shtml)
- [SRC11 — Sina Orc building guide](https://games.sina.com.cn/o/z/yxzc/2009-08-24/0020346778.shtml), [Elf building guide](https://games.sina.com.cn/o/z/yxzc/2009-08-24/0013346775.shtml), [Undead building guide](https://games.sina.com.cn/o/z/yxzc/2009-08-24/0019346777.shtml)
- [SRC17 — Heroes experience and Castellan guide](https://heroesofgaia.fandom.com/wiki/Heroes)
- [SRC19 — Lequ publisher-hosted Human troop guide (2010-11)](https://www.lequ.com/yxzc/201011/8592.html)
- [SRC20 — 17173 Human troop guide (2009-12-27)](https://web.17173.com/content/2009-12-27/1261927948.shtml)
- [SRC21 — Hero quality community reference](https://heroesofgaia.fandom.com/wiki/Hero_quality)
