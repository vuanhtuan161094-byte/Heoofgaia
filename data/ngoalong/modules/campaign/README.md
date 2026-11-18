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

Source builder report: 249 maps, 4,903 NPC details, 170 roster-complete maps, 79 incomplete, 97 unverified formations, 344 rows flagged as nonmatching by Group02's builder (may include sums not verifiable numerically), and **0 fully gameplay-ready maps** at the source review stage. The lower-level unit data does not supply validated runtime hero/troop/skill bindings. Historical patches and mobile/classic differences are not silently merged. No Chromium is required per map; the separate integration chat must run consolidated Chromium/Save/CI QA.

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
- Current source builder: 249 map rows, 4,903 NPC rows; 170 complete NPC rosters / 79 incomplete; 97 NPC formation gaps; 344 reported nonmatches (some sums unknown). **0 maps have approved combat bindings currently**. All 249 are importable research records; none is automatically enabled.
- **Verification:** 6 new source-backed deterministic QA cases pass in JS isolation; 6 earlier core QA cases also passed. Full source conversion, canonical HTML integration, Chromium and exact-SHA CI not yet executed on the task branch.

Verify deterministic real early-map import: `node tools/nl_campaign_starter_import_v1.js --check`. Rebuild only from immutable Group02 sources: `node tools/nl_campaign_starter_import_v1.js`.
