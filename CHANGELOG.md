# Changelog

## 2026-11-02 — HG-08 mine economy slice (in progress)

- Added Chinese-guide Fame thresholds for mine ownership. Mine marches at the cap are rejected before AP is deducted; Fame 2,200 unlocks the sixth slot.
- Replaced provisional mine-level income scaling with dated per-mine output: Gold 200/hour, Wood/Ore 40/hour, Sulfur/Crystal 20/hour.
- Save schema/key remains v07. Production is derived from persisted mines during the economy tick.
- Added engine/UI/Chromium regression checks, including a one-game-hour economy tick and v07 reload. Current run: Node 84/84, JS syntax 9/9, Chrome 78/78 (0 exceptions), Chromium file:// 12/12; HTML build 153,333 characters.
- Added HOG1 source audit and HG08–HG13 acceptance matrix.
- Original HOG1 client/server/asset recovery and private GitHub push remain blocked/unverified. This is not a completed HG-08 release or a 1:1 claim.


## 2026-11-02 — HG-10 mine garrison and Recall

- Dispatch now removes the selected troop group from the castle army and stores it in a saveable expedition ledger.
- Winning a mine battle leaves the hero and surviving group stationed at the mine. The player can Recall the hero; the return journey persists through Save/Load and merges surviving troops into the castle once on arrival. Owned mine income continues after recall.
- Legacy v07 march and mid-battle saves without expedition fields are migrated while preserving reserve troops; loss with no surviving troops leaves a saved hero-only return route. The v07 save key/schema is unchanged.
- Evidence: SRC40, 17173 player FAQ (2009-10-25). Route timing/AP cost and non-mine auto-return are still modeled.
- QA: Node 86/86, Chrome 88/88, Chromium file:// 22/22, zero browser exceptions. Actual browser screenshots are under `docs/evidence/hg08/` and `docs/evidence/hg09/`.
