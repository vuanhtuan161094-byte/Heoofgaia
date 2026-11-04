# HG22.1 — Meowa gallery review and actual skeleton animation upgrade

The user-linked domain mefowa.ai did not load; the likely intended site is https://meowa.ai/. Its public UGC gallery https://meowa.ai/gallery/ showcases a dragon (https://meowa.ai/showcases/sc_gen_60427/) and a fantasy axe warrior (https://meowa.ai/showcases/sc_gen_75114/). Free creation credits do **not** prove these other users' published artworks are licensed for repackaging. No gallery artworks have been copied.

Instead, this directly usable independent upgrade imports the MIT-licensed animated Skeleton sheets by Chong-U Lim (2026) from https://github.com/chongdashu/ai-pixel-snapped-game-sprites, not from Meowa. All five original PNG sheets and exact source SHA values are recorded in assets/licensed/hg22-skeleton/asset-manifest.json; original license in assets/licensed/hg22-skeleton/LICENSE.txt.

The Undead Skeleton troop (undead_1) now has real 10-frame sprite sheet action clips for Idle, Walk, Attack, Hit (source Hurt), and Death. Every sprite sheet is 1280x512, five columns and two rows of 256px source cells. The original static asset remains as fallback.

All assets are embedded into Play-Heoofgaia-HG11.html, requiring zero network connections. No gameplay, unit stats, hero owner buffs, tower, production or Save/Load schemas are touched. This is a focused animation improvement, not a claim that all 40 troop types now have HD animations.

QA: Node verifies all five upstream Git blob SHA checksums; Chromium decodes the offline images and renders each action; complete CI verifies New Game, production, 3-hero tactical tower, battle and Save/Load.
