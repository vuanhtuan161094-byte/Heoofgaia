# Classic WEB B4 — Code-first expansion (24/11/2026)

**Implementation scope:** One canonical generated HTML. 55 historical troop **names and 6 source coefficients** from the Lequ public 2018 detailed classic-lineage table, 10 historical formation names from 2011 web-era sources. Transliteration, battle balancing, formation slot layouts, effects, unlocks and sprite style are **PROJECT_SIMULATED**. The 2018 troop table is NOT proof individual numbers match the 2011 launch build.

## Implemented in native game
- Add 55 names (5 initial, 10 second-tier, 40 third-tier) in five families, each with stable `nlw-001..055` IDs. Existing 25 project original IDs and 221 hero skills remain untouched.
- Barracks is an actual selectable/paginated catalog for owned heroes, with 3-tier building unlock and deterministic Bạc change fee. Save v5 uses additive `game.nlClassicWebB4.assigned` map and original receipt owner. No shadow save or duplicate battle engine.
- Selected unit affects one authoritative `p2Unit` instance: source six coefficients are mapped through bounded simulated normalizations into `atk/def/catk/tdef/matk/mdef`. 55 choices affect actual combat stats. Supported traits: native Kỳ Cổ Thủ and Vũ Cơ morale paths, skill-stage row/column/back targeting, slight guard and crit modifiers. Exotic multi-hit mechanics remain pending and ARE NOT falsely claimed complete.
- Ten historical formation *identities* usable via 3×3 formation UI. Five existing Save families mapped; five absent families appended through existing `FORMATIONS` + `P3_PRESETS` and native `p3AssignPreset`. Former 24 project presets/Huyền Vũ are not deleted.
- Fresh project-generated WEBP courtyard battle background rendered by existing `drawBackground`; original 2D troop family vector crests and unit labels. All assets generated or drawn independently — no source-game pixels.
- 28 map stages, 8 bosses and reward/Save ownership unchanged.
- Important: read references without copying proprietary assets. Deferred: 55 separate frame-by-frame unit sprites, complete 8 Boss mechanic parity, historic 10 formation placement proof, all original buildings/world/quest modules.

## Evidence
- Classic troop source, 5+10+40: https://www.lequ.com/wly/201102/11807.html
- Detailed names/coefficients from 2018 (separate date): https://www.lequ.com/wly/201104/14053.html
- Ten classic formation names: https://www.lequ.com/wly/201103/12766.html

## Constraints
No Codex Cloud; no merge; PR #10 remains draft; no second game; Save v5 kept. Coding-first as owner instructed; heavyweight QA to be handled in a subsequent acceptance phase.
