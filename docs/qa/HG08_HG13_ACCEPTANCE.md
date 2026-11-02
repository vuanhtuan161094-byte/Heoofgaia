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
| HG-08 | IN PROGRESS — tested economy/progression slice added | Human unit requirements and partial faction proxies; real queues, hero XP, Tavern and research; Fame mine cap/yield and SRC20 Fame-ranked hero cap; v07 unchanged. Latest integrated run: 100/100 Node, hero-cap Chrome 6/6, faction city Chrome 48/48, PNG QA 4/4. | 28 non-Human gates remain provisional/incomplete; exact Tavern odds/rates, spell/research economy, regional patches and original UI/data parity remain open. |
| HG-09 | IN PROGRESS — combat slice works | Seven-slot formations, manual Attack/Advance/Stand By/Focus/Retreat, initiative, modeled targeting, casualty/Arena, battle save-resume and 1,000 seeded deterministic encounters; current full regression. | Damage formula, exact range/movement/clock, morale, enemy compositions, rewards and original battle parity are partial/simulated. |
| HG-10 | IN PROGRESS — multi-city capture/switch/offline queues PASS | 28×18 map; Fame-gated neutral-castle capture through actual tactical combat; separate race/local resource/building/army/research/training state; inactive-city production/queues; main-city-only tasks; hero station/return to recorded departure city; strict v07 Save/Load migration. Node 94/94; Chrome CDP 13/13; actual file:// reload shown in `docs/evidence/hg10/`. | Fog/scouting, portals, three simultaneous heroes, same-race cross-castle training reduction reported on mixed-edition Fandom, PvP seizure/abandonment, exact capture AP/initial city stock, visual parity and original-client comparison. |
| HG-11 | PARTIAL — four modern faction city scenes integrated; original visual oracle still blocked | Original generated Human/Elf/Orc/Undead city paintings at 1176×560, four actual Chrome file:// captures, per-faction 12/12 live building hotspots and a construction queue. Receipt: `docs/qa/hg11/chrome-visual-smoke.json` (36/36 PASS). | These flattened generated scenes are not original art. World/battle art, independent building/troop sprites, animations, UI parity and side-by-side match to a recovered original client are still missing/not tested. |
| HG-12 | IN PROGRESS — offline prototype is reproducible | Offline HTML build; Chrome launch; file:// save/reload and fresh-process persistence; JSON export/import; QA receipts. | Installer/package polish, browser/OS coverage, performance, accessibility, physical device acceptance and owner-ready release validation. |
| HG-13 | NOT STARTED — online services absent | Offline single-player architecture is explicit. | Server/auth, persistence, synchronization, guild/PvP/chat/mail, security and integration QA. |

## Tested HG-08 slice

### Fame-ranked hero roster cap — SRC20 (2009-12-27)

The dated Chinese guide's rank table (SRC20, source page rows 243–264; source register R28) lists the account-wide hero limit from 2 at the starting ranks to 18 at Fame 1,000,000. HG-08 now derives the cap from the saved Fame value and enforces it in the recruitment engine before spending gold or consuming a Tavern offer. The hero screen reports current roster/cap and disables the remaining hire button at the limit. This is a Chinese-edition guide rule; English/EU parity is unknown.

No schema/key bump: the game still saves under `heoofgaia_hg_only_v07`. Existing v07 rosters above a lower current Fame cap are retained and load/save normally; only additional hires are rejected. The offer price and generated candidate remain modeled.

Acceptance: Node boundary/transaction/migration tests cover all Fame thresholds and a legacy over-cap save. Real Chrome `file://` UI test runs the actual Tavern hire handler twice in a seeded Fame 2,200/Tavern 2 fixture, checks hero count, offer count, gold, the disabled final offer, and legacy save key. Screenshot: `docs/evidence/hg08/hero-roster-cap-chrome.png`; machine report: `docs/qa/hg08/hero-roster-cap-chrome.json`. The fixture accelerates progression; the displayed capture is from the running game, not an edited image.

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


## Latest HG-10 multi-city vertical slice — 2026-11-02

The chosen profile follows the later dated Chinese 2009 rank table: Fame 5,800 permits a second castle, 80,000 a third, 300,000 a fourth, 700,000 a fifth, and 1,000,000 a sixth. The October 16 guide instead says the first secondary castle unlocks at Fame 8,000; the living Fandom Castles page says 22,000 for two. HG-10 exposes this patch/edition conflict and uses the December 2009 Chinese table. English/EU parity is unverified.

- Gameplay implemented: five neutral castles across the four races; castle occupation uses a real march and the normal tactical-battle engine. On victory, the hero and survivors remain stationed; the captured race gets its own resource store, buildings, troop pool, research, Tavern and queues. Switching is locked while a march/battle/return is unresolved. Production and all local queues progress while another city is open. Mines are credited only to the city that dispatched the army. Legacy v07 saves without city fields migrate to one main city; the key/schema remain v07.
- Historical behavior implemented: captured-race recruitment/research and main-city-only task claiming from SRC41. The 2009 guide's three simultaneous expedition limit is not implemented yet. SRC40 says return to the original main city; the current engine stores the departure-city identity and supports correct return for current main-to-secondary gameplay; dispatch from a secondary city remains an explicit unresolved behavior.
- Modeled because no source data was found: city capture AP price (8 AP), neutral city placement, captured-city building levels and empty starting stock. Fandom says same-race castles can cut unit training time, but the living article's build is undated; this remains a research/implementation candidate, not a 2009 rule.
- Fresh baseline before edits: Node **88/88 PASS**; offline builder **PASS** (161,989 characters). Python Playwright browser suite is **BLOCKED**: `ModuleNotFoundError: playwright`; Windows Computer Use also returned kernel `os error 3`. Independent installed-Google-Chrome CDP run after changes uses the local `file://` HTML and actual UI controls: **13/13 PASS**, 0 JavaScript exceptions. It wins the unchanged neutral-city combat, switches cities, saves and reloads. The QA fixture seeds Fame=5,800 and shortens only the travel timer after dispatch; player army, enemy composition, combat and UI buttons are real. It does not fabricate screenshots or change battle outcomes.
- Current integrated Node regression: **94/94 PASS**; runtime JS syntax **10/10 PASS**; Python QA scripts compile; offline artifact `Play-Heoofgaia-HG10.html` build PASS. Separate-process `file://` restart test is not run because Playwright is unavailable; same-process file reload is covered by Chrome smoke.
- Runtime screenshots: `docs/evidence/hg10/screenshot-hg10-offline-intro-chrome.png`, `screenshot-hg10-neutral-castle-battle-chrome.png`, `screenshot-hg10-secondary-city-chrome.png`. The city screenshot visibly proves distinct Elf castle state; the battle screenshot shows the actual 16-player / 8-defender battle before the first turn. Screens are captured by installed Chrome, not composed. They show project-authored prototype art and do **not** establish visual similarity to the original client.
- Fandom coverage remains **PARTIAL**, not a complete 608-page read. A second targeted pass expanded the survey with Castle UI/world-map layout, Heroes, Units/load, World Buildings, and race-page findings; direct page/category enumeration is still blocked. Survey details and mixed-edition caveats are in `docs/research/FANDOM-WIKI-SURVEY-20261102.md`.
- HOG1 original SWF/server/database/assets: **NOT RECOVERED**. Visual comparison to a trustworthy original 2009 screenshot remains **BLOCKED**. Do not claim 1:1.

- Visual oracle follow-up: SRC42's contemporary 2009 review and Sina screenshot describe/show scenic 2D terrain, a castle, a hero, resource HUD and minimap. The current app still uses flat geometric prototype art and is visibly far from that presentation. HG-11 visual work is a major missing area, not an accepted feature.
