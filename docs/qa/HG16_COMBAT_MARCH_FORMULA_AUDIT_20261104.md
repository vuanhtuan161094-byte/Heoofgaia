# HG-16 — Combat & March Formula Audit / Implementation Gate

> **G2/G3 supersession notice (2026-11-04):** This document is the G1 historical baseline, not the latest implementation status. G2/G3 implemented a modeled 30% physical floor, equipment damage modifiers, bounded ranged reach, 25% Defend mitigation, weighted Dijkstra terrain, slowest-troop march speed, shared game/UI ETA, and corresponding v07 QA. See **[HG16_G2_G3_BALANCE_CONTRACT_20261104.md](HG16_G2_G3_BALANCE_CONTRACT_20261104.md)** for the authoritative current formulas and acceptance gates. Rows C06/C07/C14/C17/C20/C24 below describe pre-G2/G3 gaps; they must not be treated as current MISSING status. Original-2009 numerical parity is still unverified.
Review date: 2026-11-04
Baseline: `a93b13926d51d1010da2af7a8080e85bcd2401b1`.
Scope: `data.js`, `engine.js`, `hg04.js`, `hg05.js`, `hg06.js`, `hg07.js`, `hg08.js`, `hg10.js`, `app.js`, `qa-engine.cjs`, `qa-hg10-world-ai-chrome.py`.
Status: **PARTIAL**, not HOG1 1:1; no source-verified original server binary.

## Sources, version control

- **SRC02:** 2009-12-06 Wikidot unit table https://heroesofgaia.wikidot.com/game-units (primary for data.js; 4 factions × 10 tiers, HP/ATK/DEF/SPD/load/cost).
- **SRC07:** Fandom community `Combat mechanics` https://heroesofgaia.fandom.com/wiki/Combat_mechanics: PvE unit base damage `UATK²/(UATK+UDEF)`; Hero factor `(HATK+100)/(HDEF+100)`; damage buffs are combined and added/subtracted within their category, stat buffs modify underlying ATK/DEF before calculation. Example: 500 Priest, buffed ATK=82.8, NPC DEF=109, hero ATK=168 -> observed **47,897** truncation.
- **SRC24:** Fandom `Heroes` https://heroesofgaia.fandom.com/wiki/Heroes: Hero SPD affects **battle-unit SPD** by `(HSPD - 10) * 0.02`. This is *not evidence* for an exact overland march coefficient.
- **Chinese 2009:** Sina https://games.sina.com.cn/o/z/yxzc/2009-08-24/0043346794.shtml: 1 point of Hero ATK -> +1% troop damage; 1 Hero SPD -> +0.02 troop SPD; Hero DEF described as roughly 0.5% damage reduction per point (approximation, not exact reciprocal at high DEF).
- **2009 world-map design:** Sina https://games.sina.com.cn/o/z/yxzc/2009-08-23/1958346748.shtml: moving armies visible on large map; not a numerical overland ETA equation.
- **Regional/catalog discrepancy:** 2009 Wikidot lists Elf Green Dragon DEF **199**, whereas later Fandom `Units` lists **109**, and also conflicts on some names/length of training. Current catalog retains the explicitly dated Wikidot baseline. Do NOT silently normalize across editions.

## Formula inventory and audit matrix

| ID | Component | Current engine formula/behavior | Assessment | Evidence / pending |
|---|---|---|---|---|
| C01 | Per-unit base DMG | `UATK²/(UATK + max(0,UDEF))` | PASS (patched HG16) | Source SRC07; zero DEF no longer receives fictitious +1 defense. |
| C02 | Hero attack | Player factor `1 + effective HATK / 100` | PASS focused | Source SRC07/Sina; now effective Hero ATK combines equipment and current world buffs in proper order. |
| C03 | Hero defense | Defender factor `1 + effective HDEF / 100` in denominator | PASS focused | Source SRC07/Fandom; dynamic canonical Hero stats. PvP counterpart has no AI hero. |
| C04 | Troop count | Final stack damage scales with number of *living* units `count` before floor | PASS focused | SRC07 and 40 race-unit numeric oracles. |
| C05 | Rounding | `max(1,floor(stackDamage))` for positive base; `ATK=0` returns 0 | PASS focused | Example 47,897; zero ATK phantom-hit P0 fixed. |
| C06 | 30% minimum damage | Not implemented | PARTIAL | Fandom says units cannot deal less than 30% of base, but exact scope/rounding across HDEF and modifiers remains unclear; do not change balance blindly. |
| C07 | Damage modifier M | ATK/DEF stat-changing Hero spells implemented; no full equipment-specific additive `Idmg - rdam` stack | PARTIAL | SRC07 identifies M; currently M effectively 1 except stat changes. |
| C08 | Hero equipment | Equip bonus to Hero ATK/DEF/SPD, world +10% after equipment | BUG FIXED | HG04 previously used local heroStats + HG10 pre-buffed raw Hero before gear; canonical E.heroStats now authoritatively used once. |
| C09 | HP / casualties | `pool=count*hp`; `count=ceil(pool/hp)` after strike; casualties deducted from real army | PASS tested prototype | Wounds/HP exact original rule unknown. |
| C10 | Wounds / Arena | `floor(previousFraction + lost*0.75)` wounded, remainder persisted | PARTIAL | 75% midpoint of reported wound range, not guaranteed original random model. Arena has cost/time queue tests. |
| C11 | Hero/battle spells | Spells update unit stat before strike; cast limits/CD/expiry | PARTIAL | Regional modifiers recorded; 3/4-turn duration and reuse cooldown local simulations. |
| C12 | Initiative | Desc unit SPD, x/y tie-break; hero bonus `(HSPD-10)/50` added to unit SPD | PARTIAL | Battle SPD effect source-backed; tile tie and action scheduler reconstructed. |
| C13 | Melee movement | BFS detours around occupied live stacks, 1–2 tiles/turn by speed, 12×9 grid | PARTIAL | Model used for playable tactics. User move path preview and receipts tested. |
| C14 | Ranged reach | Hardcoded 20 Manhattan cells covers virtually all 12×9 stage | PARTIAL | Original numeric range unrecovered, no claim of parity. |
| C15 | Enemy targeting | Melee distance priority; ranged ATK × number priority | PARTIAL | Historical qualitative advice; numeric score is implementation model. |
| C16 | World path | 100×100 shortest 4-neighbor BFS; river water blocked, bridges passable | PASS for current model | Road, hill and forest do not alter time. Not the original world-route engine. |
| C17 | World march formula | `max(40,ceil(20+19*steps/max(.1,1+(HSPD-10)/50)))` game-seconds | PARTIAL | 19 sec/step and floor 40 are derived model; source only links speed/distance qualitatively. |
| C18 | Equipment/world SPD, return ETA | Effective Hero SPD applies to outgoing march and return; 1×/60× wall-time | PASS focused | No slowdown from slowest soldier; original formula missing. |
| C19 | March AP | 6 AP mine / 8 AP NPC/castle/treasure; 20 AP transports | PARTIAL | HG10 prices modeled except transport sourced in SRC59. Atomic failure and real UI preview tested. |
| C20 | Terrain penalty | Roads, forest and hills no different costs; water forbidden | MISSING original parity | Do not add unsupported coefficients without design decision. |
| C21 | Overkill reporting | Attack-history `dealt` may show computed raw damage above remaining pool; damage animation receipt uses HP actually lost | PARTIAL | Clarify display semantics and standardize history as a later patch. |
| C22 | Enemy Hero / PvP | Enemy AI fortress has actual racial garrison stats but no enemy Hero attribute model, no PvP | MISSING | Source PvP formula itself community-incomplete. |
| C23 | Save/Reload | v07 serializes battle HP, orders, spell effects, world routes, AI garrisons and city data | PASS tested prototype | Fresh-process Chromium plus Node old-save cases; full-scale device pending. |
| C24 | World ETA UI | Shows path steps, game seconds, wall seconds at current 1×/60× and AP | PASS focused (pending final CI) | Uses same `pathfind`, `heroStats`, `marchDuration` as real dispatch; label marks modeled coefficients. |

## Actual code repairs

- `engine.js`: Zero attack no longer chips 1 HP; target `DEF=0` no longer gets fictitious `DEF=1` (source PvE).
- `hg04.js`: Battle wrapper resolves dynamically extended `E.heroStats` (equipped stats and world effects), instead of using the obsolete local-only effective stats.
- `hg10.js`: Removed pre-multiplication of Hero base ATK/DEF ahead of the equipment step. No double world-buff.
- `app.js`: World target panels show the actual route length, ETA and AP before a paid dispatch. The 19 sec/step coefficient is explicitly marked modeled.
- `qa-engine.cjs`: Numeric 40-faction-unit oracles, source example, 0 ATK / 0 DEF, equipped + world buff offensive/defensive formulas, shortest route, wall-speed 1× and 60×, Save/Load and failed dispatch invariants.
- `qa-hg10-world-ai-chrome.py`: Browser canvas selection shows the same ETA/AP as the engine, then executes real UI dispatch/AI battle and saves/reloads.

## Release gates

1. Node gameplay and 40-unit numeric oracles complete with 0 failures.
2. Chromium real browser current world-map ETA, AI target and saved real battle passes.
3. Full existing HG09/HG12/HG14/HG14.5 suites remain green, build HTML deterministic.
4. Do not mark HG-16 formula parity or tactical AI complete until C06/C07/C12–C15/C17/C20–C22 resolved with source evidence and owner-approved balance.
5. Physical Android landscape and OWNER VISUAL PASS not yet obtained.
