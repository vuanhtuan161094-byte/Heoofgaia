# HG-14 — Batch 01: Four-Faction Battle Sprite Motion (2026-11-04)

## Scope and source-of-truth

This is actual playable game work, not a mockup. The 512×512 transparent sprite masters are **existing HG-11 sourced PNG assets** in this repository. No new AI pose sheet, licensed HoG client art, or externally sourced rig animation was created in this batch. The four initial faction identities are:

| Faction | Unit ID | Sprite master in game | Notes |
| --- | --- | --- | --- |
| Human | `human_3` Archer | `assets/generated/hg11/units/human-archer.png` | Ranged bow/projectile visual |
| Elf | `elf_1` Centaur | `assets/generated/hg11/units/elf-centaur.png` | Melee lunge |
| Orc | `orc_1` Imp | `assets/generated/hg11/units/orc-imp.png` | Melee lunge |
| Undead | `undead_1` Skeleton Warrior | `assets/generated/hg11/units/undead-skeleton.png` | Melee lunge |
| Extra elf pilot | `elf_2` Scout | `assets/generated/hg11/units/elf-scout.png` | Same motion pipeline |

Each image has its own existing HG-11 provenance manifest and alpha QC. These are **independent unit identities**; there is no false reuse of an Orc character for an Undead unit.

## Actual battle animation mechanism

`painter.js` now provides `MOTION_SPRITES`, `motionPose`, `motionSprite`, `motionImpactFx` and consumes the existing `battleVisualState` derived from real `battle.lastEvents` receipts. States:

- **Idle:** breathing/sway/vertical float.
- **Walk:** foot-pivot-preserving bounce/lean, interpolated path between actual grid cells.
- **Attack:** anticipation, directional lunge/recovery and melee slash / ranged projectile FX.
- **Hit:** deterministic recoil/shake and local hit-glint.
- **Death:** tumble/scale/fade after lethal battle receipt.

This is **single-master procedural 2D motion** (independent 512×512 PNG per troop identity); it **is not** five hand-drawn poses, separate limb rig clips, or 36 distinct authored animation frames. `human_4` Heavy Soldier continues using its previous, genuinely rig-rendered **57 frames** across five atlases; it is not downgraded or misrepresented. Unknown catalog units keep existing honest emblem fallback instead of pretending all 40 have sprites.

No combat stats, troop gates, movement authority, save schema or rewards are changed. Movement visuals follow recorded paths rather than moving the actual engine unit a second time. The animation loop is capped at 24 FPS to reduce redraw load.

## Acceptance contract

1. Identity-to-image map matches actual existing `<img id>` resources in `index.html` and remains embedded in offline HTML.
2. `painter.js` preserves `HOG_PAINTER` renderer exports for other scenes and the Heavy Soldier atlas animation.
3. Continuous motion shows distinct deterministic states for each art-backed unit with no backend mutations.
4. Real Chromium **file://** opens and renders all four faction battles, drawing the correct image ID on the battle canvas, capturing screenshots and saving/reloading the battle.
5. CI builds standalone HTML twice with matching SHA and passes engine, battle viewport, Chromium UI and HG-14 sprite checks.
6. Anything about actual owner-approved visual polish is left `OWNER_VISUAL_PENDING` until reviewed at real size.

## Next visual batch

If approved, add **genuine frame-by-frame** Idle/Walk/Attack/Hit/Death pose masters for one troop at a time, with alpha-aligned pivots and a sprite atlas, only after those frame sources are actually available. Do not label one-master transforms as multi-pose frame animation.
