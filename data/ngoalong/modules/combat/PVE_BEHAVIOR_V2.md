# CHAT 05 — Combat AI B + PvE C · Game-design contract V2

**Status:** CODED, isolated gameplay QA passed; **NOT INTEGRATED** into canonical game.  
**Scope owner:** `data/ngoalong/modules/combat/**`, `qa/modules/combat/**`. No Codex Cloud, no merge, no edits in Chat 06 campaign source / Chat 08 runtime, Save v5, economy, rewards, or `index.html`.

## 1. Tactical AI B

**Implementation:** `tactical_ai_v2.js`, `qa/modules/combat/tactical_ai_v2.test.cjs`.

The AI enumerates legal skill–target candidates using the actual 3×3 board/5-per-side resolver and scores:
- Physical/tactic/magic damage using project `counterCycle` and current formation; avoids damage that would be entirely blocked by one-charge Ironwall.
- Morale disruption when the target can currently afford a skill; rewards crossing an actual equipped-skill morale threshold and does not spam drains at 0 morale.
- Crit, piercing, repeated strikes, finishers, threat of enemy healers/controllers, and direct counter advantage. Only backline-eligible skills can reach a protected rear; no cheat targeting.
- Low-HP ally healing, removal of harmful effects, shield/guard protection, and ally morale recovery into an affordable skill band.
- Explicit `focusTargetId` to keep allied NPCs attacking the same **player** target after a successful strike; player-side simulated AI tracks its own opposing targets separately.
- Distinct modes: `balanced`, `morale-siege`, `counter-offense`, `rear-hunter`, `rear-guard`, `medic`, `boss-guard`, `boss-pressure`, `boss-desperate`, `boss-support`.

**API:** `AI.choose(state,catalog,actorId,{profile,phase,focusTargetId})` returns a command and non-authoritative decision explanation. `AI.prepare(state,catalog,actorId,policy,seededRollProvider)` gets every needed proc/critical roll from the battle caller; replay logs it inside the command. No AI-internal `Math.random`.

## 2. PvE tactical director C

**Implementation:** `pve_director_v2.js`, `qa/modules/combat/pve_director_v2.test.cjs`.

The director compiles **28 actual** source `alpha_content.json` encounter records without inventing NPC names, combat troops or roster positions. Native formation slots 0–8 are converted to Combat V2 1–9. NPC stats use existing project `campaign-npc-scaling-v1` base/growth/deployment/bossBonus values as an explicitly **SIMULATED projection** (not a canonical P2 parity claim). All eight source bosses get their own authored strategy:

| Source stage | Boss AI design ID | Original project behavior / skill overlay |
| --- | --- | --- |
| 2 | `shield-wall` | Vanguard Ironwall plus lineup piercing to force positional tactics |
| 5 | `morale-lock` | High-morale disruption and `campaign-sima-seal` adapter; native `morale-seal` remains pending |
| 8 | `protected-rear` | Defensive front guard with rear strike skills |
| 12 | `last-stand-rally` | Morale rally and emergency medical support when allies weaken |
| 16 | `dual-flank` | Front-column breakthrough and rear ambush in combination |
| 20 | `armored-core` | Armored core, cavalry raider, and heal-support option |
| 24 | `elite-five` | Distinct job/skill for each of five combat units |
| 28 | `final-war-drum` | Recorded project drum starts at 100 morale; rally and cross-line pressure |

**Other source mechanics:** stage 25 `guard` startup is represented as pending native legacy status (no fake active effects); stage 26 strategist starts at 100 morale; stage 27 cavalry receives project source +18 speed and a *SIMULATED* rear-ambush descriptor; stage 28 drum starts at 100. Stage 5 `morale-seal` requires Chat 06/08 native P2 verification and remains explicitly unsupported for standalone settling.

Each Boss reacts to the real battlefield state: `opening` for rounds 1–2, `pressure` from round 3, and `desperate` below 38% surviving total HP or half its troop count. Rear-line support changes to `medic` in desperation while attackers prioritize damage. The director produces a decision log with stage/phase/skill/target/profile and no new combat state fields.

To allow sustained skill loops in isolated PvE, NPC units receive `mdtq-pve-basic-charge` (physical basic hit + 25 self-morale, separate from legacy `mdtq-basic-strike`). This is an **original SIMULATED** project skill. The [official Mobile overview](https://ngoalong.vnggames.com/tin-tuc-2022/tinh-nang/trai-nghiem-ngoa-long-890.html) describes morale rising on ordinary attacks, but **does not authorize treating this V2 standalone formula as a parity-verified classic/legacy runtime rule**. **Chat 08 must avoid stacking this gain with the native P2 morale system.**

**APIs:**
```js
const compiled = NLPvETacticsV2.compile(alphaContent);
const cat = NLPvETacticsV2.catalog(alphaContent, effectsV1, skillSchemaV2);
const sourcePlan = NLPvETacticsV2.getPlan(compiled, 28);
const { units, unsupportedMechanics } = NLPvETacticsV2.createEnemies(alphaContent, compiled, 28);
const decision = NLPvETacticsV2.chooseNpc(battleState, cat, sourcePlan, unitId, seededRollProvider, {
  focusTargetId: lastNativeNpcAttackTargetId
});
const smoke = NLPvETacticsV2.simulate(alphaContent, compiled, 28, playerUnits, cat, {
  maxRounds: 4, seed: 981028
});
```

`simulate()` always returns `authoritative:false`, `rewardSettlement:false`, and `status:"MODULE_SIMULATION_NOT_LIVE"`. `replayParity:true` only proves the provisional module's local event/state determinism, **not** runtime parity, no-double-reward behavior, or proper native legacy commands. Pending native effect commands are separately listed.

## 3. QA / integration gates

Run from a real root checkout, in order:

```sh
node qa/modules/combat/resolver_v2.test.cjs
node qa/modules/combat/tactical_ai_v2.test.cjs
node qa/modules/combat/pve_director_v2.test.cjs
```

- Resolver: **67/67 focused isolated JS checks PASS**.
- Tactical AI: **18/18 isolated JS checks PASS**.
- PvE director: **30/30 isolated JS checks PASS**; includes 28/28 source-stage one-round simulations, eight Boss multi-round simulations and exact-seed replay-parity tests.
- **Total: 115/115** in a JavaScript isolate running GitHub-fetched exact source with Node-compatible module/filesystem/assert shims. Native `node`, Chromium, full live Save/replay receipts, release balance and exact-SHA CI **PENDING** because a GitHub clone is not available inside the tool's native Node container.

## 4. Chat 08 handoff (not an authorization to merge)

1. Read source HEAD and the eight old+four new scoped files. Check `AGENTS.md` / `NL_MULTI_CHAT_V2.md` and contract before any canonical write.
2. Register `NLCombatResolverV2`, `NLTacticalAIV2` and `NLPvETacticsV2` via **the one canonical generator only**; do not replace native P2 statuses blindly. Maintain Save v5 and receipts.
3. Make native six-status `pendingLegacyCommands` settle in **the original P2 owner turn**, not the renderer; accept a final replay frame only after all native effects are actually committed.
4. Map existing native P2 normal-attack morale into PvE skill policy: DO NOT double-grant +25. Stage 25 legacy `guard`, stage 5 `morale-seal`, and any effect duration/clock need P2 parity confirmation.
5. Run one Chromium real 3×3 battle per Boss strategy (especially 5, 25, 27, 28), replay after Save/reload, verify no reward duplication, regression and exact-SHA Actions. Balance checks must use the actual game, not these simulated growth projections.
6. Preserve the 320 Mobile Wiki effect records as **REFERENCE_ONLY**, not active runtime effects; preserve all UNKNOWN field labels. No merge before owner acceptance.
