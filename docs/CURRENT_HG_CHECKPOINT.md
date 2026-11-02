# CURRENT HG CHECKPOINT

Date: 2026-11-02 (Windows local execution)

## Standalone repository

- Project root: `E:\Heoofgaia`.
- Repository: standalone local Git repository. `git remote -v` is empty; the intended GitHub repo `vuanhtuan161094-byte/Heoofgaia` (PRIVATE) has not been created or pushed. GitHub creation/push remains BLOCKED because this Windows `gh` profile is unauthenticated, the connected GitHub tools available here do not expose repository creation, and the repo lookup returned 404. No email was sent; `gh auth login --web` is a browser/device authorization flow.
- Working branch: `feature/heoofgaia-hg08-20261102`.
- Latest HG-08 code commit: `0b2dc74245a76c3dfb0f54219c61044851072ea6`.
- Source baseline: `vuanhtuan161094-byte/tutiennhandoi`, branch `feature/heoofgaia-hg07-20261102`, source HEAD `b32737422ca866f08de8d94021b397eb22c8f017`; HG-07 implementation parent `62d4a1c6d1a0c9769cf9ee6690e77361a2927ea9`.
- Standalone bootstrap: `028cb97a0481a4ff37a9459a5dd13ddfa1256511`; audit checkpoint: `08d2fb0e4042f34af0372fb2187624bb03ff306e`; first HG-08 slice: `a1b510658e6db54a445ae73293f04b78b18b2250`; prior continuation checkpoint: `a491726d5958ab382b03ec21c6a7db6009bee0be`.
- At import, SHA-256 comparison matched all 20 Hẻoofgaia root project files from the pinned source branch. No Tu Tiên root systems were copied or changed.
- `projects/heoofgaia/HANDOFF_CREATE_STANDALONE_20261102.md` was absent at the pinned source SHA. The attached ZIP handoff file was reference material only.

## HG-07 baseline audit — PASS (local)

Re-run in `E:\Heoofgaia` before HG-08 edits:

- `node --check` on the then-current 8 JS source files: PASS.
- `node qa-engine.cjs`: 37/37 PASS.
- `.venv\Scripts\python.exe build_offline.py`: PASS; 123,427-character offline HTML.
- `.venv\Scripts\python.exe qa-browser.py`: 31/31 PASS, zero JS exceptions.
- `.venv\Scripts\python.exe qa-file-browser.py`: 9/9 PASS using installed Chromium with `file://`, v06 persistence and a separate browser-process restart.
- Runtime captures and receipts: `docs/evidence/hg07-baseline/`.
- Original-client side-by-side comparison and physical Android QA: NOT TESTED.

## HG-08 — IN PROGRESS; partial vertical slice committed

Implemented by latest code commit `0b2dc74245a76c3dfb0f54219c61044851072ea6`:

- Added schema v07 and v06-to-v07 migration, preserving old spell/research values and hero progress.
- Added hero XP, cited early/post-20 level thresholds, attribute points/allocation, Castellan XP when troop queues complete, and capacity checks.
- Added race-specific construction catalogs, one canonical Castle Spell research queue, real troop recruit/build actions and visible locked/unlocked states. Research price/time and some progression distributions are labeled simulated.
- Added a 40-row four-race troop prerequisite matrix. Human T1 and T3–T10 gates use dated Chinese references. Human Scout is partial. Scouting 1 is applied to the four tier-2 scout roles; non-Human role classification is visibly marked B*/derived from the shared 2009 catalog profile. Exact Human Town Hall and non-Human support-building gates remain unresolved. Other non-Human tiers enforce only the Barracks tier and remain partial; no faction-tier gate is invented.
- Added an evidence register. Chinese `练兵技术` ↔ English `Bootcamp` is a role-based inference, not an asserted official translation.
- Asset audit: no original commercial assets included; only runtime screenshots of this build are committed. Historical references do not grant redistribution rights.
- Replaced resource glyphs that rendered as squares in Windows Chrome.

Latest live verification, after rebuilding the offline artifact from the current source:

- `node qa-engine.cjs`: **56/56 PASS**.
- `node --check` on `data.js`, `engine.js`, `hg04.js`, `hg05.js`, `hg06.js`, `hg07.js`, `hg08.js`, `painter.js`, `app.js`: **PASS**.
- `.venv\Scripts\python.exe build_offline.py`: **PASS**, generated `Play-Heoofgaia-HG08.html` (143,856 characters).
- `.venv\Scripts\python.exe qa-browser.py`: **42/42 PASS**, 0 JavaScript exceptions, actual installed Google Chrome.
- `.venv\Scripts\python.exe qa-file-browser.py`: **9/9 PASS**, `file://` persistence including a separate browser process.
- `git diff --check`: **PASS** (line-ending normalization warnings only).

Actual runtime screenshots / receipts:

- `docs/evidence/hg08/screenshot-world-desktop.png` (1440×900; visually inspected).
- `docs/evidence/hg08/screenshot-construction-desktop.png`.
- `docs/evidence/hg08/screenshot-tavern-desktop.png`.
- `docs/evidence/hg08/screenshot-progression-desktop.png`.
- `docs/evidence/hg08/screenshot-troop-unlocks-desktop.png` (Barracks 2; derived Elf Scout B* gate visible; visually inspected).
- `docs/evidence/hg08/screenshot-world-mobile.png` and `screenshot-tavern-mobile.png` (390×844 browser viewport, not a physical phone).
- `docs/evidence/hg08/screenshot-file-launch-1280x720.png` (real local `file://` launch).
- `docs/evidence/hg08/QA-RC1-RESULTS.json`, `file-launch-persistence.json`, and `VISUAL-COMPARISON.md`.

Fidelity status and unfinished work:

- Original-client screenshot comparison: **BLOCKED / NOT TESTED**. Historical sources are cited but no playable original client was available for controlled comparison.
- Physical Android/Windows-device acceptance: **NOT TESTED**.
- HG-08 is not complete: Elf/Orc/Undead per-unit support-building and research gates, exact Tavern distribution, and version-specific battle XP remain incomplete. Some values are intentionally simulated.
- HG-09–HG-13 are not complete. The game remains an offline prototype; some world/economy/battle systems are simulated, and visual art is procedural rather than original client assets.
- No 1:1 parity claim is made.

## Next atomic work

1. Continue dated, edition-labelled research for Elf/Orc/Undead per-unit gates, including Chinese guides, English archives and any lawfully accessible static client data. Keep unresolved rules explicitly partial.
2. Complete the HG-08 prerequisite matrix from evidence; test each newly sourced positive/negative gate and no-resource-mutation case, then commit after full regression.
3. Continue HG-09 deterministic tactical combat after registering its source edition, formation and observable-outcome oracle.
4. Resolve GitHub authentication/repository creation before remote push. All current commits are local only. Keep work isolated; never modify or merge Tu Tiên Nhàn Rỗi `main`.
