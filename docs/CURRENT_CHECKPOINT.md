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
