# R11 — Corrected stationary/idle infantry source pack

**User directive:** stop posters and heavy 5×4 animation quotas. Production contract: `assets/ngoalong/ART_IDLE_RULES_CURRENT.md`. This handoff is art-only and intentionally makes no gameplay or Save changes.

**Delivered 18/11/2026:** 14 distinct infantry identities × (IDLE source PNG + ATTACK source PNG) = **28 separate 128×128 transparent RGBA images**, bottom pivot (64,121); contact sheet and local static `preview.html`. The two images are project art stills, **not** a 20-frame animation. The game renderer can use the idle still as its default frame and the second image only when a genuine attack event occurs. Hit can use brief tint/recoil, Death may fade/despawn. Skill VFX only on authoritative event.

**Files physically saved to ChatGPT Library (binary not in GitHub):**
- `/MuuDinhTamQuoc/Art/Infantry/NL_IDLE_ART_R11_CORRECTED.zip`; **909,250 bytes**; SHA-256 `477f6ff48a6a3a846076d4b1d750b8f121f772f8cf34b3862bf560a1bf9a000a`.
- `/MuuDinhTamQuoc/Art/Infantry/NL_IDLE_ART_R11_IDENTITIES.png` (preview of 14 identities).
- ZIP includes `manifest.json`, `README.md`, 28 PNGs and `preview.html`.

**14 `VISUAL_CANDIDATE` identifiers:** `bo, thuan_binh, trung_bo, dao_binh, dang_giap, ho_viet_trao, kim_bo, thach_giap, thuy_bo, tu_than_bo, ung_kiem, ban_ho_ve, ho_luc_si, lang_tu_si`.

**5 `QUARANTINED`:** `giap_bo, hoang_bo` (cropped/proportions broken), `loi_kiem_si, phan_quan, van_khuc` (poster-source crop, unreliable independent attack art). Previous ZIP/atlas claims for these five are historical, not production acceptance.

**Wiki provenance:** https://ngoalong.vnggames.com/ngoa-long-wiki/binh-chung (Mobile; names/roles VERIFIED only), original visual design DERIVED from project-generated images. Classic webgame visual parity UNKNOWN. VNG art/audio/code not imported.

**Minimal check:** 28/28 PNG files 128×128 RGBA and alpha nonempty, ZIP CRC PASS; montage visually reviewed once; no repetitive Chromium/full regression and no owner acceptance claimed.

**Integration:** Chat 07 must first get binary assets from user's Library and hook them into real events only after owner appearance approval. Art Chat did not edit `index.html`, generator, Hero, Save or combat equations. GitHub handoff docs do not themselves put images in the game; do not mark IN_GAME.
