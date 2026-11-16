# QA P2 — local baseline / not CI

Ngày 16/11/2026: chạy lại các bộ thử cục bộ trước khi đẩy GitHub. Cả hai trả exit code 0:
- test_p2.py: 31/31 PASS.
- test_p2_advanced.py: 12/12 PASS.
- Tổng 43/43 trên Chromium Playwright, localStorage shim.
- Các nhóm: start game, chiến pháp, sĩ khí, combat, battle reward, save schema, replay snapshot, target tuyến trước/sau, khắc chế, 3 hướng phòng thủ, Chu Du thiêu đốt, mobile viewport.

Đây là kết quả LOCAL và sử dụng môi trường giả lập save; không thay cho GitHub Actions exact-SHA. Trong branch, qa/smoke.py là gate hiện có để chạy trên GitHub; không mô tả nó là toàn bộ 43 bài thử.

Rủi ro: file:// Chromium tại môi trường phát triển đã bị policy chặn; Android thật chưa xác nhận; độ bền save nhiều trận dài và cân bằng 24 ải/20 tầng chưa nghiệm thu.
