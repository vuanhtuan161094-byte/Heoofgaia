# Asset provenance and research inventory

The owner authorizes use of their **own** available materials and seeks maximum Heroes of Gaia fidelity. Rights in third-party material remain held by their holders unless verified otherwise. Public web accessibility ≠ redistribution permission. Research and historical comparisons can record URLs and fingerprints without embedding original executable/asset files into a release.

Record EACH candidate item using:

| ID | Original game version/date | Filename/type | Source URL | Owner/author | License/permission | SHA-256 | Used as reference? | Distributable? | Decision |
|---|---|---|---|---|---|---|---|---|---|

Research sources to inspect: original-era MobyGames screenshots, GameGami historical galleries, Sina/17173 Chinese guides, Kongregate guide, Wikidot/Fandom, archived official Snail Games pages, YouTube captures, Wayback copies, appropriately licensed open asset libraries.

Permitted asset workflow: find historical visual → determine version → validate provenance/rights → use it if authorized, or produce a new high-fidelity equivalent → capture actual engine screenshot → compare with reference → optimize PNG/WebP and test memory on 8 GB Windows.

Do not bypass logins/paywalls/DRM or falsely claim extracted original SWF/client/server. Do not mistake a modern unrelated game with a similar title as source evidence.

## Current package audit (2026-11-02)

- The repository `assets/` folder contains no files in the HG-08 working tree. The interface/map/city visuals are drawn by project-owned HTML/CSS/canvas code; this is not recovered Heroes of Gaia artwork.
- Captures in `docs/evidence/hg08/` are screenshots produced by this standalone build and Playwright running the installed Chrome binary.
- Original-era galleries and screenshots are linked in the research/evidence files for reference only. No original SWF, sprite sheet, texture or third-party screenshot is bundled in the offline HTML.
- No distributable original commercial art has been found or licensed. HG-11 needs new, project-created high-fidelity art or separately documented permission before including source artwork.

## HG-11 generated city background contract (2026-11-02)

- Before generation, contract `docs/art/HG11_HUMAN_CITY_BACKGROUND_CONTRACT.md` defines one opaque environment background for the existing 1176×560 Human city canvas. The in-game building identities/hotspots remain `CITY_SITES` from `painter.js`; no structure or UI is baked into the background.
- Historical 2009 images/review are reference-only and are not generator inputs. The planned provider route is the ChatGPT image-generation tool. Generated artwork must be recorded as **RECREATED**, never original/verified art. Cost is unknown unless the tool reports it.
- Asset state at this record: **PENDING**. Do not describe image creation, export, QC, or game integration as passed until each acceptance gate is measured and recorded in the asset manifest.
## Public repository and asset-source search (2026-11-02)

- Queried the connected GitHub repository and code indexes for Heroes of Gaia, heroesofgaia, Castle of Heroes and the Chinese title. No relevant, clearly authorized original game client, source-code repository, or redistributable asset package was identified in the returned results.
- The indexed results included claims advertising a Heroes of Gaia database leak. That is not a lawful asset or gameplay-data source; it was excluded without opening a download link or retrieving records.
- Fandom search results link to the wiki’s CC BY-SA community-content notice, but this does not establish rights for game screenshots, SWF files, sprites, animations or assets embedded in individual pages. No Fandom image has been bundled or used as a game asset.
- This is a date-stamped search snapshot, not proof that no private, unindexed, archived, or subsequently published lawful source exists. Continue seeking owner-authorized materials and archived official references; record per-item provenance and license before release use.

- Owner-directed HG-11 update: the target is a game more polished than the 2009 renderer while preserving HOG architecture/composition. See `docs/art/HG11_HUMAN_CITY_BACKGROUND_CONTRACT.md` v3 for four faction scenes, exact canvas size, live hit-zone requirements and offline embedding gates. The two empty-landscape outputs from the earlier prompt are non-release candidates.

## HG-11 four-faction city art integration (2026-11-02)

- Four independent modern fantasy city illustrations were generated from text prompts with ChatGPT image generation. No original game asset or historical screenshot was supplied as image input. They are **RECREATED**, not original/extracted HOG assets; the reference links remain research-only. The owner selected modern polish beyond 2009-era rendering limits while retaining the castle-on-landscape composition and faction motifs.
- Exact generation prompts and route notes: `assets/generated/hg11/prompts.md`. Full source masters: `assets/generated/hg11/source/`. Runtime derivatives: `assets/generated/hg11/cities/`. Per-file dimensions, byte counts, SHA-256, prompt IDs, format, rights state and QA flags: `assets/generated/hg11/asset-manifest.json`.
- Source masters are 1816–1817×866 PNG; runtime images are opaque RGB PNG at 1176×560. The offline builder embeds all four images. Each image is a flattened scene background with live game-code labels/hotspots; it does not provide independent building sprites, animation, or original-client layout fidelity.
- Real installed-Chrome file:// acceptance, with the real game event handlers: **48/48 PASS** across Human/Elf/Orc/Undead. It verified faction selection, scene rendering, all 12 per-faction building hotspots, a real construction queue and full-page v07 save/reload. Actual captures: `docs/evidence/hg11/intro-chrome.png` and `docs/evidence/hg11/city-{human,elf,orc,undead}-chrome.png`; receipt: `docs/qa/hg11/chrome-visual-smoke.json`.
- Generation timestamp and image-generation cost were not returned by the provider; both remain unknown. Asset rights status is based on independent generation from text; it does not grant any rights to Heroes of Gaia's original art.

## HG-10 100×100 world and visitable-building markers (2026-11-03)

- The outdoor map and its ten building markers are drawn procedurally by project-owned code in `painter.js`; no SWF, sprite, external texture, screenshot or third-party image was bundled or used as the runtime asset.
- Building types and coordinates are based on SRC41/SRC43 documentary research. The simplified markers are original code-drawn prototypes for interaction and evidence; they are not historically accurate recovered art and do not meet the final HG-11 visual-fidelity gate.
- Screenshot `docs/evidence/hg10/world-buildings-chrome.png` is a direct capture of the running offline build in installed Chrome, not an art source. Original 17173/Sina references remain research-only because redistribution rights were not established.

## HG-11 first troop illustration — Orc Imp (2026-11-03)

- One Orc tier-one Imp sprite was generated from text using ChatGPT image generation. No original HOG screenshot, SWF, extracted texture, or third-party art was supplied as generation input. It is a static **RECREATED** illustration, not an original client asset and not an animated sprite.
- The raw master, prompt, source/runtime checksums, true-alpha scan, crop/scale method, pivot, battle screenshot hash and rights assessment are recorded in `assets/generated/hg11/units/asset-manifest.json`; the visual/engine contract is `docs/assets/HG11-ORC-IMP-SPRITE-CONTRACT.md`.
- The 512×512 transparent derivative is embedded in the standalone HTML and replaces geometric battle art for `orc_1` only. All other troop identities still use the existing prototype art. Actual Chrome screenshot: `docs/evidence/hg09/china-2009-orc-harden-bones-combat-chrome.png`.
- Provider timestamp/cost were not reported. Distribution is limited to this independent reconstruction project; inclusion does not imply any permission over Heroes of Gaia names, designs, or original assets.

## HG-11 Human Archer static sprite (2026-11-03)

- One independently generated Human tier-3 Archer (`human_3`) master was created from text only. Source image ID: `exec-4921f926-9d2d-4552-9593-4950dc027f89.png`; no original screenshot or third-party art was supplied to the generator. Status is **RECREATED**, never verified original.
- Master (1254×1254) SHA-256: `3F16AB3C5716EE189A23BC8DD72C3603A725FBDC674A9446563A598AF463A9F1`; cleaned master SHA-256: `8FE4E66400E3967E0B11D623425FF2EC107F4A7B70695F01BD933A746C9CC073`; runtime (512×512) SHA-256: `A362600405812EE5529A29A7468F279389BBF8B2985E2DA1F8A36DAE1E8499C0`. Alpha ranges, visible bounds, 205×380 figure dimensions and `[256,446]` pivot: `assets/generated/hg11/units/human-archer-manifest.json`.
- The offline standalone build embeds the runtime sprite. Actual offline Chrome proof covers live UI recruitment, resource spending, queue completion through the actual engine tick, Army formation, real world-map NPC selection, March, battle rendering and v07 Save/Reload: **16/16 PASS**, zero JavaScript exceptions. The actual game screenshot is `docs/evidence/hg11/human-archer-npc-battle-chrome.png` (1440×1305; SHA-256 `754331DC407C6FC99053FBFBEE5BA657298289BFB68A1F87D935D17358E48D1F`); receipt is `docs/qa/hg11/human-archer-battle-chrome.json`.
- The final combined-build regression recaptured the Human battle after adding the Undead sprite, preserving the original milestone screenshot. Combined screenshot: `docs/evidence/hg11/human-archer-combined-build-battle-chrome.png` (1440×1305; SHA-256 `4D6BE7B0214608663CDB3C57D004DDB580DC11188FCB907D4BFF89C5518F713C`); updated receipt and manifest point to this capture.
- Enemy-side horizontal flip passes a separate cloned-snapshot renderer check; it is not counted as gameplay. The sprite is one static frame with no animation. Output ownership/licensing terms have not been independently adjudicated; no commercial redistribution permission is asserted.

## HG-11 Undead Skeleton Warrior static sprite (2026-11-03)

- One independently generated Undead tier-1 Skeleton Warrior (`undead_1`) was generated from text only. The identity is listed in SRC02's dated English community table and cross-referenced with the Chinese `骷髅兵` in SRC32. Source image ID: `exec-17c4d420-dfea-4258-8b3c-5f9ef7252534.png`; no original screenshot or third-party image was used as input. Asset status: **RECREATED**.
- Master (1254×1254) SHA-256: `CF22F872ABF2ABC8A76C3390195073E76CC56CA13DB58CCCE475BED593E6B9F0`; cleaned master SHA-256: `505D56F0F06DD046FF68590919779CD957CCD9AA815E89A2A1B4B88121313E21`; runtime (512×512) SHA-256: `02562FE141A51D9D643786646EE94B322557186B339C26625E7F1B5662C529C0`. Alpha bounds, crop/scale and `[256,446]` pivot are in `assets/generated/hg11/units/undead-skeleton-manifest.json`.
- Real offline Chrome gameplay acceptance: **16/16 PASS**, zero JavaScript errors. Actual screenshot: `docs/evidence/hg11/undead-skeleton-npc-battle-chrome.png`, **1440×1305**, SHA-256 `7CA330DE35FE6F36397EB418D35E7112C270AB147DD790D700E1BE563DA6ADC4`; receipt: `docs/qa/hg11/undead-skeleton-battle-chrome.json`.
- The UI recruits Skeleton Warriors, spends resources, completes the engine queue, saves a formation, selects a nearby NPC by map click, dispatches and draws the sprite in the natural battle; v07 Save/Reload preserves state. Enemy flip is a separate cloned-snapshot renderer check. The image is one static still with no animation. Commercial redistribution terms have not been independently adjudicated.
