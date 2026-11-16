# CURRENT PRODUCT DIRECTION OVERRIDE — 16/11/2026
- Owner withdrew Ngọa Long-first feature plan and selected **Chiến Loạn Tam Quốc (2025)** as gameplay reference. Keep game brand **Mưu Định Tam Quốc** as an original implementation; original screenshots/assets cannot be copied.
- Product requirements and acceptance are in [CHIEN_LOAN_MASTER_SPEC.md](CHIEN_LOAN_MASTER_SPEC.md) and [CLTQ_REFERENCE_MATRIX.md](CLTQ_REFERENCE_MATRIX.md). Agent Codex authorization remains scoped to `main-ngoalong`; Hero isolation unchanged.
- This file's P2/P3/P4.1 results below are **historical verified baselines only**. They are not evidence that the new 5v5 soldier battle, world marching, city capture, or expanded game is implemented.
- First new implementation milestones: **CL-P0/CL-P1** (original soldiers fighting alongside 5 generals) then **CL-P2** (real march/capture territory).
- Current owner acceptance for new CL gameplay: **PENDING**; retain exact-SHA CI and device/visual gates.

## CL-P0/P1/P2 playable implementation checkpoint — 2026-11-16

- Base read from `main-ngoalong`: `39111d435f0aa6d059240dc36a81fc9be9d46225`. Exact implementation commit SHA is captured by the next GitHub Actions run and its evidence artifact.
- Added the CL compatibility/gap audit, schema-v4 `cltq` save namespace, five independent commander slots, troop-count-linked unit visuals/damage, battle receipts and recovery, a 10-node map, route/food/ETA preview, march, NPC siege/capture, one-time yield, garrison and defense loop.
- Retained the canonical offline `index.html`, legacy save key, v1/v2/v3 migration, original 3×3 slots, combat/replay/reward pipeline, and existing P4/P4.1 art. No changes to Hero, merge or force-push.
- Local Chromium: smoke 7/7; P2 full 31/31; P2 advanced 12/12; P3 74/74; P3 balance contract PASS; P4 source 4/4 + visual 14/14; P4.1 animation 18/18; CL P1/P2 43/43. P4.1 atlas reproducibly rebuilds byte-identically with CI-pinned Pillow 12.3.0.
- CL P1/P2 output includes desktop 1280×720 and mobile 390×844 screenshots, an exact `index.html` SHA-256, and a real-browser gameplay WebM that shows an actual hit event. Physical-device and owner acceptance remain separate gates.
- V0 syntax and `git diff --check`: PASS. V1 focused/legacy regressions: PASS for the listed suites; P4.1 MP4 encoder step is left to Ubuntu Actions. V2 desktop/mobile CL interaction, pause/reload/retreat, siege failure/retry and save: 43/43 PASS. V3 exact-SHA Actions and playable artifact: PENDING push. V4 physical browser devices and V5 owner visual review: PENDING.
- Remaining phase work: P2 interruption/time-skew/failure retry edge cases; P3 territory production/upkeep and long economy loop; P4 roster/deep campaign balance; P5 original isometric/directional art and art review; P6 optional diplomacy/season/siege/endgame. See `CLTQ_GAP_AUDIT.md`.

---

# Mưu Định Tam Quốc — checkpoint P3 ngày 16/11/2026

- GitHub: `vuanhtuan161094-byte/Heoofgaia`, nhánh canonical **main-ngoalong**, game `index.html` V0.4 P3.
- Baseline P2 HEAD: `50fe6a62bae2a2c8699ca927f96aaccdebea610f`; nhánh Hero HEAD trước khi làm P3: `54e6c2391cd11e7351466b9497141fc57c59a71d`.
- Đã mã hóa: P3 AI chọn mục tiêu, ma trận khắc chế, nâng cấp quân 1–4 tốn tài nguyên thực, 24 đội hình bố trí/tactic, smoothing độ khó ải 13–20.
- **Local QA**: P2 31/31, P2 advanced 12/12, P3 74/74, P3 deterministic balance 360/360 kịch bản thực thi và các điều kiện monotonic/ải 16/ải 24 PASS.
- **GitHub CI exact SHA**: SUCCESS tại mã nguồn P3 commit `3db3976b91de9863491528dc571206c4cdd0d9b4`, run `43825429382`, bao gồm 7+31+12+74 bài QA, 360 trận kịch bản, và artifact Chromium. Link: https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43825429382. Bất kỳ commit tiếp theo cũng cần CI PASS trên SHA mới.
- Windows/Android vật lý, file:// thực tế và owner mỹ thuật: **PENDING**. Chưa đưa game thành online multiplayer.
- QA phải xác nhận game Hero HEAD không đổi và nhánh Ngọa Long không chứa code Hero cũ.

NEXT: GitHub Actions exact-SHA → review artifact screenshot & report → P4 đồ họa hoặc P3.1 UI combat/AI optimization.

## P4 artwork integration — 16/11/2026
- Baseline P3 HEAD: `54a05e7ad2c700241fbc751e74cc19e53a9014ab`; branch: main-ngoalong; Hero branch tuyệt đối không ghi.
- Canonical game: index.html V0.5 P4, giữ Save v3 và P3 AI, formation, economy, replay.
- P4 source code SHA256: `53f5c9482d95313ff544a2129bd522de9920be0e019639c2b8098b196fdc3daf`.
- Asset source SHA và WebP derivative: xem docs/P4_ASSET_PROVENANCE.md.
- Local PASS: 7 smoke + 31 P2 + 12 P2 advanced + 74 P3 + 14 P4 visual + 360 balance scenarios.
- CI exact-SHA: PENDING trước khi GitHub Actions trở lại thành công trên commit P4. Tải playable ONLY khi run SUCCESS.
- Known quality debt: portrait sheet mới có 8/24 hero, sprite Idle/Attack chỉ là trạng thái tĩnh được nội suy chứ không phải hoàn chỉnh full frame-by-frame animation; VFX sheet còn bleed vùng ảnh, chưa đẹp như game gốc. Owner visual PENDING; thiết bị thật PENDING.
- P4 QA screenshots là Chromium runtime thật; không phải mockup của image generator.

## P4 embedded-asset exact-source gate
- Từng WebP derivative của City / 8 Portraits / 4 Troops / Skill VFX được commit tại `assets/p4/` và dùng cùng binary trong HTML offline.
- CI chạy `qa/p4_assets.py` để so sánh bốn SHA256. Mỗi lần thay artwork cần tái nhúng HTML và cập nhật asset file; không thay một phía.
- Những PNG master ImageGen đầy đủ nằm trong P4 backup ZIP, chưa nằm trên GitHub; không nhận là đã có lịch sử gốc trong repo.
- CI exact SHA cho commit này: PENDING đến khi Actions hoàn tất.

## P4.1 sprite animation / VFX production — 16/11/2026
- P4 base Git SHA `769cbf9e088f8e5d861253bc8e66abce5c1eae86`, target commit P4.1 theo HEAD mới của `main-ngoalong`.
- 288 exported sprite PNG frames, 4 unit classes × 4 direction × 3 actions × 6 frames, packed 800×5184 WebP. Generator deterministic `tools/build_p41_atlas.py`; source atlas SHA256 `ac77ab05bf120d253b8812dca0821b52d8b427d6a1d5b363519c55eb99f8b79f`.
- P4.1 HTML canonical retains P2/P3 mechanics and Save v3. Source is original project AI-generated pose master plus authored 2D compositing; not rig/independently hand-drawn.
- Local CHECKED: 18/18 P4.1, 7/7 smoke, 31/31 P2 full, 12/12 P2 advanced, 74/74 P3, 14/14 P4, 4/4 P4 asset, 360 P3 balance scenario executions.
- Local Chromium video: `qa/p41-combat-1280x720.mp4`, 52 actual rendered viewport frames at 12fps; visual time deliberately sampled from four real combat events (including a skill), not a full-speed live FPS recording.
- GitHub exact-SHA: CHECK action `NgoaLong P4.1 complete QA` on final commit, don't accept previous SHA; playable artifact only if full PASS. Owner visual + physical Windows/Android still PENDING.
