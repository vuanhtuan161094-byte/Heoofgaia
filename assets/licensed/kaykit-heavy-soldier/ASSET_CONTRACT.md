# Human Heavy Soldier animation asset contract

Target: `human_4`, Human Heavy Soldier (SRC02 community unit roster).

## Provenance and scope

- The replacement uses Kay Lousberg’s KayKit Adventures 1.0 Knight rig with a one-handed sword and square shield. The pinned upstream commit is `672074b73ba276876a19e8816ecdc5241817ab47`; the checked-in author license is CC0-1.0. Every source file has a recorded size and SHA-256 in `source-manifest.json` and `asset-manifest.json`.
- This is a modern low-poly replacement, not original Heroes of Gaia art and not a historical visual match. The original client was not available for same-scene comparison, so visual parity remains UNVERIFIED.
- Three.js 0.160.0 is a local export-time dependency only; the MIT license is retained in `tools/asset-renderer/THREE-LICENSE.txt`. The delivered game needs only five baked PNG atlases.

## Render and runtime

- The exporter loads actual animation clips from the rigged GLB, attaches the sword and shield to hand slots, and bakes them with a fixed three-quarter camera into transparent 256×256 cells.
- All 57 frame images have distinct hashes, non-empty alpha bounds and shared foot pivot `[148,216]`. The five atlases are Idle (13 frames), Walking_A (13), 1H_Melee_Attack_Chop (13), Hit_A (8), and Death_A (10). The metadata records source clip, duration, sample rate, times, alpha bounds, frame hashes and atlas hashes.
- `engine.js` records the actual per-stack action path, target, damage and death receipt. `painter.js` maps actual move, attack, hit and death state to these clips; animation has no authority to alter damage or troop counts. Enemy display mirrors the art. Existing v07 saves are still accepted, including legacy battles without `lastEvents`.
- `build_offline.py` embeds all five atlases. `Play-Heoofgaia-HG11.html` can be opened directly without fetching runtime images; the battle scene also uses the independent Human Meadow background asset. The resulting standalone bundle embeds 16 runtime PNGs in total.

## Verification and limits

- Node regression: **172/172 PASS**, including the pinned source/frame/atlas checks and the final asset-manifest, browser-receipt, screenshot-hash and offline-bundle integrity test.
- Installed Chrome opened the standalone `file://` HTML and passed 20/20 focused gameplay checks. It recruited two Heavy Soldiers through real UI/engine actions, formed one with militia, marched through normal travel into battle, played actual movement/attack/hit/death clips, resolved real damage and a casualty, then verified v07 Save/Reload.
- Test fixture disclosure: the test seeds prerequisite buildings, research and resources to avoid construction waits, and adjusts enemy-only stats/positions to keep combat observable. Player action, movement, damage, death and save results are engine-generated, never injected.
- Actual-browser screenshots and machine receipt are listed in `asset-manifest.json` and `docs/qa/hg11/human-heavy-animation-chrome.json`. They show this reconstruction only, not an original-client comparison.
- Only Human Heavy Soldier is animated by this asset pack. Other troop art/animations, battlefield/world art, unit-to-unit style cohesion and original-client parity remain open.

License sources: [KayKit pinned CC0 license](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/blob/672074b73ba276876a19e8816ecdc5241817ab47/LICENSE.txt) and [KayKit Adventurers 1.0](https://kaylousberg.itch.io/kaykit-adventurers).
