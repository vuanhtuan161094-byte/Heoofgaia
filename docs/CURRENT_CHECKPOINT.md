# Mưu Định Tam Quốc — checkpoint P3 ngày 16/11/2026

- GitHub: `vuanhtuan161094-byte/Heoofgaia`, nhánh canonical **main-ngoalong**, game `index.html` V0.4 P3.
- Baseline P2 HEAD: `50fe6a62bae2a2c8699ca927f96aaccdebea610f`; nhánh Hero HEAD trước khi làm P3: `54e6c2391cd11e7351466b9497141fc57c59a71d`.
- Đã mã hóa: P3 AI chọn mục tiêu, ma trận khắc chế, nâng cấp quân 1–4 tốn tài nguyên thực, 24 đội hình bố trí/tactic, smoothing độ khó ải 13–20.
- **Local QA**: P2 31/31, P2 advanced 12/12, P3 74/74, P3 deterministic balance 360/360 kịch bản thực thi và các điều kiện monotonic/ải 16/ải 24 PASS.
- **GitHub CI exact SHA**: SUCCESS tại mã nguồn P3 commit `3db3976b91de9863491528dc571206c4cdd0d9b4`, run `43825429382`, bao gồm 7+31+12+74 bài QA, 360 trận kịch bản, và artifact Chromium. Link: https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43825429382. Bất kỳ commit tiếp theo cũng cần CI PASS trên SHA mới.
- Windows/Android vật lý, file:// thực tế và owner mỹ thuật: **PENDING**. Chưa đưa game thành online multiplayer.
- QA phải xác nhận game Hero HEAD không đổi và nhánh Ngọa Long không chứa code Hero cũ.

NEXT: GitHub Actions exact-SHA → review artifact screenshot & report → P4 đồ họa hoặc P3.1 UI combat/AI optimization.
