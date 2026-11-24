# Tiến độ Dacky Mobile

Cập nhật: 2026-11-24 · Nhánh: feature/dacky-mobile-complete-20261124

## Checkpoint

- HEAD đầu lô linh căn: 75ef315520422793909010735968d1f3826fd5ce (đã có trên origin/feature/dacky-mobile-complete-20261124). Lô chiến thuật quân chủng bắt đầu tại 4849e86a9928f723f852cc87f87f5c7aff811f00; chính tuyến tại 0eb9901b69ceee0c58509ff2f8fd42da0482127a; NPC/đội hình tại 0492d85675ca66c974cb367619afaa0ec86edbf0.
- Codebase web độc lập, offline-first: thành trì, sáu tài nguyên, 21 công trình tới cấp 30, sản xuất theo giờ, queue xây/nghiên cứu/huấn luyện/hành quân, 39 binh chủng mô phỏng, đủ 540 thần tiên mô phỏng, túi đồ/rèn, khoa kỹ, 1.158 nhiệm vụ, 120 địa điểm chiến dịch có Boss Trụ Vương và 624 Tiên Sơn thử thách riêng, chiến báo, Phong Thần Tháp và 5 cửa Bất Chu.
- Chiến dịch mô phỏng có 8 chương, 1.158 mục tiêu, mở Boss Trụ Vương sau 20 thắng/7 thành; thắng đầu lưu cờ kết cục, thưởng duy nhất và cho phép tiếp tục endgame.
- Gameplay loop đã nối: nâng công trình → huấn luyện/chiêu mộ/trang bị → hành quân nhiều stack → combat/tổn thất/loot → nâng cấp/nhiệm vụ → save/reload. Capture thành phụ, sản lượng bổ sung, minh hội NPC và minh ước NPC có runtime. Mô hình gameplay là độc lập `SIMULATED`, chưa đối chiếu client Mobile.
- Giao diện responsive tiếng Việt, bản đồ tương tác, vector art SVG tự tạo, IndexedDB + localStorage dự phòng, import/export save, PWA/service worker, build Web static, một file offline và database JSON chuẩn hóa có thể tái sinh từ cùng catalog (4.676 record mô phỏng).
- Cửa hàng NPC nối 540 vật phẩm tiêu hao với giới hạn túi 500; XP tự lên nhiều cấp và tăng kỹ năng; bốn pháp môn có hiệu lực trong combat/PvE; ba chính sách thuế điều chỉnh đồng, dân tâm và tăng dân số.
- Khoa kỹ 19 nhánh/570 cấp nay tác động vào kinh tế, xây dựng, huấn luyện, quân chuyên môn, combat, hồi phục, hành quân, thần tiên, trinh sát và giao thương/ngoại giao.
- Chỉ dẫn tân thủ 7 mốc tự kiểm tra tiến trình xây/nghiên cứu/chiêu mộ/trang bị/huấn luyện/chiến đấu; các nút hướng dẫn thực thi gameplay thật và chỉ tiến bước khi đạt điều kiện.
- Thành phụ đã có giao diện quản lý, nâng cấp qua hàng xây dựng, mở theo cấp Tử Vi và tăng năm loại sản lượng theo cấp.
- 120 điểm thế giới được tái phân bổ theo tám chương, đủ 75 thành/30 dã địa/14 Tiên Sơn/1 Boss; thắng dã địa hoặc Tiên Sơn mới mở chương kế tiếp; march/scout/ngoại giao bị khóa theo tiến độ. Lô NPC thêm chủ soái, 3–5 stack quân, năm chiến thuật có hiệu lực, do thám mở thông tin và chiến báo ghi quân địch/tổn thất. Tám nhiệm vụ chính tuyến mở theo từng vùng; game lưu thắng trận/dã địa/thành theo chương, khóa mục tiêu và thưởng chương chưa mở. Combat phân tuyến trước/sau/công thành, dùng tầm đánh cho initiative, tương khắc theo đội địch và bonus đội hình cân bằng. Linh căn 0–100 tăng từ tu luyện/PvE, cộng lực chiến và kỹ năng; đội thần tiên cùng nguyên tố có cộng hưởng chiến đấu.

## Kiểm chứng thực tế

- `node tests/engine.test.js`: PASS 23/23, thêm kiểm tra tu luyện linh căn, tăng sau chiến dịch, lực chiến cá nhân và cộng hưởng nguyên tố; các test trước vẫn bao phủ đội hình NPC, 8 nhiệm vụ vùng, tương khắc và khóa chương.
- `npm run build`: PASS; build Web, `dist/offline.html` và `dist/data/dacky-game-data.simulated.v1.json`; kiểm tra JSON xác nhận 4.676 record SIMULATED trên 8 bảng.
- Chromium integration: PASS onboarding, 21 công trình, 11 màn hình, thuế, danh mục/purchase, xây dựng, chiêu mộ/trang bị, huấn luyện, hành quân nhiều stack, loot/chiến báo, thành phụ, save/reload, 390×844 và 844×390; 0 lỗi console/runtime. Smoke riêng xác nhận thông tin NPC bị ẩn trước trinh sát rồi hiện chủ soái/đấu pháp/đạo quân; nhiệm vụ ghim chính tuyến/khóa thưởng chương; màn thần tiên cập nhật linh căn sau tu luyện. Ảnh ở `qa/screenshots/`.
- PWA: PASS mở lại entrypoint khi tắt mạng và shell đã được cache.
- Hạn chế môi trường: Chromium trả `chrome-error://chromewebdata/` với URL `file://.../offline.html`; bundle inline đã qua syntax check. Thiếu Android SDK/Gradle nên APK/AAB chưa build. Không tuyên bố V1.0 hoàn thành.

## P0–P7 còn mở

- P0: nguồn Mobile công khai và nguồn legacy không truy cập được vì HTTP proxy 403; không có snapshot A1. Chưa có record nguồn xác minh. Cần dữ liệu hợp pháp có phiên bản và kiểm tra khác biệt Mobile/legacy.
- P1: thuế/dân tâm, tăng dân số, hàng đợi và thành phụ có runtime; còn thiếu chiều sâu đầy đủ cho công trình/tiến trình và hướng dẫn tân thủ.
- P2: roster 540/540 hồ sơ mô phỏng; XP/kỹ năng/trang bị/rèn và linh căn có runtime; nguồn gốc, ngũ hành sinh/khắc, thức tỉnh và hệ phát triển khác còn thiếu.
- P3: 39 binh chủng mô phỏng có tuyến trước/sau/công thành, tầm và counter theo vai trò; combat stack/counter/chiến thuật NPC/tổn thất/loot chạy thật. Hệ số và công thức nguồn Mobile vẫn chưa xác minh.
- P4: 120 điểm NPC có chủ soái/đội hình/đấu pháp và trinh sát; 8 mục tiêu chính tuyến theo vùng, tháp procedural, 5 cửa Bất Chu, nhiệm vụ phụ, thương nhân, minh hội/ngoại giao NPC có runtime; 1.158 nhiệm vụ/624 Tiên Sơn runtime đã mô phỏng đủ số lượng; nội dung nguồn và tọa độ xác minh còn thiếu.
- P5: có SVG gốc cho thành, chân dung và huy hiệu; thiếu animation combat, atlas binh chủng, âm thanh và nội dung hình ảnh đầy đủ.
- P6: Web/PWA/offline HTML build được; `capacitor.config.json` có nhưng native project/APK/AAB chưa có do thiếu Android SDK/Gradle.
- P7: QA Web tích hợp đã PASS; Android chưa kiểm tra. Chỉ các nội dung đã chạy mới được ghi PASS.

## Bước tiếp theo

1. Hoàn thiện đường phát triển thần tiên và pháp môn chủ động/bị động; nối sâu phẩm chất, nguyên tố, trang bị/pháp bảo, nhiệm vụ và đường chinh phục endgame.
2. Khi có Android SDK/Gradle, tạo project Capacitor native, build/cài APK và kiểm tra luồng cốt lõi.
3. Khi dữ liệu nguồn được cung cấp hoặc proxy cho phép, xác minh Mobile riêng, nhập dữ liệu hợp pháp và cập nhật `DATA_COVERAGE.json`.
4. Giữ nhánh feature/dacky-mobile-complete-20261124 làm checkpoint hiện tại. Tiếp tục bằng các mục P0–P7 còn mở; không merge, không force-push, không đụng Heroes/Mưu Định Tam Quốc.
