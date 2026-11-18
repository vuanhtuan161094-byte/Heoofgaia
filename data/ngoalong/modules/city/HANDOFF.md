# CHAT 03 — CITY / ECONOMY V1: INTEGRATION CONTRACT

## Source / scope
- Source base \`feature/nl-codex-cloud-v1-finish@e33e36255d62ea51af7f48386b8d3c56c6448369\`; task branch \`feature/nl-v2-city\`.
- New files under \`data/ngoalong/modules/city/\`, \`tools/nl_city_*\`, \`qa/nl_city_*\` only.
- No modification to generator, \`index.html\`, \`alpha_content.json\`, workflow, Save or Hero. No Cloud Codex.
- \`data/ngoalong/modules/city/catalog_v1.json\` identifies all project-owned and read-only legacy buildings, sources, map positions, costs, timer, production and effects.
- Existing core runtime already has market/farm production, eight data-driven research IDs, battle receipts, item costs and Save v5. Never duplicate its auto-tick or reinterpret legacy building prices.

## Research and version separation
The source Wiki is **VNG Mobile current**, not proof of classic webgame parity. Quý Tử's **26 seasonal buildings** and CN-only **14 high technologies at City Hall 280–400** are different subsystems, **REFERENCE_ONLY / BLOCKED**. The VNG guide names Nhà Chính, Phủ Sách Lược, Cửa Hiệu, Tài Vụ, Dân Cư, Xưởng and Tiền Trang but does not verify detailed formulas. New four project buildings, cost curves, timers, output and effects here are **SIMULATED**; never claim exact VNG mechanics.

## Runtime interface to chat 08
\`tools/nl_city_engine.js\` is a pure UMD/CommonJS runtime. For browser: load engine source from the **existing canonical generator**, inject catalog via generator, then:

\`\`\`js
const city = NLCityEngine.createEngine(cityCatalog, alphaContent.research);
city.advance(game, Date.now()); // must also occur on load/reload
const dto = city.view(game, Date.now());
const r = city.act(game, {
  kind: 'build', id: 'nl_city_ironworks',
  actionId: stableUniqueIntentId, now: Date.now()
});
if (r.ok && !r.duplicate) { save(); render(); }
\`\`\`

- Action kinds \`build\`, \`harvest\`, \`research\`; all require a stable string \`actionId\` unique per user action. Retry must reuse the **same** ID.
- \`game.nlCity\` is an additive optional Save v5 object: \`levels\`, \`stock\`, \`remainder\`, \`construction\`, \`receiptIndex\`, \`receipts\`, \`lastAt\`. Never change Save key \`muu_dinh_tam_quoc_v1\` or create separate storage.
- \`view().buildings\` contains \`grid\`, \`level\`, \`nextCost\`, \`nextSeconds\`, \`productionPerMinute\`, \`stock\`, \`capacity\` and effects for clickable map tiles. \`view().legacy\` must use **existing** upgrade buttons; don't bypass old economy authority.
- Build costs debit at start, takes real elapsed clock seconds, one construction job, increments level only after due; production credited to **capped escrow** after completion, player-initiated \`harvest\` alone transfers escrow once into real game resources. Offline production is capped at 6 hours; repeated time or backdated call cannot re-credit.
- Research IDs, costs, level gate and effects are read from **existing** \`alpha_content.json#research\` and written to \`game.technology\`/\`techSpent\`. **A UI click must use either this research action or the old native R03 research handler, NEVER both.** This engine does not modify existing \`lastTick\` or the legacy auto-production.
- Gameplay hooks: \`city.bonuses(game,now)\` -> \`reserveCapacityFlat\` (chat 05, add to one canonical reserve cap), \`equipmentUpgradeDiscount\` (chat 04, agree on rounding and real debit). No effect claim until those consumers are integrated.

## Acceptance / gaps
Focused Node gate: \`node qa/nl_city_cycle.test.cjs\` tests paid construction, timer, escrow, harvest, duplicate receipt, upgrade, native research costs, v5 roundtrip, capped offline interval and shortage. CI exact-SHA, Chromium UI actions, 04/05 bonuses, in-game Save/reload and balance remain **PENDING**; no full CI or preview video was requested. Client-side offline clock is not anti-cheat against intentional clock manipulation. This is CODE READY for chat 08, **not yet INTEGRATED**. Keep Draft/unmerged.
