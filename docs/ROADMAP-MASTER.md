# Hẻoofgaia — end-to-end development roadmap

**Definition of Done:** a fully playable Heroes of Gaia reconstruction, not merely a themed prototype. No claim of exact 1:1 until evidence exists for features + side-by-side original-era visual comparison. Preserve functional old save data.

| Stage | Priority | Implementable deliverable | Gate / oracle | Current status (2026-11-02) |
|---|---|---|---|---|
| HG-07 audit & repo split | P0 | Independent E:\Heoofgaia source and private GitHub repo; baseline 40 troops; hero level-cap table | 37 engine, 31 browser, 9 file:// persistence checks; fresh repo HEAD | Standalone local source and baseline PASS; private GitHub repository/push BLOCKED (GitHub API lookup 404, local gh CLI missing; repository creation unavailable through connector) |
| HG-08 troop & hero progression | P0 | 4 race × 10 unit unlock/prerequisites, accurate training timing, Tavern rerolls, hero XP/levels and capacity effects | matrix per unit and research, reject-without-spend, migration | Partial vertical slice PASS: Human T1/T3–T10 source gates; Elf/Orc Barracks and Undead Graveyard tier gates are provisional P gameplay proxies, not historical numeric claims; Orc Thunderbird and Elf Centaur have separate C secondary-source gates; four tier-2 Scout spell gates; one Castle Spell queue; hero progression and v06→v07 migration. New Node regression tests every enforced positive/negative gate with no-spend assertions. Latest combined regression: 69/69 Node, 56/56 Chrome, 9/9 file://. Stage remains IN PROGRESS: 28 non-Human gates and Tavern distributions are still missing. |
| HG-09 tactical combat | P0 | deterministic 7-stack (verify locale), initiative/range/movement, ability/equipment modifiers, retreat, wound/casualty ledger | 1,000 seeded battles, exact-once rewards, deterministic fixtures | Partial vertical slice PASS: 6/6 combat-specific Node gates including 1,000 seeded replay pairs and mid-battle save continuation; 5/5 real-Chromium combat checks. Full formula, NPC model, casualty/recovery parity and original art remain partial/simulated. |
| HG-10 world & economy | P0 | multi-castle/castellan, AP, mines, hero marching/return, fog/scouting, portals if evidenced, full buildings/production | 24h offline catch-up, unique ownership, settlement no duplication | PARTIAL |
| HG-11 visual fidelity | P1 | race-specific 2.5D cities, world, battle sprites/UI, animations, map camera, minimap, mobile landscape | original-era reference vs actual screenshots by screen; render smoke | MAJOR MISSING |
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

