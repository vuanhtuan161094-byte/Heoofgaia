# Tiến độ Dacky Mobile

Cập nhật: 2026-11-24 · Nhánh: feature/dacky-mobile-complete-20261124

## Checkpoint

- HEAD đầu lô NPC: 0492d85675ca66c974cb367619afaa0ec86edbf0 (đã có trên origin/feature/dacky-mobile-complete-20261124). Các checkpoint gameplay trước gồm 319480ff27224f26c6d6283bbc7fd738dd3b520f, bc8b3bc6e6fe91e2f15e2e73114f438ce26f6fe3, 0fb5cf62a64af15703e96c95d2444e6f7331216e, 86dce96e1247f4e927b9037d85febd8defc848e0; lô thành phụ tại ffcfac99b6362b9496bb5615a4904492adf0299f; lô chia/gating 8 chương tại 0492d85675ca66c974cb367619afaa0ec86edbf0.
- Codebase web độc lập, offline-first: thành trì, sáu tài nguyên, 21 công trình tới cấp 30, sản xuất theo giờ, queue xây/nghiên cứu/huấn luyện/hành quân, 39 binh chủng mô phỏng, đủ 540 thần tiên mô phỏng, túi đồ/rèn, khoa kỹ, 1.158 nhiệm vụ, 120 địa điểm chiến dịch có Boss Trụ Vương và 624 Tiên Sơn thử thách riêng, chiến báo, Phong Thần Tháp và 5 cửa Bất Chu.
- Chiến dịch mô phỏng có 8 chương, 1.158 mục tiêu, mở Boss Trụ Vương sau 20 thắng/7 thành; thắng đầu lưu cờ kết cục, thưởng duy nhất và cho phép tiếp tục endgame.
- Gameplay loop đã nối: nâng công trình → huấn luyện/chiêu mộ/trang bị → hành quân nhiều stack → combat/tổn thất/loot → nâng cấp/nhiệm vụ → save/reload. Capture thành phụ, sản lượng bổ sung, minh hội NPC và minh ước NPC có runtime. Mô hình gameplay là độc lập `SIMULATED`, chưa đối chiếu client Mobile.
- Giao diện responsive tiếng Việt, bản đồ tương tác, vector art SVG tự tạo, IndexedDB + localStorage dự phòng, import/export save, PWA/service worker, build Web static, một file offline và database JSON chuẩn hóa có thể tái sinh từ cùng catalog (4.676 record mô phỏng).
- Lô hiện tại nối 540 vật phẩm tiêu hao vào cửa hàng NPC, giới hạn túi 500, hiệu ứng mua/dùng và lưu số lượt mua; XP tự lên nhiều cấp và tăng kỹ năng; bốn pháp môn có hiệu lực trong combat/PvE; ba chính sách thuế điều chỉnh đồng, dân tâm và tăng dân số.
- Khoa kỹ 19 nhánh/570 cấp nay tác động vào kinh tế, xây dựng, huấn luyện, quân chuyên môn, combat, hồi phục, hành quân, thần tiên, trinh sát và giao thương/ngoại giao.
- Chỉ dẫn tân thủ 7 mốc tự kiểm tra tiến trình xây/nghiên cứu/chiêu mộ/trang bị/huấn luyện/chiến đấu; các nút hướng dẫn thực thi gameplay thật và chỉ tiến bước khi đạt điều kiện.
- Thành phụ đã có giao diện quản lý, nâng cấp qua hàng xây dựng, mở theo cấp Tử Vi và tăng năm loại sản lượng theo cấp.
- 120 điểm thế giới được tái phân bổ theo tám chương, đủ 75 thành/30 dã địa/14 Tiên Sơn/1 Boss; thắng dã địa hoặc Tiên Sơn mới mở chương kế tiếp; march/scout/ngoại giao bị khóa theo tiến độ. Lô NPC thêm chủ soái, 3–5 stack quân, năm chiến thuật có hiệu lực, do thám mở thông tin và chiến báo ghi quân địch/tổn thất.

## Kiểm chứng thực tế

- `node tests/engine.test.js`: PASS 20/20, thêm kiểm tra 120 đội hình NPC, thông tin do thám lưu và dữ liệu chủ soái/chiến thuật/tổn thất trong chiến báo.
- `npm run build`: PASS; build Web, `dist/offline.html` và `dist/data/dacky-game-data.simulated.v1.json`; kiểm tra JSON xác nhận 4.676 record SIMULATED trên 8 bảng.
- Chromium integration: PASS onboarding, 21 công trình, 11 màn hình, thuế, danh mục/purchase, xây dựng, chiêu mộ/trang bị, huấn luyện, hành quân nhiều stack, loot/chiến báo, thành phụ, save/reload, 390×844 và 844×390; 0 lỗi console/runtime. Smoke riêng xác nhận thông tin NPC bị ẩn trước trinh sát và hiện chủ soái/đấu pháp/đạo quân sau trinh sát. Ảnh ở `qa/screenshots/`.
- PWA: PASS mở lại entrypoint khi tắt mạng và shell đã được cache.
- Hạn chế môi trường: Chromium trả `chrome-error://chromewebdata/` với URL `file://.../offline.html`; bundle inline đã qua syntax check. Thiếu Android SDK/Gradle nên APK/AAB chưa build. Không tuyên bố V1.0 hoàn thành.

## P0–P7 còn mở

- P0: nguồn Mobile công khai và nguồn legacy không truy cập được vì HTTP proxy 403; không có snapshot A1. Chưa có record nguồn xác minh. Cần dữ liệu hợp pháp có phiên bản và kiểm tra khác biệt Mobile/legacy.
- P1: thuế/dân tâm, tăng dân số, hàng đợi và thành phụ có runtime; còn thiếu chiều sâu đầy đủ cho công trình/tiến trình và hướng dẫn tân thủ.
- P2: roster 540/540 hồ sơ là mô phỏng; mua/dùng vật phẩm, XP, mốc kỹ năng, trang bị/rèn đã nối; dữ liệu nguồn, linh căn và các hệ phát triển còn thiếu.
- P3: 39 binh chủng mô phỏng; combat deterministic có stack, tương khắc, chiến thuật NPC, thương vong và loot; cần cân bằng sâu vai trò/công thức và xác minh nguồn Mobile.
- P4: 120 điểm NPC có chủ soái/đội hình/đấu pháp và trinh sát, tháp procedural, 5 cửa Bất Chu, nhiệm vụ, thương nhân, minh hội/ngoại giao NPC có runtime; 1.158 nhiệm vụ/624 Tiên Sơn runtime đã mô phỏng đủ số lượng; nội dung nguồn và tọa độ xác minh còn thiếu.
- P5: có SVG gốc cho thành, chân dung và huy hiệu; thiếu animation combat, atlas binh chủng, âm thanh và nội dung hình ảnh đầy đủ.
- P6: Web/PWA/offline HTML build được; `capacitor.config.json` có nhưng native project/APK/AAB chưa có do thiếu Android SDK/Gradle.
- P7: QA Web tích hợp đã PASS; Android chưa kiểm tra. Chỉ các nội dung đã chạy mới được ghi PASS.

## Bước tiếp theo

1. Nối nhiệm vụ chính tuyến thành chuỗi 8 chương có mở khóa/mục tiêu riêng; hoàn thiện nhịp nội dung, tương khắc binh chủng và lộ trình từ thành mới đến Boss/endgame NPC.
2. Khi có Android SDK/Gradle, tạo project Capacitor native, build/cài APK và kiểm tra luồng cốt lõi.
3. Khi dữ liệu nguồn được cung cấp hoặc proxy cho phép, xác minh Mobile riêng, nhập dữ liệu hợp pháp và cập nhật `DATA_COVERAGE.json`.
4. Giữ nhánh feature/dacky-mobile-complete-20261124 làm checkpoint hiện tại. Tiếp tục bằng các mục P0–P7 còn mở; không merge, không force-push, không đụng Heroes/Mưu Định Tam Quốc.
