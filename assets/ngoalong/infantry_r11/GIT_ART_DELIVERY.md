# R11 — Source PNGs tracked for the Ngọa Long Art-only branch

These files **are actual source sprites** recovered from the already-produced R11 corrected ZIP held in Library, byte-for-byte unchanged. This is an archive/packaging correction, **not 28 new drawings** and **not 14 playable game integrations**.

- 14 infantry identities, each with a static 128×128 RGBA `sprites/idle/<id>.png` and a distinct static `sprites/attack/<id>.png`.
- Pivot (64,121). Recommended display footprint ~80 px. Preview `preview.html` shows both original poses at scale, and `preview_80px.png` shows IDLE candidates.
- All 14 identities **VISUAL_CANDIDATE**; require owner sign-off to become `APPROVED_ART`. `IN_GAME` requires Chat 08/Integration to wire the canonical combat renderer and authoritative events. **No runtime was changed here**.
- 5 IDs in `manifest.json` remain **QUARANTINED** and are not supplied as sprites. R06 code-vector SVGs remain **REJECTED**. CL/P4.1 legacy atlas remains for regression only.
- Every source file has SHA-256 and Git blob SHA-1 in `manifest.json`. Corrected ZIP checksum and source are included. Artwork is project-original/derived and not copied from VNG source visuals.
- Static QA: `python qa/nl_art_r11.py`; Pillow required only for localized PNG/alpha/pixel QA. Run once for the batch, **not full Chromium per sprite**.
- Other outstanding art: hero sprites, horse/cavalry, archers, strategist, town architecture, and true event-keyed VFX need further original assets and owner review. Do not report them as completed.
