# Hẻoofgaia — HG06 evidence dossier: Heroes of Gaia only

**Research cut-off:** 2026-11-03. **Target baseline:** 2009–early-2010 *Heroes of Gaia* (北美) / *Castle of Heroes* (EU) / *英雄之城* (China), developed by Snail Games. The playable Vietnamese title is **Anh Hùng Thời Loạn**. **Not** Call of Gods, Fengshen Wudi, or the distinct modern website at castleofheroes.com.

**Scope & confidence terminology**
- **A — observed in a dated 2009 primary-era player guide or data table**: strong evidence for that particular region/build, not guaranteed for all localized versions.
- **B — documented by community guides and corroborated by independent articles or historical screenshots**: credible mechanics, but implementation details may vary.
- **C — community hypothesis/approximation**: explicitly provisional; don't turn it into universal constants.
- **SIM — independently invented for the offline prototype**: playable but not restored from the original client.
- **MISSING — not implemented**. No original SWF, server database, protocol dump or authorized client source is in the HG06 package. No code is claimed to be extracted from the original product.

## 1. Multi-region source collection

| ID | Era | Region/character | Relevant material | URL |
|---|---|---|---|---|
| SRC01 | 2009+ | English / Kongregate official player guide | Resource bar, capacity and per-hour production; castle/map/hero sections, interface | https://www.kongregate.com/en/pages/heroes-of-gaia-guide |
| SRC02 | 2009-12-06 revision | English community wiki | Full 40-unit data: HP, ATK, DEF, SPD, Load, cost, build time, troop maintenance weighting | https://heroesofgaia.wikidot.com/game-units |
| SRC03 | 2009-12-09 revision | English community wiki | Town Hall, Barracks, Hero Tower, Tavern, Arena, Warehouse, Magic Tower, Market, Bazaar, guild | https://heroesofgaia.wikidot.com/game-buildings |
| SRC04 | 2009-12-22 revision | English community wiki | Passive castle research; 5 hero spell slots, active/passive spells by race | https://heroesofgaia.wikidot.com/game-spells |
| SRC05 | 2009-11-14 revision | English community wiki | Action Points regen, 6 AP resource action; Happy Hour; world objectives | https://heroesofgaia.wikidot.com/heroes-action |
| SRC06 | 2009-11-16 revision | English community wiki | Attack/Defense/Speed/Intelligence effects | https://heroesofgaia.wikidot.com/heroes-att |
| SRC07 | 2009-11-25 revision | English community wiki | Approximate combat damage formula, uncertain PvP defense | https://heroesofgaia.wikidot.com/game-combat |
| SRC08 | 2009-12 revision | English community wiki | Warehouse capacities by level, some specific build costs, race-dependent costs | https://heroesofgaia.wikidot.com/game-buildings-warehouse |
| SRC09 | 2009-09-21 | Chinese / Sina strategy analysis | 7 stack tactics (4 rear, 3 front), 60-minute tavern, build prerequisites, monster farming | https://games.sina.com.cn/o/z/yxzc/2009-09-21/1726350254.shtml |
| SRC10 | 2009-03-25 | Chinese / 17173 | Early building priority and high-tier unit research prerequisites | https://web.17173.com/content/2009-03-25/200903251602082.shtml |
| SRC11 | 2009-08-24 | Chinese / Sina Orc and Undead town catalog | Distinct faction building types (Orc Beast Pen; Undead Graveyard etc.) | https://games.sina.com.cn/o/z/yxzc/2009-08-24/0020346778.shtml ; https://games.sina.com.cn/o/z/yxzc/2009-08-24/0019346777.shtml |
| SRC12 | 2009-01-21 | Chinese / Sina early closed-beta review | Manual-vs-auto battle, early 10-second entry, combat limitations, **beta** troop splitting unavailable | https://games.sina.com.cn/o/n/2009-01-21/1044293570.shtml |
| SRC13 | 2010-08-06 | Chinese / 17173 | Tactical splitting/formation strategies; later build may differ from Jan 2009 beta | https://web.17173.com/content/2010-08-06/20100806100110448.shtml |
| SRC14 | 2009-09-18 | Taiwan / Bahamut | Race-specific cities, dynamic world exploration, split army system | https://gnn.gamer.com.tw/detail.php?sn=39421 |
| SRC15 | 2010-07-28 gallery | MobyGames | Contemporary original city/world/battle/scouting screenshots | https://www.mobygames.com/game/45732/heroes-of-gaia/screenshots/browser/452230/ |
| SRC16 | archived gallery | GameGami | Original battle and UI reference art, **reference only**, not licensed in package | https://www.gamegami.com/index.php/projects/heroes-of-gaia |
| SRC17 | 2010+ community compilation | Fandom Wiki | Hero ranks, equipment slots, extra contents; version drift requires care | https://heroesofgaia.fandom.com/wiki/Heroes |
| SRC18 | 2009/2010 editions | Chinese / Sina game hub | Full list of building/race/technology guides, new-edition sections | https://games.sina.com.cn/o/z/yxzc/2009-09-21/1726350254.shtml |
| SRC19 | 2010-11, publisher-hosted guide | Chinese / Lequ Heroes of Gaia official site | Human troop production gates for T1 and T3–T10; city and research terminology; includes later-version strategy context | https://www.lequ.com/yxzc/201011/8592.html |
| SRC20 | 2009-12-27, player-submitted guide | Chinese / 17173 | Human troop gates and Fame-rank rules; 76 equipment-camp coordinates for levels 1–10; force recommendations and outdoor gear-source notes. Level 6 minimum 480,000 vs “complete” 100,000 is internally contradictory and retained as printed. | https://web.17173.com/content/2009-12-27/1261927948.shtml |
| SRC22 | 2010-10, publisher-hosted race guide | Chinese / Lequ-SNSFun | Names Elf Scout, Orc Wolf Rider and low-tier Undead Ghost as scouting units; no per-unit building/research gate table | https://www.snsfun.com/yxzc/201010/7753.html |
| SRC23 | 2009-10-25, player guide | Chinese / 17173 | Automatic battle order is speed descending, then left formation column top-to-bottom followed by the next column; discusses NPC priority targeting, manual focus on ranged groups, and seven-group tactics | https://web.17173.com/content/2009-10-25/1256486243.shtml |
| SRC24 | Living page, publication/build date unknown | English community wiki / Fandom | Describes speed-based automated turns, melee advance toward a threatening stack, and ranged units firing at the strongest enemy; no numeric range is given | https://heroesofgaia.fandom.com/wiki/Newbie_Guide |
| SRC40 | 2009-10-25 | Chinese / 17173 player FAQ | After occupying a castle or resource point the hero is stationed there; selecting Return restores the hero to the original main castle | https://web.17173.com/content/2009-10-25/1256486243.shtml |
| SRC41 | 2009-10-16 | Chinese / 17173 new-player guide | Secondary castles unlock other-race troops and hero spells; routine tasks remain tied to the main-race city; castle count is fame-limited to six; cities can be taken/abandoned; no demolition/downgrade; up to three heroes can be deployed simultaneously; special world buildings have a once-per-day visit limit | https://web.17173.com/content/2009-10-16/20091016155000113,1.shtml |
| SRC42 | 2009-06-09 | Chinese / SFACG contemporary review and linked game screenshots | Describes the castle as a scenic 2D landscape with detailed buildings placed across a hillside; the Town Hall opens the building list; eligible building rows are highlighted; tutorial/tasks guide construction. Linked screenshot gallery includes live castle/world UI. | https://news.sfacg.com/Files/2009-6-9/7b77c6c3-c4a3-4e85-9d2b-c590e8241e1d.shtml ; https://games.sina.com.cn/o/i/2009-03-05/1638161736.shtml |
| SRC43 | 2009-12-27 | Chinese / 17173 player guide | Windmill resource roll; Watermill +2,000 Gold; War Academy +10% Attack; Defense Tower +10% Defense; Enlightenment Book +10% Knowledge; Prayer Temple +10% Speed for two hours; prints the 100×100 coordinates for five Watermills and the listed structures | https://web.17173.com/content/2009-12-27/1261927948.shtml |
| SRC44 | 2010-12-14 | Chinese / 17173 city-development article | Hero Tower level is a Tavern upgrade prerequisite; Tavern level affects offer count and quality. No exact gate level or probability table. | https://web.17173.com/content/2010-12-14/20101214101223733.shtml |
| SRC45 | 2009-09-21 | Chinese / Sina player strategy guide | Reports NPC victory XP for 4★–8★ as 1,000 / 4,000 / 9,000 / 18,000 / 30,000. Also gives approximate NPC forces of 400,000 / 900,000 / 1,500,000 at 6★–8★, plus dated player-side troop-tier, force, hero-speed and broad-formation advice; it does not expose complete enemy rosters or stats. | https://games.sina.com.cn/o/z/yxzc/2009-09-21/1726350254.shtml |
| SRC46 | 2009-07-27 | Chinese / Yeyou-17173 player-guide compilation, credited to GGwan | Gives minimum and “complete victory” army-force recommendations for 1★–8★ NPCs and 128 wild-monster coordinates; no troop compositions or NPC unit stats | https://article.yeyou.com/content/2009-07-27/20090727165411627_all.shtml |
| SRC47 | 2009-08-23 | Chinese / Sina player guide | Reports monster guarding force and equipment-camp guarding force for levels 1–10 (3,000 / 8,400 / 24,000 / 72,000 / 216,000 / 480,000 / 960,000 / 1,440,000 / 2,160,000 / 3,000,000); equipment color is based on number of attributes, not equipment level; prints hero-use-level bands. | https://games.sina.com.cn/o/z/yxzc/2009-08-23/2233346760.shtml |

## 2. Mechanic-by-mechanic fidelity matrix

| ID | Mechanic | Original evidence | Confidence | HG06 status / next oracle |
|---|---|---|---|---|
| F01 | Four races (Human, Elf, Orc, Undead) | SRC02, SRC11, SRC14 | A | **PARTIAL:** race selection exists; city art remains procedural |
| F02 | Five resources: Gold, Lumber, Ore, Sulfur, Crystal | SRC01, SRC02 | A | **ALIGNED:** correct resource set |
| F03 | Resource bar shows current, cap and income/hour | SRC01, SRC15 | A | **ALIGNED:** browser HUD |
| F04 | 40 basic types / 10 per race; HP, ATK, DEF, SPD, Load, cost, training time | SRC02 | A | **ALIGNED CATALOG:** requires visual unit sprites |
| F05 | Troop/command value = Gold + 5×(Lumber+Ore)+10×(Sulfur+Crystal) | SRC02 | A | **HG06 ADDED:** computed and displayed read-only; no speculative troop cap |
| F06 | Hero ATK bonus to damage | SRC06, SRC07 | B | **PARTIAL:** own formula still no full spell/equipment parity |
| F07 | Hero DEF reduces incoming damage | SRC06, SRC07 | B | **HG06 ADDED:** applies to attacking NPC troops; PvP unresolved |
| F08 | Hero SPD adds (SPDhero−10)×0.02 to unit speed | SRC06 | B | **HG06 ADDED:** tactical initiative; game-world travel still demo |
| F09 | Castellan INT affects basic Town Hall gold | SRC03, SRC06, SRC09 | B/C | **HG06 PARTIAL:** one community equation, not exact universal rate; version differs across English/Chinese writeups |
| F10 | Tavern candidate list rerolls around once/hour | SRC03, SRC09 | A/B | **HG06 ADDED:** candidate UI + timer + save; quality odds/prices SIM |
| F11 | Candidate counts by Tavern level | SRC03 | B | **PARTIAL:** documented L2=3,L4=4,L9=7,L10=8; unknown other levels filled SIM |
| F12 | Tavern hero quality differs with level | SRC03, SRC09 | B | **PARTIAL:** quality simulated, not validated distribution |
| F13 | Town Hall caps construction level except for explicit source-listed terminal gates | SRC03, SRC10 | A/B | **PARTIAL:** general cap enforced; SRC03's explicit Hero Tower L8 and Tavern L10 entries are implemented as the only sourced exceptions |
| F14 | Tavern L10 requires Hero Tower L8; Hero Tower L8 requires Town Hall L7 | SRC03; broad relationship cross-checked by SRC44 | B | **HG-08 ADDED:** real construction gates, no-spend lock, paid queue, and strict v07 Save/Load tested; other Tavern/Hero Tower levels and regional parity remain unverified |
| F15 | High-tier troop building requires side buildings / researched tech | SRC03, SRC10, SRC11 | B | **PARTIAL:** not gate-complete beyond Scout |
| F16 | Warehouse capacity & Storing | SRC08, SRC04 | A | **PARTIAL:** static level lookup exists, early levels unclear |
| F17 | Castle spells and 5 equipped hero skills | SRC04 | A | **PARTIAL:** demo spell catalog, not whole original list or combat AI |
| F18 | Arena 75% defeated units become wounded | SRC03, SRC17 | B | **PARTIAL:** wounds, healing cost demo |
| F19 | Market trades/sells materials; Bazaar sells items | SRC03, SRC11 | A/B | **HG06 FIX:** previously permanently locked despite implemented actions; now buildable; item prices SIM |
| F20 | AP regenerates 10% of maximum hourly | SRC05 | A | **ALIGNED** with game-time demo scale |
| F21 | Mine attack uses 6 AP; Happy Hour 3 AP | SRC05 | A | **PARTIAL:** normal AP cost implemented; Happy Hour absent |
| F22 | Real persistent world, scouting, roaming heroes, portals, resource control | SRC05, SRC14, SRC15, SRC43 | B | **HG-10 PARTIAL:** 100×100 coordinate map, paths, AP marches, mines/castles, three outbound heroes and ten visitable structures work; fog/scouting, portals, PvP and original-client behavior remain unverified |
| F23 | 7 tactical army stacks 4 rear + 3 front | SRC09 | A for Chinese Sep 2009 | **ALIGNED LAYOUT:** 7 positions, but tactical AI remains a simulation |
| F24 | Manual Attack, Stand By, Retreat, Focus alongside automatic turns | SRC12, SRC16, SRC23 | B | **PARTIAL:** controls work; HG-09 ties speed by battlefield position as described in SRC23. Battle formula, full timing and some targeting priorities remain incomplete |
| F25 | Historical battle encounter timer/entry delay | SRC12, later English summaries | C / version-conflict | **MISSING:** 10-second closed-beta vs later 20-second or different durations; do not hard-code yet |
| F26 | Four race-specific castle environments; scenic 2D landscape with buildings placed into the terrain | SRC11, SRC14, SRC15, SRC42 | A/B | **MISSING / LOW FIDELITY:** current geometric procedural renderer is a functional placeholder and visibly does not match the historical scenic art |
| F27 | Multiple cities, castles, hero/guild/rank limitations | SRC01, SRC17, SRC20, SRC41 | B | **HG-10 PARTIAL:** Fame-gated neutral-city capture, race-specific local economy, city switching, inactive queues and the SRC41 three-hero outbound dispatch cap are playable. Queued battles, captured-city starting state/AP, PvP seizure/abandonment and original-client parity remain incomplete or modeled |
| F28 | Guild, PvP, chat, mail, server-authoritative economy | SRC01, SRC17 | B | **MISSING:** would require backend implementation |
| F29 | Tower of Babel and later expansion modes | SRC17 | B for later versions | **MISSING / out of 2009 baseline:** version decision required |
| F30 | Game saved on central online server | SRC01 | A | **DIFFERENT:** localStorage + JSON backups by design |
| F31 | Capture leaves hero stationed at the acquired castle/resource point; Return makes the hero available at the original city | SRC40, 2009-10-25 | B | **HG-10 PARTIAL:** mine and city garrison persist; Recall follows a saved route and returns troops to the tracked departure city. The FAQ says original main city; behavior from secondary-city dispatch remains unverified |
| F32 | Capturing another-race city unlocks its troops and hero spells; routine tasks remain main-city-only | SRC41, 2009-10-16 | B | **HG-10 PARTIAL:** local race-specific recruitment/research works; task claims are blocked outside the main city. Exact captured-city buildings/stock are modeled |
| F33 | 100×100 coordinates and once-daily noncombat visits with resource rewards or two-hour hero buffs | SRC41, SRC43 | B | **HG-10 PARTIAL PASS:** ten guide-listed structures are selectable and their rewards/buffs alter live gameplay and saved state. UTC reset and immediate no-AP visit are models; original travel, visual assets and regional parity remain unverified |
| F34 | NPC hero XP rewards by star | SRC45, SRC03 | B for the dated Chinese guide | **PARTIAL:** NPC wins use the reported 4★–8★ base XP and SRC03 Hero Tower multiplier. 1★–3★ and mine/castle rewards remain explicit models; XP rounding and international parity are unresolved |
| F35 | Wild NPC stars, coordinates and recommended force | SRC46 | B for the dated Chinese guide compilation | **PARTIAL:** 128 listed sites and 1★–8★ advisory force bands are represented on the world map. Live travel and NPC battles work, and v07 saves preserve them. Enemy compositions/stats remain modeled; the recommendations are not hard gates; Chinese map instance and English/EU parity are unverified |
| F36 | Reported NPC guarding force by star | SRC45, SRC46, SRC47 | B for these dated Chinese player reports | **PARTIAL:** SRC46 attack recommendations and SRC47 guard-force reports differ at 1★/2★ (1,500/4,000 vs 1,800/4,200) and match at 3★–8★; later SRC45 gives separate approximate 6★–8★ values (400,000/900,000/1,500,000), conflicting with SRC47 (360,000/720,000/1,200,000). UI preserves dated source values separately. No hard gate or enemy roster is inferred. Formula/version and English/EU parity remain unresolved |
| F37 | High-star NPC battle advice and player army recommendations | SRC45 | B for a dated Chinese player guide | **PARTIAL EVIDENCE ONLY:** Research ledger records tier/force/speed advice for 3★–8★ and two broad 8★ formation patterns. It is not enforced as a game rule; exact enemy compositions, stats and original-client calibration remain modeled or missing |
| F38 | Outdoor equipment camps, 1–10 locations, defensive-force guidance and gear acquisition | SRC20; SRC47 | B for dated Chinese player guides | **PARTIAL PASS:** 76 coordinates are selectable; guard-force reports remain separate from attack advice, including level-2 8,400 vs 8,000 and the suspicious level-6 100,000 “complete” typo. March, battle, independent target clearing, v07 reload and equipable modeled loot work. Enemy roster/stats, item attributes and original drop table remain missing/SIM; regional parity is unverified |

## 3. Source conflicts and caveats

1. **Dates/regions must be tracked per rule.** January 2009 *英雄之城* closed-beta article says army splitting was not yet available. September 2009 Chinese tactical guide shows seven stacks. These are not necessarily contradictions: different versions of a changing game.
2. **Combat calculation is provisional.** English wiki gives a credible formula `ATKunit²/(ATKunit + DEFtarget)`, hero factor `(100+ATKhero)/(100+DEFhero)`, plus buff multipliers and attack stack count. Other pages openly flag PvP/stat modifiers as untested or broken. Use as measured approximation, not full engine recovery.
3. **Intelligence formula ambiguity.** Chinese guide mentions +2 Gold/hour per INT, while Fandom gives roughly 2/3% of base Town Hall production per point above 10. HG06 uses the latter as an illustrative model. This needs controlled battle/build screenshots or runtime behavior from an authorized client.
4. **Not all unit names match across editions.** Example: Orc tier 1 appears as `Imp` in the Wikidot 2009 table while the Fandom table calls it `Peon`. Catalog HG06 retains the earlier Wikidot dataset and records this discrepancy.
5. **Castle-limit patch conflict.** SRC41 (2009-10-16) says the first secondary city unlocks at 8,000 Fame, while SRC20's later 2009-12-27 fame-rank table gives a castle limit of two from 5,800 Fame; the living Fandom Castles page says 22,000 for two. HG-10 uses the dated December China table as its selected profile and exposes the conflict. The correct threshold for the original English/EU client is unverified.
6. **NPC force values conflict by article date and meaning.** SRC46 (2009-07-27) prints minimum/complete player attack recommendations; SRC47 (2009-08-23) labels a guard-force table; SRC45 (2009-09-21) later estimates 6★–8★ monster forces as 400,000/900,000/1,500,000, unlike SRC47's 360,000/720,000/1,200,000. The build preserves source/date labels instead of averaging these reports or inferring troop rosters/stats.
7. **Castle of Heroes search ambiguity.** A contemporary website at `castleofheroes.com` describes a different game (hero cards, castle tiles). This source is excluded from the target game's evidence set.
8. **One data source does not grant art rights.** Existing screenshots are kept as hyperlinks for comparison. No original commercial sprite/SWF/server files are redistributed.

## 4. HG06 code audit: outcomes

- ADDED: version-6-compatible Tavern candidate offers and 60-minute game clock; deterministic rotation for reproducible QA, no duplicated hire.
- ADDED: all equipped combat units get the wiki community speed adjustment from the commanding hero; incoming damage is adjusted for player's hero DEF.
- HG-08: NPC win XP for 4★–8★ now uses SRC45's dated Chinese guide table; 1★–3★ and mine/castle XP remain explicitly modeled.
- HG-09: SRC46's 128 published 1★–8★ NPC map coordinates and printed force recommendations are playable map targets; NPC roster/stats remain modeled and are disclosed in the target UI.
- HG-09: the target panel separately labels SRC47's reported monster guard force, SRC46's attack recommendations, and SRC45's later approximate 6★–8★ force estimates; 1★/2★ and 6★–8★ dated conflicts are preserved rather than averaged. SRC45's troop-tier/hero-speed tactics are recorded as player advice, not silently enforced or treated as NPC roster data.
- ADDED: illustrative Castellan INT gold modifier, visibly segregated as provisional.
- ADDED: read-only troop command value from weighted wiki cost formula, without inventing an unverified troop capacity threshold.
- FIXED: Market/Bazaar were declared `catalog` in HG05 even though their UI/actions existed and required building level >=1; HG06 makes them buildable. Guild/Embassy remains disabled.
- RETAINED: HG05 construction queue, v2→v5 migration, JSON export/import, four factions, 40-unit data, offline game speed ×1/×60.
- NOT DONE: exact hero quality probabilities, nation-specific building/side-building gates, genuine city and unit assets, browser online networking, actual Heroes of Gaia client verification.

## 5. Next implementation order based on strongest evidence

1. **HG07 Army capacity + high-tier prerequisites:** recover `unit points` command threshold from hero levels, rank and bonuses. Add dataset with provenance before enforcing a gate. Implement Forge/Stable/Graveyard race-specific building prerequisites only with citations.
2. **HG08 original tactical battle profile:** separate official/English and Chinese versions, implement accurate timer (once verified), priority targeting, unit motion, spells and 7-slot behavior. Capture screenshot diffs against historic screens.
3. **HG09 four cities + world art:** independently create each faction's town/environment/units or obtain license for historical assets; ensure actual in-game screenshots and mobile responsiveness.
4. **HG10 MMO back-end:** multi-city/world state, guild, diplomacy, PvP, alliances, anti-duplication ledger and server time. Do not call current offline prototype an MMO.

## 6. Evidence versus verification

The historical articles and wiki pages are **documentary research**. Node/Chromium tests only show that **HG06 implements its own stated behavior**, not that the 2009 client would behave identically. Verifying exact clone parity requires original data/client and version-stamped empirical or static evidence. The `REV-01` dossier remains background; this HG06 dossier supersedes its three-game planning scope by focusing on Heroes of Gaia alone.

## 7. HG08 research additions and interpretation

- `SRC19` and `SRC20` both publish the Human troop requirements in the same tier order. `SRC20` is explicitly dated 2009-12-27; `SRC19` is hosted in the publisher's Heroes of Gaia section under `/201011/`, so it is treated as a 2010 corroboration rather than mislabeled 2009 evidence. Both provide T1 and T3–T10; neither lists the Scout row.
- The English community spell page `SRC04` calls the relevant passive city research **Bootcamp** (2% less unit training time per level and a higher-tier recruitment requirement), **Manufacturing** (2% less unit gold cost per level), and says Scouting level 1 is needed for scouting units. The Chinese Human table calls the training gate “练兵技术”. HG08 maps that gate to the English Bootcamp spell by matching role/effect; that name crosswalk is an inference and remains labeled `NAME_MAPPING_DERIVED` in code/evidence. Manufacturing is a direct same-name match.
- `SRC22` calls Elf Scout, Orc Wolf Rider and low-tier Undead Ghost scouting units. HG08 applies SRC04's Scouting-1 gate to the matching catalog tier-2 units; the Common Ghost ↔ low-tier Ghost label and the cross-region gate parity are not verified against original runtime.
- `SRC03` says Barracks levels unlock units but does not provide a full per-race prerequisite table. HG08 does not invent the Elf/Orc/Undead support-building tier for each unit. The client enforces Barracks tier as a partial base gate and displays the missing faction-specific gate status.
- For Human Scout, `SRC04` supports the Scouting-1 gate and `SRC03` supports a Barracks-level unlock model. Because the cited Human table omits Scout, the exact Town Hall requirement is not enforced or claimed as observed; its status is partial.
- Current contemporary sources and the older English wiki are a mixed 2009–2010 snapshot. Exact patch parity and international localization equivalence remain unverified. See `docs/research/HG08-EVIDENCE-REGISTER.md` and `docs/research/HG08-TROOP-UNLOCK-MATRIX.md` for row-level coverage.
- HG-09 uses SRC23's dated equal-speed position order: actors are first sorted by speed descending, then by battlefield x/y (left-to-right, top-to-bottom). SRC24 describes ranged stacks firing at the strongest enemy but supplies no numeric reach; HG-09's board-wide reach is a local playable approximation. The exact unit damage formula, AI in all contexts, Stand By modifier, focus multiplier, NPC stats and encounter timer remain provisional unless a source row explicitly says otherwise. The live browser capture is in `docs/evidence/hg09/`.

## SRC39 — Fame mine caps and captured-mine output (2026-11-02)

[17173, 2009-12-27, player-submitted Chinese guide](https://web.17173.com/content/2009-12-27/1261927948.shtml), especially lines 21–24 and 243–264:

| Rule | Printed guide values | Status/confidence |
|---|---|---|
| Starting occupied mines | 5 | Existing new-game behavior; B for dated regional guide |
| Mine count by Fame | 5 at 5/200/800; 6 at 2,200; 7 at 5,800; 8 at 11,500; 9 at 21,000; 11 at 33,000; 13 at 54,000; 15 at 80,000; 17 at 150,000; 20 at 300,000, 500,000, 700,000 and 1,000,000 | Implemented as FAME_MINE_CAPS; B, Chinese guide; English/EU equivalence unverified |
| Raw yield per captured mine | Gold 200/hour; Wood/Ore 40/hour; Sulfur/Crystal 20/hour | Implemented as flat per-mine output. No per-level scaling in source; mine spell multiplier remains unverified. B |
| Same article on Lequ | Repeats broad resource/cap prose | Publisher-hosted 2010 context but near-verbatim, not independent confirmation |

These numeric rules are from a contemporary player guide, not recovered code or original-client observation. They remain region-tagged. An over-cap march is rejected before AP deduction; captured-mine output is derived from persisted ownership records during the economy tick, with no save schema/key change.

### SRC20 Fame-ranked AP capacity and recovery

The same 2009-12-27 fame table prints these exact thresholds and hourly rates:

| Fame threshold | AP maximum | AP recovery/hour |
|---:|---:|---:|
| 5 | 150 | 15 |
| 200 | 165 | 16 |
| 800 | 180 | 18 |
| 2,200 | 200 | 20 |
| 5,800 | 230 | 23 |
| 11,500 | 260 | 26 |
| 21,000 | 290 | 29 |
| 33,000 | 320 | 32 |
| 54,000 | 360 | 36 |
| 80,000 | 400 | 40 |
| 150,000 | 450 | 45 |
| 300,000 | 500 | 50 |
| 500,000 | 560 | 56 |
| 700,000 | 620 | 62 |
| 1,000,000 | 700 | 70 |

HG-08 implements the tabulated maximum and per-hour rate in the live engine and HUD. Old v07 saves retain their AP amount and key; a Fame increase does not fill the newly available capacity. The guide does not state regeneration timer granularity or a new account's starting current AP amount. The prototype retains the previous v07 starting amount of 100 AP and models accrual continuously at the printed hourly rate. Confidence B applies to the dated Chinese guide; English/EU parity is still open.


## SRC40 — Mine garrison and manual return (2026-11-02)

The 17173 player FAQ dated 2009-10-25 states in its “why did my hero disappear after occupation?” section that after occupying a new castle/resource point, the hero is stationed there; the player must choose Return to get the hero back to the original main castle and use them again. The same page separately describes fixed map coordinates and mine production.

This supports HG-10's mine garrison and explicit Recall behavior at B confidence for the Chinese edition. It does not establish the international build, troop transport ledger, route/timing, or AP cost. The reconstruction stores the selected troop group outside the castle pool, persists the destination and return route in the existing v07 save, and merges surviving troops once at arrival. No schema/key bump is made. Automatic return after non-mine battles and recall's no-AP cost remain implementation choices until sourced.


## SRC41 — Secondary-city behavior and main-city tasks (2026-11-02)

The 17173 guide dated 2009-10-16 says that occupying a secondary city unlocks the captured race's troops and hero spells, while routine tasks are performed only in the player's main-race city. It also describes fame-limited city ownership (maximum six), secondary-city capture/abandonment, and limits simultaneous expeditions to three heroes. It says buildings cannot be demolished or downgraded.

HG-10 implements race-separated resources, buildings, troop pools, research and offline queues; city switching; real castle battle/capture; and main-city-only task claiming. The guide's three-hero cap is now enforced across stationed heroes, the active expedition and queued parallel marches. Outbound route clocks progress concurrently, and v07 save/reload preserves the routes. Because the current tactical UI supports one live battle, arrivals wait and are activated one at a time after the active force settles; this serialization is a disclosed implementation constraint, not evidence about original battle concurrency. The live Chrome UI/reload test is 25/25 and cumulative Node regression 108/108. Initial stock/buildings for a captured neutral city and an 8-AP castle occupation price remain MODELED because this guide gives no values or starting state. Confidence B describes the dated Chinese guide only; English/EU parity is unverified.


## SRC43 — World visitables, rewards and coordinates (2026-11-03)

The 17173 guide dated 2009-12-27 calls out noncombat wild buildings. Lines 145–154 list the Windmill resource roll (Wood 400, Ore 400, Sulfur 200 or Crystal 200), Watermill reward (2,000 Gold), and two-hour hero bonuses: War Academy +10% Attack, Defense Tower +10% Defense, Enlightenment Book +10% Knowledge, Prayer Temple +10% Speed. Lines 225–236 print coordinates on a 0–99 map grid and list five Watermills. SRC41 separately describes a once-per-day visit limit for special buildings.

HG-10 now uses a 100×100 world coordinate grid and adds the ten listed visitable structures. Visits award capped resources or apply live hero-stat buffs; Attack/Defense change combat, Speed affects combat and hero march calculations, and Knowledge affects the existing modeled Castellan-income formula if the hero is appointed after the visit. Visit state and remaining buff game-time round-trip in v07 without a save-key/schema change. UTC midnight and immediate no-AP visitation are implementation choices because the guides do not state reset timezone, movement, or AP cost. World-building illustrations are original code-drawn prototypes, not extracted HOG artwork. This is B-confidence evidence for a dated Chinese player guide; English/EU parity remains unknown.


## SRC44 — Hero Tower/Tavern prerequisite cross-check (2026-11-03)

The Chinese 17173 city-development article dated 2010-12-14 states qualitatively that Hero Tower level gates Tavern upgrades and that Tavern level affects candidate quantity and quality. It gives neither a numeric gate nor candidate probabilities. For the exact terminal chain implemented in HG-08, the numeric evidence remains the explicit entries in SRC03's English community building page revision dated 2009-12-09: Hero Tower L8 requires Town Hall L7, and Tavern L10 requires Hero Tower L8. Do not infer intermediate level gates from either source. The 2010 Chinese article supports the relationship only; it is not independent confirmation of the exact values or of English/EU client parity.
