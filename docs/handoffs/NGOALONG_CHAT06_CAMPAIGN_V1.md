# CHAT 06 → CHAT 08 — Campaign catalogue, adapter, and integration gate

**Branch:** \`feature/nl-v2-campaign\`; parent \`feature/nl-codex-cloud-v1-finish\` at \`a88b8449714ad48531f7c9e7e081ccac43edee92\`. This handoff is intentionally separate from shared generator, alpha content, Save and runtime.

**Completed in this commit:** A fail-closed converter for the existing 249-map/4,903-NPC blueprint, original-source 3×3 slot preservation, Boss/order/unlock classification, separate HERO_ACTIVE / TROOP_ACTIVE / NPC_STAGE_ADDITION / MAP_WIDE authority, hard block on source army-count contradictions, explicit binding/approval contract, immutable pure multi-NPC PvE progression with stable once-only reward receipts, and one deterministic Node QA suite. Never reconstructs unpublished combat formulas.

**Source report checked (Group02):** 249 maps, 4,903 NPC rows; 170 roster-complete/79 incomplete, 97 formations not exhaustively verified, 344 rows flagged by the source builder as nonmatching (its logic may count unknown sums; numeric contradictions must be counted separately). \`fullyGameplayReadyMaps=0\`. The committed coverage index reflects this report, not an independently regenerated full catalogue. A ~100MB canonical blueprint requires running the existing local checkout importer to generate \`catalogue_generated_v1.json\`; this session did not run that giant source conversion.

**Required integration sequence:** 
1. Re-run \`node --max-old-space-size=3072 tools/nl_campaign_import_v1.js\` against checked-out Group02 sources, record emitted coverage and review every block reason. Do not conflate reference rows with 249 playable maps.
2. Ask respective chat 01/02/05 to provide exact hero/troop/skill/effect IDs plus crosswalk reviewed per Wiki unit and skill-specific version. Populate \`approved_bindings_v1.json\`; do not invent missing Wiki IDs, soldiers, stats, NPC-only skills or drops.
3. Choose a verified contiguous main campaign route and every NPC in **source order**; review map unlock/previous-map links, map-wide effect semantics, Boss, and reward provenance. No automatic \`mapId-1\` map predecessor.
4. Verify 1-based Wiki 3×3 slot orientation against engine 0-based enemy view, then adapt to official existing NL combat events.
5. Implement Save v5 atomic progress+reward receipts, immutable battle report/replay, first-clear NPC/map idempotence, and duplicate battle rejection in **CHAT 08 only**. Do not bypass battle-authoritative events.
6. One consolidated QA for NPC order, slots, binding graph, Boss, unlocks and receipts, then Chromium + Save/replay + legacy regressions + exact-SHA CI on the integration branch. Owner/mobile/classic parity remain separate gates.

**No claim:** The 249 source maps or 4,903 NPCs are currently playable; this source is VNG Mobile and cannot be assumed identical to classic Ngọa Long. Module code is not yet connected to canonical HTML.

## Implementation V2 — actual data + combat bridge

New files:
- `data/ngoalong/modules/campaign/starter_wiki_reference_v1.json` — 10 sourced early maps, 5 ordered Khúc Dương NPCs and 7 **partial** selected-unit detail snapshots (not full teams).
- `data/ngoalong/modules/campaign/nl_campaign_shards_v1.js`, `tools/nl_campaign_shard_import_v1.js` — 249-map batch loader with a compact manifest/shards and Group02 count guard; needs execution against the ~100 MB source at integration/build time.
- `data/ngoalong/modules/campaign/nl_campaign_battle_adapter_v1.js` — actual 3×3/skill source to combat registry bridge, progression inspect and trusted battle-settlement/atomic receipt API.
- `qa/nl_campaign_full_v2.test.cjs` — 6 isolated runtime-independent tests, passing. No Chromium per individual phó bản.

CHAT08 integration must combine modules in one browser-visible build, supply reviewed hero/troop/skill/effect IDs and an authoritative combat-result verifier + atomic Save v5 receipt application. Source Wiki links refer to current Mobile, **not** confirmed classic parity. Gate results cannot be promoted to CI/owner acceptance without evidence.
