# CURRENT HG CHECKPOINT

Date: 2026-11-02 (Windows local execution)

## Standalone repository and verified source

- Project root: `E:\Heoofgaia`.
- Working branch: `feature/heoofgaia-hg08-20261102`.
- Latest tested functional commit SHA: a3c1b9b885f526761de167a958855815133dba0e (feat: add source-informed combat target AI). This checkpoint document is committed separately after the tested functional commit; code and regression receipts below correspond to this SHA.
- Original source: `vuanhtuan161094-byte/tutiennhandoi`, source branch `feature/heoofgaia-hg07-20261102`, pinned source HEAD `b32737422ca866f08de8d94021b397eb22c8f017`; HG-07 implementation parent `62d4a1c6d1a0c9769cf9ee6690e77361a2927ea9`.
- Standalone bootstrap `028cb97a0481a4ff37a9459a5dd13ddfa1256511`; import audit `08d2fb0e4042f34af0372fb2187624bb03ff306e`. SHA-256 comparison matched all 20 Hẻoofgaia root files. Tu Tiên production systems were not copied or modified.
- `projects/heoofgaia/HANDOFF_CREATE_STANDALONE_20261102.md` was absent at the pinned source SHA. The attached ZIP was treated as reference material only.
- Target `vuanhtuan161094-byte/Heoofgaia` has no configured local remote. GitHub API lookup returned 404; this can mean absent or inaccessible. The Windows `gh` executable is missing, and the connected GitHub tools do not expose repository creation. A browser-session inventory was attempted through Computer Use but the user stopped it with Escape before the app list returned; no UI action, repository creation or login was completed. No repository was created or pushed, no email was sent, and no login flow was run. **Private repo creation/push: BLOCKED.** Do not modify or merge to the Tu Tiên repository or its `main` branch.

## HG-07 baseline audit — PASS before HG-08 changes

- JavaScript syntax: PASS on the then-current 8 source files.
- `node qa-engine.cjs`: 37/37 PASS.
- `.venv\Scripts\python.exe build_offline.py`: PASS; 123,427-character offline HTML.
- `.venv\Scripts\python.exe qa-browser.py`: 31/31 PASS, zero JavaScript errors.
- `.venv\Scripts\python.exe qa-file-browser.py`: 9/9 PASS, Chromium `file://`, v06 persistence and separate-process restart.
- Receipts: `docs/evidence/hg07-baseline/`.
- Original-client side-by-side and physical Android QA: NOT TESTED.

## HG-08 — IN PROGRESS; partial vertical slice

- Save schema v07 and v06→v07 migration; hero XP/levels/attribute points and command capacity; Castellan XP from completed troop queues; faction-specific building lists; one saveable Castle Spell research queue; real troop recruitment and visible prerequisite locks.
- Human T1/T3–T10 requirements are from dated Chinese 2009/2010 guides. Human Scout uses SRC27 Barracks 2 + Scouting 1 but remains partial because its Town Hall gate is unverified. Scouting gates for other tier-2 scout roles are cross-version-derived.
- Undead troop training correctly uses the Graveyard; legacy Undead saves copy the prior Barracks level to Graveyard when the new field is missing. Dated 2009 Sina guides identify Graveyard as the Undead recruit building and Dark Hall/Soul Tower as requirements for broad troop classes. Exact per-unit numeric gates for the remaining non-Human units were not recovered.
- Elf/Orc Barracks and Undead Graveyard levels generally use catalog tier as an explicitly labelled **P / PROVISIONAL MODEL** proxy. Two exceptions are confidence C: Elf Centaur uses SRC28 Barracks 1, and Orc Thunderbird uses SRC26 Barracks 7, Beast Pen 4, Blacksmith 4 and training technology 6 (Chinese-to-English Bootcamp mapping derived). Exact support-building gates for remaining units are unapplied.
- Tavern slot milestones and some hero quality bands are sourced; exact full candidate distributions and rare-stat odds remain missing. No original-client asset with release rights has been added; current art is procedurally drawn.
- SRC29 recovery: the Chinese 2009 guide gives 60–80% wounded, 1/7 unit-value gold, and about 3/5 troop-training speed. The build uses a disclosed fixed 75% midpoint and a persisted single-group Arena queue; exact wound distribution and queue concurrency remain unknown. Queue price, timed completion, insufficient-funds rejection, and v07 save/reload are tested.
- SRC30 Reincarnation: a living community wiki records 1% healing-time reduction per skill level before Tower of Babel when a defending hero has the skill; exact historical revision/build and original-client behavior are unknown (C). An Undead Castellan can research/equip this passive; Arena snapshots its skill level into each new queue. Research cost/time are simulated.
- Research: `docs/research/HG08-EVIDENCE-REGISTER.md`, `docs/research/HG08-TROOP-UNLOCK-MATRIX.md`, `docs/RESEARCH-HEROES-OF-GAIA-2009.md`.
- New HG-09 calibration: the community-reported 500-Priest NPC example computes to 47,897.94 and reports 47,897 in-game. Stack damage now truncates for that observed NPC result; this is one C-confidence sample, not proof of general or PvP parity. Evidence and exact regression: `docs/research/HG09-COMBAT-EVIDENCE.md`, `docs/evidence/hg09/QA-HG09-NODE-RESULTS.json`.

## HG-09 — IN PROGRESS; tested tactical combat slice

- Source-backed equal-speed initiative: speed descending, then battlefield position left-to-right/top-to-bottom following the dated 2009 Chinese guide. Executed order is stored and visible.
- Automatic targeting now combines SRC23's 2009 Chinese description of enemy AI choosing the force judged to have highest military power with the Fandom Newbie Guide's distinction: melee pursues the threatening stack in the closest general range; ranged attacks the strongest stack.
- Local targeting model is explicit: melee first selects by nearest Manhattan distance, then modeled power (unit ATK × living count); ranged selects highest modeled power across the board. Stable ID breaks ties. The original score formula and melee range grouping are not published, so this remains a simulated policy, not recovered server code.
- Manual Focus overrides automatic choice. Attack, Stand By, Focus, Retreat, spells, equipment, casualty/Arena ledger, and save-mid-battle remain playable. AI choices are persisted for the last turn and shown in combat.
- The Fandom survey found the community NPC damage formula and one reported 47,897.95 → 47,897 observation; it explicitly says the PvP formula is unresolved. This sample remains a calibration fixture only.
- Arena recovery uses dated SRC29 cost/rate in a persistent timed queue. The 75% wounded share is the disclosed midpoint of the cited 60–80% range; distribution and queue concurrency remain modeled. Undead Castellan Reincarnation reduces a new queue by 1% per level per the pre-Babel community note (C).
- Morale, exact reach, target score/range, NPC composition, full damage modifiers, battle clock and complete rewards remain partial or simulated. Fandom special modes and later Guild/Babel/Blood Fort systems are kept out of the 2009 baseline.

## Current verification on functional SHA a3c1b9b885f526761de167a958855815133dba0e

- node qa-engine.cjs: **76/76 PASS**; HG-09-specific subset **13/13 PASS**, including melee nearest-group choice, ranged strongest-target choice, Arena price/time/save/resume, migration, one NPC damage observation, and 1,000 deterministic seeded encounters.
- node --check on all 9 source JavaScript files: **PASS**.
- .venv\Scripts\python.exe build_offline.py: **PASS**, generated Play-Heoofgaia-HG08.html (151,931 characters).
- .venv\Scripts\python.exe qa-browser.py: **65/65 PASS**, zero page errors, installed Google Chrome; HG-09 subset **14/14 PASS** including actual march-to-battle, player Attack, enemy melee AI, ranged AI, Arena treatment and Reincarnation.
- .venv\Scripts\python.exe qa-file-browser.py: **12/12 PASS**, actual Chromium file:// launch, v07 save/reload, Arena recovery persistence and separate Chrome process restart.
- git diff --check: **PASS** after the checkpoint documentation edit.
- Receipts: docs/evidence/hg08/QA-RC1-RESULTS.json, docs/evidence/hg09/QA-HG09-NODE-RESULTS.json, docs/evidence/hg09/QA-HG09-BROWSER-RESULTS.json, docs/evidence/hg08/file-launch-persistence.json.

## Actual gameplay evidence and comparison limits

- docs/evidence/hg08/screenshot-undead-graveyard-desktop.png and screenshot-undead-recruitment-queue-desktop.png show the actual Chrome Undead recruitment page before and after enqueueing three Skeleton Warriors. The Orc Thunderbird, Human Scout and troop-unlock screenshots record source confidence and real prerequisite locks.
- docs/evidence/hg09/screenshot-combat-desktop.png and screenshot-combat-after-turn-desktop.png show the actual Chrome battle before and after an Attack action; enemy HP and turn state change in the running game.
- docs/evidence/hg09/screenshot-ai-target-priority-desktop.png shows the controlled melee AI case; the nearby stronger group remains alive and the target decision appears in the battle log.
- docs/evidence/hg09/screenshot-ai-ranged-target-priority-desktop.png shows the controlled ranged case; the ranged group fires at the stronger distant enemy and the result appears in the battle log.
- docs/evidence/hg09/screenshot-arena-treatment-queue-desktop.png and screenshot-undead-reincarnation-arena-desktop.png show actual Arena queue transactions and the Castellan skill's timer effect.
- docs/evidence/hg08/screenshot-file-arena-queue-1280x720.png is captured from actual Chromium file:// use with an active treatment queue; the offline test reloads it in a second browser process.
- Research index and scope statement for the Fandom pages: docs/research/FANDOM-WIKI-SURVEY-20261102.md. Its landing page reported 608 articles, but AllPages/category endpoints were blocked by the available retrieval interface; the survey covers the main mechanics families, not all 608 articles.
- Public GitHub repository/code-index searches found no clearly authorized original client or asset repository. Search results advertising a database leak were excluded without opening download links or retrieving records; the asset dossier records the search scope.
- Original client/runtime was not available for pixel-level side-by-side comparison. These are screenshots of the reconstruction, not the original. Visual resemblance and gameplay parity remain **NOT TESTED/BLOCKED**; no 1:1 claim is made. Physical Android/Windows-device acceptance: NOT TESTED.

## Remaining scope and next actions

1. Continue HG-08 source research for exact per-unit non-Human prerequisites and Tavern candidate distributions. Keep the provisional tier proxies visible and avoid adding unsupported gates.
2. Complete and regression-test source-supported HG-08 systems and old-save fixtures before declaring HG-08 complete.
3. Continue HG-09 against dated regional sources and accessible client observations for numeric range, target score, damage modifiers, morale, reward/XP and encounter timers. Original-client visual comparison remains blocked until a lawful runnable reference is available.
4. Then implement HG-10 world/economy, HG-11 original-era art/UI fidelity, HG-12 release packaging/physical acceptance and HG-13 optional server. All remain incomplete.
5. The standalone local working branch is feature/heoofgaia-hg08-20261102. No remote is configured; private repo creation/push remains BLOCKED because gh is absent and the connected GitHub tools do not provide create-repository. Do not modify or merge into the Tu Tiên repository or main.
6. Continue the broad multilingual archival and asset-provenance search. The scoped Fandom survey is not evidence that all 608 articles were read.
