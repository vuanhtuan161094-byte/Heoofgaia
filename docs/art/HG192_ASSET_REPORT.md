# HG19.2 — Imported game-ready fantasy sprites (04 Nov 2026)

## Delivery
Imported 24 species-matched, actual PNG assets (not icons or SVG placeholders) for high-tier races, dragons, giant beasts and the Undead roster. They are original **32px pixel-art masters**, with one tall Seraph at 32×48. The source is the curated CC0-compatible export of [Dungeon Crawl Stone Soup tiles](https://github.com/crawl/tiles/tree/master/releases/Nov-2015/mon), which separates artwork with known licensing status from excluded tiles; see that project's [README](https://github.com/crawl/tiles) and [unknown-license exclusions](https://github.com/crawl/tiles/blob/master/TILES_UNDER_UNKNOWN_LICENSE.md). We use that curated release, **not** an unfiltered modern game directory.

Do not claim these are HD renders or separate frame atlases: **each source unit is one genuine image** and takes the already-established *basic event-driven* Idle sway / Walk motion / Attack lunge / Hit recoil / Death collapse. No fabricated gameplay actions, unit stats or save-version changes.

The 24 game-unit → source filenames, per-file upstream Git blob SHA and local file path are recorded in `assets/licensed/dcss-cc0/unit-manifest.json`. Both 2015 source and imported bytes can be independently verified by `qa-hg192-assets.cjs`.

### Priority mapping
- Human Gryphon, Angel, Archangel: `human_5`, `human_9`, `human_10`.
- Elf Dwarf, Dryad, Elite Archer, Green Dragon, Fairy Dragon: `elf_3`, `elf_6`, `elf_8`, `elf_9`, `elf_10`. The source for Fairy Dragon is a silver dragon tile, so finer fairy features remain an art-direction improvement opportunity.
- Orc Axe Thrower, Direwolf, Ogre, Harpy, Cyclops, Monster, Behemoth: `orc_3`, `orc_4`, `orc_5`, `orc_6`, `orc_8`, `orc_9`, `orc_10`. Axe Thrower source is an orc warrior tile and remains a silhouette approximation, not an exact throwing pose.
- Undead Common Ghost, Zombie, Ghost, Vampire, Lich, Ghost Knight, Lich King, Bone Dragon, Ghost Dragon: `undead_2`–`undead_10`. Some are **closest available creature variants**, e.g. Necrophage for Zombie, Shadow Wraith for Ghost, Shadow Dragon for Ghost Dragon; all are fantasy creatures of the same broad type, but refinement remains appropriate.

### Original art retained
Existing high-detail PNGs/atlases for Human Archer, Heavy Soldier, the 2D Orc Imp/Elf Centaur/Elf Scout/Undead Skeleton, and the Human Spear Militia vector are untouched. Elite Knight and Scout still use the HG19.1 sourced SpriteCook sheets. No source PNG is shared between two troop IDs.

### User experience and performance
- The existing 40-troop game catalog, Battle Canvas and recruitment thumbnails reference new preloaded images where assigned.
- The source images are embedded once into **Play-Heoofgaia-HG11.html**, with no network dependency and no scrolling introduced into the normal game viewport.
- `imageSmoothingEnabled=false` prevents pixel-art blur; tier 9–10 receives a small faction-colored glow and larger bounded sprite. 32×48 art retains natural aspect.
- If an image fails to decode, the SVG art fallback still renders. No Save/Load or combat rules are changed.

### QA acceptance
- `node qa-hg192-assets.cjs`: source hash, PNG header/dimensions, catalog IDs, file count and source-bound rendering.
- `python qa-hg192-assets-chrome.py`: actual standalone Chromium decoding of all imported sources and 120 battle-state render checks; exports `docs/qa/hg192/creature-contact-sheet.png`.
- Existing HG16/17/18/19 & Save/Reload CI tests remain mandatory; do not confuse specific HG19.2 tests passing with entire CI success.
