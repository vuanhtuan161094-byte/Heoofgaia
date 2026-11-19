# CHAT 02 — TROOP HANDOFF V1
Date: 2026-11-18. Task branch: `feature/nl-v2-troops`. Source HEAD: `a88b8449714ad48531f7c9e7e081ccac43edee92`.

## Actual scope
- **372 Wiki appearances** (213 core tier 1–7; 96 tier-0 land mixed; 54 special/NPC; 9 ships), preserved one-to-one with existing source IDs. **NOT 372 recruitable playable troop types.**
- Across 54 special/NPC rows: **48 NPC badges observed; 6 non-NPC badges observed; neither badge grants recruitability**. All source records are REFERENCE_ONLY and recruitability UNKNOWN.
- 501 source mechanic operations preserved (235 source-specific structured profiles, 78 qualitative-only profiles, 59 not yet structured). Status one-to-one equivalence is not assumed; effect bridge remains reference-only.
- **Wiki named parent→child edges: 0 verified**. Section-level tier adjacency: 30 (not specific identities). No cross-version classic inference.
- **25 project-origin design combat identities**, separate from source: 7 base types + 18 existing project specialization IDs from alpha_content.json, with distinct trigger/target/effectIntent signatures and SIMULATED 1–7 design stats. 18 project-origin specialization edges are NOT Wiki-verified evolution.

## Files
- `catalogue_wiki_v1.json`: eight-family shard index (372 appearances). `wiki_*_v1.json` stores all appearance identities and provenance, mechanic operations, effect bridge event IDs, art metadata and missing-source gates. `getDesignData` resolves all eight shards into `wiki.records`.
- `project_playable_v1.json`: 25 project-origin behavior designs; **DESIGN_READY_NOT_INTEGRATED**, no new gameplay claimed.
- `evolution_contract_v1.json`: source tier-only adjacency / unverified named edges and separate project design edges.
- `source_audit_v1.json`: source coverage, counts and explicit unknowns.
- `tools/nl_troop_design_v1.js`: read-only descriptor lookup, tier stats, specialization quotes, economic eligibility; no Save, combat engine or index edits.
- `qa/nl_troop_contract_v1.test.cjs`: single focused contract QA; run `node qa/nl_troop_contract_v1.test.cjs`.

## Chat 05 input
Consume `records[].combat.operations` + `records[].combat.requiredStatusTags` and `project.units[].combatBehavior`. Wiki source operations are descriptive and **must not auto-activate**. Missing probability/trigger/duration or ambiguous aliases mean UNKNOWN; request verified evidence or draft project-original SIMULATED behavior under separate project IDs. Do not map a generic source status tag to any Wiki effect ID by text similarity. The 501 bridge event IDs are direct references only.

## Chat 07 input
Consume `records[].art` or `project.units[].art`. Every artKey is unique, but this is metadata and **no finished art**. Make original frame-by-frame 2D game sprites (4 directions; idle/walk/attack/cast/hit/death), weapon silhouette and stance readable; VFX separate; no rig, no poster-as-sprite, no copied VNG asset. Design fingerprint differentiates catalog keys, **not finished visual differentiation**.

## Evolution / balancing and integration safety
Project cost baseline: silver 1100 / grain 520 / iron 280, barracks >=2. Design tier costs grow by factor 1.30; unit stats use 1 + 0.12 × (tier - 1), capped 7. All SIMULATED. Existing runtime cap 4 is not changed; tier 5–7 stays future design. `evolutionOptions` and `nextTierDesignQuote` are **preview-only**; do not alter live game, Save v5, battle receipts, or Wiki datasets.

## Status
DONE: source reuse and catalogue design; source classification; project specialization graph; target-pattern/effect descriptors; art briefs; focused QA source added.
PENDING: exact Node CI/test execution on runnable checkout; per-Wiki-unit recruitability; named Wiki evolution edges; 137 mechanic profiles lacking verified structure; chat 05 combat engine integration; chat 07 sprite production; full campaign regression/owner visual signoff.
No merge. No Codex Cloud. 

## Technical coverage and handoff verification
- Family-level counters are exposed as `tacticalTaxonomy.counterFamily` (DERIVED from the Wiki family relation). **No hidden per-unit counter coefficient** is claimed; the multiplier remains null/UNKNOWN.
- Source-derived multiple `tacticalTaxonomy.roleTags`, known damage lanes, targeting shapes, immunity intents and unresolved source status tags remain separate from project `SIMULATED` combat behaviors. Rows without source mechanics keep role/attack lane UNKNOWN.
- Counts: 372 verified **appearance IDs**, 235 structured-source mechanism profiles, 137 qualitative or unstructured profiles still requiring detailed evidence; 25 project design identities, **zero newly runtime-wired by this chat**. Existing 25 legacy runtime troop identities belong to the base game, not to an imported 372-unit Wiki roster.
- Source page live rechecked 2026-11-18: https://ngoalong.vnggames.com/ngoa-long-wiki/binh-chung ; headers show only tier-level progression, no individually proven named parent/child edges.
- One-pass GitHub data inspection: **22/22 static assertions PASS** on prior exact committed data at `be40fe77ce075cec2896f6ff29fb9993d5f79313`. New taxonomy fields require a follow-up consistency inspection. **Node test and Actions full CI not executed**: workflow push filters exclude this task branch; do not label those gates PASS.

## Executable Group 02 code — 2026-11-19
- Added `tools/nl_troop_combat_v1.js`, a UMD/CommonJS original deterministic combat sandbox consuming `project_playable_v1.json` and `evolution_contract_v1.json`. 25/25 project combat behaviors have executable effects, including guard, cavalry counter, multi-hit, area damage, morale, healing, burn, targeting and reactive defenses.
- `createBattle({A,B},seed)`, `stepBattle(battle)`, `runBattle(battle)`: 3×3 slots 0–8, 1–5 units/side, emitted replayable events; never writes legacy Save or settles rewards. Test with `node qa/nl_troop_runtime_v1.test.cjs`.
- `createRosterState`, `evolveRoster`, `trainTier`: standalone immutable roster and resource transactions, checked costs, idempotent receipts and collision rejection. Project tiers 5–7 remain design-only; existing runtime cap 4 enforced.
- `project_playable_v1.json` records `implementation.standaloneExecutable=true` and `campaignWired=false` for all 25.
- Group 05 MUST wire this as the **single authoritative** damage/action resolver via the canonical generator. Never call the existing live damage function and `stepBattle` for the same attack, to avoid double HP/replay/settlement. Group 02 has NOT modified the live combat engine, `index.html`, `alpha_content.json` or Save.
- Static runtime V8 execution/QA is distinct from Node CI and live Chromium; no claim of live game integration before Chat 05 does it.

## Multi-Chat V2 owned-file port — 2026-11-19
New branch: `feature/nl-mcv2-02-troops` based exactly on integrator SHA `e33e36255d62ea51af7f48386b8d3c56c6448369` with only team02-owned modules and test files. Copied the original executable sandbox to `data/ngoalong/modules/troops/troop_combat_v2.js`. Chat 08 exclusively owns `tools/nl_*`, source pack, generator, Save, live combat and index.html. This port does **not** integrate the troop module into actual campaign. 372 Wiki appearances remain reference-only; 25 project-original combat identities remain executable only in their standalone simulator. No merge.

## Live integration contract V2 · 19/11/2026
Canonical source HEAD `b4430e560d5b9c6d19be604930b9a54c63076dbc`; module branch `feature/nl-mcv2-02-troops`.
**25/25 project-original identities** have executable standalone combat; **18/18 existing R03 branches** cross-referenced against original `alpha_content.json` and `tools/ngoa_long_r03.js`. Do not confuse existing property handling with exact ability equivalence. `live_integration_contract_v2.json` records the current hooks and **12 pending additive proposals**. `troop_live_bridge_v2.js` is a read-only live loader/intent planner, guards Wiki IDs, ignores CL and never writes damage, morale, reward, Save or replay. All additive intents are disabled until Chat08 review and single-authority wiring.
No edits to `tools/`, `index.html`, `alpha_content.json`, effect engine, Save or CI on this branch. Chat08 owns all integration. QA: `node qa/modules/troops/nl_troop_live_bridge_v2.test.cjs` plus two existing troop V2 tests. V8 bridge smoke exercised; exact Node/Chromium/CI not yet claimed.

## 2026-11-19 Batch B · 137 unfinished Wiki troop mechanics
`mechanic_refinement_v2.json` enumerates 137 source gaps: 78 with directly visible Wiki description line anchor and previous DERIVED qualitative tags; 59 with no usable mechanic description. Each 78 has source-relative fact provenance, missing source values null and a **separately identified SIMULATED project prototype**. No automatic Wiki promotion or mutation of the earlier 501 source operation rows. The runnable `troop_mechanic_rules_v2.cjs` can `preview` all 78 in an immutable sandbox (damage, counter, morale, splash, burn, defensive effects); not part of campaign.
`troop_design_v2.cjs` now loads the overlay into `getDesignData().refinement`, and exposes `wikiGapStatus` and `wikiGapAudit`. `describeTroop` adds read-only refinement metadata for a source appearance. Chat08 must NOT auto-load candidates from Wiki IDs. Source-specific chance, turn lengths, damage formulas and named evolution links remain unverified; candidates use explicit SIMULATED defaults.
