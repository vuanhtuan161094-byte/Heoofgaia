# HG-11 sprite contract — Elf tier-2 Scout (`elf_2`)

Date: 2026-11-03
Status: GENERATED, integrated and accepted for the bounded static-sprite slice; see `elf-scout-manifest.json` and the focused 20/20 Chrome receipt.

## Purpose and historical identity

Add one independently created still for the real Elf tier-2 scouting unit. The role must read as a fast, lightly equipped elf messenger/scout, not an archer, mounted Centaur, or hero. Fit the existing premium painterly faction look and keep the high-speed, low-combat identity legible at the battle renderer's 90×90 box.

- Identity: Elf faction, tier 2, `elf_2`, Elf Scout; melee in the dated English catalog.
- SRC02 (Wikidot game-units revision 19, 2009-12-06) establishes the unit ID/name/stats in the current English-facing catalog, but not its original art.
- SRC22 (publisher-hosted Lequ/SNSFun four-race guide, 2010-10, https://www.snsfun.com/yxzc/201010/7753.html, lines 87–89) calls the Chinese Elf Scout a very fast scouting unit with very weak combat power. It also describes Elf characters as elegant/ethereal with pointed ears. This is Chinese-era role/style evidence, not proof of international client art or exact gameplay gates.
- The runtime gate (`Barracks 2 + Scouting 1`) is already labeled `B*`/cross-version-derived in `docs/research/HG08-TROOP-UNLOCK-MATRIX.md`; the image test will use the actual gate and explicitly disclose any fixture setup.
- Output: one full-body 1254×1254 transparent RGBA master, processed to 512×512 RGBA. Target visible figure height 380 px; ground pivot `[256,446]`, consistent with existing troop sprites.
- Scope is one static image only. No animation, historical art recovery, or save-schema changes are implied.

## Text-only generation prompt

Create ONE original standalone game-ready character master for **Anh Hùng Thời Loạn**, an independent reconstruction inspired by Heroes of Gaia 1 / Castle of Heroes / 英雄之城. Unit identity: Elf faction tier-two Elf Scout (`elf_2`), a swift lightly equipped foot messenger and reconnaissance soldier. This is newly imagined project art and must not copy any game, illustration, screenshot, supplied image, named character, or recognizable franchise design.

Show one adult elf with clearly pointed ears, realistic human proportions, a calm observant expression, and a poised running-ready stance. Dress the scout in practical muted forest-green and pale sage travel leathers, light layered cloth, a short hooded mantle, compact belt pouches and simple soft boots. Give them a small hand-held field map or rolled message and a modest short blade worn at the hip; no bow, quiver, shield, heavy armor, glowing magic, or oversized weapon. The silhouette should communicate speed and scouting utility, not combat strength. Keep surface detail clean and readable at a 90×90 battle draw size. Use premium painterly realism, soft directional light, delicate natural texture and a restrained warm rim with cool green ambient fill. It should feel elegant and ethereal in the Elf faction while looking more polished than 2009 Flash art.

Pose exactly one full-body 3/4 view facing screen-right in a relaxed alert idle-ready stance, knees subtly flexed as if ready to move, with both feet visible and on a common baseline. Keep ears, hands, belt items and boots fully within frame. Orthographic character-art camera, consistent game-unit scale and no dramatic foreshortening. Square 1254×1254 canvas, figure around 72% of canvas height, generous transparent padding. Put the center between the feet at the exact bottom-center ground pivot.

Output one isolated figure on TRUE transparent alpha. No background, ground plane, cast shadow outside the feet, scenery, frame, lettering, watermark, logo, extra figure, sprite sheet, alternate pose or extra limbs. Crisp alpha silhouette suitable for direct compositing into the actual tactical-battle renderer.

## Acceptance

- Preserve untouched master and exact prompt; record provider/source ID, SHA-256, bytes, dimensions, alpha bounds, runtime pivot, rights assessment and static-frame count.
- Inspect anatomy, pointy ears, role silhouette, item/bow absence, detached alpha specks and 90×90 readability.
- Process through `tools/process-hg11-unit-sprite.ps1`; integrate `elf_2` into player and enemy battle rendering and the offline HTML builder.
- Test actual Elf Scouting research/gate, real recruitment transaction and queue completion, formation, world-map selection, March, NPC battle draw, v07 Save/Reload and enemy flip separately in installed Chrome `file://`.
- Capture a real browser screenshot and machine-readable receipt. Keep all fixture setup explicit; do not inject a battle or its result.

Status must remain `RECREATED`. Passing this static sprite slice does not establish original visual parity or animation coverage.
