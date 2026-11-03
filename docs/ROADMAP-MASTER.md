# Hẻoofgaia — end-to-end development roadmap

**Definition of Done:** a fully playable *Anh Hùng Thời Loạn* reconstruction, not merely a themed prototype. No claim of exact 1:1 until evidence exists for features + side-by-side original-era visual comparison. Preserve functional old save data.

| Stage | Priority | Implementable deliverable | Gate / oracle | Current status (2026-11-03) |
|---|---|---|---|---|
| HG-07 audit & repo split | P0 | Independent E:\Heoofgaia source and private GitHub repo; baseline 40 troops; hero level-cap table | 37 engine, 31 browser, 9 file:// persistence checks; fresh repo HEAD | Standalone source and historical HG-07 baseline PASS; private repo `vuanhtuan161094-byte/Heoofgaia` is verified Private, feature branch and push path are active. Current implementation SHA is recorded in `docs/CURRENT_HG_CHECKPOINT.md`. |
| HG-08 troop & hero progression | P0 | 4 race × 10 unit unlock/prerequisites, accurate training timing, Tavern rerolls, hero XP/levels and capacity effects | matrix per unit and research, reject-without-spend, migration | Partial vertical slice PASS: Human T1/T3–T10 source gates; Elf/Orc Barracks-by-tier and Undead Graveyard progression are B* cross-source derivations (exact Undead level-to-tier mapping and racial support gates remain unverified); Orc Thunderbird/Elf Centaur C secondary-source gates; tier-2 Scout spell gates; Castle Spell queue; hero progression and v06→v07 migration. Fame-ranked hero cap (SRC20) and Hero Tower +1% XP/level modifier (SRC03) pass transaction/browser/v07 checks. Current cumulative regression: Node 149/149; integrated Chrome 93/93; offline `file://` 30/30; focused Elf Scout research/recruit/battle 20/20, Human Archer 16/16, Undead Skeleton 16/16; Tavern L10 8/8, L6–L9 9/9, Tavern gates 10/10; zero page/JS errors. Exact Undead tier/support gates, Tavern server odds, spell/research economy and regional parity remain unresolved; Tavern L10 samples 6,708 SRC21 community observations, not server odds. |
| HG-09 tactical combat | P0 | deterministic 7-stack (verify locale), initiative/range/movement, ability/equipment modifiers, retreat, wound/casualty ledger | 1,000 seeded battles, exact-once rewards, deterministic fixtures | Partial vertical slice PASS: current cumulative Node regression 149/149, integrated Chrome 93/93, actual `file://` 30/30; focused Hero SPD march Chrome 8/8 and 1,000 seeded replay pairs with mid-battle save continuation. SRC46 adds 128 dated 1★–8★ NPC locations and attack recommendations; SRC47/SRC45 preserve conflicting dated guard-force reports. Real 5★ selection/March, battle, v07 save/reload and XP settlement have focused Chrome evidence. Exact enemy rosters/stats, source calibration, full formula, movement/range and original art remain partial/simulated. |
| HG-10 world & economy | P0 | multi-castle/castellan, AP, mines, hero marching/return, fog/scouting, portals if evidenced, full buildings/production | 24h offline catch-up, unique ownership, settlement no duplication | PARTIAL: 100×100 coordinate world, three concurrent outbound hero trips, ten daily visitables, 76 dated treasure camps, and owned-city resource convoys are playable and v07-persistent. SRC59's transport flow and 20 AP are implemented with load from SRC02 and the explicitly mixed-edition SRC60 conversion. Route time, return, and hold-until-warehouse-capacity are modeled. Treasure rosters/drops, fog/scouting, PvP, original economy parity, and original structure art remain open. Latest: Node 144/144, integrated Chrome 93/93, actual file:// 30/30, focused convoy UI 9/9 and actual file convoy 9/9 PASS; zero page exceptions. |
| HG-11 visual fidelity | P1 | race-specific 2.5D cities, world, battle sprites/UI, animations, map camera, minimap, mobile landscape | original-era reference vs actual screenshots by screen; render smoke | PARTIAL: four modern faction-city scenes and five static troop sprites (Orc Imp, Elf Centaur, Elf Scout, Human Archer, Undead Skeleton Warrior). Current offline build: Node 149/149, integrated Chrome 93/93, `file://` 30/30; focused Elf Scout 20/20, Human and Undead 16/16 each; no JS errors. Elf Scout passes actual Scouting research, recruit queue, formation, map dispatch, natural NPC battle render and v07 Save/Reload. Only 5/40 troop identities are illustrated; animations, remaining troop art, world/battle art, broad UI fidelity and original-client comparison remain open. |
| HG-12 usability & release | P1 | durable save upgrades, backup/export/import validation, Windows one-click, Android acceptance, performance | current source+ZIP + exact SHA, physical testing when possible | PARTIAL |
| HG-13 online mode | P2 | optional server clock, persistence, guild, world interactions, PvP and player sync | secure auth, authoritative ownership, race conditions, local server integration test | DEFERRED until offline stable |


## Latest HG-10 playable slice — dated equipment camps — 2026-11-03

- SRC20 (17173, 2009-12-27) lists 76 equipment-camp coordinates and player attack-force recommendations. SRC47 (Sina, 2009-08-23) separately reports guarding force. The dated advice is shown in the game without turning it into hard gates; level 2 has 8,000 vs 8,400 dated force reports, and SRC20 level 6 prints a 100,000 complete-victory figure below its 480,000 minimum, which remains disclosed as a suspected source typo.
- The 76 camps use the existing real dispatch, battle controls, exact-once settlement, Save/Reload v07, return and hero-equipment flow. At 10,8 the treasure overlay is distinct from the prototype NPC at the same coordinate. Treasure enemy rosters/stats, drop table, item stats and bonus resources are simulated; no level-to-gear mapping is claimed.
- Tests: Node **122/122 PASS**; installed Chrome offline treasure flow **12/12 PASS**, with the QA fixture and synthetic defender adjustment disclosed in `docs/qa/hg10/treasure-camps-chrome.json`; integrated Chrome **91/91 PASS**; fresh-process `file://` suite **29/29 PASS**; JavaScript/Python syntax and `git diff --check` **PASS**. The standalone artifact and SHA are recorded in `docs/CURRENT_HG_CHECKPOINT.md`.
- Real installed-Chrome captures are in `docs/evidence/hg10/treasure-camp-*.png`. These are captures of this reconstruction, not original-client comparisons. HG-10 remains partial and the overall project is incomplete.

## Latest HG-10 playable slice — owned-city resource convoy — 2026-11-03

- SRC59 (17173, 2009-05-25) says newly captured city buildings start at level 1, troops carry resources while accounting for Load, and one transport costs 20 AP. SRC02 supplies the dated core troop Load values. The conversion through Gold-equivalent capacity uses living Fandom SRC60 and stays marked C / mixed edition.
- World map now exposes a real convoy form for a different owned city. Dispatch reserves troops and integer cargo, checks `Load × troops × 10` capacity and 20 AP, and persists outbound/holding/return phases in the unchanged v07 save. Cargo is delivered once only when the destination warehouse can accept it in full; the carriers then return to the origin. ETA, return and waiting behavior are simulation choices, not recovered HOG1 rules.
- Tests: Node **144/144 PASS**; integrated Chrome **93/93 PASS**, zero JS exceptions; actual offline `file://` regression **30/30 PASS**; focused live convoy UI **9/9 PASS**; focused actual `file://` convoy/save/reload/delivery/return **9/9 PASS**. Two offline builds matched at SHA-256 `1C79878B622D0426C42F075A017FE0954FE18D568BB63B0FFAF7F97FB5C29DAE` (10,247,213 bytes). Captures are `docs/evidence/hg10/city-transport-outbound-chrome.png` and `city-transport-file-outbound-chrome.png`, with delivery captures alongside them.
- This bounded transport flow passes; HG-10 remains PARTIAL. Original convoy timing/overflow behavior, fog/scouting, PvP, original-client comparison and numerous other systems remain open. HG-08 is still IN PROGRESS; HG-11 is PARTIAL; HG-12 is PARTIAL; HG-13 is NOT STARTED.

## Baseline source research
Use `docs/research/RESEARCH-HEROES-OF-GAIA-2009.md`, `docs/research/HG08-EVIDENCE-REGISTER.md` and `docs/research/HG08-TROOP-UNLOCK-MATRIX.md`; improve each rule with dated, version-labelled sources. Follow three target variants (original English US, English EU, Chinese), pick one canonical gameplay version before mixing expansions. **Never copy mechanics from unrelated games.**

## Modularization plan
- `src/core/` deterministic clock, save schema, action validation, transactions.
- `src/data/` units, buildings, resources, research, spells, provenance.
- `src/game/` heroes, economy, city, world, march, battle.
- `src/ui/` display components, input, canvas, animation, accessibility.
- `assets/` reference manifests, correctly authorized original/third-party art; no untracked provenance.
- `qa/` deterministic fixture runner, browser screenshot regression, migration tests, 8 GB performance profile.
- `dist/` generated offline HTML build.

These are future target directories, not proof that modularized code already exists. Keep existing tested source files until a staged migration is proven.

## Target gates
One game session must support: create race/city â†’ gather resources â†’ build/upgrade/research â†’ recruit a hero â†’ recruit all eligible troops â†’ assign squads within hero command capacity â†’ march â†’ fight â†’ suffer wounded/losses â†’ loot â†’ return/occupy mine â†’ save/close/reload without duplicated rewards. Later add multiple cities and online features without breaking offline play.


## Latest verified continuation — mine cap and production — 2026-11-02

- Branch: feature/hog1-research-to-playable-20261102; local standalone repo has no remote.
- Source: 17173 Chinese guide dated 2009-12-27 (SRC39), cross-referenced with a near-verbatim Lequ-hosted copy. Regional player-guide rule, confidence B; not an original-client observation.
- Runtime: Fame cap rejects new mine marches before AP deduction; captured mines add source-listed fixed hourly amounts; v07 save/load derives income from persisted mine ownership.
- Regression: Node 84/84, Chrome 78/78 with 0 exceptions, file:// 12/12, JS syntax 9/9, one-hour mine income tick plus Save/Load, offline build 153,333 characters.
- Original client, non-Human numeric gates, original art and English/EU parity remain unresolved. HG-08 to HG-12 are incomplete; HG-13 is not started.
- See docs/qa/HG08_HG13_ACCEPTANCE.md, docs/research/HOG1_SOURCE_AUDIT.md and CURRENT_HG_CHECKPOINT.md.


## Latest HG-10 multi-city verification — 2026-11-02

- Integrated node suite **94/94 PASS** (includes HG-07–HG-09 regression), runtime JS syntax **10/10 PASS**, and the reproducible offline builder outputs `Play-Heoofgaia-HG10.html`.
- Installed Chrome CDP opened the output through `file://`, used the actual march/attack/city-switch UI, and passed **13/13** checks with no JavaScript exceptions; the same browser reload preserved the captured city and garrison. Separate-process file:// persistence remains unverified because Playwright is missing.
- Captured race-specific city economy and queues run as independent saved city state; multiple-city scope is still partial. Fog/scouting, three simultaneous expeditions, PvP capture/abandonment, regional city gates and original-client comparison remain open.
- Current city scenes use modern generated painterly 2.5D art with four faction-specific variants; world/battle visuals still use project-authored prototype geometry and do not establish parity with the original. A dated 2009 visual reference (SRC42) confirms a scenic hill-city composition with detailed terrain-integrated buildings; the project keeps the composition while using higher modern polish. Fandom survey remains partial (608-article full enumeration blocked); see `docs/research/FANDOM-WIKI-SURVEY-20261102.md`.
- See exact artifacts, checksums and blocker in `docs/CURRENT_HG_CHECKPOINT.md`.

## Latest HG-08 Castellan activity EXP — 2026-11-03

- SRC49 (17173, 2009-12-28) confirms that the defending Castellan receives EXP when troop production, construction and research complete; it gives no numeric formula. Build/research EXP uses the SRC17 resource-value/3 formula only as a disclosed C-confidence model, with simulated construction/research costs.
- Construction and research now award EXP on real queue completion in active and inactive cities, once each. Save schema remains v07; no migration or old-save rewrite was introduced.
- Regression after this slice: Node **127/127 PASS**; integrated Chrome **91/91 PASS**; actual standalone `file://` Chromium **29/29 PASS**; focused Castellan UI/queue/Save-Reload Chrome **11/11 PASS** with zero JS exceptions.
- HG-08 remains partial; exact Castellan construction/research reward formula, build-cost parity, unresolved troop gates and Tavern probability remain open. See `docs/CURRENT_HG_CHECKPOINT.md` for the artifact and evidence hashes.
