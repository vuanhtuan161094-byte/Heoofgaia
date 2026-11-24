# Tiến độ Dacky Mobile

Cập nhật: 2026-11-24 · Nhánh: feature/dacky-mobile-complete-20261124

## Checkpoint

- HEAD đầu lô trang bị theo slot: 0b247214be26af0248be818d9a3dbd6210002416; lô phẩm chất/ngũ hành bắt đầu tại aa87aa631049f924ea32cc57e202687d73cf2e3e; lô kỹ năng chủ động bắt đầu tại 19772fe014dadf4ca9bff21c78f9f1f8c792369d; lô linh căn trước đó bắt đầu tại 75ef315520422793909010735968d1f3826fd5ce (đã có trên origin/feature/dacky-mobile-complete-20261124). Lô chiến thuật quân chủng bắt đầu tại 4849e86a9928f723f852cc87f87f5c7aff811f00; chính tuyến tại 0eb9901b69ceee0c58509ff2f8fd42da0482127a; NPC/đội hình tại 0492d85675ca66c974cb367619afaa0ec86edbf0.
- Codebase web độc lập, offline-first: thành trì, sáu tài nguyên, 21 công trình tới cấp 30, sản xuất theo giờ, queue xây/nghiên cứu/huấn luyện/hành quân, 39 binh chủng mô phỏng, đủ 540 thần tiên mô phỏng, túi đồ/rèn, khoa kỹ, 1.158 nhiệm vụ, 120 địa điểm chiến dịch có Boss Trụ Vương và 624 Tiên Sơn thử thách riêng, chiến báo, Phong Thần Tháp và 5 cửa Bất Chu.
- Chiến dịch mô phỏng có 8 chương, 1.158 mục tiêu, mở Boss Trụ Vương sau 20 thắng/7 thành; thắng đầu lưu cờ kết cục, thưởng duy nhất và cho phép tiếp tục endgame.
- Gameplay loop đã nối: nâng công trình → huấn luyện/chiêu mộ/trang bị → hành quân nhiều stack → combat/tổn thất/loot → nâng cấp/nhiệm vụ → save/reload. Capture thành phụ, sản lượng bổ sung, minh hội NPC và minh ước NPC có runtime. Mô hình gameplay là độc lập `SIMULATED`, chưa đối chiếu client Mobile.
- Giao diện responsive tiếng Việt, bản đồ tương tác, vector art SVG tự tạo, IndexedDB + localStorage dự phòng, import/export save, PWA/service worker, build Web static, một file offline và database JSON chuẩn hóa có thể tái sinh từ cùng catalog (4.680 record mô phỏng / 9 bảng).
- Cửa hàng NPC nối 540 vật phẩm tiêu hao với giới hạn túi 500; XP tự lên nhiều cấp và tăng kỹ năng; bốn pháp môn có nội tại ở PvE và kỹ năng chủ động theo hiệp trong hành quân; phẩm chất tăng lực chiến căn bản, từng slot trang bị có hiệu ứng combat riêng, ngũ hành NPC áp vòng khắc chế vào sát thương chiến dịch; ba chính sách thuế điều chỉnh đồng, dân tâm và tăng dân số.
- Khoa kỹ 19 nhánh/570 cấp nay tác động vào kinh tế, xây dựng, huấn luyện, quân chuyên môn, combat, hồi phục, hành quân, thần tiên, trinh sát và giao thương/ngoại giao.
- Chỉ dẫn tân thủ 7 mốc tự kiểm tra tiến trình xây/nghiên cứu/chiêu mộ/trang bị/huấn luyện/chiến đấu; các nút hướng dẫn thực thi gameplay thật và chỉ tiến bước khi đạt điều kiện.
- Thành phụ đã có giao diện quản lý, nâng cấp qua hàng xây dựng, mở theo cấp Tử Vi và tăng năm loại sản lượng theo cấp.
- 120 điểm thế giới được tái phân bổ theo tám chương, đủ 75 thành/30 dã địa/14 Tiên Sơn/1 Boss; thắng dã địa hoặc Tiên Sơn mới mở chương kế tiếp; march/scout/ngoại giao bị khóa theo tiến độ. Lô NPC thêm chủ soái, 3–5 stack quân, năm chiến thuật có hiệu lực, do thám mở thông tin và chiến báo ghi quân địch/tổn thất. Tám nhiệm vụ chính tuyến mở theo từng vùng; game lưu thắng trận/dã địa/thành theo chương, khóa mục tiêu và thưởng chương chưa mở. Combat phân tuyến trước/sau/công thành, dùng tầm đánh cho initiative, tương khắc theo đội địch và bonus đội hình cân bằng. Linh căn 0–100 tăng từ tu luyện/PvE, cộng lực chiến và kỹ năng; phẩm chất Nhân/Địa/Thiên lần lượt nhân căn cơ ×1,00/×1,12/×1,28; NPC có Hỏa/Thủy/Mộc/Kim/Thổ và đội thần tiên thuận/nghịch hệ tác động sát thương. Đã nối ngũ hành vào do thám và chiến báo, Phong giữ trung tính. Bốn kỹ năng có lượt kích hoạt riêng (Phong Lôi/Huyền Thủy hiệp 1, Hỏa Phù hiệp 2, Thất Tinh hiệp 3); sát thương kỹ năng, sát thương được chặn, hồi phục và tên kỹ năng được ghi từng hiệp trong chiến báo.

## Kiểm chứng thực tế

- `node tests/engine.test.js`: PASS 26/26, thêm kiểm tra hiệu ứng riêng của vũ khí/giáp/pháp bảo cùng hệ số phẩm chất và ngũ hành thuận/nghịch cùng kiểm tra kích hoạt/chặn sát thương/gây sát thương/hồi phục của pháp môn; trước đó bao phủ kiểm tra tu luyện linh căn, tăng sau chiến dịch, lực chiến cá nhân và cộng hưởng nguyên tố; các test trước vẫn bao phủ đội hình NPC, 8 nhiệm vụ vùng, tương khắc và khóa chương.
- `npm run build`: PASS; build Web, `dist/offline.html` và `dist/data/dacky-game-data.simulated.v1.json`; kiểm tra JSON xác nhận 4.680 record SIMULATED trên 9 bảng.
- Chromium integration: PASS onboarding, 21 công trình, 11 màn hình, thuế, danh mục/purchase, xây dựng, chiêu mộ/trang bị, huấn luyện, hành quân nhiều stack, loot/chiến báo, thành phụ, save/reload, 390×844 và 844×390; 0 lỗi console/runtime. Smoke riêng xác nhận thông tin NPC bị ẩn trước trinh sát rồi hiện chủ soái/đấu pháp/đạo quân/ngũ hành; nhiệm vụ ghim chính tuyến/khóa thưởng chương; thẻ thần tiên và chiến báo hiển thị kỹ năng từng hiệp, hệ số phẩm chất, trinh sát ngũ hành và bonus chiến báo. Ảnh ở `qa/screenshots/`.
- PWA: PASS mở lại entrypoint khi tắt mạng và shell đã được cache.
- Hạn chế môi trường: Chromium trả `chrome-error://chromewebdata/` với URL `file://.../offline.html`; bundle inline đã qua syntax check. Thiếu Android SDK/Gradle nên APK/AAB chưa build. Không tuyên bố V1.0 hoàn thành.

## P0–P7 còn mở

- P0: nguồn Mobile công khai và nguồn legacy không truy cập được vì HTTP proxy 403; không có snapshot A1. Chưa có record nguồn xác minh. Cần dữ liệu hợp pháp có phiên bản và kiểm tra khác biệt Mobile/legacy.
- P1: thuế/dân tâm, tăng dân số, hàng đợi và thành phụ có runtime; còn thiếu chiều sâu đầy đủ cho công trình/tiến trình và hướng dẫn tân thủ.
- P2: roster 540/540 hồ sơ mô phỏng; XP/kỹ năng/phẩm chất/trang bị theo slot/rèn/linh căn và vòng ngũ hành khắc chế đều có runtime. Nguồn roster và hệ số gốc chưa xác minh; ngũ hành tương sinh, thức tỉnh và các hệ phát triển khác còn thiếu.
- P3: 39 binh chủng mô phỏng có tuyến trước/sau/công thành, tầm và counter theo vai trò; combat stack/counter/chiến thuật NPC/tổn thất/loot chạy thật. Hệ số và công thức nguồn Mobile vẫn chưa xác minh.
- P4: 120 điểm NPC có chủ soái/đội hình/đấu pháp và trinh sát; 8 mục tiêu chính tuyến theo vùng, tháp procedural, 5 cửa Bất Chu, nhiệm vụ phụ, thương nhân, minh hội/ngoại giao NPC có runtime; 1.158 nhiệm vụ/624 Tiên Sơn runtime đã mô phỏng đủ số lượng; nội dung nguồn và tọa độ xác minh còn thiếu.
- P5: có SVG gốc cho thành, chân dung và huy hiệu; thiếu animation combat, atlas binh chủng, âm thanh và nội dung hình ảnh đầy đủ.
- P6: Web/PWA/offline HTML build được; `capacitor.config.json` có nhưng native project/APK/AAB chưa có do thiếu Android SDK/Gradle.
- P7: QA Web tích hợp đã PASS; Android chưa kiểm tra. Chỉ các nội dung đã chạy mới được ghi PASS.

## Bước tiếp theo

1. Tiếp tục tiến trình thần tiên cấp cao: nhánh thức tỉnh/đột phá mô phỏng và liên kết trang bị, phẩm chất với thử thách cuối game.
2. Khi có Android SDK/Gradle, tạo project Capacitor native, build/cài APK và kiểm tra luồng cốt lõi.
3. Khi dữ liệu nguồn được cung cấp hoặc proxy cho phép, xác minh Mobile riêng, nhập dữ liệu hợp pháp và cập nhật `DATA_COVERAGE.json`.
4. Giữ nhánh feature/dacky-mobile-complete-20261124 làm checkpoint hiện tại. Tiếp tục bằng các mục P0–P7 còn mở; không merge, không force-push, không đụng Heroes/Mưu Định Tam Quốc.
