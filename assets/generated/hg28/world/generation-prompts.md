# HG28 World Art: Generation Record

Created 2026-11-05 for Hẻoofgaia HG28-A. Both images were generated for this project without reference images; no original Heroes of Gaia art, screenshots, game files, or third-party sprites were inputs.

## Meadow material tile

Asset: `meadow-tile.png` · 1254×1254 PNG · generated material intended to repeat under the live map layers.

Prompt:

> Game-ready seamless top-down orthographic terrain texture for a premium dark-fantasy strategy world map, square 1024 by 1024 material tile. Richly layered temperate meadow: dense mossy jade and olive grasses, subtle groundcover, clumps of short blades, tiny cream wildflowers, scattered slate pebbles, occasional faint worn earth patches. Painterly high-detail 2D environment art with controlled natural lighting, polished modern strategy game texture, muted dark teal, forest green and warm ochre accents, readable low-to-medium contrast so live map roads, rivers, landmarks and labels can sit clearly above it. Entire image is only continuous terrain texture, no horizon, no buildings, no trees with large silhouettes, no creatures, no roads, no river, no icons, no labels, no text, no border, no grid, no interface. Make all four edges tile seamlessly so it can repeat as a reusable game texture without visible seams. This is an original asset, no imitation of any named game.

## Four map creature sprites

Asset: `world-creatures-atlas.png` · 1261×1247 RGBA PNG · the game draws separate source rectangles from one offline atlas.

Prompt:

> Original game-ready 2D fantasy strategy enemy sprite atlas, perfectly organized as a 2 by 2 sheet on a truly transparent background. Four equal square cells with generous empty transparent padding and no divider lines. Top-left cell: a wildland dire wolf, medium size, crouched and alert. Top-right: an elite horned stone guardian in weathered bronze armor, imposing upright silhouette. Bottom-left: a shadow dragon boss with broad folded wings and pale blue arcane glow. Bottom-right: an ancient lich warlord in layered dark robes and bone armor, holding a staff. Each creature is a separate full-body character, completely inside its own quadrant with clear separation and no overlap, consistent ground line, same three-quarter top-down game map camera, facing slightly toward the viewer. Detailed painterly 2.5D game illustration, refined dark-fantasy palette of deep teal, slate, aged brass and restrained ember/ice highlights; realistic proportions, strong silhouettes, crisp material detail that reads at 48–72 pixel in-game scale. This is original art for a playable strategy game; do not imitate any named game or existing franchise. No text, no logos, no UI, no scene background, no ground plane, no drop shadow extending out of each subject.

The atlas render has small edge irregularities, so runtime source rectangles are specified in `asset-manifest.json` and cropped in the canvas. This does not alter or flatten the interactive world map.

## Broadleaf tree prop

Asset: `tree-broadleaf.png` · 1312×1199 RGBA PNG · separate tree prop rendered at map scale with a bottom-center ground anchor.

Prompt:

> Create one production-ready 2D environment sprite master for a premium fantasy strategy game world map. Asset identity: mature broadleaf oak tree, distinct from a pine. 3/4 top-down isometric map camera looking slightly down, full tree silhouette centered, broad leafy canopy with layered forest-green foliage, a small visible trunk and roots at the bottom center, nuanced leaf highlights and deep readable shadows, polished hand-painted game art, rich but natural color, designed to remain legible when displayed only 35–55 screen pixels tall. Entire object must fit with generous transparent padding; no ground plane, no rocks, no scene, no border, no text, no watermark, no grid, no extra objects. Maintain a clear bottom-center trunk anchor. Transparent background.

## Pine tree prop

Asset: `tree-pine.png` · 1086×1448 RGBA PNG · separate tree prop rendered at map scale with a bottom-center ground anchor.

Prompt:

> Create one production-ready 2D environment sprite master for a premium fantasy strategy game world map. Asset identity: tall dark evergreen pine, clearly distinct from a broadleaf oak. 3/4 top-down isometric map camera looking slightly down, full tree silhouette centered with layered triangular evergreen boughs, visible narrow trunk and roots at bottom center, subtle cool blue-green needles with warm edge light, polished hand-painted strategy game art, rich natural color, crisp silhouette readable at 35–55 screen pixels tall. The whole isolated tree fits with generous transparent padding, no ground plane, no rock, no scene, no border, no text, no watermark, no grid, no other objects. Clear bottom-center trunk anchor. Transparent background.
