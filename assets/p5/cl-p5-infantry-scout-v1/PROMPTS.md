# Prompt provenance — CL-P5 infantry scout v1

Provider route: built-in `image_gen`; cost: unknown. All outputs are `RECREATED`, not verified hand-drawn originals. The first identity draft was rejected as too photorealistic; the final master below was edited from that draft to fit the project's painted game-sprite style. The first hurt sheet was rejected for a checkerboard/noise background; the cleaned sheet is derived from it and keeps the 16 pose cells.

## Master draft — v1.0 (rejected)

```text
Use case: stylized-concept
Asset type: single transparent game sprite master for an original strategy game.
Primary request: create one original foot infantry scout, full body, not a named historical figure, clearly a trained soldier rather than a hero commander.
Subject: a compact Three Kingdoms-era infantryman in muted jade-green cloth under layered bronze lamellar plates, charcoal trousers, simple dark boots, plain dark-bronze helmet with one small crimson cloth knot, a short spear and a small round wooden shield. Make the face, armor silhouette, spear and shield readable at small game scale.
Style/medium: polished painterly 2.5D historical strategy-game character art, consistent in finish with the project's own existing hand-painted troop sprites, but a distinct original design; detailed cloth and metal, clean cutout edges.
Composition/framing: one isolated full-body character, 3/4 front view, neutral ready stance, upright, feet fully visible and aligned to a stable bottom-center pivot; keep the complete spear and shield inside the canvas with generous transparent padding.
Lighting/mood: soft directional studio light, calm and battle-ready.
Color palette: restrained jade green, aged bronze, charcoal and a small crimson accent.
Constraints: true transparent background; one character only; no shadow plane, no terrain, no text, no labels, no watermark, no border, no sprite grid, no weapons other than the spear and shield. Do not copy any named game character or published-game artwork.
```

## Master style edit — v1.1 (selected)

```text
Use case: style-transfer
Asset type: one game-ready 2D troop sprite master for Mưu Định Tam Quốc.
Input image: Image 1 is the exact identity, costume, equipment and pose source. Preserve this soldier's bronze helmet with small crimson knot, jade-green robe, bronze lamellar armor, spear, round wooden shield and muted colors.
Primary request: restyle Image 1 as a compact, hand-painted, semi-realistic chibi troop sprite that matches the proportions and illustrated finish of an original indie strategy game's small troop sprites. Make the head slightly larger and body shorter, with clear readable face and armor shapes at 100x144 game scale. It must still read as a disciplined infantry scout, not a hero portrait or photorealistic human.
Composition/framing: single full-body character, 3/4 front ready stance, stable bottom-center foot pivot, spear and shield fully inside a square canvas, generous clean edge padding.
Style/medium: 2D painterly game illustration, lightly textured brushwork, clean cutout silhouette, restrained medieval Chinese historical fantasy, not 3D render, not photorealism.
Scene/backdrop: genuinely transparent background.
Constraints: change style and proportions only; keep one identity and the same recognizable costume, equipment, color palette and pose. No floor, shadow, scenery, grid, lettering, logos or watermark.
```

## Walk sheet — v1.0

```text
Use case: stylized-concept
Asset type: directional walk-cycle sprite sheet for one original game troop.
Input image: Image 1 is the exact approved identity master. Preserve the same face, helmet and crimson knot, jade robe, bronze lamellar, spear, round wooden shield, painterly style and proportions. Do not invent a second soldier.
Primary request: create a clean 4-column × 4-row sprite sheet showing this single infantry scout walking in a loop. All 16 cells must be equal squares, with no grid lines or cell borders. Each row is a separate direction in this order: front, right-facing profile, back, left-facing profile. In each row, the four columns show a continuous walk cycle: left foot forward, passing pose, right foot forward, passing pose. Keep the same equipment in every frame; use small, natural arm, leg, cloth and spear motion, not a different attack or pose.
Composition/framing: square 1024×1024 sheet, 256×256 logical cells. Draw one complete character centered in each cell with the same bottom-center foot pivot and identical scale; keep spear tip, shield and feet inside the cell with ample clear gap between neighboring cells. Character height about 210 pixels per cell.
Style/medium: flat transparent cutout, 2D painterly game sprite art, lightly textured brushwork, clean readable silhouette at 100×144 final display size; match Image 1's illustrated finish, never photorealistic or 3D.
Scene/backdrop: genuine transparent canvas in every cell, no ground shadow.
Constraints: keep the identity consistent across all 16 frames and every direction. The grid is only implied by precise equal cell placement; no lines, numbering, letters, text, labels or watermark. Do not merge neighboring frames or crop limbs/weapons.
```

## Idle sheet — v1.0

```text
Use case: stylized-concept
Asset type: directional idle-cycle sprite sheet for one original game troop.
Input image: Image 1 is the exact approved identity master. Preserve the same face, bronze helmet and crimson knot, jade-green robe, lamellar armor, spear and round wooden shield. Do not add a second character.
Primary request: create a 4-column × 4-row sprite sheet showing this soldier holding a calm ready stance. Rows in this exact order: front, right-facing profile, back, left-facing profile. Four columns per row are consecutive subtle idle frames: neutral, small breath rise, slight cloth/plume movement, return to neutral. Avoid large pose changes.
Composition/framing: square 1024×1024 sheet, 256×256 logical cells, no grid lines. One full-body character centered in each cell, same scale and bottom-center foot pivot; keep spear, shield and boots fully inside with clear gaps between cells.
Style/medium: painterly 2D game sprite matching Image 1, clean silhouette and readable armor shapes at small scale; not photorealistic or 3D.
Scene/backdrop: true transparent background in every cell, no ground shadow.
Constraints: exactly four directions by four frames. Keep costume and face identity consistent. No text, numbering, borders, scenery, extra props or watermark.
```

## Attack sheet — v1.0

```text
Use case: stylized-concept
Asset type: directional spear attack sprite sheet for one original game troop.
Input image: Image 1 is the exact approved identity master. Preserve the same face, bronze helmet and crimson knot, jade robe, lamellar armor, spear and round wooden shield. Do not add a second character.
Primary request: create a 4-column × 4-row sprite sheet for one readable, non-graphic spear attack loop. Rows in this order: front, right-facing profile, back, left-facing profile. Four columns per row are the sequence: ready stance, draw spear back and brace behind shield, thrust forward to strike, recover to ready. Keep the motion grounded and clear; the spear tip moves but stays inside its cell. No enemy target is drawn.
Composition/framing: square 1024×1024 sheet, 256×256 logical cells, no visible grid or cell border. One complete soldier centered in each cell, same scale and bottom-center foot pivot; do not crop spear, shield or body.
Style/medium: 2D painterly game sprite matching Image 1, clean silhouette and readable at small scale; no 3D or photorealism.
Scene/backdrop: genuinely transparent background in every cell; no floor plane or cast shadow.
Constraints: exactly four directions by four frames. Preserve identity, costume and equipment in every pose. No text, numbering, extra characters, blood, ground, scenery, grid or watermark.
```

The first generated attack sheet (`attack-4x4-sheet-before-v2.png`, SHA256 `3b71a7321df10bd406fad080e1a084f09ec540ea26bb9d8045778651bdfe1aa3`) was retained as a rejected source because two profile thrust spear tips crossed cell boundaries. A cleanup edit (`attack-4x4-sheet-cleanup-rejected.png`, SHA256 `7b8c26d7d53136f00b2cb6aebe89dc2550bf54cebb3bcf2595eeafd30d80ed4c`) removed detached fragments but still did not preserve the required margins, so it was not selected.

## Attack sheet — v1.1 (selected)

Source: the exact approved `cl-p5-infantry-scout-master.png`, passed as the sole reference image. Generated output: 1254×1254 RGBA, copied without pixel edits to `attack-4x4-sheet.png`. SHA256: `c495d94518c93ac891f09917da058b0613d3f52c4c30cd53abca80e3b7cf57eb`.

```text
Create one ORIGINAL 4-column by 4-row sprite sheet for the exact infantry scout shown in the reference image. Preserve that soldier's face, bronze helmet and small crimson plume, jade-green robe, bronze lamellar armor, spear and round wooden shield. The reference image is the identity and art-style source.

This is a sprite-sheet production asset, not a poster. Canvas must be square with genuine transparent alpha. Exactly 16 separate full-body drawings, equal square cells, no lines/borders/grid/background/checkerboard/shadow/text. Layout: each ROW is one view in order: front-facing, right-facing profile, back-facing, left-facing profile. In each row the four COLUMNS are exactly: (1) ready stance, (2) draw spear back and brace behind shield, (3) forward spear thrust, (4) recover to ready stance. Make the attack motion clear but small and grounded. Return to the same ready pose in column four. No enemy or impact target.

CRITICAL FRAME SAFETY: Every drawing must fit wholly inside its own cell with at least 12% transparent padding at all four edges. In column 3, keep spear and spear tip especially well inside the cell; shorten/foreshorten the thrust if needed. Never let any weapon, plume, shield, foot or shadow cross a cell boundary. Keep identical character scale, centered bottom-center foot pivot and costume in all 16 cells. Character including weapon should occupy no more than about 70% of cell width or height. Use clear spacing between cells.

Style: polished original 2D painterly historical strategy-game sprite art, lightly textured and cleanly cut out, consistent with the reference, not photorealistic, not 3D. No gore. Do not copy any published game's art or character.
```

The selected v1.1 sheet was inspected in a 4×4 checkerboard contact sheet and in the packed 100×144 game-scale atlas. Its horizontal spear tips remain inside their own cells after trimming; no action frame is cropped by the packer.

## Hurt sheet — v1.0 (source rejected), cleanup — v1.1 (selected)

```text
Use case: stylized-concept
Asset type: directional hurt/flinch sprite sheet for one original game troop.
Input image: Image 1 is the exact approved identity master. Preserve this exact soldier's face, bronze helmet with crimson knot, jade-green robe, lamellar armor, spear and round wooden shield.
Primary request: make a 4-column × 4-row sprite sheet showing a non-graphic hit response. Rows in order: front, right-facing profile, back, left-facing profile. Four columns per row show a continuous sequence: ready, raise shield and brace, flinch/recoil from an impact, settle back to a guarded stance. No attacker or projectile appears.
Composition/framing: square 1024×1024 sheet, 256×256 logical cells, no visible grid. One complete soldier centered in each cell; same scale and bottom-center foot pivot; keep weapon, shield, body and boots inside cell.
Style/medium: clean 2D painterly game sprite matching Image 1; readable silhouette at 100×144 size, not photorealistic or 3D.
Scene/backdrop: genuine transparent background in every cell, no ground shadow or floor.
Constraints: exact four views × four frames. Keep identity, costume and equipment consistent; body motion only. No blood, wounds, gore, additional figures, text, grid lines, labels, scenic background or watermark.
```

The source hurt sheet (`hurt-4x4-sheet-source-rejected.png`, SHA256 `e92134a32d87bc21d8f5062a8f4c922c910191ae0bfd7c66212e98851a156741`) contained a checkerboard/noise background. It was not integrated. The selected derived sheet was edited with this cleanup prompt:

```text
Use case: background-extraction
Asset type: transparent 4×4 directional sprite sheet for one original game troop.
Input image: Image 1 is the target sheet. Preserve all sixteen soldier poses, their exact cell order, size, costume, identity, weapons and positions.
Primary request: remove only the gray checkerboard, colored halo/noise, background texture and stray colored pixels. Make every pixel outside the soldier, spear, shield and plume fully transparent. Keep the soldier art unchanged; do not redraw or restyle any pose.
Composition/framing: keep the square 4-column × 4-row sheet and existing alignment exactly. Do not crop or move any character.
Style/medium: transparent cutout cleanup only.
Constraints: true alpha background; no visible checkerboard in the output pixels. No lines, labels, text, ground, shadow, scenery, watermark or extra figures.
```

## Death sheet — v1.0

```text
Use case: stylized-concept
Asset type: directional four-stage death/fall sprite sheet for one original game troop.
Input image: Image 1 is the exact approved identity master. Preserve the same soldier's face, bronze helmet and red knot, jade robe, lamellar armor, spear and round shield. Do not add another character.
Primary request: create a clean 4-column × 4-row sprite sheet for this soldier's non-graphic defeat animation. Each row is one view in this order: front, right-facing profile, back, left-facing profile. Each row's four columns show a continuous progressive fall: (1) stagger after a hit, (2) drop to one knee, (3) lean and fall onto the ground while retaining the shield, (4) settled defeated pose lying low and still. Keep the identity and costume consistent; no blood, dismemberment, gore or additional objects.
Composition/framing: square 1024×1024 image, 256×256 logical cells, no grid lines. Draw one complete figure centered in each cell. Use the same ground line / bottom-center pivot across every cell; keep spear, shield, helmet and limbs within the cell, with clear gaps between cells. Progressive pose must read at game scale.
Style/medium: 2D painterly game sprite art matching Image 1; crisp readable cutout edges, lightly textured brushwork, not photorealistic or 3D.
Scene/backdrop: genuinely transparent background in every cell.
Constraints: exact four columns and four rows; direction is row, animation stage is column. No text, numbering, border, background, floor plane or watermark. Keep the last frame low to the ground; no movement lines or decorative effects.
```
