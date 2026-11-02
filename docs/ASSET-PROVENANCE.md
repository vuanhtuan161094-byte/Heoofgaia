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
