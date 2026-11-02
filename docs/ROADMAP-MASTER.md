# Hẻoofgaia — end-to-end development roadmap

**Definition of Done:** a fully playable Heroes of Gaia reconstruction, not merely a themed prototype. No claim of exact 1:1 until evidence exists for features + side-by-side original-era visual comparison. Preserve functional old save data.

| Stage | Priority | Implementable deliverable | Gate / oracle | Current status (2026-11-02) |
|---|---|---|---|---|
| HG-07 audit & repo split | P0 | Independent E:\Heoofgaia source and private GitHub repo; baseline 40 troops; hero level-cap table | 37 engine, 31 browser, 9 file:// persistence checks; fresh repo HEAD | Standalone local source and baseline PASS; private GitHub repository/push BLOCKED (GitHub API lookup 404, local gh CLI missing; repository creation unavailable through connector) |
| HG-08 troop & hero progression | P0 | 4 race × 10 unit unlock/prerequisites, accurate training timing, Tavern rerolls, hero XP/levels and capacity effects | matrix per unit and research, reject-without-spend, migration | Partial vertical slice PASS: Human T1/T3–T10 source gates; Elf/Orc Barracks and Undead Graveyard tier gates are provisional P gameplay proxies, not historical numeric claims; Orc Thunderbird and Elf Centaur have separate C secondary-source gates; four tier-2 Scout spell gates; one Castle Spell queue; hero progression and v06→v07 migration. Fame-ranked account hero cap from SRC20 is implemented and transaction/migration tested. Latest cumulative Node 100/100; live Chrome hero-cap 6/6; city visual/gameplay 48/48. IN PROGRESS: 28 non-Human gates and Tavern distributions remain unresolved. |
| HG-09 tactical combat | P0 | deterministic 7-stack (verify locale), initiative/range/movement, ability/equipment modifiers, retreat, wound/casualty ledger | 1,000 seeded battles, exact-once rewards, deterministic fixtures | Partial vertical slice PASS: 14/14 Node and 17/17 real-Chromium combat checks, including 1,000 seeded replay pairs, mid-battle save continuation, and the manual Advance order. Full formula, exact movement/range, NPC parity and original art remain partial/simulated. |
| HG-10 world & economy | P0 | multi-castle/castellan, AP, mines, hero marching/return, fog/scouting, portals if evidenced, full buildings/production | 24h offline catch-up, unique ownership, settlement no duplication | PARTIAL: bounded 24 wall-hour catch-up applies the selected 1×/60× rate to paid queues and production across active/inactive cities, tested with v07 reload; cap is modeled, not historically sourced. Fog/scouting, three simultaneous heroes, PvP and parity remain open. |
| HG-11 visual fidelity | P1 | race-specific 2.5D cities, world, battle sprites/UI, animations, map camera, minimap, mobile landscape | original-era reference vs actual screenshots by screen; render smoke | PARTIAL: four modern generated faction city scenes, real per-faction building hotspots and Chrome captures; world/battle sprites, animation and original-client visual parity remain missing. |
| HG-12 usability & release | P1 | durable save upgrades, backup/export/import validation, Windows one-click, Android acceptance, performance | current source+ZIP + exact SHA, physical testing when possible | PARTIAL |
| HG-13 online mode | P2 | optional server clock, persistence, guild, world interactions, PvP and player sync | secure auth, authoritative ownership, race conditions, local server integration test | DEFERRED until offline stable |

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
