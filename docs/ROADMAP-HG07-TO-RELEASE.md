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
| HG07-A | P0 | Archive HG06 RC1 source in the isolated standalone repo; preserve save v06 | Branch+files; code bundle reproducible; Node and Chromium gates | COMPLETE locally; GitHub publish remains blocked |
| HG07-B | P0 | Apply 1–100 hero base troop-value capacity lookup and guard formation/march; preserve legacy saves | Boundary tests; over-cap rejects without partial state/AP change | PASS locally; migration regressions remain green |
| HG08 | P0 | Four-race troop gates, hero progression, Tavern, research and training | 40-row tests, migration and real queue/browser checks | IN PROGRESS; exact non-Human gates and candidate odds remain unresolved |
| HG09 | P0 | Tactical battle turns, targeting, damage, losses and Arena settlement | Deterministic fixtures, 1,000 seeded encounters, actual Chrome gameplay | IN PROGRESS; formulas, morale, ranges and original-client parity remain partial |
| HG10 | P1 | World ownership, mines, fog, multi-castle and march-return logistics | no duplicate harvest; tile ownership/save identity; offline time | NOT STARTED |
| HG11 | P1 | Four-race city/world UI, animation and licensed or original art | Dated reference comparison; real desktop/mobile captures | PARTIAL prototype only; original visual parity not established |
| HG12 | P1 | Offline release, robust saves, import/export, packaging and performance | Reproducible offline artifact; recovery fixtures; physical acceptance | PARTIAL; offline HTML and file:// save/reload pass, release package incomplete |
| HG13 | P2 | Optional authoritative server, guild, PvP, chat/mail and cross-city marching | Threat model and local integration tests; no offline dependency | NOT STARTED; live service deployment requires infrastructure |

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

## Current execution — 2026-11-02

- Branch: feature/heoofgaia-hg08-20261102. Current research/test commit: be563d0c9446c53e11c81e08919a6147da6a26a8.
- Node regression: 77/77 PASS; JavaScript syntax: 9/9 PASS.
- Offline build: PASS, Play-Heoofgaia-HG08.html (151,931 characters).
- Chrome browser suite: 65/65 PASS, 0 page errors. Chromium file:// Save/Load and separate-process restart: 12/12 PASS.
- The current battle and city artwork is procedurally drawn prototype art. These captures document implemented interactions, not a match against the original client.
- No remote is configured and private GitHub repository vuanhtuan161094-byte/Heoofgaia is not verified to exist. No push has occurred.