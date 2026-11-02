# Hẻoofgaia — Roadmap HG07 → release (02/11/2026)

Scope: **Heroes of Gaia / Castle of Heroes / 英雄之城 only**. Source code, art and engine are independent. No Call of Gods/War of Legends rules.

## Source authority and fidelity statuses
- `OBSERVED` = reference or dated wiki, always URL/date/locale.
- `DERIVED` = deterministic calculation from observed table, with oracle tests.
- `SIMULATED` = temporary implementation, **not** parity with original.
- `MISSING` = not implemented; do not treat a UI button as gameplay completion.

## Sprint plan and acceptance gates

| Sprint | Priority | Work | Acceptance | Status |
|---|---|---|---|---|
| HG07-A | P0 | Archive HG06 RC1 source in the isolated standalone repo; preserve save v06 | Branch+files; code bundle reproducible; Node and Chromium gates | COMPLETE locally; GitHub publish remains blocked |
| HG07-B | P0 | Apply 1–100 hero base troop-value capacity lookup and guard formation/march; preserve legacy saves | Boundary tests; over-cap rejects without partial state/AP change | PASS locally; migration regressions remain green |
| HG08 | P0 | Four-race troop gates, hero progression, Tavern, research and training | 40-row tests, migration and real queue/browser checks | IN PROGRESS; exact non-Human gates and candidate odds remain unresolved |
| HG09 | P0 | Tactical battle turns, targeting, damage, losses and Arena settlement | Deterministic fixtures, 1,000 seeded encounters, actual Chrome gameplay | IN PROGRESS; 1,000 deterministic battles pass; SRC46's 128 NPC map sites and force recommendations now lead to real 5★ Chrome March/battle/XP and v07 reload. NPC compositions/stats, formulas, morale, exact ranges and original-client parity remain partial/modelled. |
| HG10 | P1 | World ownership, mines, fog, multi-castle and march-return logistics | no duplicate harvest; tile ownership/save identity; offline time | IN PROGRESS — mine garrison/Recall plus real fame-gated multi-city capture, race-separated local economy and inactive queues pass Node/Chrome; fog/three-expedition limit/parity remain open |
| HG11 | P1 | Four-race city/world UI, animation and licensed or original art | Dated reference comparison; real desktop/mobile captures | PARTIAL prototype only; original visual parity not established |
| HG12 | P1 | Offline release, robust saves, import/export, packaging and performance | Reproducible offline artifact; recovery fixtures; physical acceptance | PARTIAL; offline HTML and file:// save/reload pass, release package incomplete |
| HG13 | P2 | Optional authoritative server, guild, PvP, chat/mail and cross-city marching | Threat model and local integration tests; no offline dependency | NOT STARTED; live service deployment requires infrastructure |

### Locked implementation constraints
1. HG code lives **only** under `projects/heoofgaia/` in feature branch; do not alter `main`, locked Tu Tiên runtime, AGENTS or CURRENT_CHECKPOINT.
2. Do not merge into `main` without separate decision: this repository's root is another game.
3. No claim of 1:1 clone until side-by-side source evidence and complete gameplay parity.
4. Missing license for original art/audio means only independent artwork can ship.
5. All HG02–HG06 historical save formats remain importable; HG07 does not bump schema.

### Immediate actual risks
- Source unit names/values may differ by locale and expansion. Some building requirements are still `SIMULATED`.
- Hero capacity includes Arena ranks, guild boosts and items in original game. HG07 only enforces **base level limit**; no fabricated bonus.
- HG06's 7 groups come from a community tactic; UI not proof of canonical count for every edition.
- qa-browser.py uses a localStorage shim in set_content; qa-file-browser.py separately exercises the generated offline HTML through Chromium file:// and a new browser process. Physical Android validation remains untested.

## Current execution — 2026-11-02

- Branch: `feature/heoofgaia-hg08-20261102`. Latest reviewed test/research tree before the current checkpoint refresh: `689617dee01c9ef14f9d5c415ad31d8aef7eb7c5`; latest gameplay runtime commit: `813557f5fdf5add1f187e1e9e2c7b62a7f6caa17`.
- Current Node regression: **79/79 PASS** (includes exact Tavern threshold boundaries and 1,000 deterministic encounters); runtime JavaScript syntax: **9/9 PASS**.
- Offline build: **PASS**, `Play-Heoofgaia-HG08.html` (152,097 characters).
- Chrome browser suite: **71/71 PASS**, zero page errors. Chromium `file://` Save/Load and separate-process restart: **12/12 PASS**.
- The current battle and city artwork is procedurally drawn prototype art. These captures document implemented interactions, not a match against the original client.
- No remote is configured and private GitHub repository vuanhtuan161094-byte/Heoofgaia is not verified to exist. No push has occurred.
## Latest browser evidence — 2026-11-02

- This entry supersedes the earlier 65/65 browser count above: commit `4dbadfba76fcdd2f1237d818df8dba9012cc5c58` adds Hall-cap screenshots and the browser suite now reports **68/68 PASS**, zero JavaScript errors. Engine QA is **78/78 PASS**; offline build is **151,931 characters PASS**; actual Chromium `file://` Save/Load is **12/12 PASS**.
- Fandom remains a partial survey: 608 articles are reported on its home page, but direct enumeration is blocked. Indexed pages read include Units, World Buildings, Newbie Guide, Combat mechanics, Heroes, Castles, Guild, and race/building pages. No claim that every article was read.
- Fresh Hall-cap evidence: `docs/evidence/hg08/screenshot-townhall-cap-locked-desktop.png` (disabled upgrade at Hall 1) and `docs/evidence/hg08/screenshot-townhall-cap-unlocked-queue-desktop.png` (real Barracks Lv.2 queue after Hall 2). The castle artwork is still a procedural prototype; original-client parity is not established.
- Latest reviewed tree SHA before this checkpoint refresh: `689617dee01c9ef14f9d5c415ad31d8aef7eb7c5`. Private GitHub repository creation/push remains BLOCKED because no remote or available create-repository/authenticated GitHub CLI is present.

## Latest tested gameplay slice — manual Advance — 2026-11-02

- Tested gameplay commit: `813557f5fdf5add1f187e1e9e2c7b62a7f6caa17` on `feature/heoofgaia-hg08-20261102`.
- Added an actual per-stack Advance order; it moves the selected melee group without damage, persists across Save/Load and permits a later Attack to hit after contact. Fandom Newbie Guide documents Advance/Stand By/Retreat controls; exact 2009 step distance remains unverified.
- Regression: Node **79/79**, browser **71/71** with zero JS exceptions, file:// **12/12**, 9 JavaScript syntax checks PASS, offline build **152,097 characters PASS**. HG-09-only receipts: Node **14/14**, browser **17/17**. One thousand seeded combat replay pairs continue to pass.
- Captures: `docs/evidence/hg09/screenshot-advance-manual-start-desktop.png` and `screenshot-advance-manual-move-desktop.png` show the runtime before/after. Visual inspection confirms movement and unchanged target HP; visuals remain a procedural prototype.
- This advances HG-09 but does not complete it. HG-08 data gaps remain; no original-client comparison or 1:1 claim. Private GitHub repository/push remains BLOCKED due no remote/create-repository operation.

## Latest tested HG-08/HG-10 vertical slice — Fame mine cap and output — 2026-11-02

- Source: SRC39, dated 17173 Chinese player guide (2009-12-27), lines 21–24 and 243–264. Five initial mines; exact Fame cap table; per-mine output 200 Gold / 40 Wood / 40 Ore / 20 Sulfur / 20 Crystal per hour. Confidence B for this regional guide; cross-region parity not verified.
- Code: cap validated before AP spend; captured mines feed fixed output into the economy tick; no save schema change.
- Regression: Node 84/84, JS syntax 9/9, Chrome 78/78 (0 JS exceptions), Chromium file:// 12/12; one-hour economy tick and reload verified; HTML 153,333 characters.
- Chrome screenshots use a seeded state with five owned mines and Fame 2,200; renderer, live action and AP deduction execute in the app. No composite/fake image. See docs/evidence/hg08/screenshot-fame-mine-cap-full-desktop.png and screenshot-fame-mine-cap-unlocked-march-desktop.png.
- HG-08 IN PROGRESS; HG-09 partial; HG-10 partial; HG-11 prototype art only; HG-12 packaging incomplete; HG-13 not started. Private GitHub push and original-client comparison remain blocked.


## Latest HG-10 world travel slice — 2026-11-02

- SRC40 (17173, 2009-10-25) says a hero remains at an occupied city/resource point and must be told to return to the original city. Implemented for mines: selected troops leave the castle pool, a mine victory stations the hero and surviving group, and Recall schedules a real saved route home. On arrival survivors merge into the castle army once; mine output remains owned after recall.
- Compatibility: v07 remains the save key/schema; legacy v07 in-flight marches migrate to the expedition ledger. No HG07/HG08 saves are discarded.
- Verification: Node 88/88, JavaScript syntax 9/9, installed Chrome 88/88 with zero JS exceptions, Chromium `file://` 22/22. The file:// suite starts with the game's normal army and wins the mine battle without seeding the outcome. It saves/reloads on the outbound and return marches.
- Art remains procedural prototype work; these screenshots are evidence of this reconstruction only, not original-client parity.
- Still open under HG-10: multi-city capture/identity, fog/scouting, portals, offline catch-up behavior, historic world map/timing, mine bonuses and original-client comparison. Non-mine automatic return and recall AP cost are unverified model decisions.


### HG-10 multi-castle vertical slice — 2026-11-02

- Five neutral race castles are selectable and capturable through real troop dispatch and tactical combat. A source-backed Fame limit is checked before AP use. Separate local stock, race/building levels, troops, wounded, spells, research/training/building/Arena queues and Tavern data persist per city; inactive cities continue production and queues.
- Capturing an Elf city changes the available race troop roster after actual city switching. City capture leaves the hero and surviving force stationed. Recall routes troops to the saved home-city identity. Main-city-only task claims follow SRC41. Existing v07 Save/Load remains the single format/key and initializes legacy saves as one city.
- Node regression 94/94; actual installed Chrome headless CDP against `file://` 13/13, zero JavaScript exceptions, including real attack controls and save/reload; offline build is `Play-Heoofgaia-HG10.html`. Python Playwright and separate-process file persistence tests are blocked by missing Playwright. See `docs/qa/hg10/chrome-smoke.json`.
- Chrome captures are in `docs/evidence/hg10/`. They are real runtime screenshots, but artwork is geometric prototype art; no original-client visual parity has been demonstrated.
- Castle Fame thresholds conflict between the October guide (8,000), December Chinese rank table (5,800), and living Fandom page (22,000 for two castles). HG-10 uses the later December 2009 Chinese table and documents the profile choice. Capture AP price, map placement and captured-city initial stock/buildings are modeled.
- Visual comparison against SRC42 makes the gap explicit: the original scene is described/shown as a scenic 2D landscape with detailed hillside buildings; the current render is geometric placeholder art. HG-11 must replace the presentation with new, provenance-documented faction art and layout before visual parity can be evaluated.
