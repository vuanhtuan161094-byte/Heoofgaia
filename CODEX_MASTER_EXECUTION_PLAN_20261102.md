# CODEX MASTER HANDOFF — HẺOOFGAIA HG08 → RELEASE
Date: 2026-11-02
Repository: vuanhtuan161094-byte/tutiennhandoi
Working branch: feature/heoofgaia-hg07-20261102
Working root: projects/heoofgaia/
Reference ONLY: Heroes of Gaia / Castle of Heroes / 英雄之城 (Snail Games, circa 2009–2010).
Authority: current user request > live target branch files/tests > current documentation > historical references.

## OWNER GOAL
Deliver the most faithful, playable reconstruction of the ORIGINAL Heroes of Gaia possible, from beginning through end: the city, four factions, 40 unit types, hero recruitment/progression, building and research queues, resources, world map, AP, expeditions, tactical battles, spells, equipment, losses, mines, multiple cities, and eventually guild/PvP/server gameplay. No mechanics imported from Call of Gods or War of Legends. The user wants an END RESULT rather than frequent clarifying questions. Continue implementation, verification and repairs within your actual interactive execution session without pausing to request a choice for routine issues.

Do NOT claim “identical/1:1/final complete” until system-by-system evidence, functional parity and actual visual side-by-side proof exist. A useful independently playable build is preferable to a broken aspirational full clone.

## 0 — REPOSITORY SAFETY AND BASELINE (MANDATORY FIRST)
1. Refresh the live HEAD of the target branch; read repo root AGENTS.md, CURRENT_CHECKPOINT.md and docs/DEVELOPMENT_PROTOCOL.md for boundaries, plus projects/heoofgaia/ROADMAP-HG07-TO-RELEASE.md, README-HG07.md, QA-HG07.md and RESEARCH-HEROES-OF-GAIA-2009.md.
2. This repository contains a DIFFERENT game (Tu Tiên Nhàn Rỗi). Make all new code, assets, tests, documentation, scripts and screenshots ONLY inside projects/heoofgaia/. Do not modify root production files, locked Tu Tiên systems, its saves, CI, AGENTS or checkpoint. Do not merge to main. Do not force push.
3. Start from HG07 branch SHA 62d4a1c6d1a0c9769cf9ee6690e77361a2927ea9 unless branch has advanced; if advanced, re-inspect and integrate safely. Baseline offline artifact: Play-Heoofgaia-HG07.html, source index.html, data.js, engine.js, hg04.js→hg07.js, painter.js, app.js, CSS, QA scripts.
4. Run node --check on all source JS, node qa-engine.cjs, python build_offline.py and python qa-browser.py where prerequisites exist. Prior HG07 report records 37/37 engine and 31/31 browser, but RE-RUN and report CURRENT results rather than copying old PASS claims. Set a separate clean browser profile and verify persistence where possible; current browser tests use a storage shim.
5. Preserve all HG02–HG07 save imports and the exact current v06 save-key behavior unless a new versioned migration is built and tested. Back up fixtures. No silent save reset, troop deletion, duplicate resource claims, or retroactive progression reapplication.

## 1 — EVIDENCE-DRIVEN ORIGINAL RECONSTRUCTION
Research broadly in English, Chinese and archived historical material:
- Keywords: Heroes of Gaia, Castle of Heroes, 英雄之城, 蜗牛 英雄之城, Heroes of Gaia wiki, Kongregate guide.
- Starter evidence: heroesofgaia.wikidot.com/game-units, /game-buildings, /game-spells, /game-combat, /heroes-action, /heroes-att; heroesofgaia.fandom.com/wiki/Heroes; www.kongregate.com/en/pages/heroes-of-gaia-guide; dated Sina/17173 articles and archived MobyGames/GameGami screenshots.
- Explore Wayback archives, historical manuals, YouTube gameplay captures, documented community source datasets and explicitly licensed open-source projects. Evaluate them for correct game/version; never confuse them with other similarly named modern games.
- Maintain EVIDENCE_REGISTER.csv or .md with feature ID, game region, source URL, access date, source publication/build date, exact evidence, confidence, and status OBSERVED/DERIVED/SIMULATED/MISSING/CONFLICT.
- If original accessible SWF/archives or source assets are obtained legitimately, record provenance, SHA-256, file signature, source rights/terms and version, inspect in isolated environment; do not bypass access controls, credentials, DRM or protections. Never invent “original extracted” evidence.

## 2 — ASSET AND IP WORKFLOW (CRITICAL)
The owner authorizes using materials they own or can lawfully supply, and wants maximal visual fidelity. That authorization does not transfer third-party copyrights. Research/reference use is different from permission to redistribute original sprites, audio, logos, backgrounds or Flash client files.
- Find ALL relevant publicly accessible historical visual references, sprite atlases, city backdrops, icons, animations, fonts and sounds; register origin URL, author/rights holder, original filename, hash, license/permission status and required attribution.
- Use originals in shipped game only if ownership, appropriate permission or a compatible license can be verified. Other originals may be kept only as reference when allowed, not silently embedded into the published package.
- For assets with unknown/unsuitable rights, create ORIGINAL high-fidelity replacements matching the composition, scale, palette, perspective and gameplay readability of references. Do not fabricate provenance or rebrand screenshots as original art.
- Asset dirs: assets/reference-manifest/ (metadata and links), assets/licensed/ (approved distributable media), assets/original/ (original newly created art), assets/draft/ (not production). Maintain ASSET_PROVENANCE.md and an automated license/provenance gate. Prefer optimized WebP/PNG spritesheets and progressive loading for 8 GB RAM machines.
- Real UI/game screenshots must come from the running build. Do not pass generated reference/concept renders off as screenshots.

## 3 — BUILD IN DEPENDENCY ORDER (IMPLEMENT, DO NOT STOP AT DESIGN)
HG08 — TROOPS + HEROES (P0):
  - Four races Human/Elf/Orc/Undead, 40 troop IDs and verified unit catalog with costs, stats, speed, load and training times; full prerequisites by Barracks level, supporting buildings and research; correct unavailable/locked states.
  - Tavern refresh, hero quality, recruitment, hero EXP/level and attributes, hero command unit-value limits including only documented bonuses; save migrations. Build and research queues, rejection without resource/AP mutation and completion exactly once.
  - Tests: positive/negative prerequisite matrix, 40 troop schema, level 1–100 command boundaries, save compatibility.

HG09 — TACTICAL COMBAT (P0):
  - Deterministic battle simulation: actual army stacks and position, validated count/formation per historical edition, speed/initiative scheduling, movement, melee/range, targeting, defense, morale if evidenced, spells active/passive, equipment bonuses, casualty/wounded and recovery ledger, retreat and victory settlement.
  - Test order invariants, exact casualties, no negative troops/resources, no duplicate rewards and 1,000 seeded encounters; compare observable outcomes against original-era examples when available. Do not pretend a guessed formula is canonical.

HG10 — ECONOMY + WORLD (P0/P1):
  - Town Hall cap, full building set, race-specific castle and prerequisite chains, per-hour resource production and warehouse capacity, market/bazaar, research, recruiting, offline catch-up, daily/time actions.
  - Large navigable world, scouting/fog, mine control, encounter types, heroes and garrisons, AP, march travel/return, tile ownership, multiple cities; time and settlement exactly once across save/reload.
  - Test ownership, stale commands, queued operations, offline time boundary cases, battle-to-world reconciliation.

HG11 — ART/UI/UX FIDELITY (P1):
  - Match dated original screenshots screen-by-screen (world/city/tavern/heroes/barracks/research/battle): 2.5D background perspective, building silhouettes and locations, HUD hierarchy, panels, skill/icons, troop readability, animation and interaction flow for all four races.
  - Provide before/after reference matrix and actual desktop 1280×720 and mobile landscape captures; no obscured controls, tap/drag/zoom failures or stale fake UI. All interactions must call real gameplay.
  - Prioritize accurate UX and stable assets over visual decoration unrelated to the original.

HG12 — RELEASE ENGINEERING (P1):
  - Keep modular source and generate portable offline HTML via build_offline.py, smoke both source/index.html and single-file build. Add explicit versioned saves, JSON export/import with checksum/schema validation, corrupted-save recovery, backups and migration fixtures.
  - Low RAM target (8 GB Windows): avoid full browser asset preload, expensive loops and large per-frame allocations. Test browser Chromium/Edge desktop and mobile viewport; only claim physical Windows/Android validation after physical execution.
  - Ship numbered release ZIP (source, playable, user instructions, test scripts, sourced provenance, evidence/fidelity report and REAL runtime screenshots).

HG13 — ONLINE SYSTEMS (P2 AFTER OFFLINE CORE IS ACCEPTED):
  - Design and implement isolated, opt-in server authority for multiplayer world, authentication, server clock, guild, PvP, chat/mail and cross-city marching; anti-duplication and authorization, resilient persistence and security tests.
  - This must not require a live service to play the offline single-player build. If infrastructure/credentials are absent, ship server code and automated local integration tests, mark deployment BLOCKED — do not claim live multiplayer.

## 4 — IMPLEMENTATION AND QA LOOP
For EACH vertical slice: read exact evidence → write minimal contract and test oracle → implement → run scoped unit/regression/browser gates → inspect actual runtime screenshot + logs → fix failures → commit coherent changes → push to SAME isolated branch → update ROADMAP and QA evidence with exact SHA. Never mark a fake button as a completed feature.
- Add a fidelity matrix: Original behavior; current implementation; proof URL/date; confidence; PASS/PARTIAL/SIMULATED/MISSING; required next action.
- Keep game logic deterministic and separate from UI. Assert no save corruption/negative values/double claim.
- Add scripts to rerun QA and build offline without relying on project root Tu Tiên tools or GitHub Actions quota.
- Keep race data, units, technology, building prerequisites, combat abilities and UI render layouts as independently maintainable catalogs.
- Fix P0 regressions before continuing to P1. Do not hide failures by weakening tests. Keep tests runnable on 8 GB Windows hardware.

## 5 — DELIVERY AND STOP CONDITIONS
Do not repeatedly ask the owner for routine design choices, and do not stop after creating plans alone. Work through the sequence within your session as far as real tools/time allow, commit and push actual tested code. If a hard blocker arises (rights, network, unavailable historical data, external infrastructure), implement unaffected pieces, document the blocker with precise evidence, and continue other eligible work.

At the end of EACH working session, leave an unambiguous continuation checkpoint under projects/heoofgaia/CURRENT_HG_CHECKPOINT.md: branch + exact HEAD, newly completed features, modified paths, live verified tests and commands, actual screenshots, unresolved fidelity gaps, current blocker and next atomic task. Do not claim to have completed work that was not run. No merge to main.

FINAL HANDOFF when finished: one playable downloadable build and source; launch instructions for a non-programmer; exact branch and commit SHAs; original-vs-reconstruction comparison with screenshot evidence; asset provenance/license decisions; full test report showing PASS/FAIL/BLOCKED and any incomplete systems. The owner's target is highest achievable original fidelity, NOT a generic fantasy strategy game.
