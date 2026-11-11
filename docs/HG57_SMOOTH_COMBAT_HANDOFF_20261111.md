# HG57-B — VERIFIED FOCUSED RELEASE 2026-11-11

- **Game/source SHA**: `cad61f00aa24fd70ad8f81c4076282095f94f7d7` (existing single branch only, no merge, no Codex).
- **SUCCESS focused workflow**: [HG57-B #42947692652](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/42947692652); exact source SHA verified in Actions logs. Every job step succeeded, including one HTML artifact.
- **Release HTML**: artifact [HG57-Playable-Single-HTML #13822479609](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/42947692652/artifacts/13822479609). Exactly ONE member `Play-Heoofgaia-HG11.html`, 78,737,260 bytes, SHA256 `d009128f8ab03cafc9e65c9cc2d08d5d23327f17335f9fee06e3aef2c9a4f32d` (verified independently after download). Browser screenshots+metrics artifact [#13823746210](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/42947692652/artifacts/13823746210).
- **PASS focused**: HG57 engine 6/6 (including actual 3 heroes × 2 owner-bound stacks vs 16 Boss stacks, true march/AP/casualties/loss, Save v07); HG26 15/15 (real paid 61 manual troops preserved with stale 16-unit template autoFill OFF); HG57 Chromium 27/27; 4-viewport HG57B 22/22; HG34 25/25 (RAF, actual auto combat and 3×2 Boss); HG48 48/48 (10/10 scrollable slots/recipes, no phantom fragments); all HG181 checks including unpaid Tower loss and real paid 61-soldier Tower win, one reward, real HG26 start + 3 owner cold Save v07.
- **Verified short live-Chromium FPS (22-actor render stress, actual Chrome runner; not Android hardware)**: 1280×720 ~57.77 FPS, 1818×830 ~56 FPS, 844×390 ~29 FPS, 412×915 ~29 FPS; draw p95 roughly 0.6–1.0ms. Fixed ultrawide stage overflow, preserved global resource HUD, independently toggled unit names and HP. No recreated canvas or uncaught browser JS errors. Movement/attack presentation remains sequential; canonical whole round resolves once, not separately interruptible half-turns.
- **Distinct monolithic legacy offline QA**: [#42947692646](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/42947692646) was IN_PROGRESS when this handoff was written. **Do not call global FULL CI PASS** until this workflow concludes. Physical Windows and Android remain PENDING USER.
- **HG57-B source changes**: `painter.js` one pending-damage pass per frame for dense Boss battle; `app.js` 60Hz-compatible RAF caps; `style-hg57.css` intrinsic-size canvas clipped stage fix; `hg26-boss-autohunt.js` bugfix preventing disabled auto-fill from overwriting explicit paid manual formation; evidence-led HG34/HG181/HG48/3×2 QA and `.github/workflows/hg57-smooth-combat.yml` gated single HTML output.

---

# HG57 — Smooth phased combat, real commanders, labels and HP · 2026-11-11

## Verified playable checkpoint

- **Source SHA accepted:** `ead2e7fcf5972309a1947aab1206aaafb77bc6a3`.
- **HG57 focused GitHub Actions:** [run #42940862822](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/42940862822) **SUCCESS** on that same SHA.
- **Engine:** `qa-hg57-combat.cjs` **5/5 PASS**; real v07 marching/teams, melee movement allowance, true two-phase actor order, 22-actor non-overlapping animation, strict Save/Load and enemy commander origin.
- **Real Chromium `file://`:** `qa-hg57-chrome.py` **27/27 PASS** (1280×720 desktop, 844×390 mobile landscape, 412×915 mobile portrait), screenshots and diagnostics in evidence artifact ID **13819514767**. Assertions include two-sided leader portraits, responsive HP/round counters, 5 real resource HUD totals, independent HP/name toggles, original NPC rewards unmodified, no page errors.
- **Only playable HTML:** `Play-Heoofgaia-HG11.html`, artifact ID **13819649412**, 78,735,307 bytes, SHA-256 **11ecf9c2f88f939b955ed0bbd2158a302596c6330da516dc5ca4dc17edf7478d**. Independently downloaded from successful Actions and verified byte hash. Source JS/CSS and assets inline; one branch, one game, no extra HTML.
- **Monolithic old `Heoofgaia offline combat QA`**: run [#42940862842](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/42940862842) was **IN PROGRESS** when this handoff was drafted. This is separate from verified HG57 focused workflow. Do not claim overall repository FULL CI PASS until this and other historical suites are confirmed on exact relevant SHA.
- **Physical Windows/Android user device:** **PENDING USER**. Chromium mobile simulation is not device FPS/thermal/battery acceptance.

## Exactly what was changed

1. `engine.js` canonical combat round: ALL surviving player stacks resolve first, followed by ALL surviving enemy stacks; within each side priority is **higher SPD first**, then original formation column/row. No parallel side movement/attacks, no extra enemy/player action, no new Save fields or phantom battle outcome.
2. Real movement budget **melee 1 hex/turn when SPD under 7, 2 at SPD≥7**; skill/status modifier can adjust up to 3 hexes; ranged **1 hex/turn**; melee attack range 1 hex, ranged typically 4 hexes / elite 5. Existing BFS true pointy-top odd-r 12×9 hex path and no-occupancy move checks preserved. These are game-designed values, not claimed authenticated original HoG source stats.
3. `painter.js` sequential timeline: one stack completes move+strike before next; visible gap between sides; dense 22-stack boss schedule ~8.1 s; hex interpolation eased to avoid abrupt travel; existing receipt/HP/casualty authority and all HG56 combat bloom/VFX preserved. Two-sided phase indicator shows actual visual side.
4. `app.js` + `style-hg57.css`: genuine `s.heroes` commander portraits on friendly side (up to 3), actual `b.hg409EnemyCommander` on enemy side; no fake enemy hero for ordinary NPC (show named NPC leader emblem). They are **visual command representatives, not new independent attacking units**; existing skill system remains separate for future extensions.
5. Independent hide/show **unit and monster nameplates**, **HP bars**, plus hex grid display options; read-only preference in browser localStorage (not Save v07). Selected stack shows exact hex move allowance, range and actual HP/army count.
6. Responsive Canvas HP/turn UI: narrow portrait uses 94px side meters instead of overlapping min 155px, critical-health warning at below 24%; UI names and HP use real current stack totals. `qa-hg28-pve2-chrome.py` expected meter boxes updated to same measured geometry.
7. Auto battle is deadline-scheduled to full animation duration, not 85ms overlapping stacks; manual repeated attack inputs are blocked while the preceding round's animation is playing. No combat economy, skill damage, item drops, AI target rules, or Save schema changed.
8. `index.html` and `build_offline.py` embed the new CSS in the same `Play-Heoofgaia-HG11.html`.

## Full aggregate regression follow-up (QA-only after playable SHA)

- Historical monolithic `Heoofgaia offline combat QA` [#42940862842](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/42940862842) **FAIL** on the verified playable source `ead2e7fc`. The focused engine/browser gates above remained PASS.
- Exact log root cause: legacy `qa-engine.cjs` asserted that at 225ms the first two-hex path reached exactly x=2 (linear, fixed 225ms-per-hex), incompatible with intended HG57 eased, adaptive movement. This is a stale animation acceptance assertion; evidence did not show invalid geometry or data loss.
- Repaired the test **only** to derive times from the actual `battleVisualSchedule`, assert smoothstep positions stay strictly within each real hex, verify friendly-side-before-enemy animation, full Death/Hit timeline and canonical Save untouched. Regressed auto duration to exact computed visual schedule. QA-only SHA `a9fcc61ec7383f68b968580821fa2d536d4eb67b`, no game source or HTML byte change.
- New monolithic workflow [#42941697856](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/42941697856) and HG41 [#42941697881](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/42941697881) **PENDING final result** when written; do not mark overall FULL CI green without matching log. Single playable HTML SHA above remains valid.

## Known limitation and next gates

One `E.battleAct` call still resolves the complete A→B combat round and commits its authoritative receipts immediately, while the renderer presents moves and strikes sequentially. It is **not** a new interruptible half-turn tactical command system; implementing one would require a separate explicit Save-compatible turn-state design. Hero portraits likewise do not yet mint independent hero actors or skill turns. The request was to stabilize existing auto combat and prepare visible hero skill UX without premature gameplay or Save mutation.

Next: obtain the final monolithic CI outcome; fix only evidenced blockers, compare extended large-army fights and actual 10-minute FPS/RAM on Windows/physical Android. Keep branch `feature/hog1-research-to-playable-20261102`, Save v07 and a single offline HTML.
