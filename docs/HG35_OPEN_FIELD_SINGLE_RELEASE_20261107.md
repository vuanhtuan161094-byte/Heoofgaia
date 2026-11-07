# HG35 — ONE HTML / Open Field V2 local asset integration
**Owner feedback:** 07/11/2026. **STATUS: BLOCKED_BY_UNPUSHED_LOCAL_ASSET.** Engineering source work for construction/recruit UI is in the same active branch; background replacement is **NOT** on remote HEAD as of creation.

## Verified evidence

- Remote source at the time of diagnosis still used `index.html` image `#battlefield-human-meadow`, `data-battle-background="human-meadow-v1"`, `src="assets/generated/hg11/battlefield/human-meadow-1176x550.png"`.
- `build_offline.py` hardcodes this exact source path and always embeds its bytes into the single `Play-Heoofgaia-HG11.html`. The GitHub build cannot see local-only image changes.
- Owner reported a **different local Open Field V2** built from `E:\Heoofgaia`, SHA-256 `20C098089D3573B9C95B1D2026E3170D32FD01B205A1768A2423735BA89F0055`; local screens `docs/evidence/hg11/battlefield-open-field-v2/human-heavy-soldier-battle-live-chrome.png` and `human-vanguard-battle-live-960x540.png`. **Neither the screenshots nor the changed asset bytes are present on the remote branch**. Do not claim the GitHub HTML contains Open Field until the actual bytes have been pushed and verified.
- At time of this handoff, GitHub source branch is `feature/hog1-research-to-playable-20261102`. A remote build with old image is not the intended final Open Field release.

## Exact safe local merge task for Codex working on the Windows folder

1. **Before any pull/reset/clean:** on `E:\Heoofgaia`, record `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, and `git diff --name-status`. Copy the actual Open Field V2 asset (and any generated master/manifest) to a separate safe folder or stash only a clearly identified subset; **never lose local asset changes, especially if they overwrite `human-meadow-1176x550.png`**.
2. Identify the **exact local file(s)** that made the owner-provided local offline HTML hash differ. Check image dimensions/metadata and art integrity against local `Play-Heoofgaia-HG11.html`. If the only remaining copy exists inside that HTML as embedded base64, extract the original **owned** background data; verify image PNG/WebP and inspect visually.
3. Fetch latest remote HEAD and safely integrate only the needed original Open Field asset and its correct `index.html` `data-battle-background`/source reference. Update the **one** hardcoded `battlefield_asset` in `build_offline.py` to match. If replacing the existing canonical path instead of adding a new filename, update image manifest/hash accordingly; preserve original master and evidence.
4. Make `python build_offline.py` succeed **twice with identical SHA-256** and confirm the only root playable artifact remains `Play-Heoofgaia-HG11.html`. The build must embed the real Open Field V2 bytes, not choose local versus CI fallbacks. No second released HTML and no split builds.
5. Perform real `file://` Chromium battle at **1280×720 and 960×540** including 3 Boss, 3 commanders ×2 and 60Hz HG34 playback; confirm no tree occlusion, readable pointy-top hex, correct foot pivots, Canvas-only performance, no JS/page error. Capture new screenshot and source hash.
6. Run the latest full existing integrated GH Actions to SUCCESS **on the same commit**, then provide the canonical single offline artifact URL and report actual new HTML SHA. Do not claim green based on local 26/26 alone.

**SCOPE FREEZE:** No added gameplay, no background substitution with a procedural mockup, no changed Save v07, stats or economy. When no local original bytes are accessible, report `BLOCKED_BY_LOCAL_ASSET` and finish the other bugfixes instead of inventing/claiming an Open Field push.
