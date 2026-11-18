# Mưu Định Tam Quốc — CHAT 00 / Master Control V1
**As of:** 2026-11-18  
**Authority:** Owner instruction "Quy trình phát triển đa chat V1"; `AGENTS.md`, `docs/NGOA_LONG_REBUILD_SPEC_V1.md`, `docs/NL_DATA_DRIVEN_V2.md`, Issue #4.  
**Product:** ONE independent, original strategy game inspired by the **classic Ngọa Long gameplay loop**. No copying protected art, code, audio, or original game expression. No Codex.

## 1. Repository and release truth
- Source repository: `vuanhtuan161094-byte/Heoofgaia`. Current task branch: `codex/nl-wiki-01-r02-20261117`; open **Draft PR #6** targeting `main-ngoalong`. Reference commit before this file: `5d232bbf9f266f1ea5b2a641a51373eb6e8c4b31`. Always re-fetch HEAD.
- **Target, not yet verified created:** dedicated `vuanhtuan161094-byte/MuuDinhTamQuoc` repository with exactly one `main` branch. Migration helper: `scripts/migrate_ngoalong_to_own_main.ps1`; do not run it without inspecting destination, verifying owner authorization and checking unintended historical data/code retention. Never modify Hero or source refs.
- Save invariant: `muu_dinh_tam_quoc_v1`, schema v5; preserve migrations v1–v4, receipts, replay, all existing progression and legacy CL regression state.
- **CI distinction:** GitHub run [44232049362](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44232049362) at `5d232bb` is SUCCESS **only for changed_sources** (quick/game skipped); the latest independently verified full `game` PASS reviewed here is [44198801820](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44198801820) at `47a1b674`. Neither is physical-device/owner acceptance.
- Canonical offline game is generated `index.html`, not an editable standalone fork. No merges, force-push, default-branch changes or Hero edits.

## 2. Inventory verified from code pack at kickoff
Source `data/ngoalong/alpha_content.json` on `5d232bb`:
- 14 project hero roster records and 14 combat-skill descriptors; Wiki-imported hero profiles: **0**.
- 7 runtime troop profiles; 11 project-authored evolution branches; 6 runtime status effects.
- 6 formation families × 4 plans = **24 project presets**, not 24 separate Wiki canonical formations.
- 8 chapters, 28 maps/NPCs/encounters; source pack lists NPC stage structures, not canonical copied Wiki NPC stats.
- 19 original project gear items; 7 slot definitions; 8 research systems.
- `data/ngoalong/wiki_troop_facts_v1.json`: 9 sampled Wiki troop facts, **not** the entire catalog.
- Existing art R04 remains a partial original portrait/scout-contact pilot, not a full sprite/VFX production package.
- Official [VNG Wiki](https://ngoalong.vnggames.com/ngoa-long-wiki) labels itself **Mobile**. Homepage counts differ from detail-page filtered totals (Binh Chủng page displayed 73 entries when checked). Treat coverage as PARTIAL and classic parity UNKNOWN. Source evidence labels: `VERIFIED`/`DERIVED`/`SIMULATED`/`UNKNOWN`.

## 3. One owner per shared file; specialist chat contracts
| Chat | Scope / deliverable | Exclusive write area | Must NOT edit |
| --- | --- | --- | --- |
| **00** | Priorities, acceptance, GitHub oversight, conflict resolution and consolidated status | This master control file | Gameplay/asset modules |
| **01 WIKI** | Item-level Mobile/classic evidence, gaps and legal provenance for all domains | `docs/NL_REFERENCE_MATRIX.md`, new `data/ngoalong/references/` | Runtime, `index.html`, `alpha_content.json` |
| **02 COMBAT** | Troops, tactical AI, morale, formation, evolution and focused tests | New `tools/nl_combat_*.js`, `qa/nl_combat_*.py`, `data/ngoalong/modules/combat/` | Shared generator, global source pack and Save |
| **03 HERO** | Hero records, real combat skills, buff/debuff and focused tests | New `tools/nl_hero_*.js`, `qa/nl_hero_*.py`, `data/ngoalong/modules/heroes/` | Shared generator, global source pack and Save |
| **04 CAMPAIGN** | Chapter/NPC/boss design, drops and repeated PvE economy; focused tests | New `tools/nl_campaign_*.js`, `qa/nl_campaign_*.py`, `data/ngoalong/modules/campaign/` | Shared generator, global source pack and Save |
| **05 PROGRESSION** | Gear/items, city, technology, economy, hero upgrade cost and focused tests | New `tools/nl_progression_*.js`, `qa/nl_progression_*.py`, `data/ngoalong/modules/progression/` | Shared generator, global source pack and Save |
| **06 ART** | Original character/environment sprites, VFX, production metadata and asset-level QA | New `assets/ngoalong/`, `qa/nl_art_*.py` | Gameplay math, combat events, `index.html`, shared build |
| **07 INTEGRATION** | Single-file build, browser UI, runtime wiring, data pack import, global CI/release and Save-safe integration | **Exclusive:** `index.html`, `data/ngoalong/alpha_content.json`, `tools/build_ngoa_long_mode.py`, `.github/workflows/ngoalong-qa.yml`, Save integration | Other chat-owned files without coordination |

`tools/ngoa_long_r03.js`, `tools/ngoa_long_r04.js`, and existing `qa/nl_r02.py`/`qa/nl_r03.py` are currently shared legacy implementation points. **Do not modify concurrently**; specialist authors instead supply compatible proposed modules and focused tests, then chat 07 wires them in. Changes to existing shared files require chat 00 file-lock decision. All chats read latest HEAD and relevant policy first; maintain exact SHA provenance.

## 4. Delivery states and acceptance
- `RESEARCHED`: source URL/edition/date, record ID, factual field provenance and gaps.
- `IMPLEMENTED`: runtime code loads the data, reachable through real game controls, action has observable impact and correct save/reward flow.
- `TESTED`: focused negative+positive QA, same-seed A/B if strategic, regression where touched, source build reproducible and Actions on exact SHA. Distinguish quick/focused/full.
- `V1-ACCEPTED`: owner approves playable game/visuals on physical device; sufficient sustained campaign, economy, balance, performance and recovery. None of these human gates is automatically cleared by CI.
- A new Wiki record alone is **NOT** implemented gameplay. An image, static GIF, mockup, count table or HTML prototype alone is **NOT** V1.0.

## 5. Priority dispatch
1. **P0 infrastructure:** inspect dedicated-repo migration and one-`main` suitability; preserve existing source untouched; freeze shared-file ownership. No migration until destination ownership/history/contents are assessed.
2. **P1 playable substance:** chats 02–05 each turn a bounded data group into real strategic decisions, with chat 07 integrating one module at a time and giving each a reachable browser test. Chat 01 supplies exact field-level source evidence in parallel.
3. **P2 content breadth:** expand authored campaigns, bosses, heroes, troop identity, gear and economy, not just JSON counts.
4. **P3 artwork:** chat 06 produces original integrated frame-based game assets and VFX once identity/visibility approval is achieved; no rig.
5. **P4 release:** chat 07 runs full exact-SHA QA on integration/release commits; physical Windows/Android and owner review remain distinct mandatory V1 gates.

## 6. Mandatory specialist handoff to chat 00
`CHAT / BASE SHA / NEW HEAD SHA / changed files / playable behavior before→after / Wiki URLs+edition+VERIFIED-DERIVED-SIMULATED-UNKNOWN / focused QA with failures / quick vs full Actions link / remaining gaps / file conflicts / 2–3 next choices`.

Cross-team conflicts: **STOP edits to the overlapping file**, record the current owner and SHA, report to chat 00. Do not repeatedly create duplicate matrices, separate checklists or secondary Wiki mirrors; this file is the single coordination overview, domain details remain in their owned modules.
