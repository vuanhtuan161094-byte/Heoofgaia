# Hẻoofgaia

Standalone reconstruction project for Heroes of Gaia / Castle of Heroes / 英雄之城 (circa 2009–2010). This is an independent offline prototype, not the original game and not yet a complete or 1:1 reconstruction.

## Play

Open `Play-Heoofgaia-HG08.html` in Chrome or Edge. The game runs offline. Editable source is in the HTML/CSS/JavaScript files at this repository root.

## Verify

```powershell
node qa-engine.cjs
.venv\Scripts\python.exe build_offline.py
.venv\Scripts\python.exe qa-browser.py
.venv\Scripts\python.exe qa-file-browser.py
```

`qa-browser.py` uses Playwright and installed Chrome/Edge. It writes actual runtime captures under `docs/evidence/hg08/`; its in-page test profile is a storage shim. `qa-file-browser.py` opens the offline HTML with `file://` and verifies save persistence after a separate browser process restart. Neither test proves physical mobile storage or the original server behavior.

## Project records

- `docs/CODEX_MASTER_EXECUTION_PLAN_20261102.md` — development contract.
- `docs/ROADMAP-MASTER.md` — HG-08 through HG-13 sequence.
- `docs/research/RESEARCH-HEROES-OF-GAIA-2009.md` — historical evidence dossier.
- `docs/research/HG08-EVIDENCE-REGISTER.md` — dated source and confidence register.
- `docs/research/HG08-TROOP-UNLOCK-MATRIX.md` — per-unit prerequisite evidence and current implementation status.
- `docs/ASSET-PROVENANCE.md` — asset rights register policy.
- `docs/CURRENT_HG_CHECKPOINT.md` — exact working state and next task.

The primary reference is Heroes of Gaia only. Unverified mechanics remain marked as simulated or missing. HG02–HG07 save data is migrated to the v07 key `heoofgaia_hg_only_v07`; migration preserves hero level/EXP and does not grant retroactive attribute points.
