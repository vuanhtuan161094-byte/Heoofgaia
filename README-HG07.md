# Hẻoofgaia HG-07 — Hero command capacity

The project remains an **offline playable prototype, not a complete clone** of Heroes of Gaia. This sprint performs a narrow, evidence-backed implementation: level 1–100 base hero command limits using the community wiki table. Hero Arena rank, items, guild and racial bonuses remain explicitly outside scope. 2009 client/server binaries have not been recovered.

## Launch
- Windows: open `Play-Heoofgaia-HG07.html` in Chrome/Edge; export a backup JSON before upgrading.
- Developer: `python build_offline.py`; `node qa-engine.cjs`; `python qa-browser.py` (needs Playwright + Chromium).
- Sources run with `index.html` and JS/CSS in the same directory.
- Existing HG02–HG06 save data uses its previous format and is imported via existing migration; **save key remains v06**.

## New behavior
- Army tab shows unit-value used vs base command limit of selected hero.
- `setFormation` refuses a newly over-limit formation; `startMarch` also checks old saved or implicit auto formations **before** deducting AP.
- Existing saved formations are not silently deleted or trimmed. Player may reduce them to proceed.

## Reference
https://heroesofgaia.fandom.com/wiki/Heroes ("Hero Progress" / "Unit Limit", community wiki). The table is cited as community sourced, not official internal code.
https://heroesofgaia.wikidot.com/game-units (unit value = resource-value conversion)

## Not tested or not ready
- No `file://`/physical mobile persistence test in this environment; browser QA simulates storage.
- No MMO, true world synchronization, canonical PvP, full visuals or exact high-tier unlock tree.
- No changes to Tu Tiên Nhàn Rỗi under the repository root.
