# CHAT 03 — COMPLETE CITY + NAVAL FACILITY CATALOG V2

**Base:** \`feature/nl-v2-city@ffece5f96df3322ecdd442f3c4a743d11905bc57\`  
**Scope:** solely \`data/ngoalong/modules/city/\`, \`tools/nl_city_*\` and \`qa/nl_city_*\`. No generator/index/alpha_content/Save/workflow modifications, no merge, no Codex Cloud.

## Inventory / provenance
- **31 new, interactive project-owned facilities**: original four retained and 27 added. Twelve thousand? No: this count is exact, not an estimate.
- **7 existing legacy building links** retain authoritative \`game.buildings\` and current UI/tick; no parallel market/farm/barracks or academy production.
- Named facilities derive from VNG 2026 guide, 2017 Mobile architecture and naval article, and historical community Wiki. Individual name/source mapping in \`catalog_v1.json#buildings[].provenance\`. Cost, cap, timer, yield, gameplay effect, unlock and trade volume are **SIMULATED**, not copied from VNG.
- City-core and naval buildings are tagged individually. Naval building names are **reference only for gameplay** until chat 02/06 supply marine troop/expedition integration.
- Explicit exclusions: the 26 seasonal buildings of the **Quý Tử mini-game** and the 14 **CN-only advanced technologies** are not the main city buildings. Do not blend them into this economic state.
- World map, phó bản and country-view icons are activities/areas, not duplicate upgradeable city buildings.

## Functional economy loop
- \`tools/nl_city_engine.js\` is a pure JavaScript CommonJS/UMD engine.
- \`NLCityEngine.createEngine(catalog,alphaContent.research)\` uses exactly the current eight research IDs and expenses, preserving \`game.technology\` and \`techSpent\`.
- \`ensure(game,now)\` creates additive \`game.nlCity\` state and seeds \`nl_city_hall\` level 1 as an existing basic city, without minting currency. Other facilities begin level 0; their levels, build job, escrow, warehouses, finished operations, cooldowns, and intent receipt index persist across Save v5 roundtrip.
- \`act(game,{kind:'build',id,actionId,now})\`: pay once, one active construction job, next level at \`finishAt\`, capped level and hall gates. No timers created internally.
- \`act(game,{kind:'harvest',id,actionId,now})\`: transfer bounded passive production escrow once. Legacy silver/grain tick is not modified.
- \`act(game,{kind:'operate',id,operationId,actionId,now})\`: pay inputs (actual silver/grain/iron/prestige or city warehouse goods), enforce cooldown and one pending job per building, with immediate or timed credits. Timed operations **must** be followed by \`act(kind:'collect')\` after ready, and cannot yield resources on repeated tick.
- \`act(game,{kind:'collect',id,operationId,actionId,now})\`: settle one complete operation once. Costs and output based on level; refunds/notes/goods/ships local to \`game.nlCity.warehouse\` until another domain explicitly consumes them. No free unlimited currencies or negative balances.
- \`act(game,{kind:'research',id,actionId,now})\`: delegate to the same canonical 8 tech IDs and project cost catalog. **Do not also invoke legacy R03 handler for the same click.**
- \`view(game,now)\`: full 6-column grid mapping, level, lock, costs, time, stock, action options, active operations, warehouse and stats. \`bonuses(game,now)\`: live bonus catalogue; tax/trade effects are used **inside this engine** already; others await owner module integration.
- The only valid account currencies remain \`silver\`, \`grain\`, \`iron\`, \`prestige\`. Local tokens \`goods\`, \`parts\`, \`rations\`, \`orders\`, \`ships\`, etc. are stored in \`game.nlCity.warehouse\`, not invented top-level resources.

## Contracts
- Chat **08**: wire engine/catalog into canonical generator and the existing game state, create persistent unique \`actionId\` per click; call \`advance\` on load/tick and show actual 31 tiles with clickable build/harvest/operate/collect panels; preserve all legacy controls.
- Chat **04**: consume equipment offer tiers, engraving stones, inventory-cap and discounts exactly once through the real item handler. Do not create item drops directly in the city module.
- Chat **05/02**: consume reserve cap, troop-tier access, training and naval modifiers once in canonical calculations; don't apply a bonus twice. Naval combat remains pending until ship mechanics exist.
- Chat **01**: consume hero training XP, inheritance, skill, horse bonuses or hero-scroll items through a receipt-safe hero progression handler.
- Chat **06**: trial tower tokens merely unlock a separate encounter; NO fabricated battle rewards or unlocked floors without a verified battle receipt.
- City Hall gate is a **project progression curve**, not a VNG stage/level equivalence. Rarity, premium currency and multiplayer trade are intentionally not invented.
- Do not expose \`game.nlCity\` as a new Save key. Do not rewrite existing market, farm, barracks or academy logic.

## QA
Run \`node qa/nl_city_cycle.test.cjs\` (legacy core 10 checks) and \`node qa/nl_city_full.test.cjs\` (all facilities, operations, queue, credits, cooldown, save and anti-dup). All integration/browser/Actions gates remain pending until chat 08 rewires canonical source.

## V2.1 native Chợ + Xưởng completion
- The pre-existing `game.buildings.market` is NOT duplicated: two additive buy/sell grain actions debit and credit the real `game.silver` and `game.grain` using its native level, unique intent receipts and cooldown.
- The original `nl_city_workshop` is now labelled **Xưởng — Công Tượng Phường** and includes a timed `forge_goods` action creating actual warehouse goods and parts after a paid iron/grain operation. Chat 04 may later consume those via its real item APIs.
- These actions share the same city receipt ledger as all 31 buildings; integration must not double-trigger the old market UI event.
