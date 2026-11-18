> **STATUS CORRECTION (18/11/2026) — R10 IS NOT A PRODUCTION-READY 8/8 PACK.** Prior statements that all eight tier-3 units were ready for game use are withdrawn. Two (`giap_bo`, `hoang_bo`) have serious cropping/scale defects; three (`loi_kiem_si`, `phan_quan`, `van_khuc`) relied on poster-cropped single sources with faked/composited motion. They are **QUARANTINED**. Only `ban_ho_ve`, `ho_luc_si`, `lang_tu_si` remain source candidates; none has owner visual approval or runtime integration. Replacement R11 idle-first art: `assets/ngoalong/infantry_r11/HANDOFF.md`. Do not consume the old R10 160-frame claim as genuine independent animation or approved sprites.

# ART R10 — Bộ Binh cấp 3 (18/11/2026)

**Source branch:** `codex/nl-wiki-01-r02-20261117`; original handoff inspection HEAD `36e6a91dc3f9f812671c1b1bfbf810e2a6f84565`. No gameplay, Save, Hero, combat formula, generator or release workflow modified; do not merge.

## Delivered to ChatGPT Library, not yet in Git repository runtime

- Archive: `/MuuDinhTamQuoc/Art/Infantry/NL_INFANTRY_R10_LEVEL3_8.zip` (**31,779,971 bytes**, SHA-256 `de168ce4cc8f8041fbe79634390577d43149886d38ef0c168ba1855084b6e531`).
- Animation preview GIF: `/MuuDinhTamQuoc/Art/Infantry/NL_INFANTRY_R10_LEVEL3_8_PREVIEW.gif`.
- 8-unit visual overview: `/MuuDinhTamQuoc/Art/Infantry/NL_INFANTRY_R10_8_OVERVIEW.jpg`.
- Zip includes 8 transparent 640×800 sprite-sheet PNGs, each 5 action rows (Idle, Attack, Skill, Hit, Death) × 4 individual physical 160×160 raster frame cells, **160 stored raster frames** in total, 160 separate frame PNGs, generated source sheets, `manifest.json`, `README.md`, and standalone `preview.html`. No skeletal rig or Walk/Run.

## Exact eight names and roles from official Wiki Mobile

Source: https://ngoalong.vnggames.com/ngoa-long-wiki/binh-chung (section `Cấp 3`; checked 18 Nov 2026). **VERIFIED**: names, tier and displayed ability descriptions. Classic webgame equivalence is UNKNOWN. Project-original visual design is **DERIVED**, animation composites are **SIMULATED**.

1. Bàn Hộ Vệ — extreme defense, +50 own morale on attack → fortress shield
2. Giáp Bộ — strong normal/strategy attack, weak to magic → armoured warhammer
3. Hoàng Bộ — versatile, crit/counterattack → gold sword
4. Hổ Lực Sĩ — powerful, normal attack and counterattack → tiger-pelt mace
5. Lang Tử Sĩ — double attack, crit/counterattack → rapid bladed polearm
6. Lôi Kiếm Sĩ — strong attack, crit → electric blade
7. Phán Quan — tactic attack, 5% enemy morale-loss → purple imperial decree
8. Văn Khúc — tactic defense, 40% ally-protection chance → white fan and blue robe

## Quality honesty and minimum QA

- Five classes (`ban_ho_ve,giap_bo,hoang_bo,ho_luc_si,lang_tu_si`) derive from transparent multi-pose original project art: **94 source cel crops** (40+20+20+4+30), stored as 100 animation PNG frames by sampling and sometimes interpolating/transforming source artwork.
- Three classes (`loi_kiem_si,phan_quan,van_khuc`) are visually recognizable but **PROVISIONAL**: each begins with **one** project-generated presentation-concept character crop and transparent-background segmentation; four frames per action are raster compositing/transforms with simple original effect accents, NOT independently illustrated moving poses. Do not treat the three as final or incorrectly claim 160 independent hand-painted frames.
- This batch passes only one asset-level check: 8/8 atlases, 160 separate PNG frames, dimensions 640×800, alpha minimum 0, SHA-256/ZIP CRC. Character identity compared at 80px. Full browser QA and in-game Chromium/Android inspection **PENDING**.
- All artwork is newly generated for the project; no image, icon, sound or source from VNG imported. Source provenance and limitations included in ZIP manifest.
- **Do NOT claim runtime integration** or make changes to `index.html` in this Art chat. Chat 07 should transfer the approved PNGs from Library and hook only to real battle actions, with no game-state, formula or Save mutations.

## Next

1. Art replace three provisional concept-cropped characters with independently authored true PNG pose sheets when convenient; the five multi-pose classes are available now for game-scale visual review.
2. After owner accepts visuals, chat 07 can transfer the zip contents and bind assets to authoritative battle events.
3. Continue to tier 4 only after decision whether to complete this provisional batch or keep the three marked PENDING, without additional repeated gameplay QA.
