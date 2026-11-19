# CHAT06 B — Cross-chat NPC, skill, effect, troop (2026-11-19)

## Scope
- Owner paths: data/ngoalong/modules/campaign/** and qa/modules/campaign/** only.
- No Codex Cloud, no merge; no changes to CHAT01/02/05 source, CHAT08 generator, Save v5, replay, receipts, alpha_content.json, index.html or workflow files.
- Current VNG Mobile Wiki, classic parity UNKNOWN. This evidence is REFERENCE_ONLY, not a gameplay approval.

## New code and pinned dependencies
- nl_campaign_crosschat_v1.js audits every NPC and each 3×3 slot in all 21 existing source shards; designed for 249 map records / 4,903 NPCs / 23,914 observed unit positions.
- crosschat_dependencies_v1.json records branch HEADs and file blob SHAs for all source data:
  - CHAT01 feature/nl-v2-heroes SHA 173052e8f5392589c85c9974dd7aae7c8337f90d: 364 hero profiles with historical stage skill candidates. Equipped stage remains UNKNOWN.
  - CHAT02 feature/nl-mcv2-02-troops SHA 6f3b01464437e3e78a4548e5bf677692105d43ba: 372 Wiki identities, 25 project identities. No approved crosswalk for numeric Wiki troop IDs used by NPCs.
  - CHAT05 feature/nl-mcv2-05-combat SHA adfd0a16c465d4fedcf13ce8c95707f87e4c6de2: 320 reference effects, 13 project effects, 10 project skill examples; matching labels do not prove the same operation.
- Hero and troop name matches are candidate-only. NPC_EXCLUSIVE_LABEL stays in NPC_STAGE_ADDITION, never HERO_ACTIVE. Selected-unit effects do not certify the entire NPC.
- No battle binding is approved; approved_bindings_v1.json stays empty. Unknown parameters and source-version clashes are not fabricated.

## Verification commands in a full checkout

1. node --max-old-space-size=3072 --test qa/modules/campaign/nl_campaign_crosschat_v1.test.cjs
2. node --max-old-space-size=3072 data/ngoalong/modules/campaign/nl_campaign_crosschat_v1.js
3. node --max-old-space-size=3072 data/ngoalong/modules/campaign/nl_campaign_crosschat_v1.js --check

Command 2 writes data/ngoalong/modules/campaign/crosschat_reconciliation_v1.json, with map/NPC/unit evidence, skill origin, hero/troop/effect candidates and blockers. Command 3 compares the generated report byte-for-byte. Regenerate the pinned registry snapshot whenever any of the three source branches changes.

## QA status and risks

- TESTED: 7/7 small deterministic checks PASS in JS isolate: exclusive skill separation, reference-only effect, hero stage version, absent numeric troop IDs, duplicate slots, runtime/edition rejection and missing shards.
- PENDING: eighth regression runs against all 21 real source shards and requires exactly 249 maps, 4,903 NPCs and 23,914 unit slots with zero approved combat bindings. These >1MB individual shards are unavailable for complete execution via current connector, so do not claim full data QA PASS.
- PENDING CHAT08: real Chromium, runtime 3×3 unit binding, Save/replay, atomic reward receipts and GitHub Actions exact-SHA. No Wiki dungeon was promoted to playable.
- Source hazards: numeric troop ID proof is absent; 364 hero stage sources do not establish active equipped skills; Wiki effect labels alone do not give validated %/duration/trigger or a compatible engine effect ID.

## Next options
A. CHAT01/02/05 verify numeric troop ID crosswalk and NPC-exclusive effect contracts, then CHAT06 records explicit approvals.
B. Execute the full 21-shard report and QA, prioritize structurally complete maps and repair source conflicts with evidence.
C. CHAT08 wires only approved NPC maps to combat + Save v5 with Chromium, replay and exact-SHA CI, without merging.

## Source-data execution update (supersedes the full-shard PENDING note above)

- **PASS:** 21/21 committed shard blobs, partitioned into 5 disjoint groups, executed using the new cross-chat audit function in an isolated JavaScript runner. Exact source tree and input SHA are recorded in crosschat_audit_verified_shards_v1.json.
- Aggregated evidence: **249 maps / 4,903 NPCs / 23,914 unit slots / 1,787 Boss NPC occurrences**; **3,595 NPC-exclusive skill slot occurrences**; **23,914/23,914 numeric troop ID bindings remain unverified**; 23,063 unit occurrences have a unique troop *name candidate*, 184 occurrences have ambiguous troop names. Candidate is not approval.
- Only **7 selected-unit NPC facts** exist; **2 effect labels** have a Wiki effect name candidate. There are **0 approved combat bindings**, **0 verified equipped hero skills**, **0 promoted playable Wiki maps**.
- **Still PENDING:** execution of the standalone Node test suite on a full checkout (including its eighth full-source case), official GitHub Actions on exact SHA, Chromium, Save/replay/receipt settlement and owner approval.
