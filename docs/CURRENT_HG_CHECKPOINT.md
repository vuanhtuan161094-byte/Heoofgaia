# CURRENT HG CHECKPOINT

Date: 2026-11-02 (Windows local execution)

## Standalone repository and verified source

- Project root: `E:\Heoofgaia`.
- Working branch: `feature/heoofgaia-hg08-20261102`.
- Latest tested functional commit SHA: `9c40473e2f4d800c2a1963fd3858e598b967f060` (`fix: use Graveyard for Undead recruitment`). This checkpoint document is committed separately after the tested functional commit; local HEAD may be a documentation-only child. The code and tests recorded below correspond exactly to this functional SHA.
- Original source: `vuanhtuan161094-byte/tutiennhandoi`, source branch `feature/heoofgaia-hg07-20261102`, pinned source HEAD `b32737422ca866f08de8d94021b397eb22c8f017`; HG-07 implementation parent `62d4a1c6d1a0c9769cf9ee6690e77361a2927ea9`.
- Standalone bootstrap `028cb97a0481a4ff37a9459a5dd13ddfa1256511`; import audit `08d2fb0e4042f34af0372fb2187624bb03ff306e`. SHA-256 comparison matched all 20 Hẻoofgaia root files. Tu Tiên production systems were not copied or modified.
- `projects/heoofgaia/HANDOFF_CREATE_STANDALONE_20261102.md` was absent at the pinned source SHA. The attached ZIP was treated as reference material only.
- Target `vuanhtuan161094-byte/Heoofgaia` has no configured local remote. GitHub API lookup returned 404; this can mean absent or inaccessible. The Windows `gh` executable is missing, and the connected GitHub tools do not expose repository creation. A read-only browser-session check could not complete because Computer Use approval timed out. No repository was created or pushed, no email was sent, and no login flow was run. **Private repo creation/push: BLOCKED.** Do not modify or merge to the Tu Tiên repository or its `main` branch.

## HG-07 baseline audit — PASS before HG-08 changes

- JavaScript syntax: PASS on the then-current 8 source files.
- `node qa-engine.cjs`: 37/37 PASS.
- `.venv\Scripts\python.exe build_offline.py`: PASS; 123,427-character offline HTML.
- `.venv\Scripts\python.exe qa-browser.py`: 31/31 PASS, zero JavaScript errors.
- `.venv\Scripts\python.exe qa-file-browser.py`: 9/9 PASS, Chromium `file://`, v06 persistence and separate-process restart.
- Receipts: `docs/evidence/hg07-baseline/`.
- Original-client side-by-side and physical Android QA: NOT TESTED.

## HG-08 — IN PROGRESS; partial vertical slice

- Save schema v07 and v06→v07 migration; hero XP/levels/attribute points and command capacity; Castellan XP from completed troop queues; faction-specific building lists; one saveable Castle Spell research queue; real troop recruitment and visible prerequisite locks.
- Human T1/T3–T10 requirements are from dated Chinese 2009/2010 guides. Human Scout remains partial. Scouting gates for other tier-2 scout roles are cross-version-derived.
- Undead troop training correctly uses the Graveyard; legacy Undead saves copy the prior Barracks level to Graveyard when the new field is missing. Dated 2009 Sina guides identify Graveyard as the Undead recruit building and Dark Hall/Soul Tower as requirements for broad troop classes. Exact per-unit numeric gates for non-Human races were not recovered.
- Elf/Orc Barracks and Undead Graveyard levels currently use the catalog unit tier as an explicitly labelled **P / PROVISIONAL MODEL** progression proxy. UI and matrix say this is not source-verified historical data. Exact support-building gates (Magic Pool, Nature Tower, Beast Pen, Blacksmith, Dark Hall, Soul Tower) remain unapplied.
- Tavern slot milestones and some hero quality bands are sourced; exact full candidate distributions and rare-stat odds remain missing. No original-client asset with release rights has been added; current art is procedurally drawn.
- Research: `docs/research/HG08-EVIDENCE-REGISTER.md`, `docs/research/HG08-TROOP-UNLOCK-MATRIX.md`, `docs/RESEARCH-HEROES-OF-GAIA-2009.md`.

## HG-09 — IN PROGRESS; tested tactical combat slice

- Source-backed equal-speed initiative: speed descending, then battlefield position left-to-right/top-to-bottom following a 2009 Chinese player guide. Executed order is stored and visible.
- Deterministic target tie-breaking, documented board-wide ranged-reach approximation (numeric range absent from sources), melee movement, attack/defend/focus/retreat, combat spells, equipment, casualty/Arena ledger, and save-mid-battle are live.
- Normal battle flow prevents duplicate settlement and reward.
- Damage formula, exact range, NPC composition/scaling, Stand By/Focus multipliers, morale, encounter timer and rewards remain partial or simulated.

## Current verification on functional SHA `9c40473e2f4d800c2a1963fd3858e598b967f060`

- `node qa-engine.cjs`: **66/66 PASS**, including exhaustive positive/negative tests for every currently enforced unit gate and no-spend rejection checks; 1,000 seeded tactical encounters replayed deterministically with valid ledgers.
- `node --check` on all 9 source JavaScript files: **PASS**.
- `.venv\Scripts\python.exe build_offline.py`: **PASS**, generated `Play-Heoofgaia-HG08.html` (146,209 characters; 152,598 bytes).
- `.venv\Scripts\python.exe qa-browser.py`: **52/52 PASS**, zero page errors, installed Google Chrome. Includes real Graveyard UI, live Skeleton queue, march/combat interactions and mobile viewport checks.
- `.venv\Scripts\python.exe qa-file-browser.py`: **9/9 PASS**, actual `file://` launch, v07 save/reload and separate Chrome process restart.
- `git diff --check`: **PASS** before commit; only Git line-ending normalization warnings.
- Receipts: `docs/evidence/hg08/QA-RC1-RESULTS.json`, `docs/evidence/hg09/QA-HG09-NODE-RESULTS.json`, `docs/evidence/hg09/QA-HG09-BROWSER-RESULTS.json`.

## Actual gameplay evidence and comparison limits

- `docs/evidence/hg08/screenshot-undead-graveyard-desktop.png` and `screenshot-undead-recruitment-queue-desktop.png`: actual 1440×900 Chrome rendering before/after enqueueing three Skeleton Warriors; queue state is also shown in the live sidebar.
- `docs/evidence/hg09/screenshot-combat-desktop.png` and `screenshot-combat-after-turn-desktop.png`: actual Chrome battle before/after an Attack action; enemy HP and the turn order change in the running game.
- Original client/runtime was not available for pixel-level side-by-side comparison. Visual resemblance and gameplay parity with the original remain **NOT TESTED/BLOCKED**; no 1:1 claim is made. Physical Android/Windows-device acceptance: NOT TESTED.

## Remaining scope and next actions

1. Continue HG-08 source research for exact per-unit non-Human prerequisites and Tavern candidate distributions, including legal client data/screenshots and dated regional sources. Keep the P proxy visibly separate from verified data.
2. Implement and test only source-supported remaining HG-08 systems; preserve old-save migration and update the matrix and receipts.
3. Continue HG-09 with source-supported combat formula, AI/targeting, reward, and wound-recovery behavior; keep unresolved values explicit.
4. HG-10 world/economy, HG-11 original-era art/UI fidelity, HG-12 release packaging/physical acceptance and HG-13 optional server are NOT COMPLETE.
5. When GitHub repo creation/authentication is available, create the new private repository, configure its remote, push this standalone branch, and verify private visibility, branch, SHA and files. Do not use the Tu Tiên repository as a work source after the split.
