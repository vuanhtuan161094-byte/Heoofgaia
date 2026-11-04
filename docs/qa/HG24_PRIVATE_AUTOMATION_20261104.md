# HG-24 — Private Logistics, Hero Army Templates & Repeatable Progression
**Date:** 2026-11-04 · **Repo:** `vuanhtuan161094-byte/Heoofgaia` · **Branch:** `feature/hog1-research-to-playable-20261102`.
**Save authority:** `s.version=7` stays unchanged; HG24 new metadata is `s.hg24`.
**Scope:** private offline PvE; no Codex; no animation, sprite, painter or art changes.

## Owner objective and boundaries
- Increase resources and XP, reduce grinding and clicks. Maintain actual resource payment, troop ledger, hero-specific ownership and save safety. Do not tune for PvP balance or insist on original 2009 pacing.
- Do **not** convert HG21 Tower into a seven-stack global-buff party. Tower stays max **three heroes × two selected stacks each**, ownership and spell cooldowns per hero. World marches stay one hero per expedition and up to seven stacks.
- HG24 does not automatically resolve Boss fights. It chooses a viable **available** hero and route, optionally dispatches once, then HG09 tactical combat remains actual and authoritative. Winning is not promised by recommendation.

## Data model
`s.hg24={v:1,templates:{},daily:{day,drills,harvest},bossWins}`.
- Templates key `cityId:heroId` (up to 48): `{cityId,heroId,groups:[{unitId,count}],autoFill,autoTrain}`. Each is per owning city and hero. State validates real city and hero identities, race-local unit IDs, safe positive integer counts, 1–7 groups, 48 templates max.
- Legacy v07 records without `hg24` migrate on parse with **no grant or troop change**. JSON remains bounded by preexisting 2 MB save limit.
- Daily UTC date derives from `s.lastTick`; upgrades/claimed records are serialized and survive reload. `bossWins` tracks real successful Boss fights.

## Troop policy and commands
- Save a desired formation only from the hero's existing **real** HG20 plan via `E.hg24SaveTemplate(s,heroId)`. Keeping a desired count in template never duplicates the underlying army.
- `E.hg24Apply(s,heroId)` and `E.hg24Replenish(s,heroId,true)`: calculate available as `army[unit]-reservations[other heroes]-already used this plan`; obey current hero command cap. Partial refills are permitted; unavailable soldiers are **not fabricated**.
- The `autoFill` policy runs after engine time advances, for free heroes in the active city, and never while marches/tactical battles are active. Existing HG21 Tower picks are remapped by troop identity if the formation compresses.
- `autoTrain` is a second, independent **opt-in**, available only when `autoFill` is enabled. If an eligible regular troop is missing and no other recruit queue exists, queue **one** real paid training entry (1–1,000 units); validate actual unlock gate, resource affordability, and ownership. Exclusive quest/Tower units never become recruitable by policy. A queue completes via normal engine time; it does not instantly mint troops.
- The default for both policies is **OFF**. Explicit one-shot refill with training is available without turning on recurring automation.
- For multi-city, active-city-only refills are intentional: switch to that city for that city's templates. Never move a busy hero or transfer unit stock across cities silently.

## Boss squad recommendation and one-click dispatch
- `E.hg24RecommendBoss(s)` lists actual elite `E.TILES` encounters with existing routes, AP costs, availability and candidate commanders.
- Candidate strength is estimated using **live unreserved garrison units**, not the full desired historical template. Scores are a navigation suggestion, not guaranteed battle predictions.
- `E.hg24PrepareBoss`: validates no active march/battle, valid target and enough AP; switches to the recommended free commander, safely restores their valid plan or available template and returns a visible hero + troop receipt.
- `E.hg24DispatchBoss`: performs preparation and invokes the canonical `E.startMarch` exactly once. Actual AP is charged, army removed from the garrison, `s.expedition.heroId` owned and battle initiated after the real route.
- Existing normal world UI and combat are retained. Two small gameplay buttons in the Quân đội window provide **Prepare** / **Dispatch** for a nearby standard Boss.

## Repeatable private XP and resources
- `E.hg24Drill`: up to **five resource-paid practices per UTC day**, shared across heroes. Requires a living level-below-100 commander in town and enough five-resource stock. Exp base `40,000 + 5,000 × currentHeroLevel` (+ canonical Hero Tower bonus); paid cost `gold=2,500+220×level`, `wood/ore=60+3×level`, `sulfur/crystal=24+level` (rounded). No EXP for max-Lv100 hero; rebirth resets level, enabling repeat use.
- `E.hg24Harvest`: requires **at least one legitimately captured mine** and may claim only once per UTC day. Reward resource quantities scale linearly with mined site count and are capped by the existing warehouse engine; additionally grants `20,000+12,000×mineCount` XP to the chosen hero via the canonical experience service.
- Real **Boss 9★ and above victories** grant additional private EXP: 200,000 (9★), 300,000 (10★), 550,000 (HG20 private Boss), plus `min(1,000,000, 5,000×priorBossWins)`. Resource rewards also pay after actual victory and respect warehouse limits. Existing report heroXp and actual received resources are updated; no repeated claim on reload.
- These values are intentionally private fantasy progression, **not** Heroes of Gaia 2009 sourced statistics.

## User controls
- Inside Quân đội, a compact HG24 gameplay section uses existing card/button styles, no new CSS assets or animation. Actions: save current formation as template; fill from warehouse; fill and recruit missing; enable or disable opt-in policies; prepare/dispatch Boss; paid EXP drill; daily mine harvest.
- The UI shows active hero, template quantities, daily resource and EXP costs, training usages remaining and mine count. All relevant engine operations are available programmatically for future UI redesign.

## QA and known boundaries
- Focused `qa-hg24-private.cjs` verifies all four race starters, v07 roundtrip and no bonus on legacy loads; two-hero reservation isolation, opt-in paid queuing, auto-resupply, switched-off training, live-strength Boss dispatch, daily paid XP, mine ownership gating, HG21 3×2 tower ownership, and casualty-reduced Boss squad selection. Attrition, extra heroes and mine ownership fixtures are marked synthetic; actual paid recruit/training and dispatch use canonical functions.
- `qa-hg181-window-chrome.py` checks **real browser clicks** for template save, opt-in policy and resource-paid training; old Tower, world combat and fixed viewport acceptance remain mandatory CI gates.
- No physical Windows/Android long-term human playtest, no autopilot Boss kill loop, no free troops, no battle bypass, no PvP/network service, and no promises about high-tier Boss strength relative to chosen hero. Asset/animation changes must be coordinated with the separate worker, not this task.

## Next independent gameplay extensions
1. Limited auto-repeat contracts that resolve actual tactical victories and AP, not scripted success.
2. Warehouse overflow policy / resource conversion when private production fills stock.
3. Multi-city template control and recovery after dispatch while a different city is active.
