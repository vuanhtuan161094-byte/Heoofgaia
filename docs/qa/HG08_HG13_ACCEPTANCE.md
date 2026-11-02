# HG-07 through HG-13 acceptance and evidence

As of: 2026-11-02
Working tree: E:\Heoofgaia
Active branch: feature/hog1-research-to-playable-20261102
Contract: docs/CODEX_MASTER_EXECUTION_PLAN_20261102.md
Product claim: independent offline reconstruction in progress; no 1:1 claim.

## Stage status

| Stage | Status | Accepted evidence | Open acceptance work |
|---|---|---|---|
| HG-07 | PASS — historical HG-07 and current checkout audited | Historical HG-07-only baseline: 37/37 Node, 31/31 browser, 9/9 file:// checks. Separate pre-change cumulative HG-07–HG-09 checkout baseline: 79/79 Node, 9/9 JS syntax, offline build 152,097 characters, Chrome 71/71, file:// 12/12. Receipts: docs/qa/baseline-20261102/, docs/qa/BASELINE_PASS_FAIL.md and docs/evidence/hg07-baseline/. Fresh combined regression includes HG-07 guards. | Original-client comparison, Android and remote publication not verified. |
| HG-08 | IN PROGRESS — tested economy/progression slice added | Human unit requirements and partial faction proxies; real queues, hero XP, Tavern and research; Fame mine cap and source-backed yield; v07 unchanged. Latest integrated run: 88/88 Node, 9/9 JS syntax, 88/88 Chrome, 22/22 Chromium file://, HTML build 162,107 characters; troop, garrison and return state persist under v07. Raw logs under docs/qa/hg08-fame-cap-20261102/. | 28 non-Human gates remain provisional/incomplete; exact Tavern odds/rates, spell/research economy, regional patches and original UI/data parity remain open. |
| HG-09 | IN PROGRESS — combat slice works | Seven-slot formations, manual Attack/Advance/Stand By/Focus/Retreat, initiative, modeled targeting, casualty/Arena, battle save-resume and 1,000 seeded deterministic encounters; current full regression. | Damage formula, exact range/movement/clock, morale, enemy compositions, rewards and original battle parity are partial/simulated. |
| HG-10 | IN PROGRESS — mine garrison/recall vertical slice PASS | 28×18 generated map, pathfinding, AP-priced march, troops removed from city pool, real tactical battle, mine ownership and output, hero garrison, manual Recall/return route, Save/Load and old v07 migration. Chrome and offline file:// run the natural starter battle. | Multiple cities, fog/scouting, portals, historical world dimensions/timing, mine spell interactions, offline catch-up, tile ownership conflict and original-client parity. |
| HG-11 | BLOCKED on original visual oracle; prototype UI exists | Current Chrome screenshots show the running app and project-authored procedural visuals. | Original client is not recovered; race-specific 2.5D buildings, troop sprites, animation, art comparison and licenses are outstanding. |
| HG-12 | IN PROGRESS — offline prototype is reproducible | Offline HTML build; Chrome launch; file:// save/reload and fresh-process persistence; JSON export/import; QA receipts. | Installer/package polish, browser/OS coverage, performance, accessibility, physical device acceptance and owner-ready release validation. |
| HG-13 | NOT STARTED — online services absent | Offline single-player architecture is explicit. | Server/auth, persistence, synchronization, guild/PvP/chat/mail, security and integration QA. |

## Tested HG-08 slice

The 2009-12-27 17173 Chinese player guide documents five starting mines and the Fame-rank limit table, including a top cap of 20 from Fame 300,000. It lists raw per-mine yields: Gold 200/hour, Wood/Ore 40/hour, Sulfur/Crystal 20/hour. The publisher-hosted 2010 Lequ copy repeats broad statements but is near-verbatim, not independent evidence. These are confidence-B Chinese-edition guide rules; English/EU parity is unverified.

Implementation:
- A new mine march is rejected at the Fame cap before AP is spent. Mine capture still uses the battle settlement path and persists under v07.
- Owned mines add source-listed fixed hourly output. Tile level does not multiply output because the guide does not document that.
- Income is derived from the persisted mine list during the normal economy tick. A one-game-hour tick test proves each mine yield is credited, then continues after v07 Save/Load. Save key/schema did not change.
- Castle Spell multipliers on mine output remain unverified.

### Screenshot/test fixture disclosure

qa-browser.py runs the actual application in installed Chrome and clicks the real disabled/enabled March control. To reach otherwise long-lived progression states quickly, it seeds a controlled state with five captured mines, then raises Fame to 2,200. Screenshots show the live renderer/action against that fixture; they do not claim a new player earned that progression naturally. Engine tests separately cover Fame boundaries, no-spend rejection, mine settlement fields and v07 reload. Screenshots are runtime captures, not fabricated/composited.

- Full-cap desktop: docs/evidence/hg08/screenshot-fame-mine-cap-full-desktop.png
- Unlocked march desktop: docs/evidence/hg08/screenshot-fame-mine-cap-unlocked-march-desktop.png
- HTML SHA-256: CB8421970375D6485D057A6D58441522AB1CC80344A9A16F1E86F7E043680AA4
- Built artifact: Play-Heoofgaia-HG08.html, 153,333 characters and 160,095 bytes
- Test receipts: docs/qa/hg08-fame-cap-20261102/

## Latest HG-10 tested vertical slice — 2026-11-02

SRC40 (17173, 2009-10-25) explicitly says a hero remains stationed after occupying a new city/resource point and must be sent back to the original city with Return. This slice implements that behavior for captured mines. Troops are deducted from the castle pool at departure and held in a separate expedition ledger; surviving troops return once after the saved journey. Mine ownership/income remains after Recall. Automatic return after non-mine wins and Recall AP cost are still model choices because SRC40 does not settle those details.

- Node: **86/86 PASS**; all 9 runtime JS syntax checks PASS.
- Installed Chrome: **88/88 PASS**, zero page errors.
- Chromium `file://`: **22/22 PASS**, including a full natural starter-army mine battle, mine garrison, Recall, Save/Load on both journeys and troop merge at arrival.
- HTML: 161,989 characters / 169,214 bytes; SHA-256 8A4BB38F16FB45776DAA8722F6FEBCEFFD528BA60FA0222D0D3F5E36B4B28A47.
- Actual runtime captures: `docs/evidence/hg08/screenshot-file-mine-garrison-1280x720.png`, `screenshot-file-hero-return-1280x720.png`, and `docs/evidence/hg09/screenshot-mine-garrison-desktop.png`, `screenshot-hero-recall-march-desktop.png`. I visually checked the offline garrison and return captures.
- Save format remains v07. Legacy v07 outbound-march and mid-battle saves without new fields migrate deployed troops into the expedition ledger without dropping city reserves; regression verifies migration. A defeat with all troops lost now saves the hero-only return route. No save key/schema bump.

## Pre-change HG-07 baseline

The pre-change baseline ran before source edits in this continuation on the cumulative HG-07–HG-09 candidate tree: 79/79 Node, 9/9 JS syntax, 152,097-character offline build, Chrome 71/71 and Chromium file:// 12/12. Detailed stdout/exit receipts are under docs/qa/baseline-20261102/. Separately, the historical HG-07-only baseline was 37/37 Node, 31/31 browser and 9/9 file launch; evidence is under docs/evidence/hg07-baseline/. Fresh post-slice tests do not replace either baseline.

## Source, rights and repository status

- E:\Heoofgaia already exists as a local standalone Git checkout. The active feature branch has no Git remote.
- GitHub lookup for vuanhtuan161094-byte/Heoofgaia returned 404 and authenticated owner listing did not show it. This may mean absent or inaccessible. Connected GitHub tools expose no repository creation, and gh is unavailable. Private repo creation/push is BLOCKED; no push occurred.
- The source Tu Tiên repository and main were not modified. Work is isolated on the feature branch.
- Original HOG1 client/server/assets are NOT RECOVERED. See docs/research/HOG1_SOURCE_AUDIT.md.
- Fandom coverage is PARTIAL; about 608 articles are indexed, but this project has not reviewed all of them. See docs/research/FANDOM-WIKI-SURVEY-20261102.md.

## Next work

1. Continue HG-08 data gaps for non-Human troop gates and Tavern odds using dated sources; continue HG-09 combat calibration. For HG-10, implement the next evidenced world-system slice (multi-city, ownership/fog or offline time) without assuming return travel rules.
2. Continue HG-09 combat parity with additional version-matched examples; label modeled formulas.
3. Progress HG-10 multi-city/world logistics after single-city save/recovery is stable.
4. Build HG-11 race-specific visuals with original authored/licensed assets; compare to original references when available.
5. Complete HG-12 packaging and device acceptance. Start HG-13 only after offline stability and backend design.
