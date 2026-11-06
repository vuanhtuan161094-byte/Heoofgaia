# CODEX EXECUTION START — HG33 HEX + ALL-ORIGINAL COMBAT ANIMATION
**Owner instruction dated 06/11/2026.** This is an **execution order**, not a request for another plan or a conceptual mockup.

## Read before touching code

Repository `vuanhtuan161094-byte/Heoofgaia`. Work **only** on current development branch `feature/hog1-research-to-playable-20261102`, preserve single built release `Play-Heoofgaia-HG11.html`. Read in order:
1. `AGENTS.md` (new 06/11 HG33 override first).
2. `docs/HG33_HEX_ORIGINAL_ART_MASTER_20261106.md` **FULL FILE**, especially critical review and acceptance gates.
3. `docs/HG28_40_TROOP_ANIMATION_MASTER_20261106.md` (historical 22/200 count, not original-complete).
4. `docs/HG28_CODEX_VISUAL_OVERHAUL_20261105.md`.
5. `docs/PROJECT_SINGLE_SOURCE_OF_TRUTH.md`, current checkpoint, workflow, source and asset manifests.

**Verified planning baseline, not a hardcoded branch expectation:** `faf17771f28bcdf34be759b97427bc64b1529948`; Actions #383: https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/42164863325 SUCCESS, 88/88. Re-fetch latest HEAD before work. If changed, inspect intervening changes and adapt — do not overwrite other worker commits.

## Mandatory first response/action

Inspect `git status`, remote SHA, in-progress Codex ownership, source `engine.js` (12x9, Manhattan range/path), `painter.js`, `app.js`, `hg21-tower-tactical.js`, `hg261-joint-boss.js`, `build_offline.py`, `assets/animations/hg28/coverage.json`, asset source manifests. **Then begin implementation**, not another speculative plan.

### Work in this exact order, each gate producing actual source+tests+evidence+commit on SAME branch

**H0 — inventory + screenshots.** Build `docs/qa/hg33-boss-inventory.json` from the real engine encounter paths, including named/elite/Tower/private Boss; enumerate 40 core +8 specials. Audit which images and action clips in the released HTML came from third-party web sources, original image generation, drawn sources or unknown. Capture real current combat 3 Boss, 3x2 at 1280×720/960×540 as BEFORE. Fix no unrelated gameplay.

**H1 — implement genuine hex battle geometry.** Use pointy-top, odd-r, 12x9 **initially**. Shared hex service (axial/cube conversion, 6 neighbors, symmetric distance, hex path/occupancy, point-in-cell inverse, range), not merely hex outlines. Refactor battle range/AI/move previews/hit testing to use identical topology. Preserve old Save v07 and integer x/y/3x2 team mapping; do not silently change drop economy or troop stats. Optional grid aesthetically faint on terrain; selected/reachable/attackable highlights. Screenshots and browser interaction at both resolutions, continuous 12-turn auto, actual old Save restore. **Do not advance unless H1 tests truly pass**; stop and clearly report a hard blocker rather than forcing incompatible Save migration.

**H2 — original-art pilot.** Build at least six **different** newly authored game-ready characters (human melee, elf ranged, orc brute, undead, winged/dragon, a named Boss) with editable layered sources and independent **Idle/Walk/Attack/Hit/Death** poses (>=8 meaningful distinct frames/action if atlas). Fight in real game and screenshot actual attack/Hit/Death. Character art must be polished dark-fantasy, readable at 960×540; manually inspect each contact sheet. Do not substitute a copied web sheet, photo, giant static PNG or global rotate/translate animation.

**H3 — finish all 40 core troops.** 40 original source identities, 200 true original action sequences, credible per-species motions and unique silhouettes. Implement module, manifest, atlas packing, state event mapping, per-race contact sheets and source-integrity checks. Update existing 22/200 legacy coverage truthfully, **not by relabeling old clips**. Work in manageable complete batches with regression at each batch. Own all source files.

**H4 — finish every Boss + 8 special units.** Complete the actual H0 discovered Boss inventory including the three existing art registrations Azrael, Demonlord Samurai, Cyclop Tyrant; all needs original five actions. Finish 8 HG27/HG30 special soldiers independently; count them separately from the 40. Replace ALL external combat art in the runtime, including obscure fallback paths and offline builder. Do not delete source archives needed for documentation/tests without verifying downstream usage.

**H5 — final integration.** Real attack, damage, death, casualty, Save/Load, Tower, 3 commanders ×2 stacks, no rewards minted, no double ticks. One offline HTML; new original sprite assets, all offline inline, performant on Windows 10/8 GB. Run full original GH Actions to **SUCCESS on latest HEAD** and attach actual HTML + screenshots. A partial green workflow is not final release proof.

## Non-negotiable prohibitions

- No new branch, PR-only track, main merge, second HTML, force push, repo rewrite, Codex background promises, generic strategy discussion instead of implementation.
- No changes to economy, stats, loot, AP, per-owner buffing, 3x2 limits, Save v07 validation or reward receipts to "fix" rendering.
- No external web sprite/animation/photo/textures in the new combat runtime, even if free/licensed. Do not trace/crop image references. Style references okay only as general composition.
- Do not claim "original" without editable original master/source, provenance metadata, generated frames and Chromium proof. If no image-generation/drawing capability of sufficient quality, explicitly report **BLOCKED** for that actor and state why. Keep completing truly actionable engineering slices.
- Do not suppress or remove tests to hide regression, invent screenshots, simulate 40 complete actors with one template, count rigid transforms as independent action clips, invent a specific number of Bosses before source census.
- No unrealistic output claims: keep full animation coverage *PARTIAL* until 40×5 + Boss + specials are actually ready and checked.

## Command/test starting point (extend, do not weaken)

```bash
node qa-engine.cjs
node qa-hg09-combat-viewport.cjs
node qa-hg261-joint.cjs
node qa-hg28-animation-coverage.cjs
python build_offline.py
python qa-hg28-pve2-chrome.py
python qa-hg28-rigs-chrome.py
```

Implement new `qa-hg33-hex.cjs`, `qa-hg33-hex-chrome.py`, `qa-hg33-art-originality.cjs`, including a FINAL `--require-full-original` gate. Add those to existing `.github/workflows/hog-combat-offline.yml`. Maintain both baseline and new QA until conversion is validated, then replace old rectangular assumptions with equivalent or stricter true-hex assertions.

## Mandatory report at each verified gate

`Gate | source SHA | files changed | executed tests PASS/FAIL | remaining blockers | screenshots/artifact paths | source inventory coverage (40 core, 8 reward, all discovered Boss IDs) | exact CI run URL`.

Update `docs/CURRENT_HG_CHECKPOINT.md` **minimally** to avoid destroying prior history; record factual findings only. Before every push re-fetch remote HEAD and resolve concurrent edits safely. Final report must distinguish **rendered hex**, **true hex movement**, **original-art pilot**, **full original frame coverage**, and **actual CI success**.

**Owner's intended result:** the latest playable game should look like an original high-end fantasy web strategy game, pointy-hex grid and legible troops/Bosses. Start code/asset production immediately; no more draft-only output.
