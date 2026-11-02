# HG-08 troop unlock matrix

All 40 catalog rows are listed. “Gates in build” are the checks currently enforced before resources are spent. Confidence describes historical evidence, not software-test coverage.

- **A / OBSERVED:** exact requirement appears in the later dated Chinese Human table (SRC19, independently corroborated by SRC20). Earlier SRC27 (2009-05-21) is retained as version-conflicting evidence: it lists Archer at Barracks 2 and does not print the later Town Hall gates. The current enforced rows target the later table.
- **B / PARTIAL:** the available source supports only part of the gate; missing requirements are not invented.
- **C / SECONDARY:** a third-party entry lists a per-unit gate with no date/build (Thunderbird, SRC26), or a dated contemporary feature states the gate without original-client validation (Centaur, SRC28). Neither is checked against the original client.
- **P / PROVISIONAL MODEL:** non-Human troop-building level is temporarily mapped to catalog tier for a playable progression curve. No dated 2009–2010 per-unit numeric gate table was found. This is a gameplay proxy, not historical data.
- **SRC04 / DERIVED:** “练兵技术” is mapped to the English Bootcamp spell by matching purpose; the cross-language name equivalence is inferred.
- Every row also requires that troop type to belong to the selected race. Base costs and time come from SRC02.

| Race | Tier | Unit | Gates enforced in this build | Evidence status | Sources / gap |
|---|---:|---|---|---|---|
| Human | 1 | Spear Militia | Town Hall 1; Barracks 1 | A / OBSERVED | SRC19, SRC20 |
| Human | 2 | Scout | Barracks 2; Scouting 1 | B / PARTIAL; exact Town Hall row absent | SRC27 directly lists Barracks 2 and Scouting 1; SRC04 terminology crosswalk; Town Hall requirement unverified |
| Human | 3 | Archer | Town Hall 3; Barracks 3; Bootcamp 1 | A / OBSERVED; Bootcamp name mapping derived | SRC19, SRC20, SRC04 |
| Human | 4 | Heavy Soldier | Town Hall 4; Barracks 4; Blacksmith 1; Manufacturing 1 | A / OBSERVED | SRC19, SRC20, SRC04 |
| Human | 5 | Gryphon | Town Hall 5; Barracks 5; Stables 1; Manufacturing 3 | A / OBSERVED | SRC19, SRC20, SRC04 |
| Human | 6 | Monk | Town Hall 6; Barracks 6; Bootcamp 5 | A / OBSERVED; Bootcamp name mapping derived | SRC19, SRC20, SRC04 |
| Human | 7 | Elite Knight | Town Hall 7; Barracks 7; Stables 4; Blacksmith 4; Bootcamp 6 | A / OBSERVED; Bootcamp name mapping derived | SRC19, SRC20, SRC04 |
| Human | 8 | Priest | Town Hall 8; Barracks 8; Blacksmith 6; Manufacturing 7 | A / OBSERVED | SRC19, SRC20, SRC04 |
| Human | 9 | Angel | Town Hall 9; Barracks 9; Stables 7; Blacksmith 8; Manufacturing 8 | A / OBSERVED | SRC19, SRC20, SRC04 |
| Human | 10 | Archangel | Town Hall 10; Barracks 10; Stables 9; Blacksmith 10; Manufacturing 9; Bootcamp 9 | A / OBSERVED; Bootcamp name mapping derived | SRC19, SRC20, SRC04 |
| Elf | 1 | Centaur | Barracks 1 | C / SECONDARY | SRC28 explicitly names the level-1 Barracks gate; original-client check missing |
| Elf | 2 | Elf Scout | Barracks 2; Scouting 1 | P / PROVISIONAL MODEL | SRC02, SRC03, SRC04, SRC22; guide identifies Elf Scout as scout; Town Hall/faction gates unresolved |
| Elf | 3 | Dwarven Soldier | Barracks 3 | P / PROVISIONAL MODEL | SRC02, SRC03; exact gate table missing |
| Elf | 4 | Elf Archer | Barracks 4 | P / PROVISIONAL MODEL | SRC02, SRC03; exact gate table missing |
| Elf | 5 | Pegasus Warrior | Barracks 5 | P / PROVISIONAL MODEL | SRC02, SRC03; Magic Pool/Nature Tower tier unresolved (SRC11) |
| Elf | 6 | Dryad | Barracks 6 | P / PROVISIONAL MODEL | SRC02, SRC03; exact gate table missing |
| Elf | 7 | Unicorn | Barracks 7 | P / PROVISIONAL MODEL | SRC02, SRC03; exact gate table missing |
| Elf | 8 | Elite Archer | Barracks 8 | P / PROVISIONAL MODEL | SRC02, SRC03; exact gate table missing |
| Elf | 9 | Green Dragon | Barracks 9 | P / PROVISIONAL MODEL | SRC02, SRC03; Nature Tower tier unresolved (SRC11) |
| Elf | 10 | Fairy Dragon | Barracks 10 | P / PROVISIONAL MODEL | SRC02, SRC03; Nature Tower tier unresolved (SRC11) |
| Orc | 1 | Imp | Barracks 1 | P / PROVISIONAL MODEL | SRC02, SRC03; exact gate table missing |
| Orc | 2 | Wolf Rider | Barracks 2; Scouting 1 | P / PROVISIONAL MODEL | SRC02, SRC04, SRC22; guide identifies Wolf Rider as scout; Town Hall/faction gates unresolved |
| Orc | 3 | Axe Thrower | Barracks 3 | P / PROVISIONAL MODEL | SRC02, SRC03; exact gate table missing |
| Orc | 4 | Direwolf | Barracks 4 | P / PROVISIONAL MODEL | SRC02, SRC03; Beast Pen/Blacksmith tier unresolved (SRC11) |
| Orc | 5 | Ogre | Barracks 5 | P / PROVISIONAL MODEL | SRC02, SRC03; exact gate table missing |
| Orc | 6 | Harpy | Barracks 6 | P / PROVISIONAL MODEL | SRC02, SRC03; exact gate table missing |
| Orc | 7 | Thunderbird | Barracks 7; Beast Pen 4; Blacksmith 4; Training Technology 6 (mapped to Bootcamp) | C / SECONDARY; technology label mapping derived | SRC26; required buildings/skill listed; unit stats match SRC02; original-client confirmation missing |
| Orc | 8 | Cyclops | Barracks 8 | P / PROVISIONAL MODEL | SRC02, SRC03; Beast Pen/Blacksmith tier unresolved (SRC11) |
| Orc | 9 | Monster | Barracks 9 | P / PROVISIONAL MODEL | SRC02, SRC03; exact gate table missing |
| Orc | 10 | Behemoth | Barracks 10 | P / PROVISIONAL MODEL | SRC02, SRC03; Beast Pen/Blacksmith tier unresolved (SRC11) |
| Undead | 1 | Skeleton Warrior | Graveyard 1 | P / PROVISIONAL MODEL | SRC11 identifies Graveyard as troop-recruitment building; exact per-unit support gates missing |
| Undead | 2 | Common Ghost | Graveyard 2; Scouting 1 | P / PROVISIONAL MODEL | SRC11; SRC02, SRC04, SRC22; scout role mapped across editions; Town Hall/support gates unresolved |
| Undead | 3 | Zombie | Graveyard 3 | P / PROVISIONAL MODEL | SRC11 identifies Graveyard; exact per-unit support gates missing |
| Undead | 4 | Ghost | Graveyard 4 | P / PROVISIONAL MODEL | SRC11 identifies Graveyard; Dark Hall/Soul Tower levels unresolved |
| Undead | 5 | Vampire | Graveyard 5 | P / PROVISIONAL MODEL | SRC11 identifies Graveyard; exact per-unit support gates missing |
| Undead | 6 | Lich | Graveyard 6 | P / PROVISIONAL MODEL | SRC11 identifies Graveyard; exact per-unit support gates missing |
| Undead | 7 | Ghost Knight | Graveyard 7 | P / PROVISIONAL MODEL | SRC11 identifies Graveyard; exact per-unit support gates missing |
| Undead | 8 | Lich King | Graveyard 8 | P / PROVISIONAL MODEL | SRC11 identifies Graveyard; Dark Hall/Soul Tower levels unresolved |
| Undead | 9 | Bone Dragon | Graveyard 9 | P / PROVISIONAL MODEL | SRC11 identifies Graveyard; exact per-unit support gates missing |
| Undead | 10 | Ghost Dragon | Graveyard 10 | P / PROVISIONAL MODEL | SRC11 identifies Graveyard; Dark Hall/Soul Tower levels unresolved |

## Limits and next evidence work

- The exact Human conditions for the listed rows follow the later 2009–2010 Chinese sources SRC19/SRC20. Earlier dated SRC27 gives a different Archer Barracks level and omits Town Hall levels from its printed list; treat that as a version conflict, not corroboration of the later values. The table follows SRC19/SRC20; the `Training Technology` → `Bootcamp` English label is derived and needs a regional client screenshot or an official glossary to prove the crosswalk.
- All four tier-2 entries require Scouting 1. SRC22 identifies the three non-Human roles as scouts, while SRC04 supplies the Scouting-1 rule. Since these pages describe different regional editions, exact cross-version gate parity is not confirmed; Human Town Hall and other faction support-building gates remain unverified and are not enforced.
- The other 30 units do **not** have source-complete prerequisites. Faction building roles establish which structure recruits troops, not a numeric per-unit level.
- The 28 remaining Elf/Orc/Undead rows enforce the provisional P proxy `troop-building level = catalog tier`; the UI says this is not source-verified. Orc Thunderbird (SRC26) and Elf Centaur (SRC28) are C-confidence exceptions with printed gates; neither has original-client confirmation. Other support-building levels (including Dark Hall, Soul Tower, Magic Pool and Nature Tower) remain missing and unapplied.
