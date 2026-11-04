# HG-10 Economy & World Audit — 2026-11-04

Baseline: commit `92e1087ec4bd07a91170593a3c2b2003c5c37ff0`. Scope: code inspection of `engine.js`, `hg05.js`, `hg08.js`, `hg10.js`, `app.js`, `data.js`, `qa-engine.cjs`, `docs/FIDELITY-MATRIX.md`, `docs/ROADMAP-MASTER.md`. No original-client equivalence asserted. Source-backed behavior and simulation remain separate. This is an audit checkpoint, not HG-10 COMPLETE.

Legend: PASS = implemented and supported by existing focused regression; PARTIAL = implemented but coverage or game design incomplete; BUG = demonstrated code flaw; MISSING = no full gameplay implementation.

| Subsystem | Status | Evidence / exact gap | Next acceptance |
| --- | --- | --- | --- |
| Five basic resources | PASS | `data.js` keys and `engine.js` `rate/limits/spend/add`, resources tracked per active city | Verify source/spend conservation on 24h multi-city fixture |
| Base production and city buildings | PARTIAL | Hourly core income, Town Hall income and local warehouse caps present; post-level-10 and original-economy parity not established | Verify level curves, maxed warehouses, fractional income and resource cap |
| Mine production | PARTIAL | Fame-scaled mine count and city attribution exist (`hg08.js`, `engine.js`); original rates and occupancy/recapture cases require broader proof | Capture/recapture/return multi-city receipt without double income |
| Build/upgrade | PARTIAL | Paid queue, one construction per city, completion-time boundary and v07 persistence; costs/times locally modeled | 24h offline queues for two cities and exact-once resource debit |
| Research/technology | PARTIAL | Paid research, queue and school gates; source-perfect costs and all cross-faction unlock gates absent | All factions and full spell levels |
| Recruitment/army | PARTIAL | Unit costs and 40-unit catalog, training queue and some specific gates; non-Human support gates only derived or incomplete | Table-driven prerequisites for 40/40 units |
| Market | PARTIAL | Sale to gold present, but exchange coefficients are simulation, no balanced buy economy | No-negative/no-duplicate trading, capped storage and pricing UX |
| Bazaar | PARTIAL | Real equipment purchases and inventory; catalog is prototype, items/pricing not sourced fully | Stock, purchasing invariants and full inventory economy |
| City transport | BUG FIXED IN CODE, QA PENDING | `hg10.js` used to discard excess elapsed time when outbound reached destination in a long offline tick, leaving the return leg unfinished. Fixed in commit `24925b1`; regression added `a40eeb6`. Holding remains a conservative modeled policy | CI pass and fresh-process browser; test outbound+return within one tick, blocked warehouse and once-only delivery |
| Independent city economy | PARTIAL | `CITY_FIELDS`, `storeCurrent/applyCity`, inactive-city tick, independent warehouse and queue present. Global hero/AP and local economy are separated | Independent 24h passive + queues across 2–6 cities |
| Offline catch-up | PARTIAL | 24h wall-time cap and production/queue split implemented; long intervals for returning convoy bug above | Test 23h59, 24h, 24h01, clock rollback, speed 1×/60× and fractional values |
| Save/Load | PARTIAL | Strict v07 validator, backup, legacy migration, original Save/Reload fixtures and localStorage; malformed files covered by some tests | Fresh-process 24h multi-city and resource/cargo ledger; export/import after patch |
| World 100×100 | PARTIAL | Procedural tiles, 4-direction BFS, fixed river bridges; world map renders/interacts, but world coverage and spatial design have not been visually accepted | Path reachability of all critical objectives at 100×100 and mobile click QA |
| Marches and returns | PARTIAL | AP-paid travel, up to 3 concurrent heroes, return and occupied mine/city flows; limits exist | Simultaneous orders, forced interruption, defeat, load and duplicate target rejection |
| NPC, encounter and loot | PARTIAL | Known dated 128 NPC camps and real battles; enemy composition and drops often local models | Reward determinism and never-double settlement |
| Treasure camps | PARTIAL | 76 dated coordinate targets and simulated roster/loot; collision layer at 10,8 handled | Target selection and camp collision across all 76 |
| Castle capture | PARTIAL | Fame city cap and secondary-city setup; captured-city stock/queues modeled | Race takeover, warehouse, city switch and old-save regression |
| World buildings/visits | PARTIAL | Ten daily interactables and daily state; some rewards use reconstruction | Daily boundary, rollback and duplicate claim test |
| Scouting | MISSING | No end-to-end scouting order and intelligence reveal system in current core | Design and implement gameplay, durable Intel state |
| Fog of war | MISSING | No persistent exploration/visibility authority over 100×100 | Unexplored/seen/visible data, serialization, reveal from scouting |
| Portals/teleport | MISSING / DEFERRED | No source-verified complete transport mechanic | Evidence-bound scope and implementation decision |
| Multiplayer/PvP | DEFERRED | No server ownership authority | Out of scope for offline HG-10 unless owner changes plan |
| World/city visual acceptance | PARTIAL | Browser evidence confirms some interaction paths; no owner world-map visual acceptance | Desktop/mobile screenshot comparison and OWNER VISUAL PASS |

## Repairs and outstanding risks

1. **Fixed:** long offline ticks must account for both outbound and return convoy legs without duplicate delivery or troops. `advanceCityTransports` now consumes carried-over elapsed game time. The pre-existing blocked-destination behavior remains unchanged.
2. **Open:** per-city offline accounting across construction and research completion boundaries, 6-city load and corrupted save recovery need additional stress testing.
3. **Open:** fog/scouting has no production-grade gameplay/Save schema; do not mark world COMPLETE.
4. **Open:** current economic rates, caps, trade prices, battle drops, several construction times and original-instance world behavior are declared simulations.
5. **Open:** browser and Android visual/interaction acceptance cannot be replaced by Node-only tests.

## Implementation order

- G0 regression: engine+browser CI for this fix, check save v07 and affected UX.
- G1 economy invariants: each resource has audited source/sink, city warehouse cap, two-to-six-city offline, queue boundaries, convoy no duplication.
- G2 world simulation: owned mines/castles, 3 marches, all targets, scouting/fog persistent state.
- G3 UI/UX: meaningful map intelligence and economic ledger; verify 960×540 desktop, mobile landscape, old saves, real click.
- G4 owner visual acceptance and release build. Only then mark HG-10 COMPLETE.

GitHub Actions and owner visual gates must be recorded with actual SHA, job status and evidence; PASS is never inferred from source changes.
