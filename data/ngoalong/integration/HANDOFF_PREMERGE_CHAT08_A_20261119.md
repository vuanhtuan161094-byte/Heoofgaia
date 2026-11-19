# CHAT 08 · Integration A — source-pinned handoff (2026-11-19)

Status: `CANDIDATE / PR #10 DRAFT / NO MERGE / NO RELEASE`.

## Git boundaries
- Repository: `vuanhtuan161094-byte/Heoofgaia`
- Integration review: `feature/nl-integration-review-20261119`
- PR #10 source head unchanged at `e33e36255d62ea51af7f48386b8d3c56c6448369`.
- No Codex Cloud, no default-branch write, no force push, no duplicate HTML.

## Changes made in this review branch
1. Fix the Chat02 Node import in `qa/modules/troops/nl_troop_runtime_v2.test.cjs` that failed on previous composite run #44482483469.
2. The *one canonical* `tools/build_ngoa_long_mode.py` now embeds Chat03's exact `catalog_v1.json`, `tools/nl_city_engine.js`, `city_panel_v1.js` and `city_runtime_hook_v1.js`. Native `renderCity`, `render` and `tick` are wrapped once. A single `nlCity` nested state, native Save v5 and original seven legacy city routes remain authoritative. No second timer or separate city Save.
3. Embed Group05 resolver/formation/skill adapter/tactical AI/PvE director and Group02 troop live bridge into that same HTML. Create an in-game read-only tactical view for the existing 28 project encounters (eight Boss profiles) and the 25 original project troop designs. This is **not** an executable migration of Combat V2, nor 249 Wiki maps imported into battle. Native P2 still owns action order, HP, morale, replay, rewards, and Save.
4. Add `qa/nl_city_integration.py` for real browser checks: 31+7 city tiles, paid construction, atomic receipt, persistence and reload, 390px viewport, 28/8/25 staged tactical source coverage and fail-closed Wiki binding.
5. Keep Hero207 (207 project SIMULATED recruits) and Items (411 project equipment/669 project items) existing canonical integration and browser regressions intact. Original 14 heroes, 28 project stages, 19 original gear, eight research, Save key `muu_dinh_tam_quoc_v1` schema v5 remain required.

## Strict safety boundaries
- CH02 44 exceptional numeric troop IDs (9 duplicate-label, 35 absent): `0 approved`. No automatic source-ID mapping.
- Chat06 249 maps / 4,903 NPCs / 21 shards: staged source evidence only; no new playable Wiki dungeon, no source-to-runtime numeric binding.
- Chat03 cross-domain bonuses (troop, hero, equipment, naval): only effects owned by city engine may be consumed; others are **PENDING** for their authoritative consumers.
- Chat05 standalone AI/Boss action resolver and 12 proposed Chat02 troop additions are **not** authoritative live combat. Tactical intelligence UI is labeled `SIMULATED / NOT LIVE`.
- CHAT07 art candidates were not imported or owner-approved. No asset or VFX changed here.
- No release/merge until composite exact-SHA full Actions, real 3×3 stage regression, Save/replay/receipts, and owner web/device acceptance.

## Required QA gates
- Execute focused `qa/modules/{heroes,troops,city,combat,campaign}` Node tests and `qa/nl_tactical_intel_view.test.cjs`.
- Canonical generator once and item builder; `qa/nl_heroes207_browser.py`, `qa/nl_premerge_hero207_items.py`, `qa/nl_city_integration.py`, R02/R03/P2/legacy browser suite.
- Full `game` job on exact SHA, not a green focused result on a prior SHA. The uploaded `index.html` artifact is the only Web Review candidate; the source branch's existing `index.html` is not proof of generated content.

## Remaining real integration backlog (do not disguise as completed)
A. Chat08 bind troop additive intent into native hit/status owner, never call standalone simulator as second damage engine.
B. Chat08 port the tactical AI / Boss director's *legal* skills/targets and six legacy status commands into native P2, with exact-seed replay and no double morale.
C. Chat08 bridge selected Chat06 NPC maps to native 3×3 battle only after explicit ID/skill ownership, with project SIMULATED fallback distinct from Wiki data.
D. Chat08 wire city bonuses to the canonical hero, equipment, training and troop consumers once each; naval feature remains unavailable without vessel engine.
E. Chat07 original gameplay art and VFX event mapping, owner preview + acceptance.

This is an **integration batch handoff**, not a declaration that A–E are complete.
