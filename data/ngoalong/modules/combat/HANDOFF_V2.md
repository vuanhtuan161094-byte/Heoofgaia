# CHAT 05 — Combat V2 handoff (2026-11-18)

## Source / Git ownership
- Repo: `vuanhtuan161094-byte/Heoofgaia`
- Isolated task branch: `feature/nl-v2-combat`; baseline code `feature/nl-codex-cloud-v1-finish@a88b8449714ad48531f7c9e7e081ccac43edee92`; coordination documentation subsequently advanced source branch to `e33e36255d62ea51af7f48386b8d3c56c6448369` (docs-only).
- Owned files under current Chat 00 Multi-Chat V2: `data/ngoalong/modules/combat/**`, `qa/modules/combat/**`; only Chat 08 edits `tools/nl_*`, canonical generators and runtime.
- No Codex Cloud. No merge. No generator, alpha pack, Save, `index.html`, Hero or group edits.
- Source authority: `AGENTS.md`, `docs/REV_PROTOCOL.md`, `docs/NL_DATA_DRIVEN_V2.md` and the official VNG **Mobile** Wiki. Classic parity **UNKNOWN**.
- **Status:** B+C MODULE CODED / 115/115 focused JS in-isolate tests across 3 suites; **NOT YET INTEGRATED**. Real Chromium, Node on checkout/CI, live Save/replay, full regression, exact-SHA workflow and owner acceptance **PENDING**.

## Files and role

| File | Responsibility | Runtime status |
| --- | --- | --- |
| `data/ngoalong/modules/combat/resolver_v2.js` | Pure deterministic battle resolver; 3 damage lanes, 3x3 slots, 5 generals/side, counters, formations, AI, 5 operation kinds, morale, 7 additive statuses, event snapshots, replay verification | **Standalone**; not imported into canonical generator |
| `data/ngoalong/modules/combat/skill_schema_v2.json` | Shared skill contract + ten SIMULATED example templates, roles and operation targeting | **DESIGN READY / NOT LIVE** |
| `data/ngoalong/modules/combat/skill_contract_v2.schema.json` | Machine-readable JSON Schema Draft 2020-12 used by Chat 01/02/06 | **DESIGN READY** |
| `data/ngoalong/modules/combat/formation_adapter_v2.js` | Retains all 24 `p3PresetId = family-plan`, converts native zero-based slots to resolver one-based slots, carries ATK/DEF/INT/CRIT modifiers | **Standalone** |
| `data/ngoalong/modules/combat/project_skill_adapter_v2.js` | Converts 14 project hero + 5 enemy + 1 override descriptors into compatible V2 skills, labeled SIMULATED and nonparity | **Standalone** |
| `data/ngoalong/modules/combat/tactical_ai_v2.js` | Profile-weighted target/skill selection with counter, morale denial, rear guard, healer, defense, focus-target and seeded deterministic proc rolls | **Standalone, called by PvE director** |
| `data/ngoalong/modules/combat/pve_director_v2.js` | Source-aware 28-stage NPC/8-Boss tactic compiler; phase-reactive combat AI, source-project stat projection and deterministic multi-round PvE simulation | **Standalone simulation, NOT LIVE** |
| `data/ngoalong/modules/combat/PVE_BEHAVIOR_V2.md` | Boss behavior matrix, AI contract, source mechanics and explicit Chat 08 native integration gates | **Handoff** |
| `qa/modules/combat/tactical_ai_v2.test.cjs` | 18 deterministic AI assertions | **18/18 isolated QA PASS** |
| `qa/modules/combat/pve_director_v2.test.cjs` | 30 tactical PvE assertions including 28-stage source roster and 8-Boss multi-round simulation | **30/30 isolated QA PASS** |
| `data/ngoalong/modules/combat/effect_rule_index_v2.json` | 320 Wiki reference records with source line, derived op/tags and known-field provenance, explicitly disabled | **REFERENCE ONLY / NOT LIVE** |
| `qa/modules/combat/resolver_v2.test.cjs` | 67 deterministic focused assertions (Node built-ins); run `node qa/modules/combat/resolver_v2.test.cjs` | 67/67 executed in JS isolate with GitHub-fetched source and Node-compatible dependency shims; actual Node/CI run pending |

## Contract for Chats 01, 02 and 06
- Each skill uses `{id,role,moraleCost,target:{team,pattern,priority?,ignoreFront?},operations:[...],provenance:{classification:"SIMULATED"}}`.
- The only executable V2 operations: `damage(lane,coefficient,pierce?,criticalChance?)`, `heal(coefficient)`, `morale(delta)`, `status(effectId,chance?)`, `dispel(polarity,maxRemove)`; each operation may specify `scope`.
- `target.team` is `enemy`, `ally` or `self`; `target.pattern` supports `single`, `double`, `back`, `lowest-hp`, `highest-morale`, `row`, `column`, `all`. `scope` supports `selected`, `self`, `all-allies`, `all-enemies`, `ally-lowest-hp`.
- The project's source `alpha_content.json` counters are accepted as `counters` input, but coefficients (1.22 and 0.82) and all new damage math are **SIMULATED**. Slot convention is 1–9, row-major; player/front = rightmost column, enemy/front = leftmost. This is original geometry, not a VNG canonical hidden rule.
- Instantiate `cat={effects:effectsV1,skills:skillSchema.skills,counters:alpha.troops.counterCycle}`. Call `createBattle(cat,units,formation)`, `resolveAction(state,cat,{actorId,skillId,selectedTargetId?,rolls?})`, `advanceRound(state,cat)`, `replay(initial,cat,frames)`. `chooseAction(state,cat,actorId)` returns a deterministic selection.
- Each unit must provide `id,side,slot,troopType,attack:{physical,tactic,magic},defense:{physical,tactic,magic},hp,maxHp,morale,skillIds`. Optional `legacyEffects` are carried through **unmodified**, not retimed.
- Caller MUST supply per-operation RNG roll keyed `"operationIndex:targetId"` for proc chances strictly between 0 and 1. Critical roll uses `"crit:operationIndex:targetId"`. The complete command including rolls goes in the replay frame. Resolver never calls `Math.random`, does not write to Save, does not generate rewards or mutate its input.
- Renderers/VFX must consume `events` and `frame.snapshot`; they must never write HP/morale/turn counters. `replay` rejects divergent event and snapshot JSON.

## 6 legacy vs 7 V1 additive (DO NOT COERCE)
- Six **legacy native authoritative** IDs: `break, guard, daze, burn, morale-seal, ward`.
- Seven original additive IDs already bridged by group 07: `sleep, fear, anchored, ironwall, focus, repel-blessing, surge`.
- The existing `tools/nl_combat_effect_bridge_v1.js` and `tools/nl_combat_effect_wiring_v1.js` remain untouched. Group 07 documented conflicts for legacy `break`, `guard`, `daze`, `burn`; no formula substitution is allowed.
- V2 operates the **seven** by `NLCombatEffectsV1`. Legacy status application becomes an explicit `legacy-status-command` event with `adapterRequired:true` (NOT fake applied state); legacy dispel similarly emits `legacy-dispel-command`. The native live engine/group 07 must apply them in its authoritative turn. Legacy ward blocks incoming V1 harmful effects; legacy morale-seal blocks positive morale; legacy daze requires the native `p2Perform` gate rather than a second independent skip roll.
- V2 accepts `legacyEffects` for compatibility but **does not** tick their duration, generate periodic legacy burn damage or take over the native six-status resolver.

## Wiki research (SOURCE ONLY)
- Existing authoritative research file: `data/ngoalong/references/effects_wiki_mobile_v1.json`; source https://ngoalong.vnggames.com/ngoa-long-wiki/hieu-ung (Mobile, checked 2026-11-18).
- 320 records, 317 have derived normalized operation tokens; **three operation values unresolved**. 38 explicit stacking fields, 63 explicit dispel fields, 7 explicit immunity-scope fields, 32 with parameter entries, 42 linked interaction-effect IDs. There is **zero** source-verified general `durationTurns`, `probability` or `target` field in this snapshot; those remain null/not inferred.
- Tags in the V2 index are **DERIVED regex research helpers**, not proof of equivalence to executable V2 operations. One record may have multiple tags; the counts are not mutually exclusive.
- No source effect is playable, enabled or mapped into native statuses. Avoid conflating VNG `Tịnh Hóa` (damage-related) and generic dispel.
- Do not reproduce proprietary hidden formulas, art or authored source descriptions.

## Focused QA results and pending gates
- Focused 67 cases **PASS** in JS isolate loaded from exact GitHub file contents; includes 3 damage lanes/counters, 5-unit cap/3×3, formation, heal, morale, focus stacks, shield, external proc rolls, legacy ward, legacy preservation, stun skip, fear wake, anchored, replay exact-match/tamper refusal, AI.
- The in-isolate test uses Node-compatible `require`/assert/fs shims. This is **not** a completed Node process run, Chromium test, GitHub Actions result or claim of live-game integration.
- **PENDING:** native Node runner, canonical generator integration by group 07 (separate authorization), actual 6+7 live battle regression, Chromium at 1280×720 and mobile 390px, Save v5/file reload, immutable replay/receipts, existing CL/P2/P3/R02/R03 suites, exact-SHA Actions run, owner approval.
- Important branch note: `feature/nl-group07-effects-v1-20261118` diverged from `feature/nl-codex-cloud-v1-finish`. Do not force merge or overwrite the group 07 live wiring; review overlapping semantics and use explicit handoff.
- Workflow `.github/workflows/ngoalong-qa.yml` currently lists push branches `main-ngoalong`, `codex/**`, `feature/nl-codex-cloud-v1-finish`; this new task branch is **not** in that list. Do not claim CI trigger on a simple push.

## Extended combat coverage (2026-11-19)
- Historical 6 families × 4 plans validated against canonical pack: 24 unique `family-plan` IDs, strict Native-P3 slots 0..8 → resolver slots 1..9. Formation's `atk/def/int/crit` values now affect V2 physical/tactic attack, defenses, magic attack and crit chance respectively. No Save mutation.
- 14/14 existing project hero descriptors, 5/5 enemy skill archetypes and 1/1 NPC override have an adapter: 20 SIMULATED conversions, **not automatically imported to runtime**, no Wiki parity claim. `double` is interpreted as two separately logged hits against one target as a V2 design choice; native-P2 parity is PENDING.
- Max targets 1..5, sequential multi-hit `repeat` with independent hit events, and mixed attack/heal ally-lowest-HP targeting are supported. Critical rolls are external and replay-recorded, never hidden RNG.
- Full module focused isolation suite `qa/modules/combat/resolver_v2.test.cjs`: **67/67 PASS** through JS evaluation of GitHub-fetched source with Node-compatible module and fs shims; **not** a Node process or CI run.
- Latest coordination `docs/operations/NL_MULTI_CHAT_V2.md` establishes Chat 05 owned paths and dedicated branch `feature/nl-mcv2-05-combat`; original `feature/nl-v2-combat` records the historical work. No integration/generator writes by Chat 05.

## Combat V2 integration-safety hardening — 2026-11-19

- **Fix 1:** Explicit player selection in `double` ally targeting is now honored, including a unit at a rear slot; friendly heal targets no longer inherit the enemy frontline restriction. Enemy backline guarding remains enforced for ordinary single attacks.
- **Fix 2:** `choosePreparedAction(state, catalog, actorId, rollProvider)` lists proc and per-strike crit keys and obtains every roll synchronously from the caller's seeded battle RNG. It records values in `command.rolls`; missing provider or out-of-range results fail closed. `potentialRollKeys(state, catalog, command)` is exposed for integrating AI. No hidden `Math.random`.
- **Fix 3:** Legacy six effect commands now return `pendingLegacyCommands`, `readyToCommit:false` in the result and replay frame. When none are pending, `readyToCommit:true`. Replay compares these fields, rejecting tampered native status requests. Chat 08 must apply pending commands through native P2 authority and then record its final authoritative snapshot; the standalone provisional frame is **not** the published gameplay replay.
- **Focused evaluation:** `qa/modules/combat/resolver_v2.test.cjs` **67/67 PASS** in a JavaScript isolate with GitHub-fetched source and Node-compatible shims. Includes deterministic 5v5 / 40 action / 4 round-end scenario with final event+state replay equality and zero reward/settlement events. No 360-battle balance sweep.
- **Node executable limitation:** container runtime has Node.js 22 but GitHub network resolution is blocked; the checkout cannot be cloned into that runtime. Therefore **native Node execution of the exact GitHub files remains PENDING**. Chat 08 must run `node qa/modules/combat/resolver_v2.test.cjs` on an available checkout/CI runner and attach exact-SHA logs.
- **Ownership:** Only `data/ngoalong/modules/combat/**` and `qa/modules/combat/**` have been modified here. Generator, Save v5, alpha content and integration branch remain unchanged. No action is assumed for Chat 08 until integration evidence exists.

## CHAT 05 B+C implementation — 2026-11-19

**Scope B (tactical intelligence):** `NLTacticalAIV2.choose/prepare` scores actual legal 3×3 targets by offense/defense lane, project counter-cycle, enemy skill-morale breakpoints, healer/control threats, frontline protection, wounded allies, harmful status removal, ally focus target and boss phase. `prepare` obtains proc/crit rolls ONLY from the caller's seeded RNG; all decisions and rolls can be replayed.

**Scope C (PvE tactical director):** `NLPvETacticsV2.compile` loads exactly 28 encounters from `alpha_content.json` preserving existing NPC IDs, troop types and native slots. Eight boss-specific project strategies at **2/5/8/12/16/20/24/28**; opening/pressure/desperate state transitions, guarding/backline/morale suppression, healing, multi-general focus, and stage 25–28 source mechanic handling. The module has **7 SIMULATED PvE skills**, including `mdtq-pve-basic-charge` (+25 self morale after regular hit), for repeated skill cycles; Chat 08 MUST NOT stack the simulated basic-action morale gain with native P2. Existing source Wiki Mobile page describes +25 per attack in one overview but no runtime parity claim is made; label remains SIMULATED.

**Important:** Stage 5 morale-seal override and stage 25 native guard clocks are pending owner-side legacy application; simulator will flag unsupported mechanics and native commands and always sets `authoritative:false`, `rewardSettlement:false`. Source owner Chat 06 retains campaign data, and Chat 08 alone owns canonical generator/Save/UI. **No game integration has been performed here.**

**QA:** `67/67` Resolver + `18/18` Tactical AI + `30/30` PvE Director = **115/115 PASS** in isolated JavaScript evaluation of exact GitHub-fetched source with Node-compatible shims. Includes source-identity checks on 28/28 stages, 8/8 Boss multi-round simulations, deterministic event/replay, normal-attack charge loop and no reward settlement. Actual native Node on repository checkout, Chromium, exact-SHA CI and owner testing PENDING.

**Detailed B+C handoff:** [PVE_BEHAVIOR_V2.md](PVE_BEHAVIOR_V2.md).

## Next integration recommendation
1. Chat 00 / 07 reviews this module, especially six-status native gates, deterministic action ownership, and future registration route for hero/troop/NPC schema.
2. In separately authorized integration work, add contract validation and incremental import through the canonical builder; preserve Save v5/receipt authority and keep renderer read-only.
3. Run focused native Node first, then one Chromium integration + replay/save regression + full exact-SHA release gate when actually entering candidate integration. Do not run 360 balance simulations for every effect edit.

**Final acceptance:** MODULE CODE READY. Standalone 67/67 isolate QA. LIVE GAME INTEGRATION / CI / OWNER ACCEPTANCE PENDING.
