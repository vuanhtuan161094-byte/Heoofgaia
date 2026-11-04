# HG-19.1 — SOURCE ART PROVENANCE & FANTASY MATCHING (2026-11-04)

## Installed and integrated (not just bookmarked)

**SpriteCook (CC0 1.0 Universal)** — [official free GitHub collection](https://github.com/SpriteCook/spritecook-free-game-assets), [license](https://github.com/SpriteCook/spritecook-free-game-assets/blob/master/LICENSE).

| Game ID | Original asset | Local runtime asset | Actual animation |
| --- | --- | --- | --- |
| `human_2` Scout | `examples/pixel-art-red-cloaked-rogue/idle_sheet.png` | `assets/licensed/spritecook/human-scout/idle.png` | 8 real Idle frames; remaining states use unchanged basic HG14 transforms |
| `human_7` Elite Knight | `examples/pixel-art-paladin-knight/{idle,walk,attack,hurt,death}_sheet.png` | `assets/licensed/spritecook/human-elite/{idle,walk,attack,hit,death}.png` | 8/8/8/8/12 real frame PNG clips, 44 total frames |

Every source PNG is copied without visual modification. `index.html` embeds it via `build_offline.py` for zero-network offline playback. New art selection occurs only for these two exact game IDs. Existing PNG/atlas masters for Human Archer (48-frame), Human Heavy Soldier (57-frame), and other races remain authoritative and are never overwritten.

**Game-Icons** — [official source](https://github.com/game-icons/icons), [license](https://github.com/game-icons/icons/blob/master/license.txt). 26 distinct icon keys have independently selected source foreground glyph vectors, displayed in the HG19 project's existing 64×64 fantasy hex frame. The black background path is dropped; glyphs are recolored. The remainder of the 67-icon collection retains generated project-owned fallbacks; there is no forced replacement by mismatched stock art.

**Required attribution:** Icons made by **Lorc**, **Delapouite**, and **Sbed**. Available on [game-icons.net](https://game-icons.net). License: **Creative Commons Attribution 3.0**. Their foreground vector shapes are bundled in `art-free-icons-core.js` and `art-free-icons-extra.js`; the original file path, author, and Git blob SHA are captured in `HOG_FREE_ICON_SOURCES`. Artwork and source credits are not removed when offline-bundled.

## Other free sources evaluated, but not blindly installed

- [KayKit Skeletons CC0](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0) is a rigged low-poly 3D product, requiring rendering to match the 2D battle canvas. The current Undead Skeleton PNG is already stronger; do not replace it without a screenshot side-by-side.
- [Kenney RPG CC0](https://kenney.nl/assets/roguelike-characters) is 16px pixel art and much too tiny to blend with the 70px illustrated battle figures in this version.
- [LuizMelo Monsters CC0](https://luizmelo.itch.io/monsters-creatures-fantasy) offers actual animated enemies, but the hero army's mapped troop identities would not match the creatures. Keep for NPC / future encounter asset intake only.
- No source asset was substituted for dragon, centaur, direwolf, gryphon, ghost dragon etc unless species identity and battle readability were verified. Existing project SVG/PNG remains in place, flagged for original high-tier upgrade.

## Runtime and acceptance

- Existing 5 basic visual states remain `Idle/Walk/Attack/Hit/Death`; NO gameplay or Save/Load schema edits.
- `qa-hg191-assets.cjs` validates source PNG headers, per-frame sizes, 44+8 source frames, icon source glyphs and offline builder wiring.
- `qa-hg191-assets-chrome.py` validates `file://` decoded source sheets and actual per-action canvas drawings; saves screenshot and machine receipt.
- Visual quality cannot be claimed approved until comparing screenshots at gameplay 1280×720. Art direction intentionally avoids claiming all 40 as freshly sourced art.

