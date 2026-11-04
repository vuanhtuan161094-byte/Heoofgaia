# HG-18 — Sustainable Economy, Army and Item/Quest/Rebirth Balance Contract
Checkpoint: 2026-11-04. Repo: `vuanhtuan161094-byte/Heoofgaia`. Branch: `feature/hog1-research-to-playable-20261102`.
Save: **v07 unchanged**, new optional `hg18` object is migrated into valid prior saves with **zero bonus materials**. No merge main; no Codex.

## Historical Fandom reference versus new design

| System | Heroes of Gaia Fandom | Implemented HG18 | Authority |
| --- | --- | --- | --- |
| Original military | Four races × 10 = 40 recruitable tiers: https://heroesofgaia.fandom.com/wiki/Units | 40 unchanged + 4 nonrecruitable quest reward troops | 40 source-backed, four invented |
| Demon high tiers | T11: HP800 ATK230 DEF155 SPD11.89; T12: HP1101 ATK290 DEF170 SPD9.58. Source: https://heroesofgaia.fandom.com/wiki/Units | Four 9–10★ boss sites with those T11/T12 base monster stats | Numeric stats from Fandom; location/count and secondary modifiers modeled |
| Equipment | Bazaar, map, Babel floors and dungeon rewards. Weapon, helmet, body, handguard, shinguard, necklace, ring and secondary arms: https://heroesofgaia.fandom.com/wiki/Equipment | Six existing items + 3 Sentinel + 3 Astral, **three currently active slots** (weapon/armor/charm) | Original equipment categories broader; this is partial implementation |
| Hero Tasks | 20/day, 1200→3100 EXP (43,000 total), from Babel: https://heroesofgaia.fandom.com/wiki/Hero_Tasks | Retained independent HG12 system | Fandom for reward curve; target selection implemented as model |
| Hero quality | Attributes ATK DEF SPD INT and color/value thresholds: https://heroesofgaia.fandom.com/wiki/Hero_quality | Existing attribute/level engine maintained | Historical inspiration |
| Daily quests | Faction daily objectives and rewards: https://heroesofgaia.fandom.com/wiki/Undead and https://heroesofgaia.fandom.com/wiki/Orc | Existing Fandom/China 2009 boards remain, separate from new HG18 boards | Existing partial historical boards + **new modeled** board |
| Hero rebirth, reforging, gear sets, shards, weekly quests | No reliable original 2009 numbers recovered in examined Fandom pages | Implemented as a coherent **new offline endgame** | HG18 design, not claimed historical |

## Resource production and caps — foundations before features

At New Game, five resources start at **Gold 8000, Wood 900, Ore 900, Sulfur 350, Crystal 350**. Hourly base production is **160 / 12 / 12 / 6 / 6**; gold and subresources are different sinks. Warehouse Lv2 basic caps are **Gold 15,000; Wood/Ore 1,500; Sulfur/Crystal 750**. Mine bonuses, research and construction bonuses are computed by the same engine, not HG18 synthetic generators.

No material card is consumed unless **all five contents can fit within the current active city's warehouse caps**. The normal offline single-call catch-up cap remains 24 wall-clock hours. Exactly-once Save/Load remains authoritative. The HG18 regression adds **7 sequential 24h days for all four races**; HG16 G4 already tests **30 days, six cities, five resources**, and HG17 tests a captured city's growth from zero resources. These are multiple complementary QA gates, not a 30-day full organic campaign.

### Material bags / rewards

| ID | Item | Source | Expenditure / result |
| --- | --- | --- | --- |
| `resource_card` | Small resource card | Daily construction | +600 Gold, +80 Wood/Ore, +20 Sulfur/Crystal, all-or-nothing |
| `resource_chest` | Large resource chest | Weekly construction | +2400 Gold, +300 Wood/Ore, +100 Sulfur/Crystal |
| `gear_pack` | Regular equipment chest | Daily NPC combat | One among original 6 common items; deterministic cycle |
| `set_chest` | Sentinel set chest | Weekly troop training | One of 3 Sentinel pieces, deterministic cycle |
| `enhance_stone` | Equipment enhancement stone | Daily training, weekly missions, boss, salvage | Strengthens real equipped item |
| `hero_reset` | Hero stat reset card | Weekly NPC victories | Returns **only previously allocated** points, not free points |
| `rank_emblem` | Hero rank promotion card | Weekly NPC victories | Rank up to 5 with Lv gates |
| `rebirth_core` | Hero rebirth core | Weekly Boss 9–10★ | Allows Lv100→Lv1 reincarnation |
| `astral_shard` | Rare Astral fragment | 4★+ NPC rare / 9–10★ bosses / high treasure + weekly boss | Craft rare set pieces; max bag 1,000,000 each |

Materials are saved separately from actual equipped inventory. Material receipt is exact-once, and claiming a task never silently awards combat units to the wrong side.

## HG18 periodic quests (additive, not replacements for Fandom quests)

All progress is credited **after real completion**, never on queue creation, projection, preview, repeated save or same-moment tick. Period keys are UTC day and UTC Monday week; these are explicit offline design choices. Rewards must be claimed once per period.

| Quest ID | Cadence | Actual authoritative progress | Reward |
| --- | --- | --- | --- |
| `daily_build` | Daily | 1 finished construction | 1 small resource card |
| `daily_recruit` | Daily | 10 training completions | 2 enhancement stones |
| `daily_npc` | Daily | 1 real NPC victory | 1 common gear chest |
| `daily_mine` | Daily | 1 newly captured mine | 1 Astral fragment |
| `weekly_build` | Weekly | 8 construction completions | 2 large resource chests |
| `weekly_army` | Weekly | 50 trained troops | 1 Sentinel set chest + 5 stones |
| `weekly_npc` | Weekly | 5 real NPC victories | 1 rank emblem + 1 stat reset |
| `weekly_boss` | Weekly | 1 real 9–10★ Demon victory (or level-9+ treasure) | 1 rebirth core + 3 Astral shards + **one quest-only faction guard** |

Tasks are available independently; a player who reaches mine ownership cap can still complete training, NPC or construction quests. Future mission expansions should add repeatable market/production goals before releasing a fully mature endgame economy.

## Item sets, enhancement and dismantle

**Sentinel of Gaia** (3 item IDs `sentinel_sword/plate/seal`): two pieces => **-2.5% incoming damage**, three pieces => **+3.5% general damage**.

**Ancient Astral** (3 `astral_sword/plate/seal`): two pieces => **+3.5% general damage**; third adds **another +3.5% general damage and -5% incoming damage**. Astral gear is crafted, **not sold in Bazaar**. Every rare item costs **8 Astral fragments**; pieces rotate Sword→Plate→Seal to remove random softlocks.

Enhancement level **+0..+10** is deterministic with no RNG destruction. At current level `L`, next upgrade consumes `2+2L` stones and `250(L+1)` Gold. Max +10 requires **110 stones + 13,750 Gold**. The effective Hero stats add `ceil(original equipment stat * 0.08 * L)` before hero rank/rebirth multipliers. Original percentage modifiers gain `5% * L` of their own percentage bonus. Existing defensive cap **20%**, attack-modifier caps **25%** each. These caps prevent unbounded percent stacking.

Inventory hard cap remains **2,000 equipped item instances**. PvE does not add a 2,001st item; the log instructs dismantling old gear instead. Dismantle requires **unequipping first**, removes that UID once, yields `1+floor(enhance/2)` stones, and Astral set pieces refund **3 of 8** fragments. Full shard/stone bags cannot break a completed battle/Save.

## Hero growth, reroll and rebirth

- Hero rank **I→V**, requiring Hero level `20,40,60,80` to promote. One rank emblem and **+2% all four effective attributes per rank above I**. Bonus is a view/combat calculation, never a write-back to raw base attributes.
- Hero stat reset consumes one `hero_reset` and refunds the **spentAttributePoints** counters to `statPoints`. Does not reroll the hero's innate quality and cannot duplicate points if repeated.
- Hero reaches actual **level 100** before rebirth. One `rebirth_core` and `5000*(rebirth+1)` gold, max **five** rebirths. The hero returns to Lv1, XP0 and zero spent points, but retains equipped gear, learned spells, hero rank, and receives **+4% effective attributes for each past rebirth**. Rebirth is forbidden during march/combat or while serving as Castellan.
- Combined rank and rebirth percent = `1 + .02*(rank-1) + .04*rebirth`; bonuses apply to effective ATK, DEF, SPD, INT. Maximum from rank and rebirth is +28% before temporary buffs. The player must re-level to regain command capacity after rebirth.

## Special soldiers and boss monsters

- Four offline reward-only faction units `human/elf/orc/undead_quest_guard`, tier-value 8 and **1600 equivalent command points per soldier**. They cannot be produced, bought or purchased by raw `E.recruit`, but can join real formations and participate in combat/Save. One is granted only on successfully claiming the weekly Boss mission.
- Four new world sites are not historical coordinates; they use Fandom-based T11 and T12 monster base HP/ATK/DEF/SPD, but spawn counts, AI and terrain are modeled. In gameplay the sites are surfaced in the world-map landmark list.
- Only a real win can increment quest kills. Elite victories guarantee **2 Astral shards and 2 stones**, while ordinary NPC level4+ victories use a deterministic **12% drop** for one shard. Rare gear remains crafted from the ledger.
- Standard historical 40 troops are **not replaced**. A focused QA suite tests all 40 original unit build/research prerequisites at maximum allowed building and spell levels, actual training cost deductions, timed completion and valid v07 Save.

## QA / release boundaries

Technical result is tracked in `qa-hg18-core.cjs`, `qa-hg18-ui-chrome.py` and original 212 engine + HG16 G4 (1000 engagements, 32 7v7) + HG17 organic new-game suites. A green Actions run is required at each delivered HEAD.

Not yet modeled: all Fandom equipment slots (helmet, boots, handguards, necklace and separate ring); detailed equipment rarities/affixes and trade economy; Babel full 40-floor tower; many original Main/holiday tasks; dynamic randomized weekly objectives; physical Android performance; full organic fresh-save progression from Lv1 to Lv100 with no time acceleration; elite/boss custom animation sprites; strategic AI offensive war. These require separate work and must not be labelled "fully finished".

**Priority:** economic inputs/sinks and all 40 unit recruitment first; combat power and Save integrity second; long-term progression and enhanced equipment third; world AI PvP/diplomacy only after those acceptances.
