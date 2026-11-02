
## 2026-11-02 — HG-10 multi-city capture slice

- Added five neutral race castles capturable through real marching and tactical combat, with Fame-rank city limits.
- Added per-city race, resources, buildings, troop pools, training/research queues, and inactive-city production/timer progression; cities can be switched from the City tab.
- Added return-to-saved-city troop routing, main-city-only task claiming, and backward-compatible v07 city initialization.
- Added Node acceptance tests, real Chrome `file://` CDP smoke/screenshot capture, source-conflict notes, and Fandom UI/multi-castle survey details.
- Models remain explicit for capture AP, city start stock/buildings, neutral coordinates and secondary-origin returns. Graphics remain prototype geometry.

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


## 2026-11-02 — HG-10 multi-castle playable slice (in progress)

- Added Fame-gated capture of five neutral castles through real march and tactical battle; race-specific cities keep separate stocks, buildings, troops, research and queues. Switching cities, inactive-city production, main-city tasks, garrison and return persist with v07 Save/Load.
- QA: Node 94/94 PASS, JavaScript syntax 10/10 PASS, Chrome CDP `file://` 13/13 PASS with no exceptions, HTML build 175,811 characters. Python Playwright and separate-process restart remain blocked by the missing package.
- Captures under `docs/evidence/hg10/` are real Chrome outputs. SRC42 historical comparison confirms the present geometric art is low fidelity; HG-11 visuals remain a major missing feature.
- Private repository/push is unverified and blocked; no remote is configured. No claim of full HG-10 or 1:1 parity.
