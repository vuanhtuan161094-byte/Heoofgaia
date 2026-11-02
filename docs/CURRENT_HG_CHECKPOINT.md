# CURRENT HG CHECKPOINT

Date: 2026-11-02 (Windows local execution)

## Standalone repository and exact code base

- Project root: `E:\Heoofgaia`.
- Working branch: `feature/heoofgaia-hg08-20261102`.
- Last committed standalone code before this HG-09 slice: `e9362efbac120f973ce5a263841d9f2ebdb1c4ef`. The current HG-09 implementation and evidence are in this checkpoint's working tree and are ready for the local code commit; the final tested implementation SHA will replace this line after commit.
- Original source: `vuanhtuan161094-byte/tutiennhandoi`, branch `feature/heoofgaia-hg07-20261102`, pinned source HEAD `b32737422ca866f08de8d94021b397eb22c8f017`; HG-07 implementation parent `62d4a1c6d1a0c9769cf9ee6690e77361a2927ea9`.
- Standalone bootstrap `028cb97a0481a4ff37a9459a5dd13ddfa1256511`; import audit `08d2fb0e4042f34af0372fb2187624bb03ff306e`. SHA-256 comparison matched all 20 Hẻoofgaia root files; no Tu Tiên production systems were copied or modified.
- `projects/heoofgaia/HANDOFF_CREATE_STANDALONE_20261102.md` was absent at the pinned source SHA. The attached ZIP was treated as reference material only.
- Private GitHub target `vuanhtuan161094-byte/Heoofgaia` is NOT created or pushed. Local `git remote -v` is empty, `gh` is not installed in this Windows environment, and the connected GitHub toolset has no repository-creation operation; lookup returned 404. No email was sent. `gh auth login --web` is a browser/device flow, not an email flow. Local commits remain the only source until repo creation and push are available.

## HG-07 baseline audit — PASS (before HG-08 changes)

- `node --check` on the then-current 8 JS files: PASS.
- `node qa-engine.cjs`: 37/37 PASS.
- `.venv\Scripts\python.exe build_offline.py`: PASS; 123,427-character HTML.
- `.venv\Scripts\python.exe qa-browser.py`: 31/31 PASS, zero JS errors.
- `.venv\Scripts\python.exe qa-file-browser.py`: 9/9 PASS, Chromium `file://`, v06 persistence and separate process restart.
- Runtime receipts: `docs/evidence/hg07-baseline/`.
- Original-client side-by-side and physical Android QA: NOT TESTED.

## HG-08 — IN PROGRESS; partial vertical slice

- Schema v07 and v06→v07 migration; hero XP/levels/attribute points and capacity; Castellan XP from completed troop queues; faction-specific build lists; one saveable Castle Spell research queue; real troop recruitment and visible prerequisite locks.
- 40-row prerequisite matrix. Human T1/T3–T10 gates use dated Chinese guides. Human Scout is partial. Scouting 1 is applied to four tier-2 scouting roles using a cross-version mapping. Non-Human support-building tiers and most per-unit gates remain incomplete; no unsupported tier gates are invented. Tavern slot milestones are supported; full candidate distribution/rare odds are not.
- Historical commercial artwork, SWF and client assets are not included. Reference links do not grant redistribution rights. Current game art is procedurally drawn.

## HG-09 — IN PROGRESS; tested tactical combat slice

- Added source-backed equal-speed initiative: speed descending, then battlefield position left-to-right/top-to-bottom following the 2009 Chinese player guide. The executed actor order is recorded in the battle state and visible in the game.
- Added deterministic target tie-breaking, documented board-wide ranged reach approximation (numeric range is missing from sources), and kept melee movement, attack/defend/focus/retreat, combat spells, equipment, casualties and Arena behavior in the live engine.
- Victory cannot be settled twice through the normal game flow: the completed target is rejected before AP deduction. Mid-battle save/load preserves positions, order and outcome.
- Damage formula, exact range, NPC composition/scaling, Stand By and Focus multipliers, morale, encounter timer and rewards remain partial or simulated.

## Current live verification

- `node qa-engine.cjs`: **62/62 PASS** (six HG-09-specific checks, including 1,000 seeded encounters replayed twice with identical outcomes and valid nonnegative ledgers).
- `node --check` on all 9 source JS files: **PASS**.
- `.venv\Scripts\python.exe build_offline.py`: **PASS**, generated `Play-Heoofgaia-HG08.html` (144,807 characters).
- `.venv\Scripts\python.exe qa-browser.py`: **49/49 PASS**, zero JS exceptions, actual installed Google Chrome. This includes **5/5 HG-09 browser checks**: real march opens battle, actual stacks/canvas, Attack advances a turn, ranged Attack reduces enemy HP, and initiative is recorded.
- `.venv\Scripts\python.exe qa-file-browser.py`: **9/9 PASS**, actual `file://` launch, save/reload and separate Chrome process.
- `git diff --check`: PASS; line-ending normalization warnings only.
- Runtime receipts: `docs/evidence/hg09/QA-HG09-NODE-RESULTS.json`, `QA-HG09-BROWSER-RESULTS.json`, and existing HG-08 QA receipts.

## Actual runtime captures and comparison limits

- `docs/evidence/hg09/screenshot-combat-desktop.png` and `screenshot-combat-after-turn-desktop.png`: actual game build in Chrome at 1440×900, before and after a real march and Attack action. After the action the browser shows 518 damage and a defeated enemy stack.
- HG-08 desktop/mobile and file-launch screenshots are under `docs/evidence/hg08/`; original client is not bundled.
- Dated 2009 Sina and 17173 combat references and archived battle screenshots have been located and registered in `docs/research/HG09-COMBAT-EVIDENCE.md`. A playable original client or directly inspectable original runtime capture was not available for pixel-level side-by-side review: **BLOCKED / NOT TESTED**. Current flat-shaded figures, grid and panel layout visibly remain approximations; no 1:1 claim is made.
- Physical Android/Windows-device acceptance: NOT TESTED.

## Remaining scope and next action

1. Continue HG-08 first: seek dated, edition-labelled per-unit gates for Elf/Orc/Undead and the exact Tavern candidate distributions. Enforce only evidence-backed values and keep unresolved cells partial.
2. Complete HG-08 positive/negative gate, no-spend rejection, migration and browser scenarios; commit the tested HG-08 completion slice when evidence supports it.
3. Then continue HG-09 with source-supported battle effects, AI/targeting, casualty/recovery and encounter/reward parity. Keep the numeric formula and missing original client status explicit.
4. HG-10 world/economy, HG-11 art/UI, HG-12 release packaging and HG-13 optional server are NOT COMPLETE.
5. GitHub repo creation/push is BLOCKED by missing local `gh` executable and unavailable repository-create API. Do not modify or merge to Tu Tiên Nhàn Rỗi `main`.
