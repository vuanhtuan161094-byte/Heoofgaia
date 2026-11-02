
## 2026-11-03 — HG-08 Hero Tower experience bonus (partial)

- Implemented the dated SRC03 Hero Tower modifier: every hero XP award gains 1% per level of the active city's Hero Tower. Fractional XP is kept because the source does not specify rounding; combat XP and Castellan training's base award remain modeled/community-derived.
- Kept the v07 save key/schema. Node now passes 115/115; integrated Chrome 91/91; offline fresh-process persistence 29/29; Hero Tower XP `file://` flow 7/7; Tavern terminal gate 10/10; four-faction city smoke 48/48.
- Real Chrome screenshot and receipt: `docs/evidence/hg08/hero-tower-xp-chrome.png`, `docs/qa/hg08/hero-tower-xp-chrome.json`. The test seeds Town Hall/Hero Tower 10, then uses the actual Castellan, recruitment, training and Save/Reload flows.
- HG-08 remains in progress: 28 non-Human recruitment gates and Tavern distributions remain incomplete; no original-client parity or 1:1 claim.

## 2026-11-03 — HG-08 source-backed Tavern terminal construction gates (partial)

- Added the explicit SRC03 terminal chain: Hero Tower L8 requires Town Hall L7; Tavern L10 requires Hero Tower L8. Only these exact upgrades bypass the generic Town Hall cap, and rejected upgrades spend no resources.
- The city UI displays the actual missing prerequisite. Construction runs through the existing timed queue and preserves the current v07 Save/Load schema.
- Node regression: 114/114 PASS. Installed Chrome regression: 91/91 PASS with zero page exceptions. Actual Chrome `file://` Tavern/Save/Reload flow: 10/10 PASS.
- Added dated SRC44 Chinese qualitative cross-check; it does not supply numeric gates or Tavern probabilities. Intermediate gates, odds and regional parity remain open; no 1:1 claim.

## 2026-11-03 — HG-10 world visitables (partial)

- Expanded the playable outdoor map to the 100×100 historical coordinate space and added ten visitable buildings listed by the 2009 Chinese guide.
- Implemented daily Windmill resource rolls, five Watermill gold rewards, and two-hour +10% Attack/Defense/Knowledge/Speed buffs with effects in live combat, hero march timing and the existing modeled Castellan calculation.
- Preserved the v07 Save/Load key and migration. UTC reset and immediate no-AP/no-travel visits remain explicit models because sources give no reset timezone or travel/AP cost.
- Verification: Node 113/113 PASS; integrated Chromium regression 91/91 PASS with zero page exceptions; actual Chrome `file://` visit/reward/daily-lock/Save/Reload 10/10 PASS. Screenshot: `docs/evidence/hg10/world-buildings-chrome.png`; machine receipt: `docs/qa/hg10/world-buildings-chrome.json`.
- Visual honesty: new map-building markers are code-drawn prototypes, not recovered HOG artwork. World art parity and the full HG-10 feature set remain incomplete; no 1:1 claim.

## 2026-11-02 — HG-10 multi-city capture slice

- Added five neutral race castles capturable through real marching and tactical combat, with Fame-rank city limits.
- Added per-city race, resources, buildings, troop pools, training/research queues, and inactive-city production/timer progression; cities can be switched from the City tab.
- Added return-to-saved-city troop routing, main-city-only task claiming, and backward-compatible v07 city initialization.
- Added Node acceptance tests, real Chrome `file://` CDP smoke/screenshot capture, source-conflict notes, and Fandom UI/multi-castle survey details.
- Models remain explicit for capture AP, city start stock/buildings, neutral coordinates and secondary-origin returns. Graphics remain prototype geometry.

## 2026-11-02 — HG-11 modern four-faction city art slice (partial)

- Added four original generated 2.5D city scenes in a polished modern fantasy style. Kept the Heroes of Gaia faction architecture and castle-on-hills composition without emulating 2009 rendering limits.
- Added race-specific Market hotspot calibration; all other city buildings remain selectable through live game-code hotspots. Construction queues and v07 Save/Load continue to run.
- Changed the displayed game title to **Anh Hùng Thời Loạn** while retaining Hẻoofgaia as the project/repository name.
- Chrome file:// QA: 48/48 PASS, including full-page reload of faction and construction state. Node engine regression: 96/96 PASS. The offline HTML embeds the four scenes.
- HG-11 remains partial: paintings are flattened, not animated independent building sprites; world/battle visuals and original-client comparison remain outstanding. No 1:1 claim.

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
