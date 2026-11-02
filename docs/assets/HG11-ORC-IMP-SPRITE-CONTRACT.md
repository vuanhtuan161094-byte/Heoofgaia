# HG-11 troop sprite asset contract — Orc Imp

## Asset identity and use

- **Asset ID:** `HOG1-HG11-ORC-IMP-MASTER-v1`
- **Game identity:** Heroes of Gaia 1 (Heroes of Gaia / Castle of Heroes / 英雄之城), Orc faction, tier 1. The 2009 English catalog names this unit Imp; other pages localize or rename it. See `docs/research/HG08-UNIT-VERSION-CROSSWALK.md`.
- **Target:** one standalone battle character illustration replacing the geometric fallback for `orc_1` only. This is an idle/readability master, not an animation sheet.
- **Visual target:** premium modern fantasy game art, richly rendered materials and clear silhouette at small on-screen scale; retain HOG1's muscular, rough Orc faction character without copying a historical sprite or importing another game's visual identity.
- **Logical canvas:** square transparent PNG, full character visible, front three-quarter view facing toward the opponent on screen, centered horizontally with feet on the lower pivot. No ground plane, background, typography, frame, UI, contact sheet or companion creature.
- **Runtime scale:** a 90 px logical sprite canvas produces an approximately 67 px visible character at the 1176×550 battle view; its foot pivot stays inside one tactical cell. Stack count remains in the UI badge and does not enlarge a single soldier without limit.
- **Provenance/license:** generate from text using ChatGPT ImageGen, with no historical image supplied as input. Mark `RECREATED`, never original. Preserve the generated master; include prompt and SHA-256 in the manifest.

## Acceptance gates

1. Alpha channel is real and the background is transparent; no painted checkerboard or halo.
2. One complete, anatomically coherent Imp with both feet and all held gear inside the canvas; no text or unrelated objects.
3. Face, weapon and armor read clearly at the observed 67 px height, with a bottom-center pivot.
4. Battle integration keeps team selection rings, HP bar, name and troop count visible; other units and NPC art remain unchanged.
5. **Accepted 2026-11-03:** installed Chrome loaded and drew the sprite in a naturally generated Orc NPC battle; Node 137/137, integrated Chrome 91/91, actual `file://` Chrome 29/29 and focused battle/profile Chrome 8/8 passed. Screenshot and SHA-256 are in the asset manifest; runtime alpha scan passed.
6. Until additional masters and real animation frames pass the same gates, this remains a one-unit recreated still. No animation or full troop-art parity claim.
