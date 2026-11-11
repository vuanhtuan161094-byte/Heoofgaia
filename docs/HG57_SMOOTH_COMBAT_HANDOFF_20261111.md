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

## Known limitation and next gates

One `E.battleAct` call still resolves the complete A→B combat round and commits its authoritative receipts immediately, while the renderer presents moves and strikes sequentially. It is **not** a new interruptible half-turn tactical command system; implementing one would require a separate explicit Save-compatible turn-state design. Hero portraits likewise do not yet mint independent hero actors or skill turns. The request was to stabilize existing auto combat and prepare visible hero skill UX without premature gameplay or Save mutation.

Next: obtain the final monolithic CI outcome; fix only evidenced blockers, compare extended large-army fights and actual 10-minute FPS/RAM on Windows/physical Android. Keep branch `feature/hog1-research-to-playable-20261102`, Save v07 and a single offline HTML.
