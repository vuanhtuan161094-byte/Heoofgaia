# HG50 — Viễn Chinh / Boss: staged PvE design and executable gates

Status: **DESIGN LOCKED, RUNTIME NOT STARTED**. HG55 full CI is the blocking
release gate. No invented PASS, no new HTML, no Save v08. This feature is an
independent private/offline PvE design, not a claim about Heroes of Gaia 2009.

## Existing contracts (reused, not rebuilt)
- World Boss T11–T13: `hg42-boss-screen.js`, `hg409-enemy-commanders.js`,
  `hg410-battlefield.js`; 16 enemy stacks on the 12×9 tactical grid.
- Authoritative battle, real AP and troop loss: `engine.js`, `hg261-joint-boss.js`.
- Party: max **3 heroes × 2 owner-bound real stacks**, one simultaneous encounter.
- Tower projection: `hg21-tower-tactical.js`; 5 *claimable* daily wins.
- HG47 targeted shards: awarded only from real wins; no retroactive awards or
  free Boss/Tower tokens. Keep existing quest/economy/v07 saves strictly valid.
- `hg409.rewards` is a recent bounded receipt history, **not** a persistent
  unlimited career progress ledger; it must not be used alone to prove a
  permanent expedition unlock.

## HG50-A — One playable, 3-stage expedition route (P1)
Three sequentially gated nodes referencing **existing real T11, T12 and T13**
world Boss tiles. No new map overlay tiles or fake encounters. Display the
target, CS, enemy stack count, expected resource cost, real route/AP,
actual won/unlocked state and a dispatch link. The dispatch link must invoke
the existing HG39/HG42 planner; cannot silently launch an instant win.

State extension in the unchanged v07 envelope: `s.hg50={v:1,unlocked:1,
completed:[],lastReceipt:null}`. Older saves initialize at stage 1 with no
retroactive Boss wins. Validate completed stage IDs 1..3 strictly and prevent
arbitrary progress jumps. Store a bounded exact-once battle settlement marker
created by the canonical engine; do not trust screen clicks or a UI-generated
battle identifier. Each stage completion is awarded only after an eligible real
Boss `battleAct` outcome `win` and correct bound target. No additional gear,
shards, gold or troop rewards in phase A: the existing engine already pays.

QA: New Game empty, no reward on target selection, cannot skip locked stage,
real multihero victory advances exactly one stage, loss does not advance,
duplicate invocation cannot advance again, historical v07 migration,
Save/Reload during battle/after win, real owner-bound casualties, 4 races.
Extra stage must be additive; no redefinition of normal Boss rewards.

## HG50-B — Phase mechanics (P2, after HG50-A green)
Use existing 12×9 3×2 battle. *At new battle creation only*, bind a
versioned mechanic blueprint to the battle:
- T11 Shield Commander: 65% HP threshold grants a one-time defensive phase.
- T12 Summoner: 50% threshold uses existing free enemy hex only; never add
  enemy units beyond 18 physical cells or accidentally debit player units.
- T13 Berserk: 35% HP threshold boosts enemy melee and telegraphs one turn.
Each transition is a persisted, idempotent battle-state event. It must be
replayed identically on mid-combat Save/Reload and visible in battle receipts.
No uncontrolled multipliers, no changes to already active legacy battles.
Do not implement any phase until the damage/HP and Save schema are audited.

## HG50-C — Rewards, repeatability and UI polish (P3)
Only after A/B pass, add new non-overlapping expedition progression rewards
and a daily/weekly replay policy. Define capped sink/source economics first,
including HG47 focus and Tower claim eligibility, before granting anything.
Do not allow auto-hunt or manual Boss to double-claim a stage. Stage selection
and Boss screen must remain compact in landscape 768×260 and 844×390.

## Release gates
G0: `HG55` optimized HTML, exact SHA, 5-viewport Chromium, all previous
engine and UI regression, valid Save v07. **HG50 runtime blocked until G0 PASS.**
G1: HG50-A focused Node + actual Chromium receipt/Save flow PASS.
G2: HG50-B 65/50/35% phases validated with actual tactical hit receipts.
G3: integrated build and one `Play-Heoofgaia-HG11.html` artifact, no new
branch/merge, no Codex. Physical Android test remains PENDING USER if unavailable.
