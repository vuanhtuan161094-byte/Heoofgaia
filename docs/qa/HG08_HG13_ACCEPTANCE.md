# HG-07 through HG-13 acceptance and evidence

As of: 2026-11-03
Working tree: E:\Heoofgaia
Active branch: feature/hog1-research-to-playable-20261102
Contract: docs/CODEX_MASTER_EXECUTION_PLAN_20261102.md
Product claim: independent offline reconstruction in progress; no 1:1 claim.

## Stage status

| Stage | Status | Accepted evidence | Open acceptance work |
|---|---|---|---|
| HG-07 | PASS — historical HG-07 and current checkout audited | Historical HG-07-only baseline: 37/37 Node, 31/31 browser, 9/9 file:// checks. Separate pre-change cumulative HG-07–HG-09 checkout baseline: 79/79 Node, 9/9 JS syntax, offline build 152,097 characters, Chrome 71/71, file:// 12/12. Standalone private repo and feature-branch push are verified. | Original-client comparison, Android and release package acceptance remain open. |
| HG-08 | IN PROGRESS — source-based Fame progression expanded | Human source gates; Elf/Orc B* derived Barracks tiers; Undead Graveyard progression B* derived from qualitative evidence; real recruitment/research queues, hero XP, Tavern and v07 persistence; SRC20 Fame progression; SRC03 Hero Tower 8 / Tavern 10 chain. Undead “Clean Up Remnants” is playable through a real 3★ battle and one-time unit/Gold/AP claim; exact task values use the mixed-edition Fandom table, while SRC61 only corroborates a daily tier-8 ranged-unit reward in 2009. China 2009 daily tasks now reset at Fame rank promotion per SRC61; a real 1★ victory crossed 199→209 and reset the board. Current regression: Node 154/154; integrated Chrome 96/96; `file://` 30/30; China Fame-reset Chrome 13/13, Chinese task recruitment 12/12, Undead daily task 15/15; focused Elf Scout 20/20, Human 16/16, Undead 16/16; Tavern L10 8/8, L6–L9 9/9 and gates 10/10; zero page/JS errors. | Exact Undead tier mapping and faction support gates, exact Tavern server odds, spell/research economy, regional parity and original data/UI parity remain open. |
| HG-09 | IN PROGRESS — tactical combat gains player-controlled cell movement | Seven-slot formations; real Attack/Advance/Stand By/Focus/Retreat plus click-to-move; initiative, modeled targeting, casualty/Arena, battle Save/Reload and 1,000 seeded deterministic encounters. The selected stack traverses a legal shortest path, rejects occupied/off-grid cells atomically, spends its own action, and persists position/receipt in v07. Current Node 154/154; integrated Chrome 96/96; file:// 30/30; focused real movement battle 8/8; zero browser errors. | Numeric range, direct-cell control parity, distance/threshold, complete skills, damage calibration, morale, enemy rosters/rewards and original-client comparison remain partial/simulated. SPD ≥7 movement is an Advance-derived local model, not historical proof. |
| HG-10 | IN PROGRESS — three-hero dispatch and daily visitables work; broader world systems partial | 100×100 world; Fame-gated neutral-castle capture; separate race/city resources, buildings, armies and queues; inactive-city production; modeled 24-hour catch-up; three outbound expeditions; ten visitables; strict v07 Save/Load. Current cumulative Node is 154/154; integrated Chrome 96/96; local `file://` 30/30. | Fog/scouting, simultaneous battles, PvP, same-race cross-city training, exact capture AP/initial stock, original art/client and unverified offline/reset models remain open. |
| HG-11 | PARTIAL — four modern faction city scenes and five troop sprites integrated; original visual oracle still blocked | Original generated Human/Elf/Orc/Undead city paintings at 1176×560, four actual Chrome file:// captures, per-faction 12/12 live building hotspots and a construction queue. Recreated Orc Imp, Elf Centaur, Elf Scout, Human Archer and Undead Skeleton Warrior sprites are embedded in the offline HTML and verified in NPC battles. Elf Scout passes actual Magic Tower Scouting research, recruitment queue, formation, map-click March, natural NPC battle, renderer draw and v07 Save/Reload. Current Node regression 154/154; integrated Chrome 96/96; file:// 30/30. | Only 5/40 troops have new static illustrations; animations, other troop art, world/battle scene art, UI parity and side-by-side comparison to a recovered original client remain missing/not verified. |
| HG-12 | IN PROGRESS — offline prototype is reproducible | Offline HTML build; Chrome launch; file:// save/reload and fresh-process persistence; JSON export/import; QA receipts. | Installer/package polish, browser/OS coverage, performance, accessibility, physical device acceptance and owner-ready release validation. |
| HG-13 | NOT STARTED — online services absent | Offline single-player architecture is explicit. | Server/auth, persistence, synchronization, guild/PvP/chat/mail, security and integration QA. |

## Latest HG-09 battlefield cell-movement slice — 2026-11-03

Implementation/evidence commit a629aa1e222bbe99d2d2703fa7acb0bb20ae81f3 was pushed to feature/hog1-research-to-playable-20261102.

The actual installed Chrome file:// game now supports selecting an allied stack, arming ĐẶT ĐIỂM ĐẾN, and clicking an empty battlefield cell. The engine checks the legal path and occupancy before changing state, spends only that stack's movement action, resolves the other initiative actors, and persists position and movement receipt without a save-version change. The focused battle used real March/travel and real attacks before and after v07 Save/Reload; no battle result was injected.

Node 154/154 PASS; integrated installed Chrome 96/96 PASS, zero JS exceptions; standalone file:// 30/30 PASS, zero page errors; focused installed-Chrome battle 8/8 PASS. Offline builds matched at 11,044,257 bytes, SHA-256 9D235765390D3E3768300EC1A93295CB7285AF9E28CB4C27537C8C37675DD0DD. Actual screenshot: docs/evidence/hg09/manual-battle-move-chrome.png (1440×1362, SHA-256 4A1D186831EEF80B292F164C985E40208D472A5F4FA26A1FF6F6447A085D83FC).

The exact board, arbitrary cell command, and SPD ≥7 two-cell allowance are SIMULATED; no reviewed historical source verifies them. HG-09 stays IN PROGRESS. HG-11 animation remains BLOCKED because the available pipeline has no image-to-video tool; no unrelated stills were mislabeled as animation.

## Latest SRC61 China 2009 task refresh slice — 2026-11-03

The dated 17173 FAQ says a Fame-stage promotion refreshes all Daily Tasks. Runtime now applies that rule to the separate China 2009 task board; the rank thresholds are mapped from the later 2009-12-27 SRC20 table and are labeled a cross-date derivation. International community tasks remain separate. A live installed-Chrome playtest accepts the China task at test-fixture Fame 199, selects a real 1★ camp on the minimap, marches and wins with the real battle engine, and crosses to 209 Fame; that settlement immediately clears the accepted China task. It then checks 799 within-stage retention, the next reset at 800, and strict v07 Save/Reload. The fixture seeds only starting Fame; it does not inject victory or rewards. Server maintenance reset is reported by SRC61 but is not modeled in offline play.

Verification: Node **152/152 PASS**; integrated Chrome **93/93 PASS**, zero JS exceptions; independent-process offline `file://` **30/30 PASS**, zero page errors; focused Fame-reset Chrome **13/13 PASS**; original China task recruitment **12/12 PASS**; Undead daily task regression **15/15 PASS**. Actual screenshot: `docs/evidence/hg08/china-daily-task-fame-reset-chrome.png`; receipt: `docs/qa/hg08/china-daily-task-fame-reset-chrome.json`. This validates the reconstruction's behavior, not original-client parity.

## Latest HG-08 Undead daily reward slice — 2026-11-03

The installed Chrome test plays an Undead “Clean Up Remnants” task end to end: accept at 2,200 Fame, select a dated 3★ NPC from the real world map, dispatch through March, win via the tactical Attack controls, claim 800 Gold / up to 9 AP / one Lich King, then reload the v07 save. Its fixture only seeds Fame and seven Lich Kings to avoid grinding; the real UI, march, battle, objective, reward transaction, exact-once guard and save path are exercised. Focused Chrome: **15/15 PASS**, no JavaScript exceptions. Current cumulative Node regression: **150/150 PASS**; integrated browser: **93/93 PASS**; standalone `file://`: **30/30 PASS**.

Evidence must not be over-read: the 2009 17173 FAQ reports one tier-8 ranged unit per day for an Undead daily task but omits its identity and exact rules. The objective, Fame gate and bundle above come from the living mixed-edition Fandom page (confidence C); the 3★ enemy roster is also modeled. This slice is not proof of 2009 server parity. Actual Chrome captures and machine receipt: `docs/evidence/hg08/undead-daily-lichking-3star-battle-chrome.png`, `docs/evidence/hg08/undead-daily-lichking-claimed-chrome.png`, and `docs/qa/hg08/undead-daily-lichking-chrome.json`.

## Latest HG-09 Hero SPD march slice — 2026-11-03

SRC20 (17173, 2009-12-27) prints `base unit speed + (Hero SPD - 10)/50`; SRC58 (Sina, 2009-08-24) independently says each Hero SPD point adds 0.02 army speed. SRC42 says march time depends on distance but supplies no numeric land-march coefficient. Combat now uses one shared `+0.02 per Hero SPD point` helper. Overland travel derives a normalized factor `1 + (Hero SPD - 10)/50`, reusing the combat increment as a proxy; its 20-second launch, 19 seconds per path edge and 40-second floor remain simulated. This is not claimed as the original march formula.

Outbound and return ETAs both include current equipment and temporary world SPD buffs. A live Prayer Temple visit (+10%) and actual March-button dispatch in installed Chrome changed a source-listed route of 118 edges from 2,406 to 2,371 game seconds. The actual browser Save/Reload kept the v07 trip's fixed total ETA and active buff. Existing save key/schema and saved underway ETAs are unchanged.

`node qa-engine.cjs`: **140/140 PASS**. Integrated installed Chrome `qa-browser.py`: **91/91 PASS**, zero page errors. Installed Chrome local `file://` `qa-file-browser.py`: **29/29 PASS**, zero page errors. Focused real Chrome march flow `qa-hg09-march-speed-chrome.py`: **8/8 PASS**, zero JS exceptions. Receipt: `docs/qa/hg09/hero-spd-march-chrome.json`; real game screenshot: `docs/evidence/hg09/hero-spd-march-live-chrome.png`. Node receipt: `docs/evidence/hg09/QA-HG09-NODE-RESULTS.json`.

## Latest HG-09 regional combat spell slice — 2026-11-03

SRC57 records four Sina faction skill tables dated 2009-08-24. A new game can retain either the International/Fandom skill set or a separate China 2009/Sina active-stat subset. The saved China profile applies source-listed modifiers to live battle stacks. Orc Harden Bones is 2%/level in this dated China profile and 3%/level in the International profile; Undead Curse is -2% vs. -1%. Human all-unit defense is +5%/level in the China profile. This keeps the edition difference visible instead of blending the data.

`node qa-engine.cjs`: 137/137 PASS. `.venv\Scripts\python.exe qa-browser.py`: 91/91 PASS, zero JS exceptions. `.venv\Scripts\python.exe qa-file-browser.py`: 29/29 PASS, zero page errors. `.venv\Scripts\python.exe qa-spell-edition-chrome.py`: 8/8 PASS, zero JS errors. Real Chrome screenshots and SHA-256 receipts are under `docs/evidence/hg09/`; focused receipt is `docs/qa/hg09/china-2009-spell-profile-chrome.json`. Save key and schema stay v07; missing spellEdition in old saves defaults to International. Movement/passive spells are still missing, and duration/cooldown are models because SRC57 does not give them.

## Latest HG-11 unit-art integration — Orc Imp — 2026-11-03

The product is **Anh Hùng Thời Loạn**. To honor the requested modern finish while retaining HOG1's faction identity, one original text-generated, transparent Orc Imp illustration replaces the procedural geometric fallback for Orc tier-one `orc_1` only. The untouched generated master, prompt, runtime export, alpha measurements, pivots, hashes and project-use assessment are recorded in `assets/generated/hg11/units/asset-manifest.json`. No historical screenshot or extracted commercial art was used as generation input. This is one static recreated illustration; it does not provide animation or art parity for the other 39 troop identities.

- Node regression: **137/137 PASS**. Integrated Chrome UI: **91/91 PASS**, zero JavaScript exceptions. Installed Chrome `file://`: **29/29 PASS**, zero page errors. Focused offline Chrome edition/spell/sprite flow: **8/8 PASS**, zero JavaScript errors; it observes the actual image loaded and `drawImage` called in a live NPC battle, then validates spell casting and v07 Save/Reload.
- Actual installed-Chrome capture: `docs/evidence/hg09/china-2009-orc-harden-bones-combat-chrome.png`, 1440×1351, SHA-256 `03A76921C1908FE39B456ED80F043757B9AB590CEBDD7557FDE00AAEDB331A6A`. The image shows the generated Orc Imp on the battlefield. Receipt `docs/qa/hg09/china-2009-spell-profile-chrome.json` records `imageReady`, natural dimensions, draw count and screenshot hash.
- Offline playable HTML: `Play-Heoofgaia-HG11.html`, 10,236,142 bytes, SHA-256 `A5BF11AD0D73424A077646CABF36350511CE878D5F1AC48281D8A59BC615B645`. Displayed tab title and masthead are **Anh Hùng Thời Loạn**.
- Save key/schema remain v07. The sprite is a presentation-only addition and does not enter save data. Original art/client comparison is still unavailable. HG-11 stays **PARTIAL**; HG-08, HG-09, HG-10, HG-12 and HG-13 remain open as described above.

## Latest HG-11 unit-art integration — Elf Centaur — 2026-11-03

The visible game title and masthead use **Anh Hùng Thời Loạn**; Heroes of Gaia is shown as the historical reference. The project codename no longer appears in the visible masthead. A new independently generated Elf tier-1 Centaur is integrated for `elf_1`. Identity and printed statistics are grounded in SRC02 (dated 2009-12-06 community table); this is not an original client export. Raw master, cleaned master, alpha scan, runtime sprite, pivots, prompts, hashes and provenance are recorded in `assets/generated/hg11/units/elf-centaur-manifest.json`.

- Real Chromium `file://` flow: **12/12 PASS**, no JS errors. The browser starts an Elf kingdom, commits 16 Centaurs using the Army form, selects Wolves on the world canvas, dispatches through the March button, naturally opens the tactical NPC battle, draws the sprite to the real battle canvas, then confirms the live unit, formation and battle survive v07 Save/Reload.
- Cumulative verification on the same offline build: `node qa-engine.cjs` **145/145 PASS**, integrated Chrome `qa-browser.py` **93/93 PASS**, installed Chrome `file://` `qa-file-browser.py` **30/30 PASS**, focused Orc spell/sprite Chrome **8/8 PASS**, focused Elf battle Chrome **12/12 PASS**. Browser runs report zero JavaScript errors.
- Actual capture: `docs/evidence/hg11/elf-centaur-npc-battle-chrome.png`, **1440×1305**, SHA-256 **`D0737737119556B658BE08AF56EAD5607AA4C71E6BF90D79E93229CBA6076081`**. Receipt: `docs/qa/hg11/elf-centaur-battle-chrome.json`; it records the real UI march and one Centaur image draw in battle.
- This art addition leaves the v07 schema unchanged and is presentation-only. It is one static, independently generated still, not extracted commercial art or a claim of original visual parity. HG-11 remains **PARTIAL** with **3/40** troop identities illustrated; animation, the other 37 unit identities and the recovered-client comparison remain open.

## Latest HG-11 unit-art integration — Human Archer — 2026-11-03

The independently generated Human tier-3 Archer (`human_3`) is integrated into the live battle renderer and reproducible standalone HTML. Identity is attributed to SRC02's dated community roster; the sprite itself is `RECREATED`, not recovered original art. The raw master, cleaned master, alpha scan, pivot, hashes, prompt, source-tool ID and rights assessment are recorded in `assets/generated/hg11/units/human-archer-manifest.json` and `assets/generated/hg11/units/human-archer-contract.md`.

- Focused installed Chrome `file://` flow: **16/16 PASS**, zero JavaScript exceptions. It starts a Human kingdom, seeds only Hall/Barracks/Bootcamp/resources to skip long prerequisites, queues 16 Archers through the actual Recruit button, spends actual costs, completes the queue through the real engine tick, saves the formation through the Army UI, selects Wolves on the actual world canvas, dispatches with March, enters a natural NPC battle, draws the Archer, saves and reloads the v07 battle. Only the queue's remaining time is accelerated; no army or battle result is injected.
- Enemy horizontal flip: PASS in a separate renderer-only check on a cloned battle snapshot (`scales: [1,-1]`); it is not presented as gameplay evidence.
- Full regression: Node **147/147 PASS**, integrated Chrome **93/93 PASS** with zero JS exceptions, standalone `file://` Chrome **30/30 PASS** with zero page errors, generated city PNG QA **4/4 PASS**, focused Archer Chrome **16/16 PASS**. JavaScript syntax, Python source compilation, deterministic two-build SHA and `git diff --check` PASS.
- Offline game: `Play-Heoofgaia-HG11.html`, **10,660,718 bytes**, SHA-256 **`6D0D45B0BAF259F8A84A2676F94B3C5170FE09E8FE8E1ECAF429A39A20CE26C4`**; two consecutive builds matched.
- Actual Chrome screenshot: `docs/evidence/hg11/human-archer-npc-battle-chrome.png`, **1440×1305**, SHA-256 **`754331DC407C6FC99053FBFBEE5BA657298289BFB68A1F87D935D17358E48D1F`**. Receipt: `docs/qa/hg11/human-archer-battle-chrome.json`.
- Presentation-only change; save key/schema remain v07. This raises the art count to **3/40** static troop identities. HG-11 stays **PARTIAL**; animations, 37 troop identities, world/battle scene art, UI fidelity and the original-client comparison remain open.

## Latest HG-11 unit-art integration — Undead Skeleton Warrior — 2026-11-03

One independently generated Undead tier-1 Skeleton Warrior (`undead_1`) is integrated into the live battle renderer and offline builder. The historical identity is attributed to SRC02's dated community roster and cross-referenced to Chinese `骷髅兵` in SRC32. The image is tagged **RECREATED**; it is not recovered original game art. Master, cleaned master, alpha scan, prompt, runtime pivot and checksums: `assets/generated/hg11/units/undead-skeleton-manifest.json`.

- Actual installed Chrome `file://` flow: **16/16 PASS**, zero JavaScript exceptions. The UI recruits 16 Skeleton Warriors and spends resources; the engine queue completion adds them to the starting 16. The Army UI saves a group of 16; the player selects Wolves by clicking the world map, dispatches with March and enters a natural NPC battle. The sprite draws on the battle canvas and v07 Save/Reload preserves the battle and formation. Only queue time is accelerated through the actual engine tick; no army or battle result is injected.
- Enemy horizontal flip passes separately on a cloned battle snapshot (`[1,-1]` transforms); it is renderer-only QA and not gameplay evidence. The art is one still, with no animation frames.
- Combined regression: Node **148/148 PASS**; integrated Chrome **93/93 PASS**, zero JS exceptions; standalone `file://` Chrome **30/30 PASS**, zero page errors; focused Human Archer **16/16 PASS** and Skeleton Warrior **16/16 PASS**; generated city PNG QA **4/4 PASS**. Syntax, deterministic double build and `git diff --check` PASS.
- Combined offline artifact: `Play-Heoofgaia-HG11.html`, **10,882,016 bytes**, SHA-256 **`6002F355C38992D1DF27B0290151C97179DC4447BEB86EFFA3C7FF8E7F13E1DF`**.
- Actual Chrome screenshot: `docs/evidence/hg11/undead-skeleton-npc-battle-chrome.png`, **1440×1305**, SHA-256 **`7CA330DE35FE6F36397EB418D35E7112C270AB147DD790D700E1BE563DA6ADC4`**. Receipt: `docs/qa/hg11/undead-skeleton-battle-chrome.json`.
- HG-11 remains **PARTIAL**, with **4/40** static troop identities illustrated. Thirty-six troop identities, animation coverage, world/battle scene art, broader UI fidelity and the recovered-original visual oracle remain open; no 1:1 claim.

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


## Latest HG-10 multi-city vertical slice — 2026-11-03

The chosen profile follows the later dated Chinese 2009 rank table: Fame 5,800 permits a second castle, 80,000 a third, 300,000 a fourth, 700,000 a fifth, and 1,000,000 a sixth. The October 16 guide instead says the first secondary castle unlocks at Fame 8,000; the living Fandom Castles page says 22,000 for two. HG-10 exposes this patch/edition conflict and uses the December 2009 Chinese table. English/EU parity is unverified.

- Gameplay implemented: five neutral castles across the four races; castle occupation uses a real march and the normal tactical-battle engine. On victory, the hero and survivors remain stationed; the captured race gets its own resource store, buildings, troop pool, research, Tavern and queues. Switching is locked while a march/battle/return is unresolved. Production and all local queues progress while another city is open. Mines are credited only to the city that dispatched the army. Legacy v07 saves without city fields migrate to one main city; the key/schema remain v07.
- Historical behavior implemented: captured-race recruitment/research and main-city-only task claiming from SRC41; up to three concurrent outbound expeditions with a persisted queue/ledger. SRC40 says return to the original main city; the current engine stores the departure-city identity and supports return for current main-to-secondary gameplay; dispatch from a secondary city remains an explicit unresolved behavior.
- Modeled because no source data was found: city capture AP price (8 AP), neutral city placement, captured-city building levels and empty starting stock. Fandom says same-race castles can cut unit training time, but the living article's build is undated; this remains a research/implementation candidate, not a 2009 rule.
- Fresh baseline before edits: Node **88/88 PASS**; offline builder **PASS** (161,989 characters). Python Playwright browser suite is **BLOCKED**: `ModuleNotFoundError: playwright`; Windows Computer Use also returned kernel `os error 3`. Independent installed-Google-Chrome CDP run after changes uses the local `file://` HTML and actual UI controls: **13/13 PASS**, 0 JavaScript exceptions. It wins the unchanged neutral-city combat, switches cities, saves and reloads. The QA fixture seeds Fame=5,800 and shortens only the travel timer after dispatch; player army, enemy composition, combat and UI buttons are real. It does not fabricate screenshots or change battle outcomes.
- Current integrated Node regression: **94/94 PASS**; runtime JS syntax **10/10 PASS**; Python QA scripts compile; offline artifact `Play-Heoofgaia-HG10.html` build PASS. Separate-process `file://` restart test is not run because Playwright is unavailable; same-process file reload is covered by Chrome smoke.
- Runtime screenshots: `docs/evidence/hg10/screenshot-hg10-offline-intro-chrome.png`, `screenshot-hg10-neutral-castle-battle-chrome.png`, `screenshot-hg10-secondary-city-chrome.png`. The city screenshot visibly proves distinct Elf castle state; the battle screenshot shows the actual 16-player / 8-defender battle before the first turn. Screens are captured by installed Chrome, not composed. They show project-authored prototype art and do **not** establish visual similarity to the original client.
- Fandom coverage remains **PARTIAL**, not a complete 608-page read. A second targeted pass expanded the survey with Castle UI/world-map layout, Heroes, Units/load, World Buildings, and race-page findings; direct page/category enumeration is still blocked. Survey details and mixed-edition caveats are in `docs/research/FANDOM-WIKI-SURVEY-20261102.md`.
- HOG1 original SWF/server/database/assets: **NOT RECOVERED**. Visual comparison to a trustworthy original 2009 screenshot remains **BLOCKED**. Do not claim 1:1.

## HG-10 visitable world buildings — 2026-11-03

- Expanded the playable world to the guide's 0–99 coordinate space, rendered as a **100×100** map. Added ten source-listed visits: one Windmill, five Watermills, War Academy, Defense Tower, Book of Enlightenment and Prayer Temple. Source coordinates and rewards are transcribed as SRC43; SRC41 supplies the once-per-day rule.
- Windmill rolls Wood 400 / Ore 400 / Sulfur 200 / Crystal 200; each Watermill grants Gold 2,000. The four special buildings apply the visiting hero's +10% Attack, Defense, Knowledge or Speed for two game-hours. Attack/Defense alter combat, Speed alters combat and march calculations, and Knowledge enters the existing modeled Castellan-income formula for a hero appointed after visiting. The v07 key/schema is unchanged; visit locks and remaining buff time migrate/round-trip.
- Baseline before this slice: Node **108/108 PASS**. After changes: Node **113/113 PASS**. The integrated Chromium regression is **91/91 PASS**, zero JavaScript exceptions. Installed Chrome opened the actual standalone HTML over `file://`; real visit, reward, buff, daily lock and reload checks: **10/10 PASS**. Expedition/Save/Reload remains **25/25 PASS**. Receipts: `docs/evidence/hg08/QA-RC1-RESULTS.json` and `docs/qa/hg10/world-buildings-chrome.json` / `parallel-three-hero-chrome.json`.
- Standalone build: `Play-Heoofgaia-HG11.html`, 9,920,628 bytes, SHA-256 `6C1206C499ACF7BBA65375D60764D8EB5E854583BDC750619C55B21B15649654`. The current code-drawn building marks are new prototype symbols, not original HOG assets.
- Actual Chrome screenshot: `docs/evidence/hg10/world-buildings-chrome.png` (1440×1279; SHA-256 `091CC6B12F26DDF10504D7458ADC9A3A9854DD55BD1F19C58E842F8A8BFF05A3`); browser receipt `docs/qa/hg10/world-buildings-chrome.json` (SHA-256 `BC37BCFB999CD426EE3551957284342F893CD682C3052467C9BEAA5726157455`). The screenshot shows the live 100×100 world, selected/visited Watermill, actual resource state and the functioning world-building ledger.
- UTC midnight reset and immediate/no-AP/no-travel visitation are **MODELED**, because the dated guides give neither reset timezone nor travel/AP cost. The visit test uses current-date storage and v07 Save/Reload; original-client and English/EU parity are unverified. The world artwork remains visibly prototype-level. HG-10 is partial and this is not a 1:1 claim.

- Visual oracle follow-up: SRC42's contemporary 2009 review and Sina screenshot describe/show scenic 2D terrain, a castle, a hero, resource HUD and minimap. The current app still uses flat geometric prototype art and is visibly far from that presentation. HG-11 visual work is a major missing area, not an accepted feature.

## Latest HG-08 Fame-ranked AP slice — 2026-11-02

- Implemented all 15 AP maximum/recovery rows from SRC20 (17173, 2009-12-27, Fame-table rows 250–264). Fame sets the AP cap and per-hour recovery; reaching a new rank does not grant free AP.
- New games retain the prior prototype's 100 current AP while starting at Fame 5 and the documented 150 cap; the guide does not establish a new account's current AP amount. Old v07 saves keep their current AP and save key/schema; stale AP caps are recalculated from Fame during load/normalization.
- HUD shows AP current/max, AP per game hour and Fame remaining to the next cap. The runtime accrues continuously using the printed hourly rate; the source does not specify regeneration timer granularity or English/EU parity.
- Source ledger: `docs/research/HG08-EVIDENCE-REGISTER.md` R29; transcribed values in `docs/research/RESEARCH-HEROES-OF-GAIA-2009.md`. Confidence B for the dated Chinese player guide, not original server code/client observation.
- Baseline before code edits: Node 100/100 PASS. Post-edit: Node 103/103 PASS; Chrome `file://` AP and live Tavern roster flow 10/10 PASS; file-browser launch, persistent v07 Save/Load, mine selection/dispatch, battle, garrison and Recall 23/23 PASS; four-faction city Chrome 48/48 PASS; generated-scene PNG QA 4/4 PASS; JavaScript syntax 4/4 and Python QA compilation PASS; `git diff --check` PASS.
- Actual Chrome screenshot: `docs/evidence/hg08/fame-ap-progression-chrome.png`, with HUD showing 20/200 after a controlled one-hour in-game tick. Receipt: `docs/qa/hg08/fame-ap-progression-chrome.json`. It is a runtime screenshot of this reconstruction, not an original-client comparison.
- Offline artifact `Play-Heoofgaia-HG11.html`: 9,894,309 characters / 9,902,329 bytes; SHA-256 `18800693D9A93A134B1C7A75A1E841A709B17DAA216BE940CB212834DA359552`.
- Overall acceptance remains partial. HOG1 client/server/source art are not recovered; HG-08 still has 28 provisional non-Human gates; HG-09–12 remain incomplete and HG-13 is not started. No 1:1 claim. The repository has no configured remote, and private-repo push remains BLOCKED.

## HG-10 bounded offline catch-up — 2026-11-02

- Runtime policy: a suspended game processes at most **24 wall-clock hours** on the next tick. The limit is shared across the base engine and HG-05/06/08 wrappers so each queue sees the same elapsed time, then the selected 1×/60× speed converts it to game time. At 60×, a 24-hour absence advances 60 game-days. Wall time past the 24-hour budget is skipped when `lastTick` moves to now; no claim is made that the original service used this cap. See evidence register R30.
- Gameplay tested in real actions: paid Market construction, troop training, Bootcamp research and Arena treatment run concurrently through the same 24-hour tick; AP caps, hourly Tavern refresh and SRC20 mine yield update; active and inactive city construction/training queues complete. Repeating the same timestamp and loading the saved v07 state do not duplicate completion or rewards.
- Tests: Node **107/107 PASS**; Chrome HTML browser suite **91/91 PASS**, zero page exceptions; installed Chrome opening the actual offline file **29/29 PASS**, including Save/Reload in a new process. Existing four-faction city regression **48/48 PASS**; city PNG validation **4/4 PASS**; syntax/compile and `git diff --check` PASS.
- Actual file screenshot (1280×720): `docs/evidence/hg08/screenshot-file-offline-24h-market-complete-1280x720.png`; receipt: `docs/evidence/hg08/file-launch-persistence.json`. It is a Chrome capture of the offline HTML after a real Market queue completes, not an original-client comparison.
- Save format remains v07. HG-10 remains partial: fog/scouting, three simultaneous marches, siege/PvP and historical multi-region parity are open. The original client remains unrecovered; no 1:1 claim.


## Latest HG-08 Tavern terminal construction gate — 2026-11-03

SRC03 (English community building page revision 2009-12-09) explicitly lists Hero Tower L8 requiring Town Hall L7 and Tavern L10 requiring Hero Tower L8. SRC44 (17173, 2010-12-14) supports the qualitative Hero Tower→Tavern prerequisite and says Tavern level affects candidate count/quality, but gives no numbers or odds. Implementation bypasses the normal Town Hall cap only for those two source-listed terminal levels. No other building/Tavern levels are inferred from these pages.

- Actual Chrome `file://` UI: 10/10 PASS, zero JS errors. Covers Hero Tower lock below Town Hall 7, Tavern L10 lock below Hero Tower 8, real Hero Tower 8 and Tavern 10 construction queues, and v07 Save/Reload with the Tavern build queued.
- Offline HTML was rebuilt from editable source; current Chrome captured runtime screenshots `docs/evidence/hg08/hero-tower-8-locked-chrome.png`, `tavern-10-locked-chrome.png`, and `tavern-10-queue-chrome.png`. The browser fixture sets a late-game city/resource state, but the upgrade actions and construction queue use the live application/engine.
- Node regression: 114/114 PASS. Integrated installed-Chrome regression: 91/91 PASS, zero page exceptions. The fixture advances a short synthetic game-time interval to complete Hero Tower construction while keeping Save timestamps valid; it does not alter production queue mechanics.
- v07 version/key unchanged. English/international vs Chinese region parity is unverified; full Tavern odds and intermediate gates remain open. HG-08 stays IN PROGRESS; no 1:1 claim.

## HG-08 Hero Tower experience bonus — 2026-11-03

SRC03, the English Heroes of Gaia community building page revision 5 (last edited 2009-12-09), states that upgrading Hero Tower grants Heroes +1% experience per tower level. Runtime XP grants now add `base XP × current Hero Tower level / 100` before processing level thresholds. This applies at the active city where the XP event is settled. Fractional XP is retained because SRC03 does not specify rounding. SRC45 now supplies the NPC victory XP base for 4★–8★; the unsupported 1★–3★ and Castellan training bases remain simulated/community-derived. The v07 key/schema is unchanged, and XP survives Save/Reload.

- Node: **115/115 PASS**, including tower levels 0/1/5/10, exact multiplier, unchanged level thresholds at tower level 0, training completion and v07 round-trip.
- Installed Chrome `file://`: **7/7 PASS**, zero JS exceptions. The test appoints a Castellan, starts recruitment through the actual Army UI, advances the real training queue, confirms 137.5 XP from a 125 base reward at Tower 10, and reloads the v07 save.
- Existing regressions: integrated browser **91/91 PASS**; offline fresh-process Save/Reload **29/29 PASS**; Tavern gates **10/10 PASS**; four-faction city interaction/save flow **48/48 PASS**.
- Screenshot: `docs/evidence/hg08/hero-tower-xp-chrome.png`, SHA-256 `6883999520ef573c633ddd7b87aaa66fd31774e105bfa21ea9b683c5b95ae6ad`; machine receipt: `docs/qa/hg08/hero-tower-xp-chrome.json`.
- Test fixture seeds Town Hall and Hero Tower at level 10 to reach the effect immediately. The Castellan appointment, troop recruitment, training queue, XP award, Save and Reload are live game actions. This is not an original-client screenshot.

## HG-09 NPC battle experience — 2026-11-03

The 2009-09-21 Sina strategy guide reports NPC victory XP of 1,000 / 4,000 / 9,000 / 18,000 / 30,000 for four- through eight-star monsters. Runtime awards use these Chinese-guide values and apply the active Hero Tower bonus. XP for one- through three-star NPCs and mine/castle wins keeps the prior `30 × level` model. The source is player-authored and does not establish English/EU parity or the original server formula.

- Pre-change baseline: Node **115/115 PASS**, integrated installed-Chrome **91/91 PASS**, and fresh-process `file://` Save/Reload **29/29 PASS**. Post-change Node **117/117 PASS**; dedicated installed-Chrome battle scenario **8/8 PASS**, zero JS exceptions. Existing Hero Tower XP **7/7**, Tavern gate **10/10**, and world building **10/10** regressions also PASS.
- Browser fixture sets Hero Tower 10, level-50 hero stats, and 5,000 Archers to make the four-star target immediately testable. Live March, travel tick, four-star battle, Attack, XP award, browser Save/Reload all use game runtime/actions. It grants `1,000 × 1.10 = 1,100 EXP` and preserves v07.
- Actual Chrome screenshot from the standalone `file://` game: `docs/evidence/hg09/npc-four-star-xp-chrome.png`, SHA-256 `9A529F5A60580026560F8B199B91FEFCAA2CDC22B543EB47FEAD9CDDCB96AD54`. Machine report: `docs/qa/hg09/npc-four-star-xp-chrome.json`, **8/8 PASS**.
- Standalone HTML artifact: `Play-Heoofgaia-HG11.html`, 9,924,152 bytes, SHA-256 `612607FCF9E55344CE5CB81879D728FE596C98F1D0D61C1ADC8E1E60BA05FF37`. This screenshot is from the reconstruction, not the original game.
- HG-08 and HG-09 remain **IN PROGRESS**; HG-10 **PARTIAL**, HG-11 **PARTIAL**, HG-12 **IN PROGRESS**, HG-13 **NOT STARTED**. Missing 1★–3★ XP, non-NPC reward parity, full combat calibration and original-client visual comparison remain open.

HG-08 remains IN PROGRESS. The qualitative Undead Graveyard progression is source-backed, but exact level-to-tier mapping, racial support-building thresholds and Tavern distributions remain unresolved. No original-client or English/Chinese patch parity is claimed.

## Latest HG-08 Tavern L10 sampled-stat gameplay — 2026-11-03

SRC21 (living Fandom Hero quality page, exact revision/build date unknown) reports 6,708 sampled attributes: 4,350 white, 2,226 blue, 130 yellow, 2 green and no purple observations. Tavern L10 now draws each of four candidate stats from those observed category weights: white/blue 20–50, yellow 51–60, green 61–70. This is a community-sample model, **not verified original-server odds**. Name-color sample counts and all rare odds remain separate/unresolved; L6–L9 retains its explicit SRC48 qualitative model. No pricing, lower-level odds, save version or unrelated economy formula was changed.

- Node regression: **146/146 PASS**, including deterministic band boundaries, color mapping and v07 candidate-stat round-trip.
- Integrated Chrome: **93/93 PASS**; actual offline `file://`: **30/30 PASS**; focused actual `file://` L10 refresh/hire/save/reload/hourly-refresh/reload: **8/8 PASS**; L6–L9: **9/9 PASS**; Tavern prerequisite gate: **10/10 PASS**. All browser suites report zero JS exceptions.
- Offline artifact: `Play-Heoofgaia-HG11.html`, **10,506,944 bytes**, SHA-256 `7EDFE8C380E6597F4E925AFC81B90B75BB06ADE50B3BD5FE20C71541F7444BE9`.
- Actual installed Chrome screenshots from the offline game: `docs/evidence/hg08/tavern-level10-sampled-candidates-chrome.png` (1440×2131, SHA-256 `6FAC8BE2A1E7817103A4BC496E827600701394B5C8D3B4BD89D27D0157301F3A`) and `docs/evidence/hg08/tavern-level10-hourly-refresh-chrome.png` (dimensions recorded from PNG header below; SHA-256 `5C366DF798F7ECFAB0F255ACAA23C5B08CC8C372531BBF4CF0BF5DAC2E4B9C49`). Receipt: `docs/qa/hg08/tavern-level10-sampled-candidates-chrome.json`. These show the reconstruction, not the historical client.
- HG-08 remains **IN PROGRESS**. Tavern server odds, lower-level distributions/prices, non-Human exact troop gates, regional parity, recovered original client and direct original-client visual comparison remain open.
