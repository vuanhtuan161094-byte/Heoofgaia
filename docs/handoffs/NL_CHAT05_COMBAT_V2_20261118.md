# CHAT 05 — Combat V2 handoff (2026-11-18)

## Source / Git ownership
- Repo: `vuanhtuan161094-byte/Heoofgaia`
- Isolated task branch: `feature/nl-v2-combat`; baseline `feature/nl-codex-cloud-v1-finish@a88b8449714ad48531f7c9e7e081ccac43edee92`.
- Authorized writes ONLY: `tools/nl_combat_*.js`, `qa/nl_combat_*`, `data/ngoalong/modules/combat/`, this group handoff.
- No Codex Cloud. No merge. No generator, alpha pack, Save, `index.html`, Hero or group edits.
- Source authority: `AGENTS.md`, `docs/REV_PROTOCOL.md`, `docs/NL_DATA_DRIVEN_V2.md` and the official VNG **Mobile** Wiki. Classic parity **UNKNOWN**.
- **Status:** CODE READY / focused JS in-isolate tests 41/41; real Chromium, Node on CI, full regression, exact-SHA workflow and owner acceptance **PENDING**.

## Files and role

| File | Responsibility | Runtime status |
| --- | --- | --- |
| `tools/nl_combat_resolver_v2.js` | Pure deterministic battle resolver; 3 damage lanes, 3x3 slots, 5 generals/side, counters, formations, AI, 5 operation kinds, morale, 7 additive statuses, event snapshots, replay verification | **Standalone**; not imported into canonical generator |
| `data/ngoalong/modules/combat/skill_schema_v2.json` | Shared skill contract + ten SIMULATED example templates, roles and operation targeting | **DESIGN READY / NOT LIVE** |
| `data/ngoalong/modules/combat/effect_rule_index_v2.json` | 320 Wiki reference records with source line, derived op/tags and known-field provenance, explicitly disabled | **REFERENCE ONLY / NOT LIVE** |
| `qa/nl_combat_resolver_v2.test.cjs` | 41 deterministic focused assertions (Node built-ins); run `node qa/nl_combat_resolver_v2.test.cjs` | 41/41 executed in JS isolate with GitHub-fetched source and Node-compatible dependency shims; actual Node/CI run pending |

## Contract for Chats 01, 02 and 06
- Each skill uses `{id,role,moraleCost,target:{team,pattern,priority?,ignoreFront?},operations:[...],provenance:{classification:"SIMULATED"}}`.
- The only executable V2 operations: `damage(lane,coefficient,pierce?,criticalChance?)`, `heal(coefficient)`, `morale(delta)`, `status(effectId,chance?)`, `dispel(polarity,maxRemove)`; each operation may specify `scope`.
- `target.team` is `enemy`, `ally` or `self`; `target.pattern` supports `single`, `back`, `lowest-hp`, `highest-morale`, `row`, `column`, `all`. `scope` supports `selected`, `self`, `all-allies`, `all-enemies`, `ally-lowest-hp`.
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
- Focused 41 cases **PASS** in JS isolate loaded from exact GitHub file contents; includes 3 damage lanes/counters, 5-unit cap/3×3, formation, heal, morale, focus stacks, shield, external proc rolls, legacy ward, legacy preservation, stun skip, fear wake, anchored, replay exact-match/tamper refusal, AI.
- The in-isolate test uses Node-compatible `require`/assert/fs shims. This is **not** a completed Node process run, Chromium test, GitHub Actions result or claim of live-game integration.
- **PENDING:** native Node runner, canonical generator integration by group 07 (separate authorization), actual 6+7 live battle regression, Chromium at 1280×720 and mobile 390px, Save v5/file reload, immutable replay/receipts, existing CL/P2/P3/R02/R03 suites, exact-SHA Actions run, owner approval.
- Important branch note: `feature/nl-group07-effects-v1-20261118` diverged from `feature/nl-codex-cloud-v1-finish`. Do not force merge or overwrite the group 07 live wiring; review overlapping semantics and use explicit handoff.
- Workflow `.github/workflows/ngoalong-qa.yml` currently lists push branches `main-ngoalong`, `codex/**`, `feature/nl-codex-cloud-v1-finish`; this new task branch is **not** in that list. Do not claim CI trigger on a simple push.

## Next integration recommendation
1. Chat 00 / 07 reviews this module, especially six-status native gates, deterministic action ownership, and future registration route for hero/troop/NPC schema.
2. In separately authorized integration work, add contract validation and incremental import through the canonical builder; preserve Save v5/receipt authority and keep renderer read-only.
3. Run focused native Node first, then one Chromium integration + replay/save regression + full exact-SHA release gate when actually entering candidate integration. Do not run 360 balance simulations for every effect edit.

**Final acceptance:** MODULE CODE READY. Standalone 41/41 isolate QA. LIVE GAME INTEGRATION / CI / OWNER ACCEPTANCE PENDING.
