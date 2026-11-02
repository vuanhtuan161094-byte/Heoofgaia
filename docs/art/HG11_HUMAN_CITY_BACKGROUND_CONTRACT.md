# HG-11 Human city background — asset contract

**Contract date:** 2026-11-02
**Asset state before generation:** `PENDING`
**Target:** Heroes of Gaia 1 / Castle of Heroes / 英雄之城, 2009 Flash-era visual direction. This is a new recreation, not recovered game art.

## Visual oracle and bounds

- SRC42's 2009 SFACG review describes a detailed flat 2D castle scene, buildings integrated into a hillside, faction-specific European-fantasy environments, and Town Hall construction controls. The linked 2009 Sina gallery screenshot shows the world view with terrain, castle, hero, resource HUD and minimap. These are linked visual references only; no source images are supplied to the generator or bundled as assets.
- Current city canvas in `index.html` is `1176×560` logical pixels. Clickable sites are code-defined in `painter.js` as `CITY_SITES`; `cityHit` maps the same coordinates to live building actions. Do not move or replace those interactions.
- Current city view dynamically paints the keep/buildings and building-level labels. This contract covers only a separate opaque environment background so dynamic/clickable structures remain game-rendered. Do not include castle, houses, towers, characters, symbols, UI, text or logos in this layer.
- Direction: hand-painted 2D fantasy illustration with a shallow elevated/orthographic camera, rolling layered hills, woodland framing, path and stone courtyard, warm daylight, era-appropriate detail and muted 2009 Flash palette. Avoid photorealism, 3D/PBR rendering, modern mobile-game gloss, anime, pixel art, and unrelated-game motifs.

## Exact deliverables

1. Raw generated master: `assets/generated/hg11/source/human-castle-landscape-master.png` (preserve exact host output and dimensions).
2. Runtime derivative: `assets/generated/hg11/human-castle-landscape-1176x560.png` (crop/resample only if needed to exact canvas dimensions; do not paint/remove content after generation).
3. Provenance/QC manifest: `assets/generated/hg11/asset-manifest.json` (prompt version, tool/provider, creation time if returned, source route, raw/runtime dimensions and byte sizes, SHA-256, status `RECREATED`, cost only if provider reports it, QA/integration status).
4. Actual in-game Chrome screenshot after integration: `docs/evidence/hg11/` (not a mockup or composed screenshot).

No props, buildings, sprites, animation frames, collision or extra layers are claimed by this contract. Future building sprite assets need a separate contract and per-building identity QA.

## Acceptance gates

- `image_created`: host image-generation output exists and is inspected.
- `file_exported`: exact raw PNG and 1176×560 runtime PNG exist in the project.
- `asset_qc_pass`: file opens, dimensions match the manifest, format/alpha expectations match the contract, and SHA-256 is recorded. Composition leaves existing `CITY_SITES` legible for dynamic building overlays.
- `integrated_in_game`: actual HTML `file://` build loads the background; city hotspots still select live buildings; city switching/race data/save-load remain unchanged; capture a real Chrome screenshot and run regression.
- **Visual honesty:** success means an atmospheric background integration only. It does not establish original sprite fidelity, animation, separated scenery, 1:1 visual parity, or licensing of historical references.

## Generation prompt v1 (text-only reference route)

Create an original, wide 2.1:1 landscape background for a 2009-era browser fantasy strategy game city scene. Hand-painted 2D illustration, subtle layered gouache/oil texture, restrained painterly details, shallow elevated orthographic camera (not perspective-heavy and not pseudo-3D). A warm, sunlit human kingdom biome: distant blue-gray hills, dense but softly rendered green woodland along the horizon, a broad open grass slope and a quiet worn stone courtyard in the lower foreground, small shrubs and atmospheric haze. Use muted natural greens, warm stone and soft blue sky, with rich readable depth at 1176×560. Keep the middle and foreground building overlay sites visually calm: no prominent structures or objects. This image is only the environment behind separate interactive buildings. Absolutely no castle, houses, towers, walls, bridges, roads crossing the building sites, characters, armies, flags, weapons, UI, icons, text, letters, watermarks, borders, logos, copied game art, or exact screenshot composition. The result must be an original background, not a finished city screenshot.

## Iteration record and generation prompt v2

- Candidate v1 was image-created by the ChatGPT image-generation tool, then visually rejected before export: it produced a highly realistic/modern 3D-looking landscape instead of the target's hand-painted 2D 2009 browser-game style. It is not part of the game build.
- Candidate v2 uses v1 only as a composition reference and must repaint the content in a visibly illustrated style. Source image ID/path: `C:\Users\Admin\.codex\generated_images\01a19a08-e09e-7801-88a0-49e6d7322f34\exec-28a4461c-ed8b-41fa-96fe-1ac201bd91b3.png`.

Repaint the reference as a clearly hand-painted 2D background illustration from the visual era of a 2009 Flash fantasy strategy game. Preserve its very wide layered-hills composition and empty foreground/midground layout for separate clickable buildings, but remove the photographic/3D look completely. Use visible soft oil-and-gouache brushwork, simplified painted tree masses and terrain planes, softly controlled edges, restrained outlines, a warm medieval storybook palette, and readable painterly depth; the feel should be a crafted game background rather than a photograph, 3D render, modern mobile-game matte painting, or smooth AI landscape. Keep the same sunlit human-kingdom setting, hills, forest edge, open grass slope, quiet stone courtyard, blue-gray distance and muted greens/warm stone. No buildings, castle, houses, towers, walls, bridges, objects at the building sites, characters, armies, flags, weapons, UI, icons, text, letters, watermarks, borders, logos, copied game art, or exact screenshot composition. Environment background only; target 2.1:1 aspect for a 1176×560 game canvas.
## Owner-directed art update — full city art pass v3 (2026-11-02)

The owner explicitly requests a game that is **more visually polished than 2009** and says not to over-commit to the period's rendering limitations. Keep Heroes of Gaia's four-race architecture, hillside castle composition, gameplay landmarks and UI meaning, but use modern high-quality art direction. This supersedes the single empty-background prompts above; their image outputs are not release assets.

### Exact v3 deliverables

- Four separate city-scene masters, one per faction, in `assets/generated/hg11/source/`: `human-city-master.png`, `elf-city-master.png`, `orc-city-master.png`, `undead-city-master.png`.
- Four runtime scene backgrounds, exactly 1176×560 PNG, in `assets/generated/hg11/cities/`: `human-city-1176x560.png`, `elf-city-1176x560.png`, `orc-city-1176x560.png`, `undead-city-1176x560.png`.
- `assets/generated/hg11/asset-manifest.json`, containing per-file prompt/provider/known creation time/source route/actual size/bytes/hash/status/cost if reported and separate image-created, file-exported, asset-QC, integrated-in-game states.
- Live integration screenshot and browser interaction receipt under `docs/evidence/hg11/` and `docs/qa/hg11/`.

These are complete flattened scene paintings used as a scenic layer behind live canvas interaction. `CITY_SITES` and `cityHit` remain the actual real click targets for the same buildings; painting is not a separate sprite, animated building, original asset, or proof of exact-client layout. Overlay city name, building names/levels, selection highlight and construction status in code. The offline builder must embed all four compressed runtime images into `Play-Heoofgaia-HG11.html`, so it remains one-file playable.

### v3 art direction and prompt template

Create a premium modern fantasy strategy-game city scene, wide 2.1:1 landscape for a 1176×560 canvas. Use a refined richly detailed painterly 2.5D illustration with cinematic but readable depth, warm directional light, polished materials and coherent architectural silhouettes. It should feel like a high-quality current indie strategy game while preserving Heroes of Gaia's European-fantasy four-faction identity and classic hillside city composition. The central Hall/castle sits around normalized coordinate (.51,.60). Place distinct interactive landmark buildings around the scene at the normalized `CITY_SITES` coordinates: Magic Tower (.21,.41), Hero Tower (.73,.40), Embassy (.38,.43), Stables (.11,.67), Barracks (.22,.74), Tavern (.39,.83), Arena (.65,.83), Warehouse (.84,.79), Market (.11,.86), Bazaar (.89,.58), Forge (.87,.91). Keep each structure clearly separated with click-safe space around it and avoid confusing overlap. No UI, text, labels, numbers, watermark, logo, characters covering structures, unrelated game motifs, or copied screenshot pixels. The scene art is original generated recreation; all click controls, labels and building levels are rendered by game code.

Faction variant accents: Human—limestone keep, red/warm slate roofs, orderly walls, green valley; Elf—living timber/ivory structures, graceful green roofs, lush ancient woodland; Orc—heavy timber, rough stone, ironwork, ochre/red banners, rugged steppe; Undead—dark carved stone, violet/cyan arcane lights, bare trees, moonlit marsh. Maintain identical camera, scale, lighting quality, canvas framing and landmark positions across all four variants.

### v3 asset QA acceptance

- Verify all four masters visually for faction identity, no extra text/UI, no duplicated/merged landmark structures, and consistent camera/scale.
- Confirm runtime PNGs are 1176×560, readable at the actual canvas CSS size, and every `CITY_SITES` hit target selects the correct live building action; verify city switch changes the matching race scene.
- Confirm offline HTML embeds the exact runtime bytes and opens from `file://` without external network requests; rerun save/load and full regression before claiming integration PASS.
- Report art creation/export/QC/integration as separate statuses. Any mismatch remains **FAIL** or **PARTIAL**, with images retained only as documented candidates.

### Post-generation layout calibration

- Screen review found the generated faction scenes place the Market stalls in different parts of each city. The implementation keeps a common map for the other landmarks and uses market centers Human `(.50,.87)`, Elf `(.10,.86)`, Orc `(.14,.83)`, Undead `(.10,.86)` in normalized canvas coordinates. These are coordinates for this recreated art only, not claimed original-client coordinates.
- Chrome click-through verified all twelve live building actions separately for each of the four faction scenes. Human/Elf/Orc/Undead each receive their own saved race and art; the building state and upgrade queue remain engine-managed.
- Integration acceptance is **PARTIAL PASS**: one-scene-per-faction composition, rendering, live hit zones, a real construction queue, and v07 save/reload are verified. The flattened art has no animated/separate buildings, and no recovered original screenshot/client is available for exact layout comparison.
