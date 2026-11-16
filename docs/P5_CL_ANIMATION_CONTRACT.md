# CL-P5 original troop animation contract

Status: original infantry animation slice integrated and passed 48/48 local Chromium checks; this is not full P5 visual acceptance.

## Asset identity and scope

- Asset ID: `cl-p5-infantry-scout-v1`.
- Role: one original foot-infantry troop identity used by the standalone Mưu Định Tam Quốc battle/map scene.
- Scope for this slice: one transparent master plus directional idle, walk, attack, hurt and death sheets for the same identity (80 packed frames). The live battle renderer uses idle, attack, hurt and death for infantry; the walk frames are packed and addressable but are not yet wired to the world-map march token. Existing P4.1 art remains the fallback for cavalry, archers, strategists and drum/support units.
- This is not a CMN/Ngọa Long reference asset and must not resemble a named published-game character or reproduce a screenshot.

## Render and registration

- Generate one full-body identity master first; inspect it before making action frames.
- Target packed cell: 100×144 pixels; keep head, weapon and feet inside the frame; align the foot pivot to `(50, 140)`.
- Four directions: front, right, back, left. Each action has four frames per direction. Attack and hurt states come from real battle events; the death clip begins when a real damage event reduces an infantry unit to zero HP.
- Preserve true alpha; no baked grid, cell border, floor, lettering or background.
- Frame art must be sprite-first and frame-by-frame; do not rig or imply skeletal animation. A procedural Canvas/CSS transform alone does not count as the new frame set.

## Provenance and QA

- Generation route: built-in `image_gen`; raw master and unmodified generated sheets are retained in `assets/p5/cl-p5-infantry-scout-v1/`.
- Status is `RECREATED`. Provider cost is recorded as unknown unless returned by the tool.
- Inspect identity, anatomy, weapon continuity, direction, frame boundaries, alpha bounds and pivot registration before packing. The packed 100×144 contact sheet and Chromium render matrix are checked at game scale.
- Record prompt version, source/derivative paths, dimensions, frame count, file size and SHA256 in the manifest.
- The exact packed atlas bytes are embedded in offline `index.html`; `tools/build_p5_infantry_scout.py` and `qa/cl_p5_infantry.py` rebuild and verify the source-to-HTML bytes. Local Chromium passes 48/48 checks at desktop and mobile viewport sizes, including a live combat attack/hit and death-triggered infantry clip. Exact-SHA GitHub Actions remains the release gate for each future commit.

## Remaining P5 scope outside this slice

- Wiring the packed walk cycle to live march tokens; matching full action coverage for the remaining troop classes, skill effects and independent city/hero props.
- Real-device performance on Windows/Android and owner visual acceptance.
- Audio with documented rights and any newly generated video; no video-generation route is available in this environment.
