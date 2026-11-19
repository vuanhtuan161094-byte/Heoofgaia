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
3. Embed Group05 resolver/formation/skill adapter/tactical AI/PvE director and Group02 troop live bridge into that same HTML. Create an in-game read-only tactical view for the existing 28 project encounters (eight Boss profiles) and the 25 original project troop designs. This was a source-only V2 staging step before A1. A1 below activates compatible target/Boss rules via native P2 only; 249 Wiki maps remain unimported. Native P2 still owns action order, HP, morale, replay, rewards, and Save.
4. Add `qa/nl_city_integration.py` for real browser checks: 31+7 city tiles, paid construction, atomic receipt, persistence and reload, 390px viewport, 28/8/25 staged tactical source coverage and fail-closed Wiki binding.
5. Keep Hero207 (207 project SIMULATED recruits) and Items (411 project equipment/669 project items) existing canonical integration and browser regressions intact. Original 14 heroes, 28 project stages, 19 original gear, eight research, Save key `muu_dinh_tam_quoc_v1` schema v5 remain required.

## Strict safety boundaries
- CH02 44 exceptional numeric troop IDs (9 duplicate-label, 35 absent): `0 approved`. No automatic source-ID mapping.
- Chat06 249 maps / 4,903 NPCs / 21 shards: staged source evidence only; no new playable Wiki dungeon, no source-to-runtime numeric binding.
- Chat03 cross-domain bonuses (troop, hero, equipment, naval): only effects owned by city engine may be consumed; others are **PENDING** for their authoritative consumers.
- Chat05 standalone Combat V2 resolver is not authoritative. A1 now ports selected targeting, phase-aware Boss descriptors and two bounded cavalry charge additions through native P2. Other proposed Chat02 traits remain pending parity and QA; this is **not** 25 fully migrated skill kits.
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

## A1 · Native Combat V2 integration (19 Nov 2026, supersedes source-only A status)

- **Source code:** `data/ngoalong/integration/native_pve_adapter_v2.js`.
- **Canonical owned integration:** `tools/build_ngoa_long_mode.py` is still the **one** HTML generator. No separate game file was committed.
- **Authoritative runtime:** original `p2Perform` → `p2Hit`/`p2Morale`/`p2Status` → `p2ApplyFrame` → `finishBattle` and Save key `muu_dinh_tam_quoc_v1` version **5**. Never call `resolver_v2.resolveAction` or `NLPvETacticsV2.simulate` as a second damage/settlement authority.
- **28 existing playable stages:** preserve native P2/R03 battle, map IDs, formation, rewards, replay and Save. A1 labels all 28 stage plans in live game, with new deterministic NPC target scoring on stages **1–24**, respecting the native P3/R03-legal target depth.
- **Eight Boss stages:** `[2,5,8,12,16,20,24,28]`. For stages **2–24**, phase rules (opening / pressure / desperate) use CHAT05 source data and six native-compatible descriptor types: guard, line-break, rear ambush, ally healing/cleanse, rally, morale disruption. Stage **5** preserves its original named Tư Mã Ý `campaign-sima-seal` skill. Stage **28** preserves its existing R03 boss/war-drum mechanics and deterministic formation fixtures rather than overlaying new damage multipliers.
- **25 project troop identities:** all 25 original project units are mapped to source contracts in native battle snapshots. Their existing R03 evolutions and passive formula consumers remain authoritative. Only `charge_bonus` and `opening_damage_bonus` were adapted as bounded one-time native-hit multipliers on the first basic cavalry attack; the other proposed effects remain pending. There are **0** verified Wiki numeric bindings.
- **Late-stage freeze:** the exact-seed R03 formation A/B contracts for stages 25–28 must not change. When `battle.r03Encounter` exists on those stages, A1 returns native target, native Boss skill and no extra charge bonus. This was intentionally added after the first regression failed, **not** by weakening the tests.
- **No double result:** `p2Hit` is invoked once per original strike; no second morale normal-attack grant; no second reward/receipt processor. Replay reads recorded native events only.

### Confirmed focused QA before final documentation commit
- Source snapshot: `80316f5767532bae51bb2f6bf8d314b6b831c2a1`.
- GitHub focused run: https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44493125013 — **SUCCESS**.
- Real Chromium A1: `NL_NATIVE_PVE_A1` **9/9 PASS** across 28 live battle boots, eight Boss turns, native P2 source contract, stage-1 once-only settlement and replay.
- Hero207 + Items shared Web/Save: **16/16 PASS**.
- City + tactics shared Web/Save: **16/16 PASS**.
- R03 stages 25–28 frozen formation fixtures all PASS; low vs high losses respectively **232/344**, **216/328**, **208/349**, **365/513** for exactly the published seeds.
- New source contract tests `qa/nl_native_pve_a1.test.cjs` PASS within the focused Node gate.
- Artifact `muu-dinh-tam-quoc-premerge-playable-candidate`:
  https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44493125013/artifacts/14513468571
- **Full `game` job is distinct**. Its result must be reported at its own exact SHA; focused PASS never implies full release PASS or owner visual acceptance.

### Remaining A1 follow-ups
1. Add remaining CHAT02 proposed traits only after a supported native phase/intent mapping, event-dedupe and same-seed R03 regression. Do not import 44 unverified Wiki numeric troop IDs.
2. Verify balance and browser UI of Boss transitions in a complete 1–24 campaign, not merely single Boss turns; then consider original VFX event wiring.
3. Keep CHAT06 249 Wiki maps source-only until explicit NPC/skill/soldier ID verification. Preserve all original 28 playable stages until owner approves expansion.
4. Integrate CHAT07 original art only following owner acceptance. No Codex Cloud, no automatic merge, no default-branch modifications.
