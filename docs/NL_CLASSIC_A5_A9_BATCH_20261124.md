# Classic WEB A5–A9 — code-first integrated batch (2026-11-24)

Branch: feature/nl-web-review-20261122. Prior head: 0db71f9e3f9d6f5d332379a1f830c22ed1a84886. PR #10 remains draft; no merge, no Codex Cloud, no default-branch write.

## Runtime scope

- A5: 8 rank levels, prestige gates, once-daily salary, tax sentiment, relief, investment, three timed dispatch routes.
- A6: offline faction guild (10 levels), contributions, 8 territory objectives launched through native P2 campaign on already-cleared encounters, territory dividend. Native finish remains battle owner; capture requires live win, cannot be credited through replay.
- A7: existing hero level and A4 rebirth owner; breakthrough at 40 after stage 12; new cap 60+5 per rebirth, 10 maximum, one awakening, advanced training. Old Save v5 IDs and rebirth counts retained; no second growth count.
- A8: 8 supplemental trial objectives on P2, 3 daily events, 7 milestone claims. Not an expansion of all original tower floors.
- A9: training XP, investment, dispatch revenue, workshop/engraving reinforcement discount (same engine/UI quote), warehouse slots, six naval facility consumers and timed cargo. No naval combat engine.
- Canonical item builder embeds advanced JS after A4. All new balances and opponent reuse marked PROJECT_SIMULATED. No original art or source code copied.

## Reference boundary

Historic WEB concepts: https://web.17173.com/content/2011-05-16/20110516152828925.shtml ; https://www.lequ.com/wly/201205/28269.html ; https://www.lequ.com/wly/201109/17622.html ; https://snsfun.com/wly/201105/14746.html . Numeric values for rank/dispatch/growth/stat effects are project-authored. Current Mobile Wiki is a different edition.

## QA and release boundary

- Re-fetched A4/A5–A9 JS and persisted test code; executed 14/14 and 26/26 mocked contracts in a JS runtime. This is NOT actual browser/Save serializer evidence.
- Executed two focused tests on actual inventory engine/rules with synthetic one-item catalogue: workshop+engraving quote 322 silver (from 350); capacity 205 (from 200). Full catalogue access unavailable in this execution; full Node regression and A5–A9 browser smoke are wired into Web Review Actions.
- Existing CI gates retained. No exact-SHA CI/Pages confirmation at handoff. Do not claim Web artifact, release or owner acceptance.
- Remaining: real browser Save/reload with levels >40, native repeat-stage war completion, 55 sprites and portraits, NPC/Wiki map imports, full tower floors, fourth-tier troops and military seals, true multiplayer/national war, naval combat, all original item dispatch reward types, further facility consumers and edition fidelity. A5–A9 is a playable-intent source implementation, not full original parity.

