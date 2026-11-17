# MƯU ĐỊNH TAM QUỐC — CHIẾN LOẠN MASTER SPEC (HISTORICAL, SUPERSEDED)

> **17/11/2026:** Owner cancelled Chiến Loạn and hybrid primary gameplay; see `docs/NGOA_LONG_REBUILD_SPEC_V1.md`. This document is research/archive only; branch, save and QA restrictions still bind.


> **HYBRID FINAL DIRECTION, 17/11/2026:** owner selected one Chiến Loạn × Ngọa Long original hybrid game. The authoritative product design is `docs/GAME_DESIGN_BIBLE_HYBRID_V1.md`; art authority `docs/ART_DIRECTION_DARK_CHIBI_V1.md`. Conflicting single-reference roadmap and semi-realistic ideas below are superseded, but safety, save, branch isolation and QA still apply.
Date: 2026-11-16 · Owner-directed product pivot · dedicated Codex game agent.

## 0. OVERRIDING PRODUCT DIRECTION
Owner explicitly withdrew the prior plan to make Ngọa Long the main reference and selected **CHIẾN LOẠN TAM QUỐC (CMN Online, launched Vietnam 20 Aug 2025)** as **PRIMARY GAMEPLAY REFERENCE**. Loạn Tam Quốc 2018 is a secondary historical reference, and Ngọa Long only a legacy influence where existing mechanics are useful. This file supersedes conflicting product direction in `docs/NGOALONG_CODEX_AGENT.md`, `docs/P3_DESIGN.md` roadmap commentary, README "Next" and past issue wording, but **does not supersede preservation, safety, branch, save, licensing, or QA rules**. Historical branch `main-ngoalong` and GitHub repo names remain unchanged for stability; the game keeps its independently owned **Mưu Định Tam Quốc** identity.

**Request interpretation:** reproduce the desired *functional genre experience* very closely, including world-map, troops, city, battle, conquest and progression; DO NOT duplicate proprietary game code, extracted assets, exact interface art/layout, distinctive text/sound, trademarked branding or pretend to be official. Legally original, separately maintainable implementation. Do not claim an officially confirmed sequel relation between 2018 and 2025 games without evidence.

## ART DIRECTION OVERRIDE — 17 NOVEMBER 2026
Owner requested a switch to **original hand-painted 2D illustration** across world map, city, general portraits, squads, battlefield and VFX. Mandatory source-of-truth: `docs/ART_DIRECTION_HANDPAINTED_2D_V1.md`. No inherited pixel/chibi/flat CSS geometry as default. The preferred pilot is full-color brush-and-ink semi-realistic painterly 2D; the exact variation needs owner approval from actual game screenshots. **Do not claim art migrated until new originals are integrated and tested.** Existing mechanics and Save remain unchanged.

## 1. EVIDENCE — PRIMARY REFERENCE
- Official launch date 20 Aug 2025, 7 faction categories, 5v5 heroes, infantry/cavalry/archer, city development, gathering and commerce, national war: https://chienloantamquoc.vn/tin-tuc/chinh-thuc-ra-mat-ngay-20-08-2025 (OBSERVED product announcement).
- Official newcomer tutorial: recruit → balance tank, damage, support → stage boss/manual or auto skill → territory buildings, upgrade generals/gear → guild/city war: https://chienloantamquoc.vn/tin-tuc/huong-dan-tan-thu-chien-loan-tam-quoc (OBSERVED documented mechanics).
- Official formation guide and on-screen general with accompanying troop detachments: https://chienloantamquoc.vn/tin-tuc/gioi-thieu-doi-hinh-dac-sac (OBSERVED reference screenshots, not reuse rights).
- Official city/guild war rules: https://chienloantamquoc.vn/dac-sac/hoat-dong-quan-doan (OBSERVED online feature; local NPC prototype must not claim real PvP).
- Contemporary editorial screenshots of land/city/world map: https://2game.vn/chien-loan-tam-quoc-mon-an-tinh-than-moi-cho-game-thu-chan-game-the-tuong-3q-chibi-post449110.html (OBSERVED visual reference only).
- 2018 Loạn Tam Quốc review of individual soldiers actively fighting around commanders: https://kenhgamevn.com/game-online/trai-nghiem-webgame-loan-tam-quoc-game-chien-thuat-the-tuong-co-ban-hinh-anh-kha-on-voi-nen-game-web/ (SECONDARY inspiration, not proof that these are the same engine).
- Owner recollection: select army then click target city to march/attack; choose this as **DESIRED INTERACTION**; research each game's specific gesture before asserting it existed precisely.
Record findings + retrieved date, actual link, image rights, mechanic category as OBSERVED/DERIVED/SIMULATED/UNKNOWN in `docs/CLTQ_REFERENCE_MATRIX.md`.

## 2. PRODUCT REQUIREMENTS — THE GOLDEN LOOP
1. **Territory/city visual:** attractive isometric/2.5D city, actual clickable palace/barracks/farms/wood/iron/market/research/walls, improvement costs and unlock gates.
2. **Real economy:** produce, collect, upgrade, consume gold/food/wood/iron with bounded offline income, meaningful troop upkeep and recruitment costs. No fake infinite "receive" buttons.
3. **Generals and army units:** each commander owns a troop detachment with a troop count, class, morale, rank, equipment and real battle strength/casualty; soldiers **move and fight as visible sprites**, health/damage updates, not decorative soldiers. Aim at five-commander formation 5v5 with at least 3 visible soldiers per living squad (adaptive LOD), tactical slots and role interactions.
4. **World map:** provinces, connected roads, minor settlements, farms, mines, passes, garrisons and capital targets; map nodes always clickable with meaningful inspect/attack/scout/garrison or honest lock reason. Fog of war and scalable viewport.
5. **Click army → click destination → order march:** selection highlight, path preview, travel cost/ETA, route and visible marching; arrival triggers an authentic encounter or confirmation; battle resolves against persistent defenders. Invalid orders explain reason, no hidden state mutation.
6. **Battle:** 5v5 formations, troop lines, positioning, per-unit attacks, skill casting, buffs/debuffs and motion/impact VFX; manual skill and auto skill options, pause/speed where technically sound. Casualties, wounded/recovering, captured city ownership, resource/EXP/loot settled **exactly once** in authoritative state.
7. **Progression:** campaign chapters, recruit/upgrade/rarity, equipment/refinement, daily resource loop, NPC factions, siege/defense, hero synergies, diplomacy. Strong enemies and elite cities feel meaningfully different.
8. **Expanded systems (not launch blockers):** 7 **original** alignment factions, spirit generals, weather/terrain, convoy logistics, alliance warfare, kingdom seasons, siege engines, battlefield traps, elite commander synergies. Avoid mandatory real-money mechanics and destructive paywalls.
9. **Offline initially:** single-player AI world with truthful labels; real multiplayer requires separate server/security/persistence architecture and separate owner approval. Do not simulate NPCs as real players.

## 3. ENGINE AND SAVE TRANSITION
- Keep repo `vuanhtuan161094-byte/Heoofgaia`, branch `main-ngoalong`; no changes to Hero or default branch; no merge.
- Canonical playable file `index.html` remains. Internal source code may be refactored into traceable modules if a reproducible build outputs the same offline single HTML and QA validates it; do not create competing release HTML files.
- Preserve existing Save key `muu_dinh_tam_quoc_v1`, v1–v4 migration, p3TroopTier/p3PresetId and all player-owned assets. Schema v5 adds the CL economy without resetting data; future schemas need deterministic migration and export-based recovery.
- Existing 3×3 formation/24 presets are legacy compatibility: retain stored 3×3 state and deterministic conversion to new 5-hero formation. Do not silently delete the feature; provide optional old tactical mode only if not confusing or expensive.
- Unit detachments have authoritative IDs and commands (idle/marching/engaged/retreating/recovering/garrisoned). Only one event/reward authority; replay/screen/VFX NEVER mutate rewards or troop counts.
- Offline clock: clamp deltas, deterministic progress for saved march/production, no replay farming by changing time, idempotent transactions.

## 4. EXECUTION PHASES WITH DEMONSTRABLE RELEASES
### CL-P0 — Pivot audit and compatibility baseline
Inspect all existing controls/state/source/QA and record `docs/CLTQ_GAP_AUDIT.md`; identify which P2/P3/P4/P4.1 features can be preserved, adapted, deprecated safely. Create reference matrix and acceptance matrix. **Code work starts in the same session**, not just documentation.

### CL-P1 — Commanders with real troops (FIRST playable vertical slice)
Five authentic commander slots (compatible migration from legacy 3×3), each squad rendered by moving/attacking/hit troop sprites with health and death/retreat; original art from legal provenance. Player taps/clicks live controls to deploy, battle, use skills, and watch soldiers strike. End-of-battle receipts and recovery; 3+ real battles including loss and boss. QA proves soldiers contribute to damage (e.g. fewer soldiers → lower strength) and casualties persist after reload.

### CL-P2 — Conquerable province + army marching (PRIMARY USER PRIORITY)
One rendered original world region with **minimum 10 meaningful nodes** (cities, farm, mine, pass, fort, enemy capital). Player selects commander/army then target node: preview path/ETA/food, commit order, watch march, resolve NPC garrison battle, change ownership, station defenders, collect resources, defend against NPC recapture, and save/reload. Introduce turn/time simulation with pause/resume. No gray unclickable fake decorations.

### CL-P3 — City/base and strategic economy
Original city artwork, 8+ functional building categories, real production/collect/recruit/upgrade/tech trees, shop/forge, quests and training. Connecting territory yields and garrison upkeep, with robust anti-duplication tests. Player can complete a 30–45 minute strategy loop without a softlock.

### CL-P4 — Campaign, hero roster, balance
30+ original/authorized historical figures' unique art, troop variation and commander skills, 5v5 tactical matchups, 7 original faction alignments if helpful, elite fortress/raids, chapters + boss progression. Keep economy viable without purchases; quantified difficulty sweeps and save migrations.

### CL-P5 — Professional visuals and release
Original isometric world/city/hero/squad art, directional sprite-first frame-by-frame animation **NO RIG**, moving-target VFX, alpha quality, native browser video evidence, audio from fully licensed assets. Mobile 390px + desktop 1280×720 actual click QA, memory/performance and offline release.

### CL-P6 — Optional grand strategy
Alliance/NPC diplomacy, seasons, weather, siege machines, wonder cities, multi-army campaigns, original super-skill system, persistent PvE endgame and global NPC factions; online multiplayer only after owner approval and separate server implementation.

## 5. MUST-PASS ACCEPTANCE
- Baseline tests: existing `qa/smoke.py`, `qa/p2_full.py`, `qa/p2_advanced.py`, `qa/p3.py`, `qa/p3_balance.py`, `qa/p4_assets.py`, `qa/p4_art.py`, `qa/p41_animation.py`, `qa/p41_video.py`. Refactor tests only with documented equivalence; no deleting failures to get green.
- CL-P1: 5 hero slots, >=3 soldiers visible per active squad where graphics budget allows, exact soldier damage/casualty updates, all costs/levels persisted, 3 battles incl. failure.
- CL-P2: click select army -> click destination -> route validation -> expense -> march -> garrison battle -> capture -> yield -> defend -> reload. Test routing, interrupted march, defeat, retries, double click, time-skew, deterministic repeat and imported legacy saves.
- Verify realistic full-loop functional UI, no fake buttons, click actual Chromium pages and capture desktop/mobile screenshots, video of continuous playable combat when available. 52 sampled frames aren't evidence of live frame rate.
- REV V0 syntax → V1 focused/regression/deterministic → V2 actual Chromium UI/state/visual → V3 GitHub Actions exact-SHA SUCCESS with executable artifact and test logs → V4 physical browser devices PENDING until owner tests → V5 owner visual approval PENDING until reviewed.
- Each milestone checkpoint has artifact link, SHA, changed files, actual tested command output, known risks and 2–3 choices. Do not claim complete game from a master plan, screenshots or a green test alone.

## 6. REQUIRED AGENT BEHAVIOR
- Agent identity (existing Codex persona) remains **NgoaLong-Codex** only as a legacy administrative identifier; **product target is now CLTQ-inspired Mưu Định Tam Quốc**. Agent must prioritize this pivot over older Ngọa Long research/roadmap instructions.
- Start from latest `main-ngoalong` HEAD every session; open Issue #4 as master task. If new branch needed by Codex platform: base exclusively on `main-ngoalong`, PR only to `main-ngoalong`, no auto-merge.
- **START IMPLEMENTING CL-P0+CL-P1 in code**. Don't spend the whole task planning. Small reproducible commits, no bypass of CI, do not touch Hero/Tông Môn/CMP.
