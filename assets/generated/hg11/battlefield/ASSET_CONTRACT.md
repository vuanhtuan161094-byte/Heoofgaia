# HG-11 Human Meadow Battlefield — Asset Contract

## Asset and in-game purpose

- Content ID: `battlefield-human-meadow-v1`; one static opaque background used behind the existing 12×9 tactical grid, unit sprites, HP bars and battle HUD.
- Runtime size: 1176×550 pixels, matching `#battle-canvas` exactly. The game grid is engine data (`BATTLE_GRID`), spans x=0…1176 and y=173…365, and remains drawn over the image; image generation does not create walkable-cell or collision data.
- Composition: elevated three-quarter / isometric strategy-game view. Keep the forested horizon in the upper band, readable open olive meadow through the complete grid rectangle, and quiet grass in the foreground. Keep edges, flowers, debris and strong contrast outside the center where units and grid lines appear.
- Mood and quality: lush high-fantasy summer clearing, warm late-afternoon sun, layered forest, light atmospheric depth, premium painterly 2.5D game environment. Match the existing dark green / brass / parchment UI palette while making the field brighter and richer than 2009 Flash art.
- Exact constraints: no characters, creatures, buildings, walls, roads, props, UI, grid, text, logos, border or watermark. The art is a single flattened background; no layer separation, animation, collision, or interactivity is claimed.

## Provenance and quality gate

- Generate a new independent image from the prompt in `prompt.txt`, with no Heroes of Gaia screenshot or original client art used as model input. Record provider output location, final dimensions, crop operation, SHA-256, license/source declaration and QA in `asset-manifest.json`.
- Status is `RECREATED`, never original or extracted. Historical visual parity remains unverified; generated art is a modern visual interpretation.
- Preserve the generated master under `source/`. Derive an opaque, exact 1176×550 runtime PNG without painting over unsupported game objects. Do not overwrite existing files.
- Pass gates: exact PNG dimensions and decode; opaque alpha; pixel variation and no large empty/transparent bands; game screenshot check that the tactical grid remains visible and units read over the field; real offline-browser battle; no gameplay state changes caused by the image.
- If crop makes the grid area too noisy, reject or regenerate before integration. A static background alone does not complete HG-11.
