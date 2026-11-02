# Hẻoofgaia — Roadmap HG07 → release (02/11/2026)

Scope: **Heroes of Gaia / Castle of Heroes / 英雄之城 only**. Source code, art and engine are independent. No Call of Gods/War of Legends rules.

## Source authority and fidelity statuses
- `OBSERVED` = reference or dated wiki, always URL/date/locale.
- `DERIVED` = deterministic calculation from observed table, with oracle tests.
- `SIMULATED` = temporary implementation, **not** parity with original.
- `MISSING` = not implemented; do not treat a UI button as gameplay completion.

## Sprint plan and acceptance gates

| Sprint | Priority | Work | Acceptance | Status |
|---|---|---|---|---|
| HG07-A | P0 | Archive HG06 RC1 source in isolated branch; preserve save v06 and run independently of Tu Tiên runtime | Historical HG-07 baseline archived; isolated branch audited | PASS — legacy review complete; release delivery remains open |
| HG07-B | P0 | Apply 1–100 hero base troop-value capacity lookup and guard formation/march; preserve legacy saves | Boundary, over-cap atomicity and compatibility fixtures included in cumulative suite | PASS — coded and regression-protected |
| HG08 | P0 | Troop unlock contract with evidence by race/tier; hero XP/rank; training queue edge cases | Source-linked unlocks, actual queues, negative/positive tests, v07 saves | IN PROGRESS — 40 units and major progression systems work; faction support gates, exact Tavern odds and regional data remain open |
| HG09 | P0 | Battle turn scheduler, range, spells, defense, 7 groups, loss ledger and Arena settlement | deterministic fixtures, 1,000 seeded encounters, real browser/save-load spell check | IN PROGRESS — per-stack orders and edition-separated combat spells work; formula, movement, duration and original NPC parity remain partial |
| HG10 | P1 | World ownership, mines, fog, multi-castle and march-return logistics | ownership, once-only rewards, city state and offline-time tests | IN PROGRESS — mines, captured cities, three marches and visitables work; fog/PvP and source parity remain open |
| HG11 | P1 | Four faction castles, faithful scene/UI, art pipeline, animation and mobile UX | actual desktop/mobile screenshots and resolved source provenance | PARTIAL — four modern city paintings and functional hotspots; world/battle/unit sprites, animation and original-client visual comparison remain open |
| HG12 | P1 | Offline save durability, export/import/checksum, compatibility and performance | standalone HTML, regression and physical device gates | IN PROGRESS — offline HTML and v07 persistence run; installer polish, physical Windows/Android and performance soak remain open |
| HG13 | P2 | Isolated opt-in authoritative server for clock, marches, guild and PvP | threat model, deterministic integration, secure opt-in deployment | NOT STARTED — no server deployment or multiplayer claim |

### Locked implementation constraints
1. HG code lives **only** under `projects/heoofgaia/` in feature branch; do not alter `main`, locked Tu Tiên runtime, AGENTS or CURRENT_CHECKPOINT.
2. Do not merge into `main` without separate decision: this repository's root is another game.
3. No claim of 1:1 clone until side-by-side source evidence and complete gameplay parity.
4. Missing license for original art/audio means only independent artwork can ship.
5. All HG02–HG06 historical save formats remain importable; HG07 does not bump schema.

### Immediate actual risks
- Source unit names/values may differ by locale and expansion. Some building requirements are still `SIMULATED`.
- Hero capacity includes Arena ranks, guild boosts and items in original game. HG07 only enforces **base level limit**; no fabricated bonus.
- HG06's 7 groups come from a community tactic; UI not proof of canonical count for every edition.
- Browser test uses localStorage shim in `set_content`; no physical file launch validation.
