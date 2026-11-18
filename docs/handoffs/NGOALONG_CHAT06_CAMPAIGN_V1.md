# CHAT 06 → CHAT 08 — Campaign catalogue, adapter, and integration gate

**Branch:** \`feature/nl-v2-campaign\`; parent \`feature/nl-codex-cloud-v1-finish\` at \`a88b8449714ad48531f7c9e7e081ccac43edee92\`. This handoff is intentionally separate from shared generator, alpha content, Save and runtime.

**Completed in this commit:** A fail-closed converter for the existing 249-map/4,903-NPC blueprint, original-source 3×3 slot preservation, Boss/order/unlock classification, separate HERO_ACTIVE / TROOP_ACTIVE / NPC_STAGE_ADDITION / MAP_WIDE authority, hard block on source army-count contradictions, explicit binding/approval contract, immutable pure multi-NPC PvE progression with stable once-only reward receipts, and one deterministic Node QA suite. Never reconstructs unpublished combat formulas.

**Source report checked (Group02):** 249 maps, 4,903 NPC rows; 170 roster-complete/79 incomplete, 97 formations not exhaustively verified, 344 verified numeric soldier-sum mismatches after recalculating from the 16 MB extracted source. \`fullyGameplayReadyMaps=0\`. The committed coverage index reflects this report, not an independently regenerated full catalogue. A ~100MB canonical blueprint requires running the existing local checkout importer to generate \`catalogue_generated_v1.json\`; this session did not run that giant source conversion.

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

Early catalogue deterministic rebuild: `tools/nl_campaign_starter_import_v1.js --check`; QA V2 now includes direct equality with the two original Group02 JSON sources.


## CHAT06 V3 — source catalogue and bindings delivered

**New committed source artifacts**: \`data/ngoalong/modules/campaign/source_shards/\`: \`manifest.json\`, \`coverage.json\`, and 21 separate \`shard-001.json\` … \`shard-021.json\`. Verified 249 map rows, 4,903 NPCs, 23,914 unit positions, 170 exact roster-complete maps, 4,806 exhaustive NPC formations, 344 numeric army mismatches and 17,850 units with no sourced soldier count. The first map's 5 NPCs (Bùi Nguyên Thiệu, Cao Thăng, Trương Yên, Ba Tài, Trương Bảo) retain original battle order and 3×3 positions.

**Binding backlog**: \`wiki_binding_backlog_v1.json\` is a working crosswalk of 346 numeric troop IDs and 1,972 distinct skill-label pairs. The 302 one-name candidate matches are **not** proof of matching runtime troop IDs. The 196 \`NPC_EXCLUSIVE_LABEL\` skill names must be reviewed separately from hero skills or map-wide effects. Do not auto-promote candidate bindings or assume all 249 maps are playable.

**CHAT08 action now**: consume shards through \`nl_campaign_shards_v1.js\`, retain version/slot/provenance; collaborate with CHAT01/02/05 to approve exact troop and skill IDs and original project mechanics, then create a small verified contiguous playable route. Wire \`nl_campaign_battle_adapter_v1.js\` to shared combat/Save v5 using atomic receipts and authoritative battle results; full browser/CI on exact integration SHA afterward. Old instructions above to regenerate the 100 MB blueprint are historical; use the 16 MB extracted importer for reproducibility.

**Current gate**: source materialization and isolated tests; NOT canonical game integration, NOT physical device or owner acceptance; no merge performed.


## CHAT06 V3 — next integration priorities (source completeness, NOT gameplay approval)

A consolidated check against the pinned 16 MB GitHub source and actual committed shards passed **13/13 JS consistency checks**: 249 maps, 4,903 NPC identities, 170 source-roster-complete maps, 344 exact numeric troop discrepancies, 21 shards, manifest/coverage, first and last shard reproduction, crosswalk reproduction, no auto-enabled runtime IDs, and 23,914 unit slots / 17,850 soldier values UNKNOWN. The Node regression suite \`qa/nl_campaign_source_v3.test.cjs\` is committed but has not been executed under GitHub Actions exact-SHA.

**Eight maps are SOURCE-STRUCTURALLY COMPLETE** (NPC roster count matches the Wiki index; all NPCs have enumerated formations; all per-unit soldiers are known and sum to NPC totals). This is *not* equivalent to verified playable mechanics: no hero/troop/skill/Save/combat bindings have been approved.

- Wiki IDs 21–25: Giang Đình Trụ, Dịch Kinh Lâu, Dã Tùng Lâm, Kho Thành Đô, Thiên Thủy Đạo (each 5 NPCs / 25 unit slots; city level 110)
- Wiki IDs 27–28: Bạch Lâu Mật Thất and Hang Dị Nhân (each 5 NPCs / 25 slots; city level 110)
- Wiki ID 80: Hắc Diệu Thâm Uyên (10 NPCs / 50 slots; city level 185)

These are candidate **data-driven side content** only. No story-link chronology, side/hard/main classification or unlock dependency has been approved from their numeric IDs. Do not mark them available before reviewed skills and real combat bindings.

**Early main route blockers (as extracted):** Khúc Dương (map 1, 5/5 NPC, one unit soldier count UNKNOWN); Quảng Tông (map 2, 7/7 NPC, three units with UNKNOWN soldier counts). Repair these using confirmed source rather than guessing. Map 3 Hổ Lao has 22/22 index rows but 73 unknown unit soldier counts and 1 incomplete NPC formation.

Do not merge, change the generator, \`alpha_content.json\`, Save or shared runtime from CHAT06. Integration is owned by CHAT08. Crosswalk name matches remain candidate-only.
