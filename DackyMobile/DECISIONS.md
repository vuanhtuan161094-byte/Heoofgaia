# Quyết định kỹ thuật

## 2026-11-24 · Codebase offline không phụ thuộc CDN

- Mặc định trong yêu cầu là TypeScript + Vite + PixiJS + IndexedDB + Capacitor. Môi trường có Node 24 và Chromium nhưng không có tsc, Vite, PixiJS, Capacitor, Android SDK, Gradle hoặc package cache tương ứng; các truy cập HTTPS ra tài liệu công khai bị proxy trả 403.
- Để có thể build và chạy không tải thư viện ngoài, bản đầu dùng ES modules JavaScript thuần, DOM/CSS/SVG do dự án tự tạo, IndexedDB/localStorage và script Node tích hợp static/PWA/offline HTML. Đây là thay đổi kiến trúc có lý do môi trường; không tuyên bố đã đáp ứng PixiJS/Capacitor hoặc Android APK. Chuyển đổi sang TypeScript/PixiJS/Capacitor vẫn mở sau khi dependency/build chain khả dụng.
- Source không tải tài sản ngoài, không dùng client/server/binary legacy, không ghi dữ liệu raw độc quyền vào repo và không có payment.

## Gameplay và dữ liệu

- Tất cả danh mục được tạo độc lập trong src/catalog.js; record gameplay mang nhãn SIMULATED. Catalog có 540 thần tiên, 2.155 vật phẩm, 1.158 nhiệm vụ và 624 Tiên Sơn; `scripts/export-database.mjs` xuất JSON từ cùng nguồn, không chép database legacy. Reference count không có nghĩa dữ liệu tương đương Mobile.
- Chiến dịch có tám chương và Boss Trụ Vương tại Triều Ca; mở sau 20 trận thắng/7 danh thành, kết cục/thưởng một lần, còn cho phép endgame. Điều kiện này là thiết kế mô phỏng.
- Kinh tế theo giờ, cap kho và offline 8h; hàng đợi lưu thời điểm hoàn thành UTC epoch ms, settlement chỉ diễn ra một lần khi đọc save/advance.
- Khi tắt autosave, game giữ thay đổi trong bộ nhớ tới khi người chơi bấm Lưu ngay; trước khi rời trang không ghi ngầm.
- Combat NPC chạy local, deterministic theo seed, tách quân chết và bị thương, ghi chiến lợi phẩm vào báo cáo. Đây không phải multiplayer hay xác nhận công thức game gốc.
- Hành quân lưu detach theo từng stack binh chủng; vai trò phối hợp dùng để tính tương khắc và hoàn trả thương vong riêng từng stack.
- Dữ liệu runtime/save dùng version 1. IndexedDB là kho chính, localStorage là dự phòng; import được parse/version-check và migration trước khi ghi.
- Art thành, huy hiệu và chân dung là SVG gốc trong assets/; không sao chép sprite, logo hoặc database nguồn.

## 2026-11-24 · Nối kinh tế, vật phẩm và pháp môn vào runtime

- Thương nhân NPC bán 540 vật phẩm tiêu hao có sẵn trong catalog. Giá SIMULATED tăng theo bậc; vật phẩm bậc 8 trở lên cần thêm linh ngọc; túi giới hạn 500 món. Dữ liệu mua, sử dụng và số lần mua lưu cùng game.
- XP từ tu luyện, vật phẩm và PvE dùng chung ngưỡng lên cấp, có thể tăng nhiều cấp trong một lần; kỹ năng tăng mỗi khi thần tiên đạt mốc cấp chia hết cho bốn.
- Bốn pháp môn đội hình áp dụng hệ số SIMULATED cụ thể vào combat quân đội và thử thách thần tiên; chiến báo ghi lại pháp môn đã tham chiến.
- Thuế khoan giảm / trung dung / nặng thay đổi thu đồng, độ trôi dân tâm và tốc độ dân số; save cũ được migration về trung dung.
- Cả 19 nhánh khoa kỹ có hiệu ứng runtime: bốn tài nguyên, tăng dân số, xây/nghiên cứu/huấn luyện, tấn công/phòng thủ và chuyên môn kỵ/xạ, hồi thương, tương khắc, hành quân, lực chiến thần tiên, phí trinh sát và giao thương/ngoại giao. Các hệ số hiển thị đúng theo nhánh và đều SIMULATED.
- Chỉ dẫn tân thủ có bảy mốc dựa trên trạng thái gameplay đã lưu. Các hành động đề xuất gọi cùng action runtime và bước kế tiếp chỉ mở sau khi queue/trận thật hoàn tất; save cũ tự xác định lại bước từ thành tựu, không thể nhấn để bỏ qua.
- Danh thành chiếm đóng trở thành thành phụ có thể nâng tới cấp 10 qua cùng hàng xây dựng; cấp thành phụ tăng cả năm sản lượng, và điều kiện Tử Vi Thành giới hạn cấp tiếp theo. Save queue xác thực thành phụ thuộc danh sách thành đã chiếm.
- 120 điểm thế giới được chia thành tám chương, mỗi chương có 15 NPC với thành, dã địa và tiên sơn phân bổ. Thắng ở dã địa/Tiên Sơn của chương hiện tại mở chương tiếp theo; march, scout và ngoại giao chặn mục tiêu chưa mở. Điều kiện Boss cuối vẫn yêu cầu tiến trình chương, 20 trận thắng và bảy danh thành.
- Mỗi địa điểm thế giới có chỉ huy NPC, 3–5 stack binh chủng và một chiến thuật riêng theo loại địa hình. Phục kích, thủ thành, xung phong, pháp trận và chiến thuật Boss làm thay đổi hiệp đầu, sức bền hoặc sát thương. Do thám mở đầy đủ đội hình; chiến báo lưu chủ soái, quân số địch và thương vong. Thành phần/hệ số vẫn là SIMULATED.
