# NL Art R11 — Style lock (owner selection, 19/11/2026)

Owner has selected the **14 R11 chibi infantry sprites** as the **reference for the visual style of every future troop**. This is a style decision, **not** individual sprite approval or game integration. Preserve the 28 tracked R11 original PNG bytes.

## Production contract

- One **single isolated** original full-body IDLE per identity on true transparent RGBA (128×128, foot pivot 64,121); start with 80px readability.
- Large head, short body/legs, dark clean silhouette, textured cel shading, weapon & armor role fidelity. Use the 14 R11 files directly as style targets; do not imitate promotional visual sheets.
- CONTACT may be added as its own original illustration after the IDLE silhouette is accepted. No Walk/Run quota, no rig, no fabricated independent frames.
- Use 80px review in a *separate QA-only preview*; poster/collage is never production sprite source.
- `VISUAL_CANDIDATE` is not `APPROVED_ART` or `IN_GAME`. Only the integration team connects actual battle events. Do not modify the generator, index.html, combat or Save.

## Style review result

- **R11: 14 reference identities, 28 separate original IDLE/ATTACK PNGs remain unchanged.**
- **R12 Giáp Bộ: QUARANTINED** for adult-body vs R11 scale; technically valid RGBA is not visual acceptance.
- **R13 Phán Quan: QUARANTINED** for adult-body vs R11 scale.
- **R13 Hoàng Bộ: VISUAL_CANDIDATE** awaiting exact comparison at native size.
- **Lôi Kiếm Sĩ / Văn Khúc: QUARANTINED** — no accepted original isolated source; image generation produced poster sheets repeatedly. Never crop those sheets and claim game sprites.

Next artwork requirement: redraw the missing characters from the R11 style anchor **individually**, in IDLE first; reject anything off model before asset commit. Additional visual QA sheet `r11_reference_vs_wrong_scale_80px.png` is for review only, not an atlas/game file.

## Verification

`python qa/nl_art_chibi_lock.py` checks the 14 R11 source IDs, both PNG pose hashes, alpha, dimensions and baseline. It does **not** make subjective visual judgement; all new units still need an explicit 80px approval by the owner. Full Chromium/CI runs belong to the integration milestone, not each art batch.
