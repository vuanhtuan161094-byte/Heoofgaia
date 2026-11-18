# R04 original visual pilot — generation prompts

All assets were generated or edited with OpenAI image_gen on 2026-11-17. Both prompts request original fictional characters, transparent background and no external game reference. The generated raw PNGs are preserved unchanged in this directory.

## Scout (`scout`)

Prompt: “Refine this original fictional Mưu Định Tam Quốc border scout into a production master sprite. Preserve this exact identity: young adult male scout, tousled charcoal hair, pale silver-jade eyes with a subtle glow, asymmetrical charcoal lamellar armor with restrained jade cloth accents, short mantle, simple generic short spear. Full body front three-quarter facing right, upright neutral ready stance, both complete boots and weapon fully visible with generous transparent padding around every edge; no cropping. Exactly chibi proportions around 3.2 heads tall, readable head and face, painterly dark fantasy materials, clean silhouette at small scale. Isolated single character on genuinely transparent background, no shadow, no ground, no text, no interface, no frame, no extra weapons, no historical costume or recognizable existing character. Keep one consistent original design; centered on a portrait canvas, feet aligned near a bottom anchor with 6% transparent padding. This is one static idle master, not an animation sheet.”

Route: image edit using the earlier local draft solely as this project's own identity reference; no third-party source.

## Field tactician (`tactician`)

Prompt: “Preserve the exact same original female tactician identity, face, haircut, amber eyes, charcoal armor, orange sash and jade command token. Recreate a clean full-body idle master centered with large transparent margins. Make the baton a short hand-length command baton held close to her side, not a staff or spear, and keep its complete tip well inside the frame. Both boots including soles must be fully visible and have a transparent gap below; hair, sash, baton, and all silhouette edges have at least 8% clear transparent padding. The whole figure should occupy about 78% of canvas height, no part touches/crops at the edge. Front three-quarter facing left, 3.2-head chibi proportion. Transparent background, no shadow, no ground, no UI, no text, no extra props.”

Route: image edit from an earlier generated identity master; no third-party source.

## Scout attack contact pose (`scout-attack-contact`)

Prompt: “Create one original game-ready 2D action sprite keyframe using the attached fictional character as the exact identity reference. Preserve his identity and materials: young adult male border scout, tousled charcoal hair, pale silver-jade eyes, asymmetrical charcoal lamellar armor with muted jade cloth accents, short mantle, simple generic short spear. Full body, same 3.2-head chibi proportions and painterly dark-fantasy rendering. This is the ATTACK_CONTACT keyframe: feet planted in a clear forward lunge facing right, torso rotated toward the target, both hands gripping the spear, spear thrust horizontally toward the right with the tip inside canvas; focused expression. Show one character only. Keep head, spear tip, boots, mantle, and all silhouette parts completely inside the image with generous transparent padding; align the bottom-center foot pivot and character height to the supplied master. Isolated on genuinely transparent background, no shadow, no ground, no glow, no VFX, no text, no UI, no frame, no extra weapon, no historical insignia. Keep design details consistent with the reference; do not invent armor pieces.”

Route: OpenAI image_gen edit using the project-owned scout raw master as the identity reference; this is one generated key pose, not video-derived animation. Raw output is retained; `tools/register_nl_r04_attack.py` deterministically trims transparent bounds, scales into the registered 768×640 RGBA canvas and preserves the bottom-center anchor. Status: **RECREATED**. The pose is used only for the 390px/desktop stage-25 callout when a real enemy infantry physical action occurs. This does not complete directional or frame-by-frame animation coverage.

## Limits

The image-generation tool produces still images. No video-to-sprite route or user-supplied action footage is available in this environment. The pilot therefore contains static portrait masters only; it does not claim Idle/Walk/Attack/Hit/Fall frames or four-direction animation, and no synthetic pose set was fabricated.
