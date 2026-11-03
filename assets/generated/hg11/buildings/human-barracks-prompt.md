# Human Barracks sprite prompts — 2026-11-03

Provider for both versions: ChatGPT `image_gen.imagegen`. The asset is `RECREATED` project art. No original-client or archive image was provided.

## Trial v1 — rejected after visual review

Route: new text-only generation; source image ID `exec-f65c8cde-6293-4f9d-b087-bd870826128d.png`.

Create one premium, game-ready standalone building sprite for the Human faction of the independent strategy game Anh Hùng Thời Loạn. Identity: Human Barracks, a disciplined medieval military training hall. It is one architectural asset identity, not a city illustration and not a collection of buildings. Show the complete structure from a shallow elevated three-quarter strategy-game camera: a broad pale limestone hall with a tall central timber gate, two crenellated side towers, warm red-slate pitched roofs, restrained blue-and-gold heraldic shields without letters, and a small attached stone entry apron. Distinct construction silhouette: broad grounded footprint, taller central gable, lower side wings. Use attractive modern painterly 2.5D rendering, refined limestone, timber and roof materials, controlled warm sun and cool ambient shadows, with readable edges at 180 px display height. Keep visual consistency with a modern premium fantasy strategy city while preserving classic Heroes of Gaia human-faction identity; do not imitate any specific existing game's building asset or screenshot.

Composition: one whole building centered in a square 1024×1024 logical canvas; structure occupies about 70% of canvas height and 72% width, with generous transparent padding. Align the attached front entrance apron to the lower-center registration point around x=512, y=940. True transparent alpha outside the structure. Contact shadow may exist only as a tight, subtle part of the footprint, never as a large background/floor plane.

No people, soldiers, horses, flags with readable text, weapons, detached props, second building, city walls, trees, terrain landscape, sky, scenery, UI, labels, numbers, letters, logo, border, watermark, frame, tile sheet, alternate view or extra pose. Output one crisp isolated building object only.

Rejected: the generated silhouette read too strongly as the main castle/Town Hall. The raw result is retained in `assets/generated/hg11/source/rejected/` and is not used in the game.

## Selected v2 — image-to-image edit of the rejected project trial

Route: image-to-image edit of the prior generated v1 trial (source image ID `exec-f65c8cde-6293-4f9d-b087-bd870826128d.png`) with text instructions. Output ID `exec-c7d6f3f0-b42c-4279-a92b-7def4ecc177b.png`. The provider did not return generation timestamps or an independent license grant. The v1 project copy is retained under `assets/generated/hg11/source/rejected/`; neither generation used original HOG1 art as image input.

Redesign this isolated fantasy strategy-game building so it reads unmistakably as a Human military barracks and training hall, not the main castle or town hall. Preserve the polished painterly 2.5D render quality, pale limestone, warm red-slate roof, dark timber framing, restrained blue-and-gold trim, soft warm key light and cool ambient shadows. Change the silhouette to a broad, low, functional 1.5-storey training complex: one long central hall with a wide pitched roof, a large timber entrance and two short square corner watch-posts with crenellations. Remove the tall central steeple/spire, remove the oversized castle keep silhouette, and do not create a dominant multi-tower fortress. Add one attached shallow covered practice porch along the front with a few neat training targets built into the wall, but no detached props. It must remain one coherent architectural building asset with one shared footprint. Keep the same shallow elevated three-quarter strategy-game camera and center registration. True transparent alpha outside the structure; preserve the square transparent canvas and generous padding.

No people, soldiers, horses, flags, extra buildings, city walls, landscape, trees, ground plane, sky, text, letters, numbers, logo, border, watermark, frame, tile sheet, alternate angle or multiple versions. Output one isolated building sprite only.

The selected version was reviewed for a low broad silhouette and attached practice targets; disconnected edge noise was removed with the repository's System.Drawing sprite processor. It is static architecture, not an animation.
