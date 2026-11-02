# Changelog

## 2026-11-02 — HG-08 mine economy slice (in progress)

- Added Chinese-guide Fame thresholds for mine ownership. Mine marches at the cap are rejected before AP is deducted; Fame 2,200 unlocks the sixth slot.
- Replaced provisional mine-level income scaling with dated per-mine output: Gold 200/hour, Wood/Ore 40/hour, Sulfur/Crystal 20/hour.
- Save schema/key remains v07. Production is derived from persisted mines during the economy tick.
- Added engine/UI/Chromium regression checks, including a one-game-hour economy tick and v07 reload. Current run: Node 84/84, JS syntax 9/9, Chrome 78/78 (0 exceptions), Chromium file:// 12/12; HTML build 153,333 characters.
- Added HOG1 source audit and HG08–HG13 acceptance matrix.
- Original HOG1 client/server/asset recovery and private GitHub push remain blocked/unverified. This is not a completed HG-08 release or a 1:1 claim.
