# HG93 — Four-realm world and future multiplayer contract (2026-11-16)

## What is implemented now

- Offline 200 × 200 tile grid (40,000 tiles), with four 100 × 100 realms.
- The original 0–99 area, historical sourced POIs and existing castle/mine
  coordinates are retained. The source of truth remains the offline engine.
- 16 Saint / 4 Divine capturable castle tiles: four Saint plus one Divine
  per race. Capturable through the existing engine siege and city loop.
- Defenders use three full highest-tier T8–T10 stacks, 400 per Saint stack
  and 700 per Divine stack, with 3× / 5× raw HP, ATK and DEF siege boosts.
  Defender metadata records CS3 or CS5.
- 20 unique settlement-locked special soldier definitions, 3× / 5× raw
  T10 HP, ATK and DEF; recruitment requires the city to be captured,
  currently active, sufficient treasury, and transactional v07 verification.
- Deterministic region travel buttons, enhanced castle pins and legends.
  Existing castle artwork is temporarily reused with Saint / Divine glow.
- Save remains version 7. Old AI states are expanded only with the new
  castles, never reset. Original private Boss placements stay in legacy zone.

## Work not yet completed

- Full claim/farm mechanic for every walkable empty tile. The existing
  340+ HG92 POIs, mines, cities, NPCs and farm locations are playable,
  but empty terrain is still scenery.
- 20 bespoke hand-approved Saint / Divine castle sprite illustrations.
  Current glowing castle pins are an intermediate art upgrade.
- Independent combat-power benchmarking and server-side balancing;
  HP × ATK × DEF does **not** imply total effectiveness only 3× / 5×.
- On-device Android manual acceptance and real-world game-load profiling.
- Multiplayer, shared persistent ownership, guild combat, matchmaking,
  authoritative servers and anti-cheat. These do not exist in HG93.

## Safe multiplayer architecture (design only)

Do not extend a 40,000-tile client array forever to represent an MMO.
Use stable identifiers `world_id:realm_id:chunk_x:chunk_y:tile_x:tile_y`
and deterministic terrain generation. Keep present v07 coordinates as
`world_0 / realm_0` when migrating, without rewriting existing saves.

Suggested server components:
1. Authentication, identity, access policies, rate limits and per-account
   resource ledgers. The client submits intentions, not results.
2. World authority: chunk ownership, battles, mines, alliances, siege
   windows and seasonal politics; no client-authoritative claims.
3. Combat worker: deterministic outcome (with recorded seeds), auditable
   loot, idempotent action IDs, and anti-replay controls.
4. Realm interest subscriptions: stream only visible chunks and adjacent
   actor events. Draw a low-resolution region summary on the minimap.
5. Persistence: transactional ownership changes with optimistic versions
   or per-tile serialization. Separate tile geometry from state and
   players; retain audit logs and restore points.
6. Shard allocator: create additional worlds / seasons on demand.
   Cross-shard diplomacy and migration must be intentionally designed.

Performance targets are hypotheses to test, not promises: benchmark
initially 50/200/1,000 concurrent clients, asset IO, draw frames, pathfinding,
server tick, transfer contention and persistence before setting server
population caps. Online migration should be a separate, reversible project.

## Release gates

- Static: 40,000 world cells, exactly 20 unique special castle IDs and
  consistent 16/4 / 4-race distribution.
- All old canonical POIs remain, no overwritten source tile, and v07
  old/new save compatibility.
- Deterministic defenders, no free holy troops, treasury checked server-side
  when multiplayer eventually exists.
- Real Chromium touch/mouse navigation, pan/zoom and actual combat.
- Art owner approval only after real screenshot and review, no automated
  `ART_PASS` claims.

### Operational constraint

One branch only: `feature/hog1-research-to-playable-20261102`.
One offline `Play-Heoofgaia-HG11.html`. No branch or merge.
