# HG-10 World AI & combat/march formula audit — 2026-11-04

## Status

Implementation snapshot: original six castle coordinates preserved; deterministic procedural expansion adds 54 model-labeled castles, for 60 total, of which 36 have **offline defensive AI state** and 18 are new neutral castles. Original six are unchanged. Player city cap is still 1–6 by Fame. This is NOT proof of original Heroes of Gaia world population.

### Combat formulas (code `engine.js`)

- Unit base: `B = UATK^2 / (UATK + max(1,UDEF))`.
- Player damage: `max(1, floor(count * B * (1 + heroATK/100)))`.
- Enemy damage to player: `max(1, floor(count * B / (1 + heroDEF/100)))` (current enemy heroATK factor = 1).
- The hero factor and unit formula align with the general community reference `https://heroesofgaia.fandom.com/wiki/Combat_mechanics`, but the complete damage modifier, item/spell layering, a historical minimum damage floor, NPC hero bonuses and PvP behavior are not complete or validated.
- Melee range is 1, ranged reach is hardcoded 20 on 12×9 battle grid. This is an explicit approximation. AI target score uses ATK × living count and closest-distance priority, not recovered source code.
- Damage receipts, HP depletion, casualties, 75% modeled wound allocation, victory/defeat and persistence are implemented but exact 2009 edge-case parity remains PARTIAL.
- New offline AI castle combat uses the actual persisted racial troop garrison, no synthetic attack attributes for those defenders. Neutral castles retain generic prototype defenders.

### World march formulas (code `engine.js` and `hg08.js`)

- BFS four cardinal directions on a 100×100 square world; water cannot be entered, bridged cells passable, hills/forests have no special travel cost.
- World duration in game seconds: `max(40, ceil(20 + 19 * pathSteps / max(0.1, 1 + (heroSPD - 10)/50)))`.
- Real-time wall duration divides by selected speed factor 1× or 60×. This coefficient is a local reconstruction. It must not be labeled an observed HOG1 movement equation.
- Source-backed historical portal travel exists in community docs; the current offline world has no working portal/scouting/fog system. Army load does not affect march speed in this model.

### Offline AI cities (new HG-10 stage)

- 54 generated cities use only previously empty tiles and preserve dated NPC/treasure/visitable coordinates, five historical neutral castles and main capital. Castle generation uses a deterministic coordinate grid, never random on Save/Load.
- 36 modeled city owners have persistent `state.aiCities[key]` containing faction, level, five-resource treasury, actual garrison, completed simulated hours and fractional-hour accumulator.
- Each simulated game hour adds five-resource output (bounded), purchases one eligible garrison unit when funds permit, and allows a small incremental city upgrade once per 24 simulated hours if it can pay the modeled construction cost. Growth is bounded to keep an offline session playable.
- A player attack against an AI castle uses the actual saved faction troop IDs, counts, HP, ATK, DEF and SPD from `data.js` rather than a generic guard roster. Defenders surviving a failed siege persist; capture removes AI ownership and seeds the player's city via the existing Save v07 lifecycle.
- No AI offensive marches, tactical scouting, fog of war, trade with AI, AI diplomacy or AI-versus-AI castle wars are implemented in this stage. AI simulation is deliberately limited to autonomous defense and economic/recruitment progress.
- Save format remains v07 with an optional field transparently migrated for earlier v07 files; strict validation checks each AI city key against known modeled castles and disallows duplicate player/AI ownership.
- On minimap AI castles are marked in red, player-owned in cream/green, neutral in pale gold. Map target panel reveals AI faction, level and garrison count; only nearest 16 unowned castles are shown as shortcut buttons to avoid 60-item clutter.

## Acceptance criteria

- 60 distinct castle tiles, 54 generated, 36 AI, 18 new neutral.
- Historical 128 NPC coordinates and 76 treasure camp coordinates remain unchanged and path-reachable.
- 2–6 owned cities independently produce, build, research and train with current 24h offline catch-up.
- AI garrisons increase only after real resource purchase; treasury never negative. Save/Reload and a repeated tick are idempotent.
- Targeted AI castle combat uses exact persisted garrison count; conquest removes its AI state, adds only one owned city, and old save migrates.
- GitHub Actions engine, offline HTML, Chromium gameplay/pointer and Save/Reload must PASS before this slice can be declared verified.
- Physical Android and OWNER VISUAL PASS remain open.

## Follow-up G2 proposals

1. Fog-of-war tile visibility and scouting intel, Saved v07 without rewriting existing fields.
2. Regional road/terrain travel-cost model and world movement source audit (and portal option).
3. AI offensive dispatch and diplomacy, without making the offline user repeatedly lose castles during unattended play.
4. Full PvE modifier stack and real ranged reach, with historical reference, deterministic seeded replay and explicit balance regression.
