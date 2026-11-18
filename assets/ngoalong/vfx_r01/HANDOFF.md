# VFX R01 — four isolated original light-effect sprites

**Production origin:** Original **procedural/code-drawn raster FX** (`generate.py`), explicitly not painterly AI illustration and not copied from VNG. PNG RGBA 128×128 transparent; static sprite per event purpose. No GIF, crop-based animation, rig, poster or fake action loop.

The four semantic intents are `morale_gain`, `guard_buff`, `morale_drain`, `contact_slash`. **These are art IDs, NOT guaranteed existing combat event keys.** The integrating chat must inspect actual event schema, connect on source-authoritative event and preserve combat calculations, Save/replay and troop counts. The art team does not edit runtime. A renderer may fade the VFX without inventing new events.

`preview_1x_dark_light.png`: four effects presented at **80 pixels** across both dark and light backgrounds. `manifest.json`: hashes and provenance for all generated PNGs. Regenerate exact files using `python assets/ngoalong/vfx_r01/generate.py` (Pillow). All effect assets remain `VISUAL_CANDIDATE`, not owner-approved and not `IN_GAME`.

Light readability is tested on two solid backgrounds only; real battlefield and overlapping-unit readability remain integration-gate PENDING. This is intentionally a small standalone effects batch, not an effects system rewrite.
