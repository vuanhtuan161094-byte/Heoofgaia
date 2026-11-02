# Háº»oofgaia

Standalone reconstruction project for Heroes of Gaia / Castle of Heroes / è‹±é›„ä¹‹åŸŽ (circa 2009â€“2010). This is an independent offline prototype, not the original game and not yet a complete or 1:1 reconstruction.

## Play

Open `Play-Heoofgaia-HG07.html` in Chrome or Edge. The game runs offline. Source is in the HTML/CSS/JavaScript files at this repository root.

## Verify

```powershell
node qa-engine.cjs
.venv\Scripts\python.exe build_offline.py
.venv\Scripts\python.exe qa-browser.py
.venv\Scripts\python.exe qa-file-browser.py
```

`qa-browser.py` uses Playwright with installed Chrome/Edge, writes actual runtime captures under `docs/evidence/hg07-baseline/`, and uses a test-only storage shim. It does not prove physical mobile storage or the original server behavior.

## Project records

- `docs/CODEX_MASTER_EXECUTION_PLAN_20261102.md` â€” development contract.
- `docs/ROADMAP-MASTER.md` â€” HG-08 through HG-13 sequence.
- `docs/research/RESEARCH-HEROES-OF-GAIA-2009.md` â€” historical evidence dossier.
- `docs/ASSET-PROVENANCE.md` â€” asset rights register policy.
- `docs/CURRENT_HG_CHECKPOINT.md` â€” exact working state and next task.

The primary reference is Heroes of Gaia only. Unverified mechanics remain marked as simulated or missing. Preserve the HG-02 to HG-07 save key `heoofgaia_hg_only_v06` and test explicit migrations before changing schema.

