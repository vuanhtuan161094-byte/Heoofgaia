# Mưu Định Tam Quốc — checkpoint P3 ngày 16/11/2026

- GitHub: `vuanhtuan161094-byte/Heoofgaia`, nhánh canonical **main-ngoalong**, game `index.html` V0.4 P3.
- Baseline P2 HEAD: `50fe6a62bae2a2c8699ca927f96aaccdebea610f`; nhánh Hero HEAD trước khi làm P3: `54e6c2391cd11e7351466b9497141fc57c59a71d`.
- Đã mã hóa: P3 AI chọn mục tiêu, ma trận khắc chế, nâng cấp quân 1–4 tốn tài nguyên thực, 24 đội hình bố trí/tactic, smoothing độ khó ải 13–20.
- **Local QA**: P2 31/31, P2 advanced 12/12, P3 74/74, P3 deterministic balance 360/360 kịch bản thực thi và các điều kiện monotonic/ải 16/ải 24 PASS.
- **GitHub CI exact SHA**: PENDING cho đến khi workflow mới chạy thành công. Không coi local PASS thay GitHub.
- Windows/Android vật lý, file:// thực tế và owner mỹ thuật: **PENDING**. Chưa đưa game thành online multiplayer.
- QA phải xác nhận game Hero HEAD không đổi và nhánh Ngọa Long không chứa code Hero cũ.

NEXT: GitHub Actions exact-SHA → review artifact screenshot & report → P4 đồ họa hoặc P3.1 UI combat/AI optimization.
