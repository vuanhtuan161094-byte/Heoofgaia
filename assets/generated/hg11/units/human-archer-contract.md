# HG-11 sprite contract — Human tier-3 Archer (`human_3`)

Date: 2026-11-03
Status: GENERATED, integrated and accepted for the bounded static-sprite slice; see `human-archer-manifest.json` and the focused 16/16 Chrome receipt.

## Purpose and target

Add one static project-authored archer sprite for actual player/enemy stacks in tactical battles. The asset increases illustrated roster coverage and must be legible at the renderer's 90×90 draw box (about 67 px visible figure height), while matching the existing Orc Imp and Elf Centaur's polished painterly realism. It should look better finished than a 2009 Flash rendering while preserving a restrained medieval strategy-game identity.

- Identity: Human faction, tier 3, `human_3`, Archer (ranged).
- Historical identity evidence: SRC02, Heroes of Gaia Wikidot unit table, revision 19 dated 2009-12-06; `docs/research/HG08-UNIT-VERSION-CROSSWALK.md` records the localized/edition crosswalk. Evidence identifies the roster role; it does not prove original sprite appearance.
- Output: one isolated full-body master PNG with true alpha, runtime export 512×512 RGBA.
- Registration: same bottom-center foot pivot `[256,446]` as the existing static troops; normalized pivot `[0.5,0.87109375]`.
- Runtime target height: 380 px on the 512 canvas; actual battle draw is 90×90 in `painter.js`.
- Integration: embed without touching save data; draw for both player and enemy `human_3` stacks; horizontal flip for enemies remains renderer-owned.
- Scope: one still image, no animation frames, no original HOG1 image input, no background, no extra unit types.

## New-generation prompt (text only)

Create ONE original standalone game-ready character master for **Anh Hùng Thời Loạn**, an independent reconstruction inspired by the historical Heroes of Gaia 1 / Castle of Heroes / 英雄之城 roster. Unit identity: Human faction tier-three Archer (`human_3`), a disciplined ranged foot soldier. This is newly imagined project art, not a recreation of any particular original sprite and not copied from any game, illustration, screenshot or supplied image.

Show one adult human archer in a practical medieval strategy-game uniform: muted deep navy-blue and warm ivory cloth, fine but readable steel scale/brigandine chest protection, leather bracers and boots, a restrained small gold insignia, a full quiver of arrows on the back, and a tall elegant wooden longbow held ready with both hands. Keep the bowstring and bow fully visible and anatomically plausible. Give the face a calm alert expression; keep the human silhouette and ranged role immediately readable. Use realistic human proportions and detailed but controlled materials, premium painterly realism, strong clean silhouette, soft warm rim light and cool ambient fill. The visual quality should feel polished and more beautiful than 2009 Flash art, while remaining coherent with a premium 2.5D medieval fantasy strategy game's unit art. Avoid excessive tiny details that vanish at a 90×90 render size.

Pose and framing: exactly one full-body 3/4 view facing screen-right, standing in a composed idle-ready archer pose, both boots visible and on the same baseline. Center the full character including bow and quiver; keep equipment within the canvas. Orthographic game-character camera, consistent scale, no giant foreshortening. Square 1254×1254 master composition, character around 72% of the square height with generous transparent padding. Put the center between both feet at the exact bottom-center ground pivot.

Output one isolated figure with TRUE transparent alpha. No background, no ground plane, no scenery, no cast shadow outside the feet, no frame, no lettering, no watermark, no alternate pose, no sprite sheet, no extra person, no extra arms/fingers, no glowing magic, no borrowed logos or recognizable franchise costume. Crisp clean alpha edges suitable for compositing into the live battle renderer.

## Deliverables and verification gate

- Preserve the untouched tool-generated master and exact prompt.
- Inspect anatomy, role readability, equipment, detached alpha specks, and leg/bow/string completeness before accepting.
- Export cleaned master and 512×512 runtime file with the existing HG-11 sprite processor; preserve 90×90 readability and pivot.
- Record provider/route, prompt path, master/clean/runtime SHA-256, bytes, dimensions, alpha range/bounds, pivot, static-frame count and rights assessment. Status must be `RECREATED`, never `VERIFIED_ORIGINAL`.
- Add `human_3` to the actual battle renderer; embed it in the reproducible offline HTML.
- Run focused actual-Chrome `file://` battle coverage for a UI-recruited Human Archer, enemy flip/render, battle save/reload and no JavaScript errors; capture a real screenshot and machine receipt.
- Keep v07 save schema unchanged and verify the sprite stays presentation-only.

No original HOG1 artwork or external reference image is authorized as generator input for this asset. This new project art does not establish original visual parity or animation coverage.
