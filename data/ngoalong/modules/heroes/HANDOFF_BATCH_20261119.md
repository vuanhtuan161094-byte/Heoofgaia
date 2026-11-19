# CHAT 01 — Võ Tướng V2 / Big Batch 2026-11-19

## Context and ownership

- Repo: `vuanhtuan161094-byte/Heoofgaia`
- Specialist branch: `feature/nl-v2-heroes`, based on original source `feature/nl-codex-cloud-v1-finish@a88b8449714ad48531f7c9e7e081ccac43edee92`. Source moved independently later to include Chat 00 ownership policy. **No merge**.
- Owner scope for this batch follows newer `docs/operations/NL_MULTI_CHAT_V2.md`: all newly created files in `data/ngoalong/modules/heroes/` or `qa/modules/heroes/`. The older branch still contains earlier `tools/nl_hero_*`, `qa/nl_hero_*` committed before that policy; **do not make new cross-owner edits**.
- No Codex Cloud. No runtime, alpha content, Save, generator, index.html, CI edits, no artwork.

## What was implemented this batch

### Published data from VNG-hosted guides, 30 September 2026

- `guide_thuc_ngo_20260930_v1.json`: **82 transcribed records**.
  - Thục: 20 Uy Danh + 21 Tháp.
  - Ngô: 20 Uy Danh + 21 Tháp.
  - Each record: attributes Chỉ Huy/Võ/Trí, per-rebirth growth, role name, base skill label, source recruitment requirements (Renown+silver or tower floor+souls), URL/date and row-based evidence.
  - Sources:
    - https://ngoalong.vnggames.com/tin-tuc/huong-dan/cam-nang-thuc-quoc.html
    - https://ngoalong.vnggames.com/tin-tuc/huong-dan/cam-nang-ngo-quoc.html
  - These are **guide-published baseline snapshots**, not authoritative current upgraded hero stats. The general index lists evolved grade while these tables cover onboarding/recruitment. Code keeps editions separate.
- **72/82 guide rows** match a single Wiki index name, collapsing to **67 unique candidate hero IDs** due to five cross-faction guide repeats (Vương Doãn, Vương Dị, Phan Phượng, Trương Tú, Hoa Đà). Repeated numbers and terms were compared field by field.
- **10/82 source rows** deliberately unresolved: Tôn Can, Lưu Bị, Trương Nghị, Tưởng Uyễn, Mã Văn Lộc, Cổ Ung, Tô Mậu, Tiểu Kiểu, Trương Hoành (two candidate index IDs), Tôn Quyền. Several resemble another spelling, but **no automatic alias**.
- `guide_stats_adapter_v1.js`: validates dates, source URLs, all 82 rows, per-row fields, numeric bounds, cross-source consistency, identity ambiguity, and builds 67 read-only candidate objects.
  - `checkRecruitment` checks published renown/tower requirements only. Returns quote/eligibility, **does not pay or grant**.
  - `projectPreviewRebirthStats` is a **SIMULATED_PROJECT_LINEAR_PREVIEW**, not the official game growth algorithm. It does not mutate any authoritative record.

### Versioned official patch facts

- `wiki_skill_overrides_20240903_v1.json`: one exact official VNG bulletin 03/09/2024 https://ngoalong.vnggames.com/su-kien-2022/pbm-muu-dinh-tam-quoc/he-thong-tuong-cam-13958.html.
- **3 direct, source-backed updates** to Quan Vũ's 02/01/2024 Orange skill sheet:
  - Thiên Lý Đơn Kỵ 500% → 300%;
  - Nghĩa Tuyệt 14,500% → 29,000%;
  - Nghĩa Tuyệt counter scaling 400% → 1,000%.
- **19 additional historical balance change facts** recorded but not automatically bound to unrelated skill snapshots (Mã Vân Lộc, Chu Thái, Bàng Đức, Thái Sử Từ, Điển Vi, Tôn Thượng Hương, Hạ Hầu Đôn, Hạ Hầu Uyên, Công Tôn Tu, Triệu Vân, Đại Kiều).
- `balance_release_overlay_v1.js` validates original exact skill ID and old values, and produces an **immutable historical adjusted copy**, not overwriting old sources or claiming current 2026 values.

### Consolidated handoff (one bulk interface)

- `heroes_readonly_bundle_v2.js` exposes `assembleHeroes()` and `getHeroForIntegration(bundle,heroId)`.
- Unified 364 records with `historicalGuide`, `datedSkillVersions`, explicit current nulls and evidence status. It joins the original 55 versioned stage skills with 67 guide stat candidates; leaves 14 legacy runtime generals independent.
- Coverage reconciliation: **18** heroes have *both* guide baseline stats and a sourced dated stage-skill descriptor; **49** guide-stats-only; **26** skill-version-only; **271** neither. Union **93/364** touched by one or more non-index detailed fact sources. Do **not** call this 93 playable or ready.
- Hero Wiki `DESIGN_READY` and `PLAYABLE` remain **0/364** because current stage/role, full skill mechanism, skill version resolution, actor mapping and real combat QA are not verified.
- Older `skills_handoff_v1.json` retains older stage snapshots. For Quan Vũ Orange, use historical patch resolver if analyzing a 2024+ bulletin; **do not pretend the bulletin resolves whether a newer server patch changed it again**.

## Focused QA

- Prior Chat01 tests: `qa/nl_hero_catalogue.test.cjs` 27 checks + `qa/nl_hero_development.test.cjs` 12 checks, previously PASS.
- New: `qa/modules/heroes/guide_stats_adapter.test.cjs` **18/18 PASS**.
- New: `qa/modules/heroes/heroes_readonly_bundle.test.cjs` **13/13 PASS**.
- New checks include unique ID count, 82/82 source fact validation, 5 duplicated tower rows matching, 10 unresolved identity cases, recruitment without transaction, simulated rebirth math explicitly flagged, immutable dated skill correction, and no cross-team changes.
- These tests were executed against retrieved GitHub JS source in a V8 isolate with a mapped read-only filesystem. Native Node, GitHub Actions, Chromium, Save/replay and Playable QA remain PENDING. Do **not** state these tests constitute CI acceptance.

## Next data dependencies

1. Continue source extraction for Ngụy/Quần/current Wiki detailed hero pages and any genuinely published variant/evolution mappings. Use per-field provenance and dated versions, especially source corrections superseding earlier skill parameters.
2. Resolve 10 uncertain guide-name identities using evidence, not speculative aliases. Avoid cross-edition conflation.
3. Provide Chat05/08 the **18 overlapping candidates** (baseline guide stats + dated stage skills), but Chat05 must author/verify skill resolvers and Chat08 must approve original SIMULATED gameplay balance, integrate through canonical generator and Save, then full QA. None are imported or playable here.

## Risk and compliance

No external VNG asset, sprite, poster, sound, text copy or original game code imported. Data consists of factual numeric metadata and original normalization/descriptors. Gameplay stat growth calculations are explicitly SIMULATED; no secret official formulas claimed. Everything in this batch stays **REFERENCE_ONLY** until Chat08 integration.
