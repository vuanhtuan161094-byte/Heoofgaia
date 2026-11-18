# R12 — Giáp Bộ replacement / isolated IDLE PNG

Date: 2026-11-19. Branch `feature/nl-v2-art`. This is **one** production-size, single-character, transparent PNG asset candidate. It is **not** a poster, cut-out from a poster, sprite animation, or runtime integration.

| Field | Evidence |
|---|---|
| Wiki Mobile role | `Giáp Bộ`, infantry tier 3: normal attacks and battle tactics strong; vulnerable to stratagems; https://ngoalong.vnggames.com/ngoa-long-wiki/binh-chung |
| Art origin | Original image generation; fantasy/Three Kingdoms visual interpretation only, not VNG pixels. Original high resolution supplied in R12 ZIP; repo has an RGBA 512 master derivative. |
| Game file | `sprites/idle/giap_bo.png`, RGBA 128×128, foot pivot (64,121) |
| Larger editable-ish source | `sources/giap_bo_idle_512.png`, PNG 512×512, not an independently editable rig or layer PSD |
| QA scene | `preview/compare_80px.png` at native 80×80 presentation alongside legacy 14 R11 identities |
| State | `VISUAL_CANDIDATE`; NOT `APPROVED_ART`, NOT `IN_GAME` |
| Status of ATTACK / VFX | Not produced for this identity; event-specific contact pose may be made only if required |

**Visual review concern:** R12 has more human/realistic anatomy and a narrower silhouette than the earlier R11 chibi infantry; owner must choose whether to standardize the roster to one look. No art should be promoted automatically. The 80-pixel comparison can support this decision. Record owner decision before further expansion of this rendering style.

**QA:** run `python qa/nl_art_r12.py` from repo root. Runs one static gate over source, IDLE sprite and preview, verifying exact bytes in manifest plus dimensions, alpha, crop clipping and pivot; no Chromium/Save/CI per sprite.

**Quarantine:** Older R10 `giap_bo` remains QUARANTINED; this is a new isolated replacement, not a relabel of R10 poster/crop. Older `hoang_bo`, `loi_kiem_si`, `phan_quan`, `van_khuc` remain quarantined until replaced with independently generated PNGs.

**Handoff:** Chat 08 may *review* and later integrate after owner art approval and verifying real battle event availability. Do not edit generator, combat, Save or index.html in ART branch.
