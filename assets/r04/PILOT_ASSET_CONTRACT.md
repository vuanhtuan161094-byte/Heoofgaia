# R04 visual pilot — asset contract

- Asset pack: `r04-original-visual-pilot-v1`.
- Purpose: two original static character masters integrated into real NL campaign battles as enemy mechanic callout portraits (stage 25 and stage 26). This is a playable visual pilot, not a finished roster or animation set.
- Character A: fictional unnamed border scout; young adult male; charcoal lamellar armor, restrained jade accents, short generic spear; front three-quarter facing right.
- Character B: fictional unnamed field tactician; adult female; charcoal armor, burnt-orange sash, small jade command token, short command baton; front three-quarter facing left.
- Neither character depicts a VNG or historical character. Names are temporary role labels.
- Master source: generated RGBA PNGs preserved unmodified as `*-raw-master.png`; reproducible registration to 512×640 RGBA transparent PNG with 56×70 CSS display target and bottom-center pivot. Registration trims fully transparent margins only, scales with Lanczos and composites without changing source alpha.
- Visual direction: original Dark Fantasy Sharp-Eyed Chibi, about 3.2 heads tall, painterly material breakup, bright eyes, readable silhouette at small scale.
- Exclusions: no text/UI/frame/logo, copied character, historic insignia/costume, VNG assets or hidden formulas.
- Runtime use: stage 25 bulwark and stage 26 ember battle callouts only. Portraits do not change battle power, unit identity, damage, target, event timing or Save state.
- Provenance route: OpenAI image_gen original generation/editing. Prompts are recorded in `generation_prompts.md`; status `RECREATED`. No source asset from an external game was used.
- Acceptance gates: raw/master hashes, dimensions, alpha bounds and occupancy in JSON; reproducible offline HTML embedding; exact asset rendered at desktop 1280×720 and mobile 390×844 with screenshots. Owner art approval is separate and remains pending. Animation frames/directions/VFX are not delivered by this static pilot.
