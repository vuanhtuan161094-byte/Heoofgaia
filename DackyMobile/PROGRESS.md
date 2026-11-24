# Tiến độ Dacky Mobile

Cập nhật: 2026-11-24 · Nhánh: feature/dacky-mobile-complete-20261124

## Checkpoint

- HEAD lúc bắt đầu: 4023325d441a7f818f7346586b1ee6e19943a5cc (origin/feature/dacky-mobile-complete-20261124). Working tree sạch khi nhận nhánh; game được khởi tạo trong lô hiện tại.
- Codebase web độc lập, offline-first: thành trì, sáu tài nguyên, 21 công trình tới cấp 30, sản xuất theo giờ, queue xây/nghiên cứu/huấn luyện/hành quân, 39 binh chủng mô phỏng, đủ 540 thần tiên mô phỏng, túi đồ/rèn, khoa kỹ, 1.158 nhiệm vụ, 120 địa điểm chiến dịch có Boss Trụ Vương và 624 Tiên Sơn thử thách riêng, chiến báo, Phong Thần Tháp và 5 cửa Bất Chu.
- Chiến dịch mô phỏng có 8 chương, 1.158 mục tiêu, mở Boss Trụ Vương sau 20 thắng/7 thành; thắng đầu lưu cờ kết cục, thưởng duy nhất và cho phép tiếp tục endgame.
- Gameplay loop đã nối: nâng công trình → huấn luyện/chiêu mộ/trang bị → hành quân nhiều stack → combat/tổn thất/loot → nâng cấp/nhiệm vụ → save/reload. Capture thành phụ, sản lượng bổ sung, minh hội NPC và minh ước NPC có runtime. Mô hình gameplay là độc lập `SIMULATED`, chưa đối chiếu client Mobile.
- Giao diện responsive tiếng Việt, bản đồ tương tác, vector art SVG tự tạo, IndexedDB + localStorage dự phòng, import/export save, PWA/service worker, build Web static, một file offline và database JSON chuẩn hóa có thể tái sinh từ cùng catalog (4.676 record mô phỏng).

## Kiểm chứng thực tế

- `npm test`: PASS 11/11 engine tests, gồm full catalog, Tiên Sơn và điều kiện/kết cục Boss một lần.
- `npm run build`: PASS; build Web, `dist/offline.html` và `dist/data/dacky-game-data.simulated.v1.json`; kiểm tra JSON xác nhận 4.676 record SIMULATED trên 8 bảng.
- Chromium integration: PASS onboarding, 21 công trình, 11 màn hình, nâng công trình, chiêu mộ, trang bị, huấn luyện, hành quân nhiều stack, loot/chiến báo, IndexedDB reload, viewport 390×844 và 844×390; 0 lỗi console/runtime. Ảnh ở `qa/screenshots/`.
- PWA: PASS mở lại entrypoint khi tắt mạng và shell đã được cache.
- Hạn chế môi trường: Chromium trả `chrome-error://chromewebdata/` với URL `file://.../offline.html`; bundle inline đã qua syntax check. Thiếu Android SDK/Gradle nên APK/AAB chưa build. Không tuyên bố V1.0 hoàn thành.

## P0–P7 còn mở

- P0: nguồn Mobile công khai và nguồn legacy không truy cập được vì HTTP proxy 403; không có snapshot A1. Chưa có record nguồn xác minh. Cần dữ liệu hợp pháp có phiên bản và kiểm tra khác biệt Mobile/legacy.
- P1: kinh tế, hàng đợi, thuế/dân tâm và thành phụ sau chiếm thành có runtime; chưa đủ độ sâu công trình/tiến trình và tutorial.
- P2: roster 540/540 hồ sơ là mô phỏng; tu luyện/trang bị/rèn cơ bản đã nối, thiếu roster/kỹ năng/phẩm chất/linh căn nguồn và hệ phát triển đầy đủ.
- P3: 39 binh chủng mô phỏng và combat deterministic có thương vong/loot; chưa tái hiện công thức gốc, đội hình và đấu pháp đầy đủ.
- P4: 120 điểm NPC, tháp thủ tục, 5 cửa Bất Chu, nhiệm vụ, thương nhân, minh hội/ngoại giao NPC có runtime; 1.158 nhiệm vụ/624 Tiên Sơn runtime đã mô phỏng đủ số lượng; nội dung nguồn và tọa độ xác minh còn thiếu.
- P5: có SVG gốc cho thành, chân dung và huy hiệu; thiếu animation combat, atlas binh chủng, âm thanh và nội dung hình ảnh đầy đủ.
- P6: Web/PWA/offline HTML build được; `capacitor.config.json` có nhưng native project/APK/AAB chưa có do thiếu Android SDK/Gradle.
- P7: QA Web tích hợp đã PASS; Android chưa kiểm tra. Chỉ các nội dung đã chạy mới được ghi PASS.

## Bước tiếp theo

1. Tiếp tục hoàn thiện gameplay/nội dung từng hệ thống; mở rộng catalog mô phỏng có cấu trúc và endgame, gắn nhãn `SIMULATED` cho thông số không có nguồn.
2. Khi có Android SDK/Gradle, tạo project Capacitor native, build/cài APK và kiểm tra luồng cốt lõi.
3. Khi dữ liệu nguồn được cung cấp hoặc proxy cho phép, xác minh Mobile riêng, nhập dữ liệu hợp pháp và cập nhật `DATA_COVERAGE.json`.
4. Giữ nhánh feature/dacky-mobile-complete-20261124 làm checkpoint hiện tại. Tiếp tục bằng các mục P0–P7 còn mở; không merge, không force-push, không đụng Heroes/Mưu Định Tam Quốc.
