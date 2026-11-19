# CHAT06 / CHAT02 — Same-dungeon NPC fallback, SIMULATED V1 (2026-11-19)

## Owner decision and purpose
When a Wiki NPC, formation, or troop combat dossier is incomplete, generate project-origin, **SIMULATED** content by copying a structurally valid NPC from the **same dungeon**. Similar, not identical, is acceptable. This does not make any Wiki numeric ID verified. Never overwrite a source record or infer classic parity from Mobile.

## Delivered
- `data/ngoalong/modules/campaign/nl_campaign_peer_fallback_v1.js` (CHAT06): pure deterministic peer-selection / candidate generator + CLI preview.
- `qa/modules/campaign/nl_campaign_peer_fallback_v1.test.cjs`: 5 safety and behavior tests.
- CHAT02 independent design overlay: `data/ngoalong/modules/troops/npc_35_simulated_peer_design_v1.json` on `feature/nl-mcv2-02-troops` with 35 research-only designs. This is **not imported into this branch**.
- Original `source_shards/*`, `npc_numeric_troop_crosswalk_v2.json` and `approved_bindings_v1.json` remain unchanged.

## Rules
1. Search only inside `map.npcs`; source-eligible donor has 1–5 unique slots, valid 3×3 positions, no `FORMATION_NOT_EXHAUSTIVE`. Prefer same Boss/normal class, nearest level, nearest encounter order. Deterministic tie-breaking.
2. Preserve every existing Wiki unit and slot. For partial formations clone up to the donor's formation count (capped at 5), using unused 3×3 positions. New unit has `troopWikiId=null`, `heroId=null`, `troopId=null` and provenance `SIMULATED`.
3. For 9 ambiguous and 35 missing source numeric troop IDs, propose a per-NPC-unit *combat design* with cloned same-dungeon peer behavior and bounded coefficients (attack 0.8–1.2, defense 0.8–1.2, project design morale +20). Preserve the original numeric ID only in a **reference** field; leave approved CHAT02/runtime binding null. Do not copy hidden abilities as verified Wiki claims.
4. If the map advertises more NPCs than its indexed roster, optionally create up to 20 placeholder NPC candidates named `Địch quân giả lập` using a same-map NPC. They have **no Wiki aiId**, no drops and no source status. If no suitable peer exists, mark unresolved and do not borrow a different map.
5. Any approved source-to-runtime mapping is *still blocked*. A `SIMULATED` combat intent must be reviewed as project-origin design by CHAT02/CHAT06, then separately integrated by CHAT08 with Save v5/replay/receipts and generator-level tests.
6. No Codex Cloud. No merge. No modifications to `index.html`, `tools/`, combat engine, Save or canonical generator in this branch.

## Reproducible commands on a full checkout
```bash
node --test qa/modules/campaign/nl_campaign_peer_fallback_v1.test.cjs
node data/ngoalong/modules/campaign/nl_campaign_peer_fallback_v1.js
node data/ngoalong/modules/campaign/nl_campaign_peer_fallback_v1.js --check
```
The generator reads all 21 pinned source shards, outputs `data/ngoalong/modules/campaign/npc_same_dungeon_simulated_preview_v1.json` as **optional review artifact**, and prints counts for maps, NPCs, 44 exception ID uses, simulated unit designs, incomplete formations, NPC placeholders and no-peer blockers. It does not enable gameplay.

## QA status
- Executed the actual committed generator in JavaScript isolation using a source-shaped 2-map fixture: 14+ assertions PASS.
- Executed the actual committed test script with a JavaScript test/assert harness: 5/5 PASS.
- Full 21-shard CLI, Node runtime, Chromium, exact-SHA CI, Save/replay and real-game acceptance **NOT RUN / PENDING** in this environment. Do not claim full-playable status.
- CHAT06 code commit `0c086f2eefb5c526ed4f8eaad461dbf16503b5cf`; QA test commit `74bfde3d80575c18c5c810789f47f384f005e406`. CHAT02 design commit `9b1a045225e56cdf77c02ae12955f53999773b5c`.

## Next step for CHAT08
Run the generator on the complete checkout, review generated candidates including boss tiers and 3×3 geometry, import **only** project-origin `SIMULATED` combat profiles via an explicit feature gate; never use `sourceTroopWikiIdKeptAsReference` as a runtime troop ID. Run source integrity comparison, Chrome preview, Save v5/replay/receipts, CI exact-SHA before accepting. `approved_bindings_v1.json` must not be altered without explicit approval.
