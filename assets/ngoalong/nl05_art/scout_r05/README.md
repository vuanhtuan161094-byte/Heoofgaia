# R05 · Scout stationary combat 2D sprite pilot
- Reuses exact R04 registered masters (Git blob SHA IDs in `manifest.json`). No replacement of character identity, no external game art, no skeletal rig.
- **20 actual packed raster frames**: 5 visual states × 4 frame images, 160×168 canvas, 640×840 atlas, foot pivot (80,158). States: Idle, Attack, Hit, Skill, Disappear. No walk/run or four-direction pose claims.
- Two genuine source poses: idle and spear-contact. All 20 packed frame images are **2D raster composites** of these two originals, with tiny position/color/opacity staging. They are **not** 20 independently drawn poses; lightweight pilot only.
- `scout-r05-spear-fx.png` is a separate four-frame original silver-jade charge/release/contact/fade alpha atlas. Rendering it over character is cosmetic. No engine event hooked, no combat or Save changed.
- Open `preview.html` from the repository checkout, or run `node build_scout_r05.mjs --check` to verify frame atlas and effect bytes are exactly reproducible from the two original registered PNGs.
- Test visually at large and 50% size; do not upscale 49 heroes or create more frame sets without owner art review.
- Source classification: existing R04 originals **VERIFIED** by Git blob; atlas **DERIVED**, VFX **SIMULATED/ORIGINAL**; classic reference art parity UNKNOWN.
