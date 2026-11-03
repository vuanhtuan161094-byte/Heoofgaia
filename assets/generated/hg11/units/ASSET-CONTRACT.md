# HG-11 unit sprite records — 2026-11-03

## Elf tier-1 Centaur (`elf_1`)

### Scope

Create one independently authored, static Elf tier-1 Centaur (`elf_1`) illustration for use in real tactical NPC battles. The figure must read as a mounted centaur and a melee guard, with an Elf palette and equipment. Match the project's premium painterly strategy-game finish while keeping the silhouette readable at the current 90×90 battle draw size.

### Deliverables and gates

- Preserve the untouched image-generation master and prompt.
- Export an alpha-cleaned 512×512 runtime PNG with the ground pivot at `[256,446]`, consistent with the existing Orc Imp sprite.
- Keep the sprite outside save data; integrate it into the real battle renderer for `elf_1` stacks. The verified gameplay receipt currently exercises a player stack; enemy-side use is not yet exercised by a natural encounter.
- Record raw, cleaned and runtime SHA-256; pixel dimensions, alpha bounds, generation route, license assessment, static-frame status and source identity.
- Validate alpha and pivot, embed it in the offline HTML, verify `drawImage` in an actual NPC battle, and capture the running offline game in Chrome.
- Do not use the historical commercial sprite as generation input; no extracted artwork is redistributed.

### Evidence limits

Identity and troop role come from the dated 2009 English community unit table (SRC02): Elf tier-1 `Centaur`, melee, HP 38, ATK 16, DEF 12, SPD 4.22, Load 30. The image is a new recreation, not recovered original art. It is one static still; it is not animation or proof of historical visual parity. Actual offline Chrome evidence verifies UI-based formation, dispatch, battle drawing and v07 Save/Reload; see the manifest and receipt.

## Human tier-3 Archer (`human_3`)

See `human-archer-contract.md` for the text-only creation brief and acceptance gate, and `prompts.md#human-archer-sprite-master-prompt` for the exact generation prompt and image-tool source ID. `human-archer-manifest.json` records the source identity, alpha scan, dimensions, pivot, hashes, rights assessment and current QA state.

The new art is independently generated and tagged `RECREATED`; it is not recovered original art or an assertion about the historical sprite's appearance. Focused installed-Chrome `file://` testing passes UI recruitment, training, formation, map dispatch, NPC battle rendering, renderer-only enemy flip and v07 Save/Reload. It remains one static still with zero animation frames.

## Undead tier-1 Skeleton Warrior (`undead_1`)

See `undead-skeleton-contract.md` for the text-only visual contract and `undead-skeleton-manifest.json` for the dated roster identity, provenance and alpha/runtime measurements. The sprite is a static project recreation, not an original client export. Focused installed-Chrome `file://` testing passes UI recruitment, training, formation, map dispatch, NPC battle rendering, renderer-only enemy flip and v07 Save/Reload; see `docs/qa/hg11/undead-skeleton-battle-chrome.json`.
