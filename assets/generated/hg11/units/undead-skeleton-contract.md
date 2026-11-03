# HG-11 sprite contract — Undead tier-1 Skeleton Warrior (`undead_1`)

Date: 2026-11-03
Status: GENERATED, integrated and accepted for the bounded static-sprite slice; see `undead-skeleton-manifest.json` and the focused 16/16 Chrome receipt.

## Purpose and historical identity

Add one project-authored static sprite for the actual Undead tier-1 melee stack. The unit must read as a skeletal infantry defender at the renderer's 90×90 draw box and fit the existing modern painterly look while retaining a distinct Vong Linh faction palette.

- Identity: Undead faction, tier 1, `undead_1`, Skeleton Warrior (melee).
- Evidence: SRC02 2009-12-06 dated community roster; crosswalk `docs/research/HG08-UNIT-VERSION-CROSSWALK.md`. This supports the unit identity/role only, not recovered original visual appearance.
- Runtime: transparent 512×512 RGBA PNG, same baseline pivot `[256,446]` and figure target height 380 px as existing troop art.
- No historical image or third-party art is used as generator input. One static pose only; no animation is implied.

## Text-only generation prompt

Create ONE original standalone game-ready character master for **Anh Hùng Thời Loạn**, an independent reconstruction inspired by the historical Heroes of Gaia 1 / Castle of Heroes / 英雄之城 roster. Unit identity: Undead faction tier-one Skeleton Warrior (`undead_1`), a common melee foot soldier. This is newly imagined project art, not copied from a game, illustration, screenshot or supplied image.

Depict one disciplined skeletal infantry soldier with clear human-like bone anatomy, intact skull, natural jaw, two arms, two legs and readable hands. Give it a practical, weathered round shield and a short single-edged sword. The silhouette should communicate a basic low-tier melee guard, not a lich, ghost, knight hero or boss. Dress it in restrained worn charcoal mail, aged leather straps, a muted violet-gray torn half-cloak and a few bone-and-iron fittings. Keep the face and ribs readable without gore. Use premium painterly realism, controlled texture, strong clean silhouette, warm restrained edge light and cool desaturated ambient fill. Make it polished and attractive beyond 2009 Flash rendering while coherent with a premium medieval fantasy strategy game's Undead army. Do not resemble a named character or recognizable franchise design; avoid oversized weapons, glowing eyes that overwhelm the face, tiny noisy ornament, skull piles or gore.

Pose: exactly one full-body 3/4 view facing screen-right in a balanced idle-ready infantry stance. Hold the sword low and the shield defensively; keep both feet, sword and shield completely within frame. Orthographic character-art camera, no dramatic foreshortening. Square 1254×1254 canvas, figure around 72% of canvas height, generous transparent padding. Put the center between both feet at the exact bottom-center ground pivot.

Output one isolated figure on TRUE transparent alpha. No background, floor, cast shadow outside the feet, scenery, frame, text, watermark, extra character, alternate pose, sprite sheet or logo. Crisp alpha silhouette suitable for direct compositing into the live battle renderer.

## Acceptance

- Preserve untouched master and prompt; record provider/source ID, rights assessment, SHA-256, dimensions, alpha bounds, runtime pivot and static-frame count.
- Inspect anatomy, detached alpha specks, shield/sword/feet completeness and silhouette at 90×90.
- Process through `tools/process-hg11-unit-sprite.ps1`; integrate `undead_1` into the real battle renderer and offline builder.
- Test UI recruitment, engine queue completion, formation, real map dispatch, NPC battle draw, v07 Save/Reload and enemy-side flip separately in installed Chrome `file://`; keep test-fixture disclosure explicit.

Status must remain `RECREATED`. A passing new sprite does not establish original visual parity or overall HG-11 completion.
