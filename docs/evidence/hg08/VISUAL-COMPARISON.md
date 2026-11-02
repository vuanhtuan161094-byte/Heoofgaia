# HG-08 visual review and comparison status

Review date: 2026-11-02. The project screenshot files in this folder are captured from the rebuilt game in installed Google Chrome through Playwright; they are not mockups.

## Build screenshots reviewed

- `screenshot-world-desktop.png` — desktop world screen, 1440×900.
- `screenshot-construction-desktop.png` — Elf city with a Market construction queue.
- `screenshot-tavern-desktop.png` — Tavern, hero roster and progression.
- `screenshot-troop-unlocks-desktop.png` — Elf troop page at Barracks 2; Centaur is available at its cited Barracks 1 gate with a C source badge, while tier-2 Scout remains locked until Scouting 1 with its cross-version partial status.
- `screenshot-human-scout-gate-desktop.png` — Human army page; the Scout card shows SRC27 Barracks 2 + Scouting 1, its unresolved Town Hall requirement, and a locked Recruit action.
- `screenshot-progression-desktop.png` — completed troop training, Castellan XP, research, level-up and attribute allocation.
- `screenshot-world-mobile.png` and `screenshot-tavern-mobile.png` — narrow 390×844 viewport; responsive layout, not a physical phone capture.

## Historical references

- [Sina 2009 screenshot gallery](https://games.sina.com.cn/o/i/2009-03-05/1638161736.shtml) is dated 2009-03-05 and identifies its images as *英雄之城* screenshots. It is Chinese client-era reference material; the gallery does not grant asset redistribution rights.
- [MobyGames 2010 world screenshot](https://www.mobygames.com/game/45732/heroes-of-gaia/screenshots/browser/452230/) is captioned “The world outside the city” and records an addition date of 2010-07-28. The image is a reference link only.
- [GameGami Heroes of Gaia gallery](https://www.gamegami.com/index.php/projects/heroes-of-gaia) confirms its project participation was localization, monitoring, management and moderation (page lines 33–38). Its screenshots are references only; no usage license for redistribution was found.

## Comparison result

**Side-by-side original-client comparison: BLOCKED / NOT TESTED.** The original screenshots are identified and linked, but an original client or visually inspectable source capture was not available in the browser QA environment. The MobyGames item supplies a caption/date, and the Sina page supplies a dated gallery, not a verified pixel-level comparison in this run.

The current build has a playable map canvas, city canvas, top resource HUD, minimap, castle construction selection, Tavern and hero progression panels. It visibly remains a procedural, flat-shaded approximation: the screenshots do not demonstrate original sprite fidelity, original page composition, animation timing, race-specific source art, or visual parity. Those remain HG-11 work. Historical reference images have not been copied into the build.

Windows Chrome's missing-square glyphs for newer coin/log emoji were corrected with stable Unicode resource marks. The refreshed screenshot shows those marks rendered; the compact symbols are functional icons, not original-game art.

Computer Use window capture timed out (`FrameArrived timed out: timed out waiting on channel`); the successful screenshot evidence comes from the actual installed Chrome executable driven by Playwright. Android physical-device testing was not performed.
