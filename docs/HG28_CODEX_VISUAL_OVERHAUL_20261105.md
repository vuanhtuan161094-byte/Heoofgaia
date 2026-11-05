# HG28 — CODEX VISUAL OVERHAUL DELIVERY CONTRACT
**Owner decision: 05/11/2026.** This task is explicitly delegated to Codex. Implement into the playable game, not mockups or a concept deck.

## Nonnegotiable

- Repo **vuanhtuan161094-byte/Heoofgaia**, **sole development branch** `feature/hog1-research-to-playable-20261102`, **sole release** `Play-Heoofgaia-HG11.html`. The suffix HG11 is historical. **No new feature branches, separate game build, PR-only track, or main merge.** Worktree is `E:\Heoofgaia` when running on Windows; a cloud worktree may be elsewhere. Don't overwrite concurrently edited assets: `git fetch`, compare HEAD and `git status` before each push; use rebase/guarded commits, never force push.
- Keep Save **v07**, migration and exact-once reward authority intact. Preserve HG18–HG31, including HG26.1 real **3 heroes × 2 stacks** in one Boss fight, 3×2 paid Tower combat, HG29 drop ledger, HG30 troop conversion, HG31 focused gear crafting and per-hero set buffs. NO gameplay/economy rebalancing, new fake rewards, altered assertions to conceal regressions or static screenshot-as-interface. Existing overlay/dialog and interaction APIs continue to function.
- **Aesthetics before explanatory text.** This is a classic fantasy strategy game, inspired by Heroes of Gaia without distributing ripped/unauthorized third-party game art. Original asset creation or properly licensed/free assets with provenance only. Art must be integrated into actual canvas/UI and available offline, not hosted remotely. Do not stop at image prototypes, mockups, purely CSS gradients, emoji replacements, or generated screenshots pasted into the interface.
- **Owner feedback:** current 1280×720 screenshot is ugly and text-heavy, world map is flat/childlike, location labels too small, modal windows enormous, text and nested scrolls conceal buttons, some artwork looks pasted rather than integrated. Codex is responsible for its own design judgement and iteration; avoid asking owner to name every wrong pixel.

## Baseline and known red gate

- On 05/11/2026 the branch HEAD is `292af2da117c7d5c3fbb2fae9dfaef03a5cb3b17`. The last successful full code run is [41947776493](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/41947776493), and HG31 code pass on [41947547472](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/41947547472).
- **Latest checkpoint-only CI run [41948299888](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/41948299888) is FAILURE.** Failing step: HG18.1 fixed viewport/popup UX, `qa-hg181-window-chrome.py` line ~92, `[data-action="tower-climb"]` disabled after prior UI interactions. Establish whether state/team reset, test setup or actual gameplay issue. Repair the legitimate cause, DON'T force-click a disabled button, seed test in a way that bypasses the intended user interaction, or lower existing acceptance thresholds.
- Read `AGENTS.md`, `docs/CURRENT_HG_CHECKPOINT.md`, `docs/PROJECT_SINGLE_SOURCE_OF_TRUTH.md`, `docs/HG27_PVE_FARM_MASTER_20261105.md`, and this file. Check latest HEAD again before code edits.

## Visual direction: premium dark-fantasy 2.5D strategy

- Cohesive **dark teal/navy + parchment/bronze/gold**, textured but legible, high-contrast selectable states. Fantasy environment visual richness comparable to polished early-browser strategy RPG artwork; not cartoon doodles, blurry stretched bitmaps, or unstructured photoreal imagery.
- At **1280×720 desktop landscape**, the map/scene is dominant. Compact HUD/resources; controls roughly 36–44 px where space permits, readable high-contrast font and consistent type scale; focus indication and tooltips. At **960×540 landscape**, no clipped critical actions, toolbar collision or body horizontal scrolling. Reduce explanatory copy in primary gameplay to **short labels and numbers**, put deeper explanation in small hover/secondary information, never large blocks before the main scene.
- Art assets: avoid creating oversized 20MB backgrounds that throttle user's 8GB Windows 10 PC. Use atlas/webp/png/sprite caching and canvas compositing, maintain crisp pixel/art proportions; letterbox/crop intentionally, NEVER stretch map/labels anisotropically. Stage canvas pixel ratio must track actual display size on resize.

## Required editable/playable visual passes

**P0 / World:** Replace flat procedural color carpet with richly layered reusable terrain patches (grass/plains, dirt road, forest, mountains, rivers, gold/ore mines, quest camps) blended into zoom/pan world canvas; 100×100 world coordinates/click mapping stay exact. Distinct detailed landmark sprites for ordinary NPC vs Elite vs Boss T11–T13, each mine type, castle factions, Tower, quest target. Strong sizes and silhouettes without obscuring hit targets, controlled hover/selection, compact icon/level/potential loot info. Keep minimap and navigate-to-target. **Real pointer click, zoom, drag, target preview must PASS.**

**P0 / City:** Actual four-faction (Human/Elf/Orc/Undead) city environment art, differentiated buildings, hover/click transparent hotspots from the canonical building state, level/progress visible as chips, selected-building action info in an accessible compact side/bottom dock. The city may be a full scene or wide panel but should not be a huge document-like modal with a giant image that hides all actions. Preserve building upgrade/research/recruit interactions, including zero-resource New Game gates.

**P0 / Combat & Troops:** Actual combat screenshot at 1280×720, clear squad identity, battlefield terrain, HP/ATK effects, visible target selection/path/attack indication, legible casualty/damage numbers. Preserve tactical 3 heroes × 2 owner stacks in one Boss and Tower fight, 7 normal slots elsewhere. **40 troop identities must remain distinct**; first upgrade the 8 special/tower soldiers (HG30) and high-tier T9/T10 (including Dragon/Lich etc.) with coherent sprites and deliberate Idle/Walk/Attack/Hit/Death when feasible. Existing HG22.1 Skeleton 5 actions/50 frames must not regress. No promise of “40 fully animated” without frame coverage and actual QA.

**P1 / Hero, Army, Gear:** Hero portrait/character priority, real equipped-slot icons for weapon/armor/charm, stat deltas/real set bonus, visual item rarity, usable army cards and commander assignments. HG29–31 fragments should be represented as clear, compact icon/progress strips. Show spend/earn amounts and missing gates on one row; two sets Long Hồn/Tinh Không should be selectable without >2 full-screen scrolling. Render source-specific unique item icons (existing 6 HG31 SVG can be refined). Don't turn a menu into a wall of instructional text.

**P1 / Quest, Tower, Magic, Reports, Codex:** Compact, meaningful icons, section grouping, progress indicators and a single primary CTA per panel. Distinct boss farm vs tower farm missions; reward previews use actual engine data not invented promises. Move lengthy source explanations and tutorial paragraphs into Tư liệu/optional tooltip; don't delete provenance documents or gameplay detail.

## Implementation and asset workflow

Read `painter.js`, `app.js`, `style.css`, `style-hg03.css`, `art-pack.js`, `art-free-icons-core.js`, `art-free-icons-extra.js`, `art-hg192-sprites.js`, `art-hg193-sprites.js`, `art-hg22-skeleton.js`, `assets/`, `build_offline.py`, `index.html`, and existing qa scripts. Reuse/protect prior real art. Implement actual SVG/PNG/WebP/art atlas assets and corresponding render logic in source, never replace entire UI with image screenshot. Save source files, optimize import and reuse caches. Document provenance/licensing of third-party art in `docs/asset-provenance-hg28.md`.

Execute in **three verified code slices** (continue until completed; do not stop after plan):
1. **HG28-A World/City P0:** capture BEFORE screenshot at 1280×720 & 960×540, implement terrain/landmarks/city, run interaction tests, capture AFTER screenshots and visually inspect them. If aesthetic still poor, iterate.
2. **HG28-B Combat/Army/Hero:** render and animate meaningful actor silhouettes and states, correct stack/hero visuals and equip cards, re-test 3×2 and Save.
3. **HG28-C Forge/Quest/Tower/All tabs:** compact HG29/30/31 displays, unify HUD and modal/window navigation, screenshot all ten screens, fix visible defects, deliver playable offline artifact.

## Screenshot QA — not optional

Create `qa-hg28-visual-chrome.py` driven by built `Play-Heoofgaia-HG11.html` in real Chromium:
- Always capture **before/after** on both **1280×720** and **960×540**; all 10 tabs: World, City, Army, Heroes, Magic, Relics, Tasks, Tower, Reports, Sources.
- Include extra active-state screenshots: selected normal NPC, Boss T11+, mine, each race city, hero equipped + HG31 3/3 set, HG30 available & completed conversions, paid Tower team 3×2, Boss 3×2 actual battle, HG29 loot UI, Save reload.
- Record UI evidence in `docs/evidence/hg28/`; the captured PNGs must be from the **real playable HTML** and linked to exact commit SHA; no generated concept art masquerading as screenshots. Add BEFORE/AFTER comparison contact sheet, clear file names and QA receipt.
- Programmatic checks: no JS exceptions; no overflow/cropped core CTA; all modal close/ESC; all primary nav tabs work; canvas proportions correct; mouse click hit testing and map pan/zoom; game actions are wired and change real engine state; save/export/import/reload; new game non-preseeded; playable at both sizes.
- Visual review (human-style): scene looks like a real fantasy game, no blurry/stretched labels, no tiny map landmarks, no font contrast failure, no art panel hiding all controls, no long text wall on first viewport. Rework screenshots until review items pass. Do not report “looks beautiful” without screenshots.

## Hard QA and final delivery

Run from repo:
```
node qa-engine.cjs
node qa-hg29-loot.cjs
node qa-hg30-ascension.cjs
node qa-hg31-legendary.cjs
python build_offline.py
python qa-hg28-visual-chrome.py
```
Also run all existing workflow gates in `.github/workflows/hog-combat-offline.yml` including HG18.1, HG21, HG26.1, Save/Load and core Chromium. **Do not claim PASS until latest source HEAD actually has GitHub Actions SUCCESS.** Provide exact branch/commit, evidence paths, before/after images, failures fixed, per-screen pass/fail, full artifact download & SHA-256. One `Play-Heoofgaia-HG11.html` offline file only. Do not add telemetry or new remote dependencies. If full art/animation coverage is still partial, report real coverage and continue work rather than declaring done.

## Expected owner-facing delivery (brief)

- One screenshot contact sheet showing measurable BEFORE/AFTER improvements in **World, City, Combat, Army and Hero**, plus remaining five screens.
- One playable offline HTML link/artifact with CI green and real screenshots (not a design mockup).
- A compact table of screens COMPLETED/PARTIAL/FAIL and one next-step recommendation. No lengthy explanation or feel-good progress report.
