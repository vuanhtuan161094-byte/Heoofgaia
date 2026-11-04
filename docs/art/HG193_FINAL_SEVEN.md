# HG-19.3 — Final seven troop art masters

Checkpoint: 2026-11-04. Scope: visuals only; no gameplay, damage, recruitment or Save/Load schema changes.

The 7 identities previously using procedural-vector fallback have dedicated **transparent PNG** images:

| Unit | Art | Format | Notes |
|---|---|---|---|
| human_6 Monk | SpriteCook happy monk CC0 | 784×98 PNG, eight 98px idle frames | Basic pose transforms for Walk/Attack/Hit/Death |
| human_8 Priest | DCSS curated CC0 Priest | 32×32 PNG | Robed caster silhouette (upstream Deep Elf Priest art) |
| elf_4 Elf Archer | DCSS curated CC0 Joseph Archer | 32×32 PNG | Humanoid archer; not explicitly elf-looking |
| elf_5 Pegasus Warrior | Original project art | 64×64 PNG | Winged mount, elven rider and spear |
| elf_7 Unicorn | Original project art | 64×64 PNG | Snowy horse, golden horn and teal mane |
| orc_2 Wolf Rider | Original project art | 64×64 PNG | Mounted orc armed with spear, distinct from wild wolf |
| orc_7 Thunderbird | DCSS curated CC0 Caustic Shrike | 32×32 PNG | Source bird is a visual approximation; golden lightning glow is added in-game |

The exact source/original mapping, Git blob SHA-1 and creator-generated SHA-256 are recorded in `assets/hg193-unit-manifest.json`. Sourced art is from [SpriteCook's CC0 repo](https://github.com/SpriteCook/spritecook-free-game-assets) and [crawl/tiles' curated CC0 export](https://github.com/crawl/tiles). The three project-owned raster masters were created specifically for HG-19.3.

Runtime priority: original HG11/HG12 sprites, HG19.1 real frame sheets, HG19.2 24 licensed sprites, then the seven HG19.3 masters, with the SVG catalog serving only as decode fallback. **All 40 unit IDs now have associated authored/imported raster or specialist source artwork** (the original human_1 uses distinct authored SVG). In particular, 39 entries have PNG source/art and 1 uses a separately authored 512px SVG (Human Spear Militia). Do not claim 40 PNGs.

The 7 assets are loaded in `index.html`, embedded directly into `Play-Heoofgaia-HG11.html` by `build_offline.py`, used by battle Canvas and unit roster thumbnails. The five basic motion states reuse receipt-driven HG14 transforms. Human Monk plays its 8 genuine idle frames while other actions use basic transforms.

Acceptance:
- `node qa-hg193-assets.cjs`: all source and custom PNG binary checks, 40/40 non-overlapping catalog identities and source bindings.
- `python qa-hg193-assets-chrome.py`: real Chromium decoding, 35 five-state battle raster checks, idle frame diversity and contact sheet at `docs/qa/hg193/contact-sheet.png`.
- Existing battle/New Game/Save–Reload workflows remain mandatory, plus offline build integrity and artifact receipts.
- If any image fails to load, existing procedurally generated SVG fallback remains available.
