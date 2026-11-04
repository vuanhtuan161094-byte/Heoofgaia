# HG-16 G2 + G3 — Combat, Spell, Equipment & World-March Balance Contract
Date: 2026-11-04
Branch: `feature/hog1-research-to-playable-20261102`
Baseline: HG-16 G1 at `ba98ac1b877c4a17c9de236b564baeb0d0e3952c`.
Authority: **offline gameplay design choices** where 2009 sources do not determine exact coefficients. Do not label these new coefficients as original Heroes of Gaia server data.
No new branch and **Save schema remains v07**.

## G2 — Deterministic damage pipeline

For a living unit group with `N` soldiers, unit `ATK>0`, defender unit `DEF>=0`:

```
physical = max(0.30 * ATK, ATK * ATK / (ATK + DEF))
heroAttack = 1 + (player attacker effectiveHeroATK / 100), otherwise 1
heroDefense = 1 + (player defender effectiveHeroDEF / 100), otherwise 1
equipmentAttack = 1 + damageBonus + (melee ? meleeDamage : rangedDamage)
equipmentDefense = 1 - damageReduction
defendStance = 0.75 if target guarded this battle turn, otherwise 1
damage = max(1, floor(N * physical * heroAttack / heroDefense
                      * equipmentAttack * equipmentDefense * defendStance))
```

`ATK=0` deals **zero**, not a phantom 1 damage. The physical 30% floor applies only before other mitigating effects; it does not override the Hero DEF, equipment reduction or Defend stance. Positive damage is floored once, after all multipliers. The original Fandom Priest example `47,897` remains a numeric regression.

Physical base and Hero ratio have community support (SRC07); 30% floor placement, equipment bonuses, 25% Defend, target selector and balance caps are **local offline design choices**.

### Real equipment modifiers

| Item | Existing Hero attributes | New battle modifier |
| --- | --- | --- |
| Copper Blade | ATK +3 | +4% melee damage |
| Ash Bow | ATK +4, SPD +1 | +6% ranged damage |
| Iron Armor | DEF +4 | -6% incoming damage |
| Traveler Cloak | DEF +2, SPD +2 | -3% incoming damage |
| Quartz Ring | ATK +2, DEF +1, SPD +1 | +4% total damage |
| Old Talisman | ATK +1, DEF +3 | -4% incoming damage |

The 3 equipment slots remain **weapon / armor / charm**. Same-category bonuses add, with independent conservative limits: general damage +25%, melee +25%, ranged +25%, incoming reduction +20%. Hero stat equipment applies before temporary +10% world-building buffs. The same `E.heroStats` and `E.combatModifiers` drive real battle damage.

### Tactical balance

- Ranged tier < 8: **11** Manhattan cells; ranged tier >= 8: **12**; melee: **1**.
- Current battle grid remains 12×9. Fast melee (SPD >=7) gets 2 movement cells/turn; others 1; ranged 1. Orc Battle Instinct fractional movement carry persists.
- Defend consumes one selected group's attack this turn but reduces incoming damage by **25%**, even if the enemy has higher initiative. Defense expires next turn.
- Casts continue to modify troop ATK/DEF/HP before strike; effects replace one another, a 3-turn general expiry and 2-turn recast delay are explicit models, not recovered server timing. `battle_instinct` has a separate movement lifetime already tested.
- Wounded recovery retains the modeled **75% of casualties** with exact fractional carry and real Arena costs; interruption by Save/Reload must not reset the fractional remainder.
- Enemy combat AI continues to prioritize ranged targets by ATK × number and melee by distance, which remains an approximate targeting policy.

## G3 — Weighted overland movement

Each world tile traversed contributes integer path cost (tenths of a normal step):

| Entered terrain | Weight | Relative travel time |
| --- | ---: | --- |
| Road | 8 | 0.80× |
| Plain | 10 | 1.00× |
| Bridge | 11 | 1.10× |
| Forest | 13 | 1.30× |
| Hill | 15 | 1.50× |
| Water | Impassable | Must use bridge |

Shortest-weight route is selected via deterministic **Dijkstra** over cardinal neighbors on the 100×100 grid. Source-driven NPC, camp, castle and bridge coordinates remain fixed. Routes do not cross river tiles except bridges. A longer road detour may beat a shorter steep-hill route.

Define `W = sum(weight[entered tile]/10)` and effective Hero SPD after equipment and world buffs:

```
heroFactor = max(0.1, 1 + (effectiveHeroSPD - 10) / 50)
unitFactor = clamp(0.8 + slowestGroupSPD / 40, 0.8, 1.1)
ETA_game_seconds = max(40, ceil(20 + 19 * W / (heroFactor * unitFactor)))
ETA_wall_seconds = ceil(ETA_game_seconds / gameSpeed)
```

`gameSpeed` is 1 or 60. The slowest troop whose count is positive determines group speed. The default fallback factor is 1 if no valid formation is supplied to a symbolic math unit test. Real dispatch uses the exact selected formation. Returns use the **surviving saved expedition formation**, not now-empty city state. Convoys have no Hero (base SPD=10) and use their carrier troop SPD. Returns from an earlier save retain their saved `remaining` and `total`; changing balance does not retroactively speed up an in-flight legacy convoy.

### World costs and UI

- Mine expedition costs **6 AP**; NPC, treasure or castle expedition costs **8 AP**; own-city transport costs **20 AP**.
- The world-map target panel shows actual path steps, weighted terrain points, troop speed factor, projected wall ETA, game ETA and AP cost. The projection uses the same `E.pathfind`, `E.pathTravelCost`, `E.armyMarchFactor` and `E.marchDuration` as dispatch.
- Army recruitment cards show tactical range and solo troop travel factor. The equipment screen shows actual extra damage/mitigation modifiers; these are not fake presentation-only values.

## QA acceptance / implementation status

| Test gate | Required validation |
| --- | --- |
| 40/40 unit formulas | Source-type reference damage and positive-ATK/zero-ATK edges |
| G2 special cases | 30% floor, Defend before faster enemy attack, melee/ranged item effects, defense mitigation, 1-turn expiry |
| Spells | Actual attack damage increase, 3-turn expiry and cooldown; reload while buff active |
| Wounds | 4 true casualties => 3 recoverable at 75%, across intermediate v07 Save/Reload |
| Paths | Dijkstra deterministic, valid four-neighbor traversals, terrain weights, no pass through water |
| Timers | Outbound and return with gear/SPD, mixed-unit slowest troop, city convoys |
| UI | Real Chromium pointer selection and same terrain/army-dependent ETA as engine, dispatch and Save/Reload |
| Existing regression | Full `qa-engine.cjs`, HG09/HG12/HG14/HG14.3/HG14.5 Chromium and repeatable HTML build |
| Scope outside HG16 | Physical Android playtest, original 2009 travel coefficient, PvP server, fog/scouting, AI offensive war not claimed complete |

Historical data stays source-tagged, but these are explicit offline playable choices. Future numerical tuning should revise this contract, add deterministic oracles, and prove old-save compatibility first.
