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
