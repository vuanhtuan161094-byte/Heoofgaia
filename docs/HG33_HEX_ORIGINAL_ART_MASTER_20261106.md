# HG33 — HEX BATTLEFIELD + 100% ORIGINAL COMBAT ART & ANIMATION
**Owner decision:** 06/11/2026 | **Status:** APPROVED PLAN / NOT YET IMPLEMENTED | **Executor:** Codex (explicit delegation for HG33)  
**Repository:** `vuanhtuan161094-byte/Heoofgaia` | **Only branch:** `feature/hog1-research-to-playable-20261102` | **Only playable HTML:** `Play-Heoofgaia-HG11.html`.

> This file supersedes contradictory HG28 *future art and grid* design instructions. It does NOT authorize changing economy, reward, per-hero ownership, Save v07, or unrelated UI. Read `AGENTS.md`, `docs/HG28_40_TROOP_ANIMATION_MASTER_20261106.md`, `docs/HG28_CODEX_VISUAL_OVERHAUL_20261105.md`, and `docs/CODEX_EXECUTE_HG33_20261106.md`.

## 0. Verified baseline — stop inventing progress

- At planning time, branch HEAD `faf17771f28bcdf34be759b97427bc64b1529948`, integrated GitHub Actions [run #383](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/42164863325) **SUCCESS, 88/88 steps**. A historical checkpoint, not a permanent HEAD; recheck the remote branch before writing.
- `engine.js`: `BATTLE_GRID={cols:12,rows:9,...}`; `dist(a,b)=|dx|+|dy|`; `battlePath` and movement/target/ranged balance are written for square/Manhattan cells. `painter.js` uses an invertible shallow **oblique quadrilateral** projection. Hex is **NOT implemented** yet.
- Current HG28 catalog: **4 races × 10 = 40 troop IDs** `human_1..10`, `elf_1..10`, `orc_1..10`, `undead_1..10`. `assets/animations/hg28/coverage.json` and `node qa-hg28-animation-coverage.cjs` track **22/200 independently sourced action clips; 4/40 complete units, 215 known frames** at baseline. These are provenance/pose counts, **NOT 100%-original release approval**.
- Eight T9/T10 troops currently have original 512px masters and articulated rig transforms in `art-hg28-rigs.js`, **NOT five independent frame clips**. Do not count 8×5 render invocations as 40 genuine action clips.
- Only **three Boss image registrations** currently exist in `painter.js` / `assets/generated/hg28/bosses/asset-manifest.json`: Azrael, Cyclop Tyrant, Demonlord Samurai. Other enemy archetypes exist (e.g. Fiery Giant, Earth Bear, Fallen Treant, NPC camps, Tower-generated enemies, private world Bosses); **derive exhaustive unique identities from all combat source paths at execution time**, do not assume 3 Bosses is complete.
- In addition to the 40 core units, HG27/HG30 provide **8 special/reward unit IDs** (`race_quest_guard`, `race_tower_sovereign` for four races). Track them separately; never claim 48/40, never omit their runtime presentation in migration.
- `build_offline.py` embeds JS/assets into one offline HTML. Retain this packaging; do not add network dependencies or duplicate release outputs.

## 1. Critical design decisions after red-team review

| Rejected shortcut | Why it fails | Approved correction |
|---|---|---|
| Switch immediately to 14×8 or 13×8 | 12×9 is an engine/save/test contract; impacts melee/ranged distance, A*, auto and saved battle coordinates | **Preserve 12×9 and existing x/y IDs initially.** Expand only on measured, approved need with migration/equivalence proof |
| Draw hex outlines over Manhattan pathfinding | Misleading: six apparent neighbors, four actual neighbors; invisible path/range mismatch | Implement **true six-neighbor hex navigation + hex distance** before calling it completed |
| Flat-top purely by habit | User's most relevant third battle image depicts top/bottom pointed hexes, and vertical lanes need horizontal staggering | **Pointy-top, odd-r horizontal offset** recommended; verify by real screenshots, pivot alignment, hit targets |
| Make isometric/3D floating board | Repeats ugly platform/grid complaint, complicates tap targets | **Terrain-integrated flat mesh** with real textured grass/snow variants, no raised polygon stage |
| Drop all HP/labels on feet | Hides actors in six-stack fights | Layout/occlusion budget, foot pivot at cell center, badge/name to clear zones; prioritize active/hover/focused actors |
| Convert old five existing actions by global rotate/scale alone | Same still repeated is not real animation | Independent per-part articulated poses and verifiable per-frame output, meaningful action-specific progression |
| Preserve previously downloaded sprites in runtime | Violates owner's **new** no-internet-art decision, even if permissively licensed | Newly made **original source artwork** and motion only in released runtime; existing art retained only as historical reference/QA where necessary and clearly excluded from release |
| Count one master or renderer output as 5 animation clips | Misreports progress; previous 22 clips not necessarily original | Track **source provenance + pose type + runtime connectivity** separately; 100%-original gate requires all three |
| Promise Codex can always generate polished images | Code generator's asset/image tools are environment-dependent | Create original SVG/painted source/rigs with available tools; if high-quality raster generation is unavailable, label that identity **BLOCKED** and do not substitute a low-quality placeholder or call it DONE |
| Fake victory, free army, loosen Save validity to show visuals | Corrupts economy and invalidates QA | Fixtures may provision synthetic actors for renderer QA only, must be labeled; test real dispatch and real loss/loot separately |

**Nonnegotiable distinction:** Phase H0 can render a hex *preview* while the old rectangular mechanics still exist, but a hex preview is never a release gate. Final H1 converts movement, proximity, range, path previews and AI to the same hex topology as the renderer. No fake hex-complete claim.

## 2. Hex geometry specification — engineering contract

**Topology:** pointy-top regular hex, **odd-r offset** (odd row shifted right half a cell), canonical `col=x in 0..11`, `row=y in 0..8`. Preserve IDs, occupants, saved integer coordinates and existing battle player/enemy sides. Define one reusable `hexGeometry` service used by engine, painter, pointer hits, focus/selection, reachable overlay and QA. Avoid two independent math implementations.

- Conversion (odd-r to axial): `q = col - (row - (row&1))/2`, `r = row`; cube `(q, -q-r, r)`. Reverse `col = q + (r - (r&1))/2`, `row = r`.
- Distance: `max(|dx|,|dy|,|dz|)` for cube coordinates, not Manhattan/Euclidean; six neighboring cube deltas at distance one. Use cube-rounding (deterministic tie-breaker) to invert pixel pointer to cell. `cellAt(center(x,y))==(x,y)` for every valid cell.
- Screen shape: `centerX = X0 + sqrt(3)*R*(col + 0.5*(row&1))`; `centerY = Y0 + 1.5*R*row`; six corners `angle= -90° + 60°*k`. **Uniform R**: never stretch hexes on 960×540. Camera origin + radius derived from available combat canvas space; reserve HUD/safe margins, keep all cell polygons inside field and selectable.
- Movement: six neighbors, obstacle and occupancy rules, no diagonal corner clipping, shortest paths/tie order deterministic, movement points unchanged unless evidence demands retuning. Attack/range/AoE and AI target priority must explicitly use hex distance. Review `TACTICAL_RANGE` because old ranged 11/12 came from Manhattan diameter 19: preserve *gameplay intent* (relative melee/ranged reach), not blindly preserve unbalanced numbers. **No silent rebalance**: change a numeric rule only with before/after reachable counts, damage opportunity proof, tests and a decision record.
- Spawn: retain saved in-range coordinates and 3×2 hero ownership; collisions forbidden. If visual overlap occurs, first adjust **render scale and staging**, not mutate canonical actor x/y or add fake stacks.
- Height/depth: sort by pixel footY then deterministic unit ID. Hard-occlusion protection: within 3 Boss + six ally stacks at 1280×720 and 960×540, target actors and labels remain visible/clickable. Hit priority = selected/label/visible painted silhouette/foot/cell with explicit disambiguation for overlapping sprites, respecting active action interpolation.
- Grid aesthetics: visible thin, low-opacity hex border integrated with terrain (selected/reachable/attackable emphasized); optional toggle ON/OFF and HP toggle persist independently from Save v07. No glowing full-screen lattice, no overscaled labels, no three-dimensional platform.
- **Save compatibility:** Existing v07 saves with `s.battle`, `battle.x/y`, `lastMoves`, `orders`, `history` must parse without corruption and use coherent saved positions. Do not change the save version or `strictSave` thresholds merely to pass. If necessary create a backward-compatible per-battle `gridKind` migration in validated state, with a complete roundtrip test. If backward compatibility is genuinely impossible without gameplay changes, mark BLOCKED and stop the migration rather than silently discarding saved battles.

## 3. Original art & motion production specification

### Scope and inventory
1. **40 core troops** (stable catalog IDs), all five actions **Idle/Walk/Attack/Hit/Death = 200 action sequences**.
2. **Every unique playable Boss/archetype encountered by real engine paths**, enumerated into a generated `docs/qa/hg33-boss-inventory.json` with name, encounter source, registry key, art key, distinct animation status. Include all fixed named world Bosses, elite variants, three known HG28 Bosses, Tower archetypes as classified from actual data. Do not invent a number or treat every randomly scaled floor as a new artistic identity.
3. **Eight reward units** have their own coverage column and art readiness; if used in combat they need the same five original actions before final "all combat art replaced" claim. Keep scope counts separate from 40 core/ Boss.
4. Effects **separate from source sprite frames**: projectiles, melee swings, floating damage, hit sparks, dying/summon glow respond to authentic `battle.lastEvents`, not random invented damage.

### Art direction
- **Original premium fantasy strategy sprite**, semi-painted 2.5D, serious mature silhouettes (no chibi, no pasted photo, no low-effort emoji, no one-shape procedural placeholders). Clear faction palettes, distinct weapons/limbs/armor/horns/wings; all units face toward battlefield center, mirroring allowed only where the silhouette/weapon/insignia remains believable.
- Four separate visual families: Human (brass/blue cloth/steel), Elf (forest/teal/organic shapes), Orc (iron/earth/brutish), Undead (obsidian/bone/violet). Bosses visually distinctive from ordinary troops, but not huge to the point of hiding adjacent unit selections.
- **Invent fresh source masters and parts**. Historical user-provided screenshots are references for composition and tactical readability only; **do not trace or crop another game's models, textures, icons, sprites, or pose sheets**.
- Keep **editable original source** (SVG, separated layers, authored vectors, painted source, or editable rig) under `assets/original/hg33/`, with `artist_route`, `creation_method`, `source_file`, hashes, pose timeline and license/status in a manifest. Do not claim AI-generated files exist if image tools were unavailable.
- Original raster master target >=512×512 per actor, transparent with full feet/weapon and no baked VFX; preserve originals unscaled. Optimize runtime atlases to smaller target sizes only after zoom/readability tests. Atlas dimensions <=2048 px, consistent pivot, frame timing and alpha, sampled without blurry scaling.
- Rigged or individually painted output is acceptable **only when the actions have meaningful independent body/wing/leg/arm/weapon articulation** and their emitted frames can be validated; static master plus rigid whole-image transform doesn't count. Pose examples: Idle weight shift+breathing; Walk alternating contact and recovery; Attack anticipation+strike+follow-through+recovery, ranged nock+release; Hit directional recoil+regain; Death collapse or species-correct wing/leg fall and terminal hold. Make no unrelated attack sounds/music.
- Keep two explicit coverage axes: `action_art_kind` = `independently-authored-frames | original-part-rig-baked-frames | procedural-still-transform | external-source-frames | missing`; `original_status` = `verified-original | external | unknown`. Full ORIGINAL requires one of the first two kinds AND verified original provenance, runtime mapped, decoded, accepted in Chromium. **Do not silently relabel 22 legacy "source frames" as new-original**.

### Production batches (complete one batch before declaring it accepted)
- **A0 — asset provenance & boss census:** script enumerates all 40+8 IDs and Boss archetypes from engine, audits every combat source currently embedded in offline HTML. Capture file path/SHA and classify borrowed, original, unknown, placeholder; design one representative sheet for a soldier + ranged + flying + Boss. No blanket deleting assets used outside combat without regression proof.
- **A1 — style/rig pilot:** one each human melee, elf/ranged, orc/brute, undead/bone, flying dragon and Boss. Implement all five actions for each pilot using generated source files **and real battle playback**. Evaluate screenshot/readability. A rig that wiggles but does not walk is a FAIL.
- **A2 — baseline most used + 8 top-tier:** New Game T1–T4 first, followed T9/T10 8 identities; existing premium still masters may be redrawn/rearticulated but must remain original.
- **A3 — remaining T5–T8:** every race; complete 40/40 core ×5/5.
- **A4 — Boss and special units:** every inventoried Boss + 8 reward units, distinct actions and functional FX.
- **A5 — remove all runtime external art:** no HTML embed, registered sprite fallback, or lazy loader may serve third-party borrowed combat animation or actor art. Remove former source registrations **only when replacement passes**, preserve historical provenance docs. Release new original combat atlas plus source manifest.

### QA/coverage truth
- Update `assets/animations/hg28/coverage.json`, `qa-hg28-animation-coverage.cjs`, packer/source metadata and GH Actions **without weakening existing anti-fake gates**. Preserve old receipts, add a new HG33 originality gate that verifies real master files, file hash, multiple meaningful poses, actual runtime references and art census.
- For each action: minimum 8 **meaningfully different** source/baked frames (author-built rigs can bake a transparent frame atlas if independently articulated). Auto duplicate/SSIM-style low-variance checks plus human inspection; weak motions marked REVIEW, not PASS. Landing foot pivot for Idle/Attack/Hit and terminal pose, correct walk trajectory between actual grid cell centers, non-looping Death.
- At least 40×5×8=**1600 meaningful core frames** as a minimum if shipping frame atlases; **additional Boss +8 special** counted separately. Core pilots and procedural preview do not satisfy full-original gate.
- Default runtime never references known external-sourced combat sprites/animations. Check this in `index.html`, `build_offline.py`, `painter.js`, art pack mappings and offline built HTML. Avoid enormous inline binary duplication; cache/decode only actors actually rendered. Measure build bytes and Chrome CPU/memory versus baseline, avoid uncontrolled growth on Windows 10 8GB RAM.

## 4. Implementation order & blockers

| Gate | Deliverable (on same branch) | Necessary proof | Block condition |
|---|---|---|---|
| **H0 – audit/baseline** | exact Git HEAD, CI green baseline, boss+asset census and screenshots before | existing #383 or newer green at actual starting SHA; independent manifest + logs | any unverified target identities or conflicting source ownership |
| **H1 – engine+hex** | shared coordinate library, hex movement/range/A*/AI, clickable pointy-top 12×9 renderer | 108 invertible centers+edges, 6 neighbors, no occupied jumps, manual+12-turn auto, desktop+mobile | Save v07 compatibility, changed rewards, incorrect movement/ranged targeting |
| **H2 – original pilot** | 6 distinct high-quality actors incl Boss, five motions each, editable sources | PNG/atlas contact sheet, animation frame variance and screenshots during actual actions | only sprite transforms/borrowed image/source not preserved |
| **H3 – 40 core** | 40 separate original source families × all five actions | independent 200/200 original clip accounting + real in-game animation checks | any missing action, reused character clone, fake frame count |
| **H4 – every Boss and 8 specials** | inventory-complete original Boss/special sprites and motion | generated census crosswalk, zero missing Boss IDs, 8/8 bonus mapped | missing Boss from another engine route or reused unlicensed fallback |
| **H5 – integration/release** | one playable offline HTML, no external combat art, consistent gameplay | current HEAD full CI SUCCESS + real Chromium screenshots 1280×720/960×540 + Win/Android only where actually tested | any red full CI, malformed Save v07, unverified source, visual occlusion |

**Commit discipline:** single existing branch, no parallel feature tracks. Each gate is a separate small set of commits with reviewable evidence; H1 code can precede all art but don't declare final COMPLETE until H5. Before every push `git fetch` + compare remote SHA and local HEAD; rebase safely or cherry-pick your own commit, **never force push**, especially if another collaborator edited assets.

## 5. Required acceptance checklist — not optional

### Hex logic / gameplay
- 108 valid cell centers, point-in-hex correct near edges/corners, edge/out-of-bounds null, all neighbors count 6 for interior, symmetric hex distance, exact reversible offset/axial/cube conversion.
- Old v07 saves created before HG33: load active normal fight, auto fight, Tower and Boss 3×2; play and save again without resets or duplicated rewards.
- Actual New Game → recruit → march → NPC combat without QA resources; manual move/attack, melee/ranged focus, hero buffs specific to owned stacks, auto 12 turns, genuine casualty ledger and exactly-once settlement.
- Boss 3: Azrael, Demonlord Samurai, Cyclop Tyrant independent click/nametags; Tower 3 commanders ×2 and private real Boss 3 commanders ×2 at same time. Movement cells and attacks reflect six-neighbor grid; no invisible Manhattan neighbor limits.
- Real Chrome click on hex interior/edge and sprite body/label; no selected unit changes merely due to animation. No occlusion hiding active actors at both screen sizes; capture battle screenshots during attack/hit/death.

### Art/animation
- 40/40 core distinct original source masters and 200/200 genuine source/baked action sequences, 8 special units with separately accounted 40 sequences, all enumerated Boss identities ×5 original sequences. Unique silhouette audit and source/action hashes.
- 5 action animations respond to **real** combat events, not a timed gallery loop. 5 actions for every source mapped into **actual Canvas renderer**; no white backgrounds, snapped feet, head clipping, duplicated layers, dead sprite reviving mid-animation or "Walk" with stationary legs.
- Contact sheet per race (10 troops ×5 states), per Boss, plus high-res 3×2 Boss encounter screenshots; 1280×720 and 960×540. Evidence images produced from **real game/renderer**, never generated "comparison images."
- Browser file:// with network blocked; all art load from single HTML with stable paths/hashes, no fetch of remote images or URLs.
- Compare performance: HTML size, asset source bytes, frame rendering FPS, peak memory; disclose measured values and regression, never invent results.

### CI and reporting
- Keep original `.github/workflows/hog-combat-offline.yml` and add `qa-hg33-hex.cjs`, `qa-hg33-hex-chrome.py`, `qa-hg33-art-originality.cjs`, and final `--require-full-original` (names can differ if consistent).
- Existing gates (examples): `node qa-engine.cjs`, `node qa-hg09-combat-viewport.cjs`, `node qa-hg28-animation-coverage.cjs`, `node qa-hg261-joint.cjs`, `python build_offline.py`, `python qa-hg28-pve2-chrome.py`, `python qa-hg28-rigs-chrome.py`, real browser auto QA, HG18/21/24/26/27/29/30/31/32 regressions. Adapt tests to **correct new geometry**; never skip, weaken or delete safety checks simply to get green.
- `docs/qa/hg33/` must store per-gate machine-readable PASS/FAIL/BLOCKED and evidence SHA; `docs/evidence/hg33/` actual captured screens. Report only the latest **verified** HEAD CI, source identities completed, art actions completed, Boss census, measured file size and any residual failures.

## 6. Critical self-review before accepting work (Codex must answer in a concise report)

1. Did we accidentally render hex while AI still uses Manhattan? Show the exact matching distance/path function and a real six-neighbor example.
2. Are 12×9 saved x/y positions and hero ownership intact? Show old Save v07 import+post-action export diff (exclude volatile exportedAt only, not game state).
3. Can 3 Boss + 6 allied stacks be clicked and visually separated at **960×540**, especially while moving, not just while idle?
4. Does each one of 200 core clips have at least 8 independently meaningful poses? Are legacy web sprites **actually removed from the released runtime**, not merely hidden behind a preference?
5. Did Codex really create editable source files and evidence, or only write a generator/promises? If its environment lacks proper image-generation capability, mark missing art **BLOCKED**, don't fake "professional" graphics.
6. Does the final HTML work offline after Save/Load, with realistic turn timing and no synthetic victory/loot?
7. Is this the **same original repo, branch and single HTML**, no unrelated tasks, no main merge, no second prototype?
8. Does **latest exact commit** have integrated CI success and a screenshot set? If not, status must remain PARTIAL.

**Goal:** a genuinely playable, readable pointy-hex fantasy battle with newly authored high-quality combat art — not a green test over a cosmetic lattice, a text-only handoff, or a procedural still-image wiggle.
