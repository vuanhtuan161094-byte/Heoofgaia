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
| HG07-A | P0 | Archive HG06 RC1 source in isolated branch; preserve save v06 and run independently of Tu Tiên runtime | Branch+files; code bundle reproducible; Node and Chromium gates | IN PROGRESS |
| HG07-B | P0 | Apply 1–100 hero base troop-value capacity lookup and guard formation/march; preserve legacy saves | Boundary tests L1/L5/L10/L50/L100; overcap rejects without partial state/AP change | CODED / tested locally |
| HG08 | P0 | Troop unlock contract with evidence by race/tier; hero XP/rank; training queue edge cases | Each unlock has source & negative/positive tests; save migration | PLANNED |
| HG09 | P0 | Battle turn scheduler parity (speed, range, spells, defense, 7 groups), loss ledger, Arena settlement | deterministic encounter fixtures, 1000 random battles without negative army/duplication | PLANNED |
| HG10 | P1 | World ownership, mines, fog, multi-castle and march-return logistics | no duplicate harvest; tile ownership/save identity; offline time | PLANNED |
| HG11 | P1 | UI and 4 race castles, original/authorized artwork pipeline, mobile UX | actual screenshots desktop/Android; explicit visual approval | PLANNED |
| HG12 | P1 | Local save durability, export/import/checksum, compatibility and performance | physical Windows/Android acceptance + 24h soak | PLANNED |
| HG13 | P2 | MMO design: authoritative game clock, async marches, guild and PvP isolated server | threat model, deterministic simulation, opt-in deployment | DEFERRED |

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
