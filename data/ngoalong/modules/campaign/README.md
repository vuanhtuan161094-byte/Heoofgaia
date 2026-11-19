# CHAT 06 — PvE campaign data contract V1

**Scope:** only the independent game *Mưu Định Tam Quốc* in the Ngoạ Long branch. The reference is the **current VNG Mobile Wiki**, and classic webgame parity remains \`UNKNOWN\`. This module is not wired into the shared generator or Save yet (CHAT 08 owns integration).

## Existing source pipeline (do not recrawl)

Group02 already provides:
- \`data/ngoalong/group02_wiki/import_campaign_json.py\`: public per-map JSON importer, with VN/CN distinctions and raw army counts.
- \`data/ngoalong/group02_wiki/build_dungeons.py\`: normalized 249-map blueprint + conflict report.
- \`data/ngoalong/group02_wiki/reconcile_dungeon_versions.py\`: patch history crosscheck.

This module **consumes** \`wiki_dungeon_blueprints.json\`; never mutates it. Regenerate the compact loadable reference catalogue:

\`\`\`sh
node --max-old-space-size=3072 tools/nl_campaign_import_v1.js
node --max-old-space-size=3072 tools/nl_campaign_import_v1.js --check
node --test qa/nl_campaign_module.test.cjs
\`\`\`

The input blueprint is ~100 MB. These commands must be run from a checked-out branch with the existing Group02 sources. The generated catalogue and coverage report remain under \`data/ngoalong/modules/campaign/\`. This commit ships the importer and the **source-coverage index**; it does **not** assert that the 249-map generated JSON has already been rebuilt.

## Integrity and ownership

\`nl_campaign_core_v1.js\` exposes \`compileWikiDungeons\`, \`validateCatalogue\`, \`makeState\`, \`canEnterMap\`, \`beginEncounter\`, \`settleEncounter\`. Compiled maps/NPCs are **REFERENCE_ONLY by default**. Approval files begin empty; 0 records are gameplay-ready before explicit reviews.

Any promotion requires an approval record for map chronology, unlock, version, map-wide rules, rewards, NPC stage-only skills, and each unit's hero/troop/active skill ID with an exact Wiki-name crosswalk and registry membership. The possible skill origins \`HERO_ACTIVE\`, \`TROOP_ACTIVE\`, \`NPC_STAGE_ADDITION\` and \`MAP_WIDE\` remain separate. Source troop mismatches are preserved and block promotion. Wiki slot 1–9 translates to engine slot 0–8 **DERIVED**, pending chat 08 orientation check.

A Boss may occur at any verified NPC order; do not move it to the final row. If order/count is unknown, lock that map rather than creating NPC substitutes. Clear each NPC in source order; unlock subsequent maps only through reviewed predecessor links and city-level thresholds.

The progression adapter is pure: it never edits the current Save v5, resources, battle RNG, replay, or generator. \`settleEncounter\` only returns *reward instructions* with stable first-clear receipt keys. Chat 08 must apply the new progress state and receipt grants **atomically** via the existing Save v5 authority and trusted combat result; no reward is automatically issued here. An unverified report or duplicate battle ID is refused. Do not enable the module in the shared runtime without full Save/replay/receipt regression.

## Source limitations

Source builder report: 249 maps, 4,903 NPC details, 170 roster-complete maps, 79 incomplete, 97 unverified formations, 344 confirmed numeric source soldier-sum mismatches in the current 16 MB extraction, and **0 fully gameplay-ready maps** at the source review stage. The lower-level unit data does not supply validated runtime hero/troop/skill bindings. Historical patches and mobile/classic differences are not silently merged. No Chromium is required per map; the separate integration chat must run consolidated Chromium/Save/CI QA.

## Implementation V2 (source-backed)

- `starter_wiki_reference_v1.json`: actual pre-reviewed **10 early map records**, Khúc Dương's **5 ordered NPC records** and **7 single-unit detail snapshots**, derived only from read-only Group02 inputs. This reference is **not a 10-map playable pack**.
- `nl_campaign_shards_v1.js` and `tools/nl_campaign_shard_import_v1.js`: batch-convert Group02's ~100 MB/249-map blueprint to compact map shards (12 maps per file) and a manifest with ID-to-shard mapping; source counts must match the Group02 report, source SHA256 is recorded. Each shard keeps original NPC soldier conflict, skill origin and field provenance. Commands:

  ```sh
  node --max-old-space-size=3072 tools/nl_campaign_shard_import_v1.js
  node --max-old-space-size=3072 tools/nl_campaign_shard_import_v1.js --check
  node --test qa/nl_campaign_full_v2.test.cjs
  ```

  `loadShard` loads one reference map group, `assembleShards` validates and joins all shards. **Do not bypass unverified maps/NPCs**.
- `nl_campaign_battle_adapter_v1.js`: `inspect` returns a real NPC roster and 3×3 grid for game UI, `prepare` produces a battle request from reviewed IDs and a **real** combat registry resolver. `settle` only accepts a trusted combat report, and requires a single atomic Save+receipt callback from CHAT08. No fake battle resolution or direct reward grants.
- Current source builder: 249 map rows, 4,903 NPC rows; 170 complete NPC rosters / 79 incomplete; 97 NPC formation gaps; 344 confirmed numeric soldier mismatches. **0 maps have approved combat bindings currently**. All 249 are importable research records; none is automatically enabled.
- **Verification:** 6 new source-backed deterministic QA cases pass in JS isolation; 6 earlier core QA cases also passed. Full source conversion, canonical HTML integration, Chromium and exact-SHA CI not yet executed on the task branch.

Verify deterministic real early-map import: `node tools/nl_campaign_starter_import_v1.js --check`. Rebuild only from immutable Group02 sources: `node tools/nl_campaign_starter_import_v1.js`.


## V3 CURRENT — full catalogue now materialized (2026-11-19)

**This V3 section supersedes earlier statements about not having imported the complete source.** Instead of fetching the 100 MB expanded blueprint, the existing Group02 \`wiki_dungeons_extracted.json\` (16 MB, pinned Git blob \`7318568320612ccd4c3c31bd762010609347c893\`) was read, validated against the Group02 builder report and converted using \`tools/nl_campaign_extract_import_v1.js\` into **21 committed JSON shards** in \`data/ngoalong/modules/campaign/source_shards/\` plus \`manifest.json\` and \`coverage.json\`. The import includes **249 real map records, 4,903 named NPC rows and 23,914 observed unit slots**. It never creates missing NPCs, soldier counts, skills or exclusive formulas.

Source reconciled: 170/249 exact roster-complete maps, 4,806/4,903 exhaustively enumerated NPC formations, **344 numerically confirmed source soldier mismatches**, and 17,850 units with unknown soldiers. All are source research, **0 gameplay-ready** until bindings and authoritative combat/Save approval.

\`tools/nl_campaign_binding_backlog_v1.js\` generates \`wiki_binding_backlog_v1.json\`: 346 distinct Wiki troop numeric IDs, 1,972 distinct skill namespace/label pairs, 196 NPC-exclusive skill labels. 302 troop IDs have one **unverified name match** to Group01 troop references; 9 have ambiguous matches. These are **not** approved combat mappings. Skill labels, unit battle positions, NPC-specific actions, map-wide effects and Mobile/classic editions remain separately typed.

Commands from a full local repository checkout:

\`\`\`sh
node --max-old-space-size=3072 tools/nl_campaign_extract_import_v1.js --check
node tools/nl_campaign_binding_backlog_v1.js --check
node --max-old-space-size=3072 --test qa/nl_campaign_module.test.cjs qa/nl_campaign_full_v2.test.cjs qa/nl_campaign_source_v3.test.cjs
\`\`\`

Current QA is isolated JavaScript/source consistency; shared runtime \`index.html\`, Save v5 and real combat are still owned by CHAT08. Do not claim Chromium, CI exact-SHA or a playable 249-map campaign before integration.

## CHAT06 V5 — Source reconciliation for all 249 dungeons

Full source audit is committed, but no Wiki dungeon is automatically playable:
- 249 maps, 4,903 NPCs, 23,914 observed 3×3 unit slots, 170 roster-complete maps.
- 17,850 missing unit soldier amounts; 344 numeric soldier sum conflicts; 97 NPC formations incomplete.
- 3 zero-remainder ambiguities blocked; 0 auto-filled fields, 0 gameplay-approved maps.
- 59 historically referenced map-title matches and 11 patch events without a unique match; historical rules never overwrite the current snapshot.
- 7 selected NPC-unit snapshots corroborated (32 field agreements); 4 detailed selected-unit skill facts; none is a complete team or approved combat formula.

New code and source outputs:
- data/ngoalong/modules/campaign/nl_campaign_evidence_v5.js
- data/ngoalong/modules/campaign/evidence_batches/batch-001.json to batch-003.json (all 249 maps and 4,903 NPC rows)
- data/ngoalong/modules/campaign/source_reconciliation_index_v5.json
- data/ngoalong/modules/campaign/verified_secondary_wiki_facts_v5.json
- data/ngoalong/modules/campaign/source_repair_queue_v5.json
- tools/nl_campaign_evidence_v5.js, tools/nl_campaign_verified_facts_v5.js, tools/nl_campaign_repair_queue_v5.js
- qa/nl_campaign_evidence_v5.test.cjs

Deterministic full-checkout commands:
    node --max-old-space-size=2048 tools/nl_campaign_evidence_v5.js --check
    node tools/nl_campaign_verified_facts_v5.js --check
    node tools/nl_campaign_repair_queue_v5.js --check
    node --test qa/nl_campaign_evidence_v5.test.cjs

10/10 isolated JS checks passed on the committed source/index. Native Node, shared browser battle, Save/replay and exact-SHA Actions have not been confirmed.
See docs/handoffs/NGOALONG_CHAT06_CAMPAIGN_V5.md for priority groups, limitations and CHAT08 handoff.
