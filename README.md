# Anh Hùng Thời Loạn — Hẻoofgaia

Standalone reconstruction project for Heroes of Gaia / Castle of Heroes / 英雄之城 (circa 2009–2010). The playable Vietnamese title is **Anh Hùng Thời Loạn**; Hẻoofgaia remains the project/repository name. This is an independent offline prototype, not the original game and not yet a complete or 1:1 reconstruction.

## Play

Open `Play-Heoofgaia-HG11.html` in Chrome or Edge. The file embeds all four faction city scenes and runs without network access. The city art uses a polished modern fantasy illustration style while preserving Heroes of Gaia faction architecture and hillside-city landmarks; it is original recreated artwork, not extracted Heroes of Gaia art. Building selection, upgrade queues and save actions are handled by the game code.

## Verify

```powershell
node qa-engine.cjs
.venv\Scripts\python.exe build_offline.py
.venv\Scripts\python.exe qa-browser.py
.venv\Scripts\python.exe qa-file-browser.py
python qa-hg11-chrome-cli.py
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

The primary reference is Heroes of Gaia only. Unverified mechanics remain marked as simulated or missing. HG02–HG07 save data is migrated to the v07 key `heoofgaia_hg_only_v07`; migration preserves hero level/EXP and does not grant retroactive attribute points. HG-10 provides Fame-gated secondary-race castles with separate per-city stores and queues. HG-11 adds four original generated city scenes and per-faction building hotspots. Capture-city starting inventory/AP, troop sprite fidelity, building animation and original-client parity remain unresolved; see `docs/CURRENT_HG_CHECKPOINT.md`.


## Current research and acceptance

- docs/research/HOG1_SOURCE_AUDIT.md records the original client/server/asset leads; no HOG1 source file is recovered.
- docs/qa/HG08_HG13_ACCEPTANCE.md records stage status and acceptance evidence.
- docs/research/HG08-EVIDENCE-REGISTER.md records dated sources and confidence.
- The current map economy uses the documented Chinese-guide Fame mine cap and per-mine yields; regional parity and mine spell multipliers remain unverified.
- Current screenshots show the prototype UI, not a side-by-side match to the original. Fandom survey coverage is partial, not all 608 pages.
