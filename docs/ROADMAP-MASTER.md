# Hẻoofgaia — end-to-end development roadmap

**Definition of Done:** a fully playable *Anh Hùng Thời Loạn* reconstruction, not merely a themed prototype. No claim of exact 1:1 until evidence exists for features + side-by-side original-era visual comparison. Preserve functional old save data.

| Stage | Priority | Implementable deliverable | Gate / oracle | Current status (2026-11-03) |
|---|---|---|---|---|
| HG-07 audit & repo split | P0 | Independent E:\Heoofgaia source and private GitHub repo; baseline 40 troops; hero level-cap table | 37 engine, 31 browser, 9 file:// persistence checks; fresh repo HEAD | Standalone local source and baseline PASS; private GitHub repository/push BLOCKED (local remote absent; current machine still lacks a verified create/push path) |
| HG-08 troop & hero progression | P0 | 4 race × 10 unit unlock/prerequisites, accurate training timing, Tavern rerolls, hero XP/levels and capacity effects | matrix per unit and research, reject-without-spend, migration | Partial vertical slice PASS: Human T1/T3–T10 source gates; Elf/Orc Barracks and Undead Graveyard tier gates are provisional P gameplay proxies, not historical numeric claims; Orc Thunderbird and Elf Centaur have separate C secondary-source gates; four tier-2 Scout spell gates; one Castle Spell queue; hero progression and v06→v07 migration. Fame-ranked hero cap from SRC20 and the SRC03 Hero Tower +1% XP-per-level modifier are transaction, browser, and v07-persistence tested. Latest regression: Node 120/120; Chrome 91/91; offline file:// 29/29; Hero Tower XP 7/7; Tavern terminal gate 10/10; four-faction city 48/48. IN PROGRESS: 28 non-Human gates and Tavern distributions remain unresolved. |
| HG-09 tactical combat | P0 | deterministic 7-stack (verify locale), initiative/range/movement, ability/equipment modifiers, retreat, wound/casualty ledger | 1,000 seeded battles, exact-once rewards, deterministic fixtures | Partial vertical slice PASS: 120/120 Node regression, 91/91 integrated Chrome, 29/29 actual `file://`; 1,000 seeded replay pairs and mid-battle save continuation. SRC46 adds 128 historical 1★–8★ NPC locations and attack recommendations; SRC47 and later SRC45 give separately dated guard-force reports, with 1★/2★ and 6★–8★ conflicts preserved. Dedicated Chrome exercises source displays for 8★ plus real 5★ selection/March, v07 save/reload, battle and 4,400 XP settlement; exact enemy roster/stats, source calibration, full formula, movement/range and original art remain partial/simulated. |
| HG-10 world & economy | P0 | multi-castle/castellan, AP, mines, hero marching/return, fog/scouting, portals if evidenced, full buildings/production | 24h offline catch-up, unique ownership, settlement no duplication | PARTIAL: 100×100 coordinate world, three concurrent outbound hero trips, ten daily visitables, and 76 dated treasure camps are playable and v07-persistent. Treasure camps use real March, tactical battle, settlement, modeled equipable loot and return; no source drop table/roster is claimed. Arrivals queue through the current single-battle UI; battle-concurrency parity is not verified. Fog/scouting, PvP, original economy parity, original structure art and other world rules remain open. Current cumulative Node 122/122, integrated browser 91/91, actual file:// 29/29, treasure Chrome 12/12, expedition Chrome 25/25 and visit/reload 10/10 PASS. |
| HG-11 visual fidelity | P1 | race-specific 2.5D cities, world, battle sprites/UI, animations, map camera, minimap, mobile landscape | original-era reference vs actual screenshots by screen; render smoke | PARTIAL: four modern generated faction city scenes, real per-faction building hotspots and Chrome captures; world/battle sprites, animation and original-client visual parity remain missing. |
| HG-12 usability & release | P1 | durable save upgrades, backup/export/import validation, Windows one-click, Android acceptance, performance | current source+ZIP + exact SHA, physical testing when possible | PARTIAL |
| HG-13 online mode | P2 | optional server clock, persistence, guild, world interactions, PvP and player sync | secure auth, authoritative ownership, race conditions, local server integration test | DEFERRED until offline stable |


## Latest HG-10 playable slice — dated equipment camps — 2026-11-03

- SRC20 (17173, 2009-12-27) lists 76 equipment-camp coordinates and player attack-force recommendations. SRC47 (Sina, 2009-08-23) separately reports guarding force. The dated advice is shown in the game without turning it into hard gates; level 2 has 8,000 vs 8,400 dated force reports, and SRC20 level 6 prints a 100,000 complete-victory figure below its 480,000 minimum, which remains disclosed as a suspected source typo.
- The 76 camps use the existing real dispatch, battle controls, exact-once settlement, Save/Reload v07, return and hero-equipment flow. At 10,8 the treasure overlay is distinct from the prototype NPC at the same coordinate. Treasure enemy rosters/stats, drop table, item stats and bonus resources are simulated; no level-to-gear mapping is claimed.
- Tests: Node **122/122 PASS**; installed Chrome offline treasure flow **12/12 PASS**, with the QA fixture and synthetic defender adjustment disclosed in `docs/qa/hg10/treasure-camps-chrome.json`; integrated Chrome **91/91 PASS**; fresh-process `file://` suite **29/29 PASS**; JavaScript/Python syntax and `git diff --check` **PASS**. The standalone artifact and SHA are recorded in `docs/CURRENT_HG_CHECKPOINT.md`.
- Real installed-Chrome captures are in `docs/evidence/hg10/treasure-camp-*.png`. These are captures of this reconstruction, not original-client comparisons. HG-10 remains partial and the overall project is incomplete.

## Baseline source research
Use `docs/research/RESEARCH-HEROES-OF-GAIA-2009.md`, `docs/research/HG08-EVIDENCE-REGISTER.md` and `docs/research/HG08-TROOP-UNLOCK-MATRIX.md`; improve each rule with dated, version-labelled sources. Follow three target variants (original English US, English EU, Chinese), pick one canonical gameplay version before mixing expansions. **Never copy mechanics from unrelated games.**

## Modularization plan
- `src/core/` deterministic clock, save schema, action validation, transactions.
- `src/data/` units, buildings, resources, research, spells, provenance.
- `src/game/` heroes, economy, city, world, march, battle.
- `src/ui/` display components, input, canvas, animation, accessibility.
- `assets/` reference manifests, correctly authorized original/third-party art; no untracked provenance.
- `qa/` deterministic fixture runner, browser screenshot regression, migration tests, 8 GB performance profile.
- `dist/` generated offline HTML build.

These are future target directories, not proof that modularized code already exists. Keep existing tested source files until a staged migration is proven.

## Target gates
One game session must support: create race/city â†’ gather resources â†’ build/upgrade/research â†’ recruit a hero â†’ recruit all eligible troops â†’ assign squads within hero command capacity â†’ march â†’ fight â†’ suffer wounded/losses â†’ loot â†’ return/occupy mine â†’ save/close/reload without duplicated rewards. Later add multiple cities and online features without breaking offline play.


## Latest verified continuation — mine cap and production — 2026-11-02

- Branch: feature/hog1-research-to-playable-20261102; local standalone repo has no remote.
- Source: 17173 Chinese guide dated 2009-12-27 (SRC39), cross-referenced with a near-verbatim Lequ-hosted copy. Regional player-guide rule, confidence B; not an original-client observation.
- Runtime: Fame cap rejects new mine marches before AP deduction; captured mines add source-listed fixed hourly amounts; v07 save/load derives income from persisted mine ownership.
- Regression: Node 84/84, Chrome 78/78 with 0 exceptions, file:// 12/12, JS syntax 9/9, one-hour mine income tick plus Save/Load, offline build 153,333 characters.
- Original client, non-Human numeric gates, original art and English/EU parity remain unresolved. HG-08 to HG-12 are incomplete; HG-13 is not started.
- See docs/qa/HG08_HG13_ACCEPTANCE.md, docs/research/HOG1_SOURCE_AUDIT.md and CURRENT_HG_CHECKPOINT.md.


## Latest HG-10 multi-city verification — 2026-11-02

- Integrated node suite **94/94 PASS** (includes HG-07–HG-09 regression), runtime JS syntax **10/10 PASS**, and the reproducible offline builder outputs `Play-Heoofgaia-HG10.html`.
- Installed Chrome CDP opened the output through `file://`, used the actual march/attack/city-switch UI, and passed **13/13** checks with no JavaScript exceptions; the same browser reload preserved the captured city and garrison. Separate-process file:// persistence remains unverified because Playwright is missing.
- Captured race-specific city economy and queues run as independent saved city state; multiple-city scope is still partial. Fog/scouting, three simultaneous expeditions, PvP capture/abandonment, regional city gates and original-client comparison remain open.
- Current city scenes use modern generated painterly 2.5D art with four faction-specific variants; world/battle visuals still use project-authored prototype geometry and do not establish parity with the original. A dated 2009 visual reference (SRC42) confirms a scenic hill-city composition with detailed terrain-integrated buildings; the project keeps the composition while using higher modern polish. Fandom survey remains partial (608-article full enumeration blocked); see `docs/research/FANDOM-WIKI-SURVEY-20261102.md`.
- See exact artifacts, checksums and blocker in `docs/CURRENT_HG_CHECKPOINT.md`.
