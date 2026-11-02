# Hẻoofgaia — HG06 evidence dossier: Heroes of Gaia only

**Research cut-off:** 2026-11-02. **Target baseline:** 2009–early-2010 *Heroes of Gaia* (北美) / *Castle of Heroes* (EU) / *英雄之城* (China), developed by Snail Games. **Not** Call of Gods, Fengshen Wudi, or the distinct modern website at castleofheroes.com.

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
| F13 | Town Hall caps construction level | SRC03, SRC10 | A | **ALIGNED** |
| F14 | Hero Tower prerequisite to Tavern level | SRC03, SRC09 | B | **MISSING:** exact level gates require regional verification |
| F15 | High-tier troop building requires side buildings / researched tech | SRC03, SRC10, SRC11 | B | **PARTIAL:** not gate-complete beyond Scout |
| F16 | Warehouse capacity & Storing | SRC08, SRC04 | A | **PARTIAL:** static level lookup exists, early levels unclear |
| F17 | Castle spells and 5 equipped hero skills | SRC04 | A | **PARTIAL:** demo spell catalog, not whole original list or combat AI |
| F18 | Arena 75% defeated units become wounded | SRC03, SRC17 | B | **PARTIAL:** wounds, healing cost demo |
| F19 | Market trades/sells materials; Bazaar sells items | SRC03, SRC11 | A/B | **HG06 FIX:** previously permanently locked despite implemented actions; now buildable; item prices SIM |
| F20 | AP regenerates 10% of maximum hourly | SRC05 | A | **ALIGNED** with game-time demo scale |
| F21 | Mine attack uses 6 AP; Happy Hour 3 AP | SRC05 | A | **PARTIAL:** normal AP cost implemented; Happy Hour absent |
| F22 | Real persistent world, scouting, roaming heroes, portals, resource control | SRC05, SRC14, SRC15 | B | **MISSING/PARTIAL:** 28×18 local map and pathfinding, portals absent |
| F23 | 7 tactical army stacks 4 rear + 3 front | SRC09 | A for Chinese Sep 2009 | **ALIGNED LAYOUT:** 7 positions, but tactical AI remains a simulation |
| F24 | Manual Attack, Stand By, Retreat, Focus alongside automatic turns | SRC12, SRC16 | B | **PARTIAL:** controls work; speed/timing/target priorities incomplete |
| F25 | Historical battle encounter timer/entry delay | SRC12, later English summaries | C / version-conflict | **MISSING:** 10-second closed-beta vs later 20-second or different durations; do not hard-code yet |
| F26 | Four race-specific city backgrounds, alternate architecture | SRC11, SRC14, SRC15 | A | **MISSING:** procedural renderer only; no properly sourced original artwork |
| F27 | Multiple cities, castles, hero/guild/rank limitations | SRC01, SRC17 | B | **MISSING:** currently single-player offline |
| F28 | Guild, PvP, chat, mail, server-authoritative economy | SRC01, SRC17 | B | **MISSING:** would require backend implementation |
| F29 | Tower of Babel and later expansion modes | SRC17 | B for later versions | **MISSING / out of 2009 baseline:** version decision required |
| F30 | Game saved on central online server | SRC01 | A | **DIFFERENT:** localStorage + JSON backups by design |

## 3. Source conflicts and caveats

1. **Dates/regions must be tracked per rule.** January 2009 *英雄之城* closed-beta article says army splitting was not yet available. September 2009 Chinese tactical guide shows seven stacks. These are not necessarily contradictions: different versions of a changing game.
2. **Combat calculation is provisional.** English wiki gives a credible formula `ATKunit²/(ATKunit + DEFtarget)`, hero factor `(100+ATKhero)/(100+DEFhero)`, plus buff multipliers and attack stack count. Other pages openly flag PvP/stat modifiers as untested or broken. Use as measured approximation, not full engine recovery.
3. **Intelligence formula ambiguity.** Chinese guide mentions +2 Gold/hour per INT, while Fandom gives roughly 2/3% of base Town Hall production per point above 10. HG06 uses the latter as an illustrative model. This needs controlled battle/build screenshots or runtime behavior from an authorized client.
4. **Not all unit names match across editions.** Example: Orc tier 1 appears as `Imp` in the Wikidot 2009 table while the Fandom table calls it `Peon`. Catalog HG06 retains the earlier Wikidot dataset and records this discrepancy.
5. **Castle of Heroes search ambiguity.** A contemporary website at `castleofheroes.com` describes a different game (hero cards, castle tiles). This source is excluded from the target game's evidence set.
6. **One data source does not grant art rights.** Existing screenshots are kept as hyperlinks for comparison. No original commercial sprite/SWF/server files are redistributed.

## 4. HG06 code audit: outcomes

- ADDED: version-6-compatible Tavern candidate offers and 60-minute game clock; deterministic rotation for reproducible QA, no duplicated hire.
- ADDED: all equipped combat units get the wiki community speed adjustment from the commanding hero; incoming damage is adjusted for player's hero DEF.
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
