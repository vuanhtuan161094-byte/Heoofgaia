# HG-26 — Boss Auto-Hunt: Canonical Tactical Loop and Safe Logistics
**Checkpoint:** 2026-11-04. **Repo:** `vuanhtuan161094-byte/Heoofgaia`.
**Branch:** `feature/hog1-research-to-playable-20261102`. **Save version:** v07 (unchanged).
**Implementation:** `hg26-boss-autohunt.js`; focused `qa-hg26-boss.cjs`.
**No Codex**, no edits to animation/sprite/painter/CSS systems.

## Behavior — the only authorized flow
1. Player opens **Quân đội → HG-26 Tự săn Boss**; explicitly selects a *real* reachable elite NPC Boss; sets max sorties (1–100), minimum troops, minimum remaining AP, minimum percentage of stored formation, maximum casualty percentage, Arena heal, paid enlistment, stop-on-loss. Default automation is **OFF**.
2. `E.hg26Start(s,policy)` validates hero availability, army ownership and route. It prepares a normal HG20 per-hero formation and saves its desired HG24 template if none exists. **No immediate reward, no granted soldier.**
3. Every enabled browser timer pulse calls `E.hg26Step(s)` exactly once. A `ready` pulse calls the canonical `E.startMarch` **once**, charges true AP, removes real soldiers from the garrison into the canonical `s.expedition`, and records departure count. No new dispatch while an expedition, battle or parallel march exists.
4. The canonical `E.tick` advances actual march duration. On real battle arrival, a pulse arms HG09 tactical mode. During combat, **one pulse = at most one canonical `E.battleAct('attack')` tactical turn**. No strength comparison, automatic win flag, artificial damage, synthesized reward or bypass of 70-turn timeout.
5. The terminal HG26 wrapper observes the real outcome from the fully wrapped HG24→HG18→HG10 battle authority. It writes **exactly one** `s.hg26.last` and increments one attempt. XP, materials, loot, Fame and original battle reports come **only from existing gameplay functions**, and only on a real win.
6. The canonical expedition carries surviving army back with actual travel duration. HG26 does not take new troops or another AP payment until the first expedition is fully returned to its city.
7. Recovery policy: stop at max sorties, after a non-win (when stop-on-loss), or when casualty fraction exceeds configured max. With Arena healing enabled, genuine `E.heal` queues gold-paid treatment; wait for completion through normal ticks. When enlistment enabled, call `E.hg24Replenish`, which uses unreserved city stock and the canonical paid recruit queue (subject to troop unlock, race and affordability); wait for training completion. When refill is incomplete and safe force thresholds are not satisfied, stop. When merely short of AP, *wait for natural regeneration*. Next sortie begins only when all gates pass.
8. Disabling HG26 stops further bot pulses/launches. **It does not magically recall/cancel an army already outside**; its existing expedition continues via canonical world rules.

### Important distinctions
- The policy is a **single-hero world Boss loop** with up to seven HG20 world formation stacks and actual casualties, NOT the HG21 **Tower team of up to 3 heroes × 2 stacks**. Tower remains untouched and independently playable.
- The Boss location and leader are pinned for the whole run. No switching to another hero or another target midway; other reserved troops are never borrowed or duplicated.
- The automation stops after at most 100 sorties and on loss by default. While a Boss battle is live, it also checks surviving soldier counts before each new round; if losses exceed the configured percentage, it halts without issuing another turn, marks the battle for manual intervention, and suppresses the older 10-second fallback auto-combat until the user explicitly clicks Auto. It is **not** a bot that runs while the game is closed. Browser reload preserves an active policy, but no real fight advances in a closed browser.
- The `s.hg26` object (default OFF) contains a versioned policy and state-machine phase: `ready | outbound | battle | returning | recovery | halted`; `runs/wins/losses`; departure count; most recent actual result, survivors, damage losses and battle `reportId`. Legacy v07 saves are initialized with this extension **without free loot or money**.
- `E.hg26Stop` remains available on the HUD while the bot is running, including during battle. The Quân đội popup contains all policy controls and current status.
- It is intentionally conservative: unrelated combat/marches stop the bot, other recruit queues are never overwritten, and special reward-only troops cannot be enlisted via the automation.
- Real-time/ offline-accumulation in the original E.tick can replenish AP and resources on travel; this is legitimate production, not an HG26 grant.

## QA contracts and evidence
- Four New Game races start with HG26 OFF; Save v07 roundtrip and HG24 legacy migration produce no free army, XP or resources.
- A real Boss dispatch checks true AP debit and soldier transfer to `s.expedition` exactly once, then Save→Reload while en route, and confirms no second AP payment from a duplicate step.
- Real tactical combat is driven for up to 70 turns, terminal result matches the canonical report, one attempt records exactly once, no extra reward on subsequent recovery ticks or Save reload.
- Explicitly **synthetic high-attribute-hero fixture** wins a *real* tactical fight to prove successful receipt flow; no test may claim this was naturally earned from Lv1.
- Two successive *real* tactical victories by a fixture commander require two distinct world departures and two distinct canonical report IDs, with real troop return/refill between them.
- Safety tests block AP-reserve violations, excessive casualties, missing stock, and explicit stop; Arena healing queues and pays actual cost, waits for duration, and restores actual troops only after completion.
- Real Chromium UI: HG26 starts disabled, displays Boss/limits, user clicks enable, Save is strict, then user clicks stop; existing HG21 Tower and HG24 UI contracts must still pass.
- Full offline build uses `hg26-boss-autohunt.js` after `hg24-private-automation.js` and before UI; `.github/workflows/hog-combat-offline.yml` runs HG26 Node QA.
- Ordinary world/tower/quest/XP/weapon/source-art regression must remain unchanged.

## Known boundaries and next steps
- No overnight/background auto-combat, remote daemon, autoplay without opened game, PvP, Castle combat, Boss-farming efficiency guarantee or Godot/Android build is claimed.
- The tactical AI currently follows the original game's auto-attack priorities; specialist Boss spells and retreat-risk heuristics are future gameplay work.
- Arena's built-in recovery queue chooses an existing wounded unit; on heavily mixed garrisons, the player should review overall wounded stock before enabling paid healing.
- Repeat-until-limit is bounded (1–100 attempts per activation) to protect Save and AP. Player may explicitly start another policy after it finishes.
