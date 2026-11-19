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


## V3 — Chat 08 exact implementation handoff (no source authority transfer)
**Source commit:** 5b5b4bfcadfb47c6643aa0680224c434c3c049f8 (panel V1; read the new HEAD for subsequent QA revisions).

Additional files:
- \`data/ngoalong/modules/city/city_panel_v1.js\`: UMD/CommonJS UI component with \`createPanel({engine,catalog,research,getGame,save,now,openLegacy,onResult})\`.
- \`qa/modules/city/city_panel_v1.test.cjs\`: 38 building identifiers, 8 research IDs, selection, real build/harvest, market, workshop, research, duplicate-click receipt, legacy navigation, responsive CSS.
- Exports \`NLCityPanel.stylesheet\`; \`panel.render()\` returns accessible HTML, \`panel.bind(element)\` attaches one delegated click handler and returns an unbind function.
- \`panel.handle(intent)\` is available for integration testing but should not be reimplemented by chat 08. The panel uses a deterministic **same-render** \`city-ui:seq+1:kind:id:op\` actionId; only a successful transaction increments the engine receipt seq. A double-click on the same rendered button repeats the same receipt ID and is ignored. A genuinely new click after repaint receives a new ID.
- \`panel.coverage\` requires exactly **31 project facilities + 7 legacy**; fails closed if IDs are duplicated or catalog coverage is incomplete.
- Legacy \`openLegacy(id)\` **must route to the existing actual game control**, not to a fake upgrade button; the panel only adds Chợ purchase/sale actions to legacy state.
- \`NLCityPanel.stylesheet\` is responsive for mobile <=760px, no poster assets or HTML file variants.

### Chat 08 implementation sequence
1. Check latest PR #10 HEAD and \`docs/operations/NL_MULTI_CHAT_V2.md\`; keep it Draft. Review this source commit independently.
2. Add \`catalog_v1.json\`, \`tools/nl_city_engine.js\`, and \`city_panel_v1.js\` through the **existing canonical** \`tools/build_ngoa_long_mode.py\` or another owned canonical build step (not a competing HTML). Preserve the existing build patch markers and BOOT constant.
3. Instantiate **inside the existing game closure**, after \`NL_GAME_DATA\` and \`game\` exist:
   \`const cityEngine=NLCityEngine.createEngine(NL_CITY_CATALOG, NL_GAME_DATA.research);\`
   \`const cityPanel=NLCityPanel.createPanel({engine:cityEngine,catalog:NL_CITY_CATALOG,research:NL_GAME_DATA.research,getGame:()=>game,save:()=>save(),now:()=>Date.now(),openLegacy:id=>{/* route to original city panel */}});\`
4. Append a unique container to \`renderCity\` while preserving its **existing** market/farm/barracks/academy/walls controls. Each native \`render()\` call may replace DOM, therefore unbind the old city root before binding the **new** \`#nl-city-panel-root\` element; otherwise buttons appear inert after changing tab. Do not bind twice, do not create an extra timer.
5. Call \`cityEngine.advance(game,Date.now())\` on load and from the existing runtime tick. Preserve \`game.nlCity\` as additive nested state of the one Save v5 object; validate that native \`save()\`, reload, import/export, old v1-v4 migration and replay retain its receipts. Account for panel \`render()\` running \`advance\` via \`engine.view()\`.
6. Bring all *in-scope* effects to their canonical consumers (Chat 01/02/04/05/06). Do not claim reserve, hero, equipment or naval bonuses live merely because they are displayed in city UI. \`research\` must be handled **either** by the native R03 handler or city action per click, never both.
7. Run focused tests, browser at 1280×720 and 390, save/reload and exact SHA CI only after integrator finishes wiring. Check 38/38 selection, 31/31 build, 34/34 operation paths, one-time receipts and legacy parity.

**Status:** Chat 03 delivers working code + focused non-browser tests; the only missing point for buttons to work in canonical game is **Chat 08 runtime ownership**. The old source claim "full 38 integrated" is not valid until the integration QA passes.

## V4 — Runnable native-render lifecycle bridge (CHAT 08 integration-ready)

Source: \`data/ngoalong/modules/city/city_runtime_hook_v1.js\`; test \`qa/modules/city/city_runtime_hook_v1.test.cjs\`. Pure UMD/CommonJS. It does not mutate canonical source or create a competing HTML file.

Within **CHAT 08-owned generator's existing game closure**, inject the engine+panel+hook JS and catalog once, after \`NL_GAME_DATA\`, R03 and all renderer overrides have been prepared, *before* final \`BOOT\` call. Then bind:

\`\`\`js
const cityHook=NLCityRuntimeHook.createIntegration({
  catalog: NL_CITY_CATALOG,
  research:NL_GAME_DATA.research,
  engineApi:NLCityEngine,
  panelApi:NLCityPanel,
  getGame:()=>game, save:()=>save(),
  now:()=>Date.now(),
  findRoot:id=>document.getElementById(id),
  openLegacy:id=>{
    // MUST implement legacy display focus via original [data-focus-building].
    // Keep original building handler, never create a duplicate upgrades handler.
    const nativeBtn=document.querySelector('[data-focus-building="'+id+'"]');
    if(!nativeBtn)throw Error('NATIVE_CITY_BUILDING_NOT_FOUND:'+id);
    nativeBtn.click();
  }
});
renderCity=cityHook.wrapRenderCity(renderCity);
render=cityHook.wrapRender(render);
tick=cityHook.wrapTick(tick);
\`\`\`

Include \`NLCityPanel.stylesheet\` in the existing canonical CSS. The bridge appends a **single** \`#nl-city-panel-root\` after the existing native city markup and rebinds on every replaced \`#view\`. It wraps existing \`tick\` (no second interval) so the city clock is advanced through the real native game loop. Saving/replay are still owned by the original game: after city action it invokes the supplied \`save()\`, preserving Save v5.

**Important QA / integration blockers:** The native city may expose only 9 focusable original building tiles, while this source keeps 7 legacy aliases; the integrator must map them correctly, or explicitly mark navigation unavailable (not invent a control). Full browser/P2 QA and real Save migration still belong to 08 and are not asserted by this handoff. Wrap render only **once**; installing twice would duplicate the panel. Review tree after other chat commits before cherry-pick/port. 08 must add real item/troop/hero bonus consumers independently.

Run checks: \`node qa/nl_city_cycle.test.cjs\`, \`node qa/nl_city_full.test.cjs\`, \`node qa/nl_city_operations.test.cjs\`, \`node --test qa/modules/city/city_panel_v1.test.cjs qa/modules/city/city_runtime_hook_v1.test.cjs\`.


## V5 balance contract (2026-11-19)
- **Source:** \`data/ngoalong/modules/city/catalog_v1.json#policy.balance\` and \`tools/nl_city_engine.js\`. Version \`2\` is a tuning **configuration version**, not a change to the existing \`nlCity.schemaVersion=1\` or Save v5.
- Starter escrow holds two hours of resources, with six-hour **offline time cap**; treasury, granary and depot improve local stock thresholds. Tax and trade revenue bonus caps +25%; mint buffs residence silver; hunting buffs paid quest; lighthouse discounts sea-trade duration. **All economics SIMULATED**.
- Every completed \`operate\` must respect \`dailyUsage\` UTC-day quota + cooldown; only successful actions increment the count. Native UI should display \`dailyUsed/dailyLimit\`. Quotas reset at 00:00 UTC, independent of browser locale. On local clock rollback the engine refuses **new** actions (\`CLOCK_ROLLBACK\`) but historical receipt retries remain idempotent.
- Local item store uses a 10,000,000/unit soft ceiling: old over-ceiling saves can reduce existing stock, new token creation is blocked until there is room. Currency caps remain Number.MAX_SAFE_INTEGER, not the new city token ceiling.
- No new top-level resources, no direct modification of legacy farm/market generation; 8 legacy research formulas stay unchanged.
- Review deterministic standalone figures in [BALANCE_REPORT_V2.md](BALANCE_REPORT_V2.md); [tools/nl_city_balance_sim.js](../../../../tools/nl_city_balance_sim.js) is gross passive-only and assumes buildings already owned. Do not substitute its 30-day figures for real game outcome.
- CHAT 08 must copy revised catalog/engine/panel/hook together and verify actual Save, Chromium, exact-SHA CI only after canonical generator integration. Do not merge.

## CHAT 03 — PHẠM VI KHÓA / CLOSED FOR SPECIALIST CODING (19/11/2026)

**Quyết định của Owner:** Chốt phạm vi code và cân bằng kinh tế V2 tại thời điểm này; sẽ tổng hợp danh mục công trình Ngọa Long / khác biệt phiên bản trong đợt sau. Không mở rộng thêm Wiki hay hệ Quý Tử lúc đóng phạm vi.

- **Mức hoàn thành:** 31 công trình module nguyên bản có cơ chế nâng/cost/sản xuất/hành động; 7 công trình legacy tham chiếu/giữ nguyên, tổng **38 mục của dự án**, không phải danh mục đủ mọi công trình Ngọa Long Wiki.
- **Hệ kinh tế:** cost curve, giới hạn sản xuất và offline, kho, thuế, trade, daily cap và receipt chống trùng có kiểm thử tập trung **54/54 PASS trong JS harness**; **KHÔNG** có bằng chứng Chromium, direct Node hay CI exact SHA trên HEAD chuyên môn.
- **Chưa hoàn thành sản phẩm cuối:** Chat 08 chưa tích hợp panel/city engine vào canonical `index.html` và Save thật; hiệu ứng liên thông tướng/quân/trang bị/thủy chiến phụ thuộc nhóm khác. Không được ghi "INTEGRATED", "OWNER_ACCEPTED" hoặc "đã đủ toàn bộ công trình Ngọa Long".
- **Handoff:** tổng điều phối 00 và integrator 08 sử dụng bản này để hợp nhất sau; đối chiếu dữ liệu VNG mobile/Ngọa Long web cổ điển theo edition trước khi lập danh mục mở rộng. Giữ PR #10 Draft, **không merge**, không dùng Codex Cloud.
- **Trạng thái chính thức CHAT 03:** `DOMAIN_CODE_COMPLETE / FOCUSED_QA_PASS / INTEGRATION_PENDING / WIKI_COVERAGE_PENDING / OWNER_GAME_ACCEPTANCE_PENDING`.
