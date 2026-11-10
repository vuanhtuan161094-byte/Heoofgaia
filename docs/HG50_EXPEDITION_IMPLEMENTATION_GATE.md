# HG50-A/B/C release gate — 2026-11-10 (latest status)

**IMPLEMENTED + HG50 focused FULL WORKFLOW PASS** on exact game-code SHA `4aa29bcd20b3bfee86310e4dc05f59401405774e`, [Actions #42849692293](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/42849692293). Engine A 9/9, B 7/7, C 9/9; economy 4/4; Chromium A 28/28, B 27/27, HG55 27/27. Single offline `Play-Heoofgaia-HG11.html` artifact ID 13779343956, SHA256 `ad820d4f8de1e61fa5c38587fc993c3d43b391f848cb91e1a10fdd06886b5a8a`.

**HG50-C is implemented as a *non-paying* repeat progression ledger:** real Boss replay and day/week UTC milestones retained inside strict Save v07; no extra reward, no duplicate grant, no fake fight. Original Boss rewards, AP, troop casualties, per-race equipment fragment systems and HG40.9 authoritative loot continue unchanged. The requested audit has run against 4 races × 3 tiers. Physical Android/Windows remain PENDING USER; entire historical monolithic combat workflow and latest additional 3×2 HUD regression are separate **PENDING CI** items, not mislabeled PASS.

The original staged plan below remains as historical design; any statement there that HG50-B/C are not implemented is superseded by this status. Exact SHA updates and blockers: `docs/HG55_HG50_HANDOFF_20261110.md`.

---

# HG50 — Viễn Chinh / Boss: staged PvE design and executable gates

Status (2026-11-10): **HG55 G0 CI PASS; HG50-A coded and focused engine tested; final A full-CI for route-target hotfix pending exact-SHA confirmation. HG50-B/C not started.** No invented PASS, no new HTML, no Save v08. This feature is an
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

## HG55/HG50-A verified handoff (2026-11-10)
- HG55 Actions run `42828561859` on SHA `4cadb3a8c6f7d7f2004eed1d2f0f178c88808949` completed all CI steps successfully. Actual Linux Chromium mobile-emulation report: 27/27 assertions across desktop 1280×720, 960×540 and emulated touch 844×390, 768×260, 412×915. Measured navigation wall 840–899 ms, JS heap 7.67–9.13 MB; neither is a physical Android benchmark.
- 22 PNG embeds converted to verified pixel-identical lossless WebP, source assets untouched; one offline build decreased from 88,169,270 to 78,688,956 bytes (9,480,314 bytes saved). Save remains v07.
- HG50-A engine and Boss UI already integrated. Three canonical stage targets are T11 `18,92`, T12 `29,86`, T13 `99,81`; other same-tier Boss fights must remain normal playable Boss encounters, not expedition milestone wins.
- Bugfix source commit `cd3a5a9007ce1432921ca709e2e1096dd2ec30e0`: checks the **exact canonical route target** in addition to the current tier before recording an expedition completion. Regression source commit `819c151574e0a375bf7ae4f173d8d6648a354809`: real alternative T11 Boss `82,91` victory must leave the expedition stage locked, while the original Boss receipt remains claimable.
- Focused real-engine VM from the embedded game scripts: true Boss `82,91` victory (18 turns) did not advance HG50, true Boss `18,92` victory (18 turns) advanced to stage 2 and remained valid after Save/Load; four New Game races, malformed state rejection, historical Save migration also checked. This is not a substitute for GitHub FULL CI or Android.
- HG50-A full workflow must be verified at **the exact hotfix+regression source SHA** before opening HG50-B or distributing its replacement HTML. Earlier CI on `cd3a5a9` was canceled after a newer push; don't label this canceled run PASS.
- HG50-B release discipline: persist threshold crossing and combat phase in the existing v07 battle state, not a second store. Verify mid-battle Save→Reload, double-trigger prevention, real damage/casualties, boss phase VFX/telegraph, and exactly-once loot at each 65/50/35% phase before changing daily/weekly reward rules.
