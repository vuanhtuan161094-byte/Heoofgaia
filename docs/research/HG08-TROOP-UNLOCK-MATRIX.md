# HG-08 troop unlock matrix

All 40 catalog rows are listed. “Gates in build” are the checks currently enforced before resources are spent. Confidence describes historical evidence, not software-test coverage.

- **A / OBSERVED:** exact gates are printed in the detailed Human table of the 2009-12-27 guide hosted by 17173 and republished at Lequ in 2010-11 (SRC19/SRC20). These URLs contain near-verbatim text and are not independent corroboration. The guide has a Monk conflict: a strategic prose example says Barracks 5 + training technology 5, while the unit table and fame-stage recommendation say Town Hall 6 + Barracks 6 + training technology 5. The matrix retains the specific table row and flags the conflict. Earlier SRC27 (2009-05-21) is version-conflicting evidence: it lists Archer at Barracks 2 and does not print the later Town Hall gates.
- **B / PARTIAL:** the available source supports only part of the gate; missing requirements are not invented.
- **B* / DERIVED BASE TIER:** For Elf/Orc, SRC03 says every Barracks level unlocks another unit; SRC02 lists the ten units in order and SRC11 identifies Barracks as their troop building. For Undead, SRC11 says higher Graveyard levels recruit higher-tier units, while SRC02 supplies the ordered roster. `Troop-building level = catalog tier` is a disclosed derivation for all three races; for Undead, the source supports direction only and no exact per-tier Graveyard table was recovered. Tier-2 Scouting remains cross-edition-derived. Missing racial support-building gates stay unapplied.
- **Early-version conflict (SRC10):** the 2009-03-25 17173 guide says Town Hall caps building levels, tier-2 Scout onward needs technology, and both Stables and Blacksmith become necessary from Heavy Soldier. It gives no per-unit levels; later SRC19/SRC20 lists Blacksmith 1 at T4 and Stables first at T5. Keep this as a build/source conflict; the matrix retains the dated detailed table and does not infer a Stable level.
- **C / SECONDARY:** a third-party entry lists a per-unit gate with no date/build (Thunderbird, SRC26), or a dated contemporary feature states the gate without original-client validation (Centaur, SRC28). Neither is checked against the original client.
- **SRC04 / DERIVED:** “练兵技术” is mapped to the English Bootcamp spell by matching purpose; the cross-language name equivalence is inferred.
- Every row also requires that troop type to belong to the selected race. Base costs and time come from SRC02.

| Race | Tier | Unit | Gates enforced in this build | Evidence status | Sources / gap |
|---|---:|---|---|---|---|
| Human | 1 | Spear Militia | Town Hall 1; Barracks 1 | A / OBSERVED | SRC19, SRC20 |
| Human | 2 | Scout | Barracks 2; Scouting 1 | B / PARTIAL; exact Town Hall row absent | SRC27 directly lists Barracks 2 and Scouting 1; SRC04 terminology crosswalk; Town Hall requirement unverified |
| Human | 3 | Archer | Town Hall 3; Barracks 3; Bootcamp 1 | A / OBSERVED; Bootcamp name mapping derived | SRC19, SRC20, SRC04 |
| Human | 4 | Heavy Soldier | Town Hall 4; Barracks 4; Blacksmith 1; Manufacturing 1 | A / OBSERVED | SRC19, SRC20, SRC04 |
| Human | 5 | Gryphon | Town Hall 5; Barracks 5; Stables 1; Manufacturing 3 | A / OBSERVED | SRC19, SRC20, SRC04 |
| Human | 6 | Monk | Town Hall 6; Barracks 6; Bootcamp 5 | A / OBSERVED; one prose example conflicts on Barracks level; Bootcamp name mapping derived | SRC19, SRC20, SRC04 |
| Human | 7 | Elite Knight | Town Hall 7; Barracks 7; Stables 4; Blacksmith 4; Bootcamp 6 | A / OBSERVED; Bootcamp name mapping derived | SRC19, SRC20, SRC04 |
| Human | 8 | Priest | Town Hall 8; Barracks 8; Blacksmith 6; Manufacturing 7 | A / OBSERVED | SRC19, SRC20, SRC04 |
| Human | 9 | Angel | Town Hall 9; Barracks 9; Stables 7; Blacksmith 8; Manufacturing 8 | A / OBSERVED | SRC19, SRC20, SRC04 |
| Human | 10 | Archangel | Town Hall 10; Barracks 10; Stables 9; Blacksmith 10; Manufacturing 9; Bootcamp 9 | A / OBSERVED; Bootcamp name mapping derived | SRC19, SRC20, SRC04 |
| Elf | 1 | Centaur | Barracks 1 | C / SECONDARY | SRC28 explicitly names the level-1 Barracks gate; original-client check missing |
| Elf | 2 | Elf Scout | Barracks 2; Scouting 1 | B* / DERIVED BASE TIER; scouting cross-version-derived | SRC02, SRC03, SRC04, SRC11, SRC22; exact support gates absent |
| Elf | 3 | Dwarven Soldier | Barracks 3 | B* / DERIVED BASE TIER | SRC02, SRC03, SRC11; exact support gates absent |
| Elf | 4 | Elf Archer | Barracks 4 | B* / DERIVED BASE TIER | SRC02, SRC03, SRC11; exact support gates absent |
| Elf | 5 | Pegasus Warrior | Barracks 5 | B* / DERIVED BASE TIER | SRC02, SRC03, SRC11; Magic Pool/Nature Tower tier unresolved |
| Elf | 6 | Dryad | Barracks 6 | B* / DERIVED BASE TIER | SRC02, SRC03, SRC11; exact support gates absent |
| Elf | 7 | Unicorn | Barracks 7 | B* / DERIVED BASE TIER | SRC02, SRC03, SRC11; exact support gates absent |
| Elf | 8 | Elite Archer | Barracks 8 | B* / DERIVED BASE TIER | SRC02, SRC03, SRC11; exact support gates absent |
| Elf | 9 | Green Dragon | Barracks 9 | B* / DERIVED BASE TIER | SRC02, SRC03, SRC11; Nature Tower tier unresolved |
| Elf | 10 | Fairy Dragon | Barracks 10 | B* / DERIVED BASE TIER | SRC02, SRC03, SRC11; Nature Tower tier unresolved |
| Orc | 1 | Imp | Barracks 1 | B* / DERIVED BASE TIER | SRC02, SRC03, SRC11; exact support gates absent |
| Orc | 2 | Wolf Rider | Barracks 2; Scouting 1 | B* / DERIVED BASE TIER; scouting cross-version-derived | SRC02, SRC03, SRC04, SRC11, SRC22; exact support gates absent |
| Orc | 3 | Axe Thrower | Barracks 3 | B* / DERIVED BASE TIER | SRC02, SRC03, SRC11; exact support gates absent |
| Orc | 4 | Direwolf | Barracks 4 | B* / DERIVED BASE TIER | SRC02, SRC03, SRC11; Beast Pen/Blacksmith tier unresolved |
| Orc | 5 | Ogre | Barracks 5 | B* / DERIVED BASE TIER | SRC02, SRC03, SRC11; exact support gates absent |
| Orc | 6 | Harpy | Barracks 6 | B* / DERIVED BASE TIER | SRC02, SRC03, SRC11; exact support gates absent |
| Orc | 7 | Thunderbird | Barracks 7; Beast Pen 4; Blacksmith 4; Training Technology 6 (mapped to Bootcamp) | C / SECONDARY; technology label mapping derived | SRC26; required buildings/skill listed; unit stats match SRC02; original-client confirmation missing |
| Orc | 8 | Cyclops | Barracks 8 | B* / DERIVED BASE TIER | SRC02, SRC03, SRC11; Beast Pen/Blacksmith tier unresolved |
| Orc | 9 | Monster | Barracks 9 | B* / DERIVED BASE TIER | SRC02, SRC03, SRC11; exact support gates absent |
| Orc | 10 | Behemoth | Barracks 10 | B* / DERIVED BASE TIER | SRC02, SRC03, SRC11; Beast Pen/Blacksmith tier unresolved |
| Undead | 1 | Skeleton Warrior | Graveyard 1 | B* / DERIVED BASE TIER | SRC02, SRC11; Graveyard level direction is dated, exact level-to-tier mapping and unit support gates remain derived/unresolved |
| Undead | 2 | Common Ghost | Graveyard 2; Scouting 1 | B* / DERIVED BASE TIER; scouting cross-version-derived | SRC02, SRC04, SRC11, SRC22; Graveyard level mapping is derived; Scouting is cross-version-derived; exact unit support gates remain unresolved |
| Undead | 3 | Zombie | Graveyard 3 | B* / DERIVED BASE TIER | SRC02, SRC11; Graveyard level direction is dated, exact level-to-tier mapping and unit support gates remain derived/unresolved |
| Undead | 4 | Ghost | Graveyard 4 | B* / DERIVED BASE TIER | SRC02, SRC11; Graveyard progression direction is dated; Dark Hall/Soul Tower tiers and exact mapping remain unresolved |
| Undead | 5 | Vampire | Graveyard 5 | B* / DERIVED BASE TIER | SRC02, SRC11; Graveyard level direction is dated, exact level-to-tier mapping and unit support gates remain derived/unresolved |
| Undead | 6 | Lich | Graveyard 6 | B* / DERIVED BASE TIER | SRC02, SRC11; Graveyard level direction is dated, exact level-to-tier mapping and unit support gates remain derived/unresolved |
| Undead | 7 | Ghost Knight | Graveyard 7 | B* / DERIVED BASE TIER | SRC02, SRC11; Graveyard level direction is dated, exact level-to-tier mapping and unit support gates remain derived/unresolved |
| Undead | 8 | Lich King | Graveyard 8 | B* / DERIVED BASE TIER | SRC02, SRC11; Graveyard progression direction is dated; Dark Hall/Soul Tower tiers and exact mapping remain unresolved |
| Undead | 9 | Bone Dragon | Graveyard 9 | B* / DERIVED BASE TIER | SRC02, SRC11; Graveyard progression direction is dated; Dark Hall/Soul Tower tiers and exact mapping remain unresolved |
| Undead | 10 | Ghost Dragon | Graveyard 10 | B* / DERIVED BASE TIER | SRC02, SRC11; Graveyard progression direction is dated; Dark Hall/Soul Tower tiers and exact mapping remain unresolved |

## Limits and next evidence work

- The exact Human conditions for the listed rows follow the later 2009–2010 Chinese sources SRC19/SRC20. Earlier dated SRC27 gives a different Archer Barracks level and omits Town Hall levels from its printed list; treat that as a version conflict, not corroboration of the later values. The table follows SRC19/SRC20; the `Training Technology` → `Bootcamp` English label is derived and needs a regional client screenshot or an official glossary to prove the crosswalk.
- All four tier-2 entries require Scouting 1. SRC22 identifies the three non-Human roles as scouts, while SRC04 supplies the Scouting-1 rule. Since these pages describe different regional editions, exact cross-version gate parity is not confirmed; Human Town Hall and other faction support-building gates remain unverified and are not enforced.
- The other 30 units do **not** have source-complete prerequisites. Faction building roles establish which structure recruits troops, not a numeric per-unit level.
- Elf/Orc enforce the B* derived base gate `Barracks level = catalog tier`. Undead enforces `Graveyard level = tier` as a B* inference: SRC11 supports the direction of progression but does not give exact per-tier levels, and an early internal-test article conflicts on roster count/stats. Orc Thunderbird (SRC26) and Elf Centaur (SRC28) retain C-confidence gates; none has original-client confirmation. Support-building levels (including Dark Hall, Soul Tower, Magic Pool, Nature Tower, Beast Pen and Blacksmith) remain missing and unapplied except where a cited row states them.

### Additional source audit — 2026-11-02

Sina's dated race roster pages identify unit names and broad roles for all four Chinese rosters, but do not establish numeric per-unit gates. This confirms that roster role and recruitment prerequisite are separate evidence questions; the P-tier building-level proxies remain unverified.

SRC19/SRC20 are not independent guides: the Lequ-hosted 2010 page and 17173 2009 article reproduce near-identical text. The Monk row remains the explicit table requirement, but the same guide's prose says Barracks 5; both statements are retained as a source conflict. No game rule was changed from this evidence alone.

### Additional source audit — 2026-11-03

The dated Sina Undead-building guide (SRC11) says the Graveyard recruits troops and that higher-level recruitment buildings provide higher-tier units. This supports a directional gate but not an exact unit-by-unit level. The 2009-02-23 internal-test preview (SRC50) independently describes the Graveyard and says Dark Hall is required for later high-tier units, but its combat values are explicitly tentative and its stated 11-unit count conflicts with its ten-name list. Neither source gives numeric Dark Hall/Soul Tower gates; no support-building threshold was invented.
