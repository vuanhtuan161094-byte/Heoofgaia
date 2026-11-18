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

Source builder report: 249 maps, 4,903 NPC details, 170 roster-complete maps, 79 incomplete, 97 unverified formations, 344 source soldier-count contradictions, and **0 fully gameplay-ready maps** at the source review stage. The lower-level unit data does not supply validated runtime hero/troop/skill bindings. Historical patches and mobile/classic differences are not silently merged. No Chromium is required per map; the separate integration chat must run consolidated Chromium/Save/CI QA.
