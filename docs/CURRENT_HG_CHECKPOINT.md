# CURRENT HG CHECKPOINT

Date: 2026-11-02 (Windows local execution)

## Standalone repository

- Local project root: `E:\Heoofgaia`.
- Repository: standalone Git repository; no remote is configured. Intended GitHub destination is `vuanhtuan161094-byte/Heoofgaia` (PRIVATE), but creation and push are BLOCKED: this Windows `gh` profile is unauthenticated, the connected GitHub tools available here do not expose repository creation, and the destination lookup returned 404. No email was sent; `gh auth login --web` is a browser/device authorization flow.
- Working branch: `feature/heoofgaia-hg08-20261102`.
- HG-08 implementation commit: `a1b510658e6db54a445ae73293f04b78b18b2250`.
- Source baseline: `vuanhtuan161094-byte/tutiennhandoi`, branch `feature/heoofgaia-hg07-20261102`, source HEAD `b32737422ca866f08de8d94021b397eb22c8f017`; HG-07 implementation parent `62d4a1c6d1a0c9769cf9ee6690e77361a2927ea9`.
- Standalone bootstrap commit: `028cb97a0481a4ff37a9459a5dd13ddfa1256511`; previous audit checkpoint commit: `08d2fb0e4042f34af0372fb2187624bb03ff306e`.
- At import, SHA-256 comparison matched all 20 Hẻoofgaia root project files from the pinned source branch. No Tu Tiên root systems were copied or changed.
- `projects/heoofgaia/HANDOFF_CREATE_STANDALONE_20261102.md` was absent at the pinned source SHA. The attached ZIP handoff file was reference material only.

## HG-07 baseline audit — PASS (local)

Re-run in `E:\Heoofgaia` before HG-08 edits:

- `node --check` on the then-current 8 JS files: PASS.
- `node qa-engine.cjs`: 37/37 PASS.
- `.venv\Scripts\python.exe build_offline.py`: PASS; 123,427-character offline HTML.
- `.venv\Scripts\python.exe qa-browser.py`: 31/31 PASS, zero JS exceptions.
- `.venv\Scripts\python.exe qa-file-browser.py`: 9/9 PASS using installed Chromium with `file://`, v06 persistence and a separate browser-process restart.
- Runtime screenshots and receipts: `docs/evidence/hg07-baseline/`.
- Original client side-by-side comparison and physical Android QA: NOT TESTED. Previous Windows Chrome emoji glyph issue was addressed for the resource bar in HG-08.

## HG-08 — IN PROGRESS; partial vertical slice committed

Implemented in `a1b510658e6db54a445ae73293f04b78b18b2250`:

- Added a v07 save schema and v06-to-v07 migration while preserving prior spell/research values.
- Added hero XP, source-derived early and post-20 level thresholds, attribute points/allocation, troop completion XP to the castellan, and capacity checks.
- Added race-specific construction catalogs, a single canonical Castle Spell research queue, military research actions, costs/time marked as simulated, and real locked/unlocked troop states.
- Added a 40-row four-race troop unlock matrix. Human tier 1 and tiers 3–10 gates use dated Chinese guide evidence. Scout is partial because its source gate is incomplete. Elf/Orc/Undead currently enforce only the sourced Barracks tier; their missing per-unit support-building/research gates are explicitly marked partial rather than guessed.
- Added evidence register entries for 17 mechanism IDs. Chinese `练兵技术` ↔ English `Bootcamp` is a derived role mapping, not an asserted official translation.
- Refreshed package asset audit: no original game assets are included; only runtime screenshots of this reconstruction are committed. Source/reference attribution does not grant redistribution rights.
- Corrected resource icons that rendered as squares in Windows Chrome.

Live verification after the final UI wording change:

- `node qa-engine.cjs`: **55/55 PASS**.
- `node --check` on `data.js`, `engine.js`, `hg04.js`, `hg05.js`, `hg06.js`, `hg07.js`, `hg08.js`, `painter.js`, `app.js`: **PASS**.
- `.venv\Scripts\python.exe qa-browser.py`: **41/41 PASS**, zero browser JS exceptions.
- `.venv\Scripts\python.exe qa-file-browser.py`: **9/9 PASS**, including reload from a separate browser process.
- `.venv\Scripts\python.exe build_offline.py`: **PASS**, generated `Play-Heoofgaia-HG08.html` (143,574 characters).
- `git diff --check`: **PASS** (Git emitted line-ending normalization warnings only).

Actual runtime screenshots / receipts:

- `docs/evidence/hg08/screenshot-world-desktop.png` (1440×900; visually inspected).
- `docs/evidence/hg08/screenshot-construction-desktop.png`.
- `docs/evidence/hg08/screenshot-tavern-desktop.png`.
- `docs/evidence/hg08/screenshot-progression-desktop.png`.
- `docs/evidence/hg08/screenshot-world-mobile.png` (390×844 viewport).
- `docs/evidence/hg08/screenshot-tavern-mobile.png`.
- `docs/evidence/hg08/screenshot-file-launch-1280x720.png` (real local `file://` launch).
- `docs/evidence/hg08/QA-RC1-RESULTS.json`, `docs/evidence/hg08/file-launch-persistence.json`, and `docs/evidence/hg08/VISUAL-COMPARISON.md`.

Limitations and fidelity status:

- Original-client visual side-by-side comparison: **BLOCKED / NOT TESTED**; historical references are cited, but no playable original client was available for controlled capture.
- Physical Android and Windows-device acceptance: **NOT TESTED**.
- HG-08 is not complete: full race-specific troop prerequisites and verified timing/economy details remain incomplete. Tavern quality/refresh still needs edition-specific cross-checking. These gaps are not marked PASS.
- HG-09–HG-13 are not complete. Current world/battle visuals and some world/economy formulas remain prototype/simulated.
- The product is not claimed to be 1:1.

## Next atomic work

1. Research and register dated, edition-labelled evidence for Elf, Orc and Undead per-unit gates; search Chinese, English, archived manuals/guides and any lawfully accessible client data. Keep unknown gates explicitly partial if evidence cannot be found.
2. Complete HG-08 prerequisite matrix and cost/time oracle from actual sources; add positive/negative and no-mutation tests for every newly verified race gate, then rerun full regression and commit.
3. Continue HG-09 deterministic tactical combat only after its source edition and formation oracle are registered. Keep all work on this isolated branch and never merge to `main`.
4. Resolve GitHub authentication/repository creation before remote push. Until then, all commits are local only; never report a push as successful.
