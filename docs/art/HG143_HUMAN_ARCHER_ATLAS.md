# HG-14.3 — Human Archer source-layered 48-frame PNG animation

**Real artifact, not a mockup.** The master is the already integrated 512×512 transparent Human Archer in `assets/generated/hg11/units/human-archer.png`. This batch generates **48 distinct transparent PNG poses** through independently pivoted head/hood, bow, arms and legs, all registered to the same original artwork, not 48 unrelated AI image generations. The generated master atlas is **2048×1536 PNG**, 8 columns × 6 actions, each frame 256×256, common foot pivot `(0.485,0.87)`.

| Clip | Atlas row | Frames | Duration | Loop |
| --- | ---: | ---: | ---: | --- |
| Idle | 0 | 8 | 1100 ms | Yes |
| Walk | 1 | 8 | 750 ms | Yes |
| Draw bow | 2 | 8 | 510 ms | No |
| Release arrow | 3 | 8 | 360 ms | No |
| Hit | 4 | 8 | 540 ms | No |
| Death | 5 | 8 | 950 ms | No |

Generator: `tools/generate_hg143_archer.py`. It always exports atlas, metadata with SHA256s and 48 individual PNG frames to `assets/generated/hg143/animation/`. Build offline with `python -m pip install Pillow==11.3.0` and `python build_offline.py`. The final HTML embeds the atlas as a PNG data URI and needs no Python or internet connection to play.

**Game integration:** `painter.js` calls `animatedArcher()` when `human_3` appears in battle, reads the appropriate 256×256 cell, and falls back to the original source master if atlas loading fails. Real battle event `attack` maps 70% draw then 30% release; real paths use walk, damage uses hit, lethal receipt uses death. No combat stats, AI, Save/Load schema, terrain or other unit sprites are changed.

**QC:** Art script `qa-hg143-archer-art.py` verifies 48/48 unique raster frames, transparent alpha, alignment, 48 corresponding individual PNGs, metadata and source SHA. Real Chromium script `qa-hg143-archer-chrome.py` verifies all six clips draw actual atlas pixels, live NPC combat, Save/Reload and 960×540 landscape. CI uploads PNG atlas, all frames, actual battle screenshot and contact sheet.

**Precise limitation:** This is layered 2D puppet animation rendered into unique raster frames; **not 48 hand-painted keyframes, motion-captured video or 8-direction movement**. Art quality remains `OWNER_VISUAL_PENDING` until the user reviews screenshots and frame strip. Main branch and unpushed Windows E drive copy were not modified.
