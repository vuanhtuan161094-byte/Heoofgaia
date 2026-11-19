# CHAT06 V4 — source-readiness priority and handoff to CHAT08

**Scope:** independent PvE source analysis. Do not merge or edit canonical generator, Save v5, combat engine or `alpha_content.json`.

**Verified existing full source:** 249 Wiki map records / 4,903 NPC rows / 23,914 observed unit slots in 21 committed source shards, with Group02's 170 roster-complete maps. This is current VNG Mobile reference material, not classic gameplay parity.

**New V4 code:**
- `data/ngoalong/modules/campaign/nl_campaign_readiness_v1.js` evaluates *every* NPC for real 3×3 slot consistency, combat order, NPC total, unit soldier completeness, mismatched sums, formation enumeration, named unit, Wiki troop ID and active skill label.
- `tools/nl_campaign_readiness_v1.js` deterministically reads the committed 21 shards, verifies full map coverage, and writes `data/ngoalong/modules/campaign/source_readiness_v1.json` with per-map source structural readiness, missing data, Boss count and blockers.
- `qa/nl_campaign_readiness_v1.test.cjs` exercises source-complete-but-not-playable, missing unit soldiers, wrong slot/order/totals, and invalid edition or duplicate map cases.

Run in complete checkout:
```sh
node tools/nl_campaign_readiness_v1.js
node tools/nl_campaign_readiness_v1.js --check
node --test qa/nl_campaign_readiness_v1.test.cjs
node --max-old-space-size=3072 --test qa/nl_campaign_module.test.cjs qa/nl_campaign_full_v2.test.cjs qa/nl_campaign_source_v3.test.cjs
```

**Current verification:** four isolated JavaScript tests pass on exact GitHub file content. The 249-map report is *not generated in this session*: `source_readiness_v1.json` cannot be claimed as committed until run against the full repository source. The earlier V3 handoff identified **eight source-structurally complete maps** (Wiki IDs 21–25, 27–28, 80). This is historical V3 evidence, not an independently rerun V4 number. These are *not playable* without mechanics approval and the real Save/combat wiring.

**Priority order for next action:**
1. Run the deterministic all-map readiness CLI on the checked-out source and review the first source-complete candidates.
2. Resolve Wiki ID crosswalk for actual unit/troop/skill identities with CHAT01/02/05, including `NPC_EXCLUSIVE_LABEL` skills; keep missing numbers and historical version conflicts unknown.
3. CHAT08 selects a small source-complete contiguous route or separate side-dungeon unlock; validates source skill origins and confirms real 3×3 orientation; connects battle adapter to authoritative combat and atomic Save v5 receipts.
4. Run consolidated Node QA, actual Chromium battle/replay, Save reload, legacy regressions and GitHub exact-SHA workflow on integration branch. Never promote V4 reference data directly to playable through a flag.

**Gate:** CODED / isolated QA PASS; full source report execution, runtime integration, GitHub Actions and owner playtest PENDING.
