# CURRENT HG CHECKPOINT

Date: 2026-11-02 (Windows local execution)

## Standalone source

- Local root: `E:\Heoofgaia`.
- Repository: standalone Git repository, no remote configured because GitHub authentication is not available in this Windows profile.
- Working branch: `feature/heoofgaia-hg08-20261102`.
- Imported source: `vuanhtuan161094-byte/tutiennhandoi`, branch `feature/heoofgaia-hg07-20261102`, HEAD `b32737422ca866f08de8d94021b397eb22c8f017`; HG-07 implementation parent `62d4a1c6d1a0c9769cf9ee6690e77361a2927ea9`.
- Standalone bootstrap commit before this checkpoint: `028cb97a0481a4ff37a9459a5dd13ddfa1256511`.
- SHA-256 comparison: all 20 Hẻoofgaia root project files match the source branch at import. No Tu Tiên root systems were copied or changed.
- `projects/heoofgaia/HANDOFF_CREATE_STANDALONE_20261102.md` was absent at the pinned source SHA. The attached ZIP's separate handoff file was reference material only.

## HG-07 baseline — PASS

Re-run in `E:\Heoofgaia` before HG-08 edits:

- `node --check` on all 8 JS source files: PASS.
- `node qa-engine.cjs`: 37/37 PASS.
- `.venv\Scripts\python.exe build_offline.py`: PASS; 123,427-character offline HTML.
- `.venv\Scripts\python.exe qa-browser.py`: 31/31 PASS, zero JS exceptions.
- `.venv\Scripts\python.exe qa-file-browser.py`: 9/9 PASS; actual Chromium opened `file://`, saved under v06, reloaded and restored after a separate browser process restart.
- Actual game runtime captures and JSON test receipts: `docs/evidence/hg07-baseline/`.
- Visual issue: some emoji/resource glyphs render as missing-square symbols in Windows Chrome. Android physical QA and side-by-side comparison with an original client: NOT TESTED.

## GitHub standalone repository — BLOCKED

- Intended repository: `vuanhtuan161094-byte/Heoofgaia`, visibility requested PRIVATE.
- `gh auth status` reports no authenticated GitHub host. The destination lookup returned 404; no remote is configured, and repository creation/push have not occurred.
- The user was told to use `gh auth login --web`; no email was sent and browser/device-code auth does not require an email to be sent by this agent.
- Current local work is committed and can continue; pushing remains BLOCKED pending GitHub auth.

## HG-08 — IN PROGRESS

- Audited prerequisite sources. A dated 2009 Chinese official-publisher guide provides a complete Human troop table for tiers 1 and 3–10; it does not list Human Scout. A separate 2009 game guide confirms all four races and the Magic Tower as the research system. The English community unit catalog provides all 40 base stats/costs/timing and the generic Barracks-tier unlock rule.
- Next: add an evidence register and per-unit prerequisite confidence, implement the verified Human requirements and honest provisional gates for unresolved race tiers, implement source-backed hero XP thresholds/attribute points and safe v06-to-v07 migration, then run full regression/browser/file persistence and capture fresh screenshots.
