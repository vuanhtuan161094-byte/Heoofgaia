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
- Bốn pháp môn có nội tại SIMULATED trong combat/PvE. Trận quân đội tự kích hoạt Huyền Thủy + Phong Lôi ở hiệp 1, Hỏa Phù ở hiệp 2, Thất Tinh ở hiệp 3; hệ số sát thương, giảm thương và hồi phục scale theo kỹ năng/linh căn. Chiến báo giữ từng lượng sát thương, sát thương chặn, hồi phục và tên pháp môn đã thi triển. Đấu pháp thử thách dùng độ tinh thông để điều chỉnh lực chiến, không giả lập từng hiệp.
- Thuế khoan giảm / trung dung / nặng thay đổi thu đồng, độ trôi dân tâm và tốc độ dân số; save cũ được migration về trung dung.
- Cả 19 nhánh khoa kỹ có hiệu ứng runtime: bốn tài nguyên, tăng dân số, xây/nghiên cứu/huấn luyện, tấn công/phòng thủ và chuyên môn kỵ/xạ, hồi thương, tương khắc, hành quân, lực chiến thần tiên, phí trinh sát và giao thương/ngoại giao. Các hệ số hiển thị đúng theo nhánh và đều SIMULATED.
- Chỉ dẫn tân thủ có bảy mốc dựa trên trạng thái gameplay đã lưu. Các hành động đề xuất gọi cùng action runtime và bước kế tiếp chỉ mở sau khi queue/trận thật hoàn tất; save cũ tự xác định lại bước từ thành tựu, không thể nhấn để bỏ qua.
- Danh thành chiếm đóng trở thành thành phụ có thể nâng tới cấp 10 qua cùng hàng xây dựng; cấp thành phụ tăng cả năm sản lượng, và điều kiện Tử Vi Thành giới hạn cấp tiếp theo. Save queue xác thực thành phụ thuộc danh sách thành đã chiếm.
- 120 điểm thế giới được chia thành tám chương, mỗi chương có 15 NPC với thành, dã địa và tiên sơn phân bổ. Thắng ở dã địa/Tiên Sơn của chương hiện tại mở chương tiếp theo; march, scout và ngoại giao chặn mục tiêu chưa mở. Điều kiện Boss cuối vẫn yêu cầu tiến trình chương, 20 trận thắng và bảy danh thành.
- Mỗi địa điểm thế giới có chỉ huy NPC, 3–5 stack binh chủng và một chiến thuật riêng theo loại địa hình. Phục kích, thủ thành, xung phong, pháp trận và chiến thuật Boss làm thay đổi hiệp đầu, sức bền hoặc sát thương. Do thám mở đầy đủ đội hình; chiến báo lưu chủ soái, quân số địch và thương vong. Thành phần/hệ số vẫn là SIMULATED.
- Chính tuyến có tám nhiệm vụ mở cửa ải theo từng chương và một mục tiêu Boss cuối. Save theo dõi thắng trận/dã địa/danh thành từng chương; mục tiêu chương sau chưa hiện cho tới khi chiến dịch mở khu vực, và phần thưởng chương khóa theo cùng tiến trình. Save cũ được bổ sung bộ đếm khi migration; số thành đã chiếm được dựng lại từ danh sách node.
- Binh chủng được phân tuyến trước/sau/công thành, mỗi vai trò có tầm đánh và đối tượng khắc chế. Combat so tỷ lệ quân có khắc chế thực sự với đội đối phương; đội hình quân trước + hỗ trợ sau, tương khắc nội bộ và khoa Trận Đồ góp sức riêng. Đây là mô hình chiến thuật bổ sung, hệ số SIMULATED và chưa được đối chiếu công thức Mobile.
- Linh căn thần tiên dùng thang 0–100 hiện có trong save: tu luyện +3, hành quân/đấu pháp +1 đến +4 tùy kết quả/chương. Mỗi điểm thêm 0,15% lực chiến và tăng nhẹ hiệu lực pháp môn; các thần tiên trùng nguyên tố có cộng hưởng đội hình tối đa 15%. Dùng cùng một thang cho mọi nguyên tố, chưa mô phỏng quan hệ sinh/khắc nguyên tố do chưa xác minh dữ liệu nguồn.


## 2026-11-24 · Phẩm chất và ngũ hành đối kháng

- Phẩm chất Nhân/Địa/Thiên nhân hệ số lực chiến cơ bản 1,00/1,12/1,28; hệ số và tên bậc đều SIMULATED, chiêu mộ Thiên phẩm tiếp tục tốn nhiều linh ngọc hơn. UI công khai hệ số căn cơ trước khi chiêu mộ.
- Mỗi đội NPC có Hỏa/Thủy/Mộc/Kim/Thổ. Vòng khắc chế được mô phỏng theo Hỏa khắc Kim, Kim khắc Mộc, Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa; Phong trung tính do chưa có nguồn xác minh. Mỗi thần tiên thuận/nghịch hệ làm đổi ±2,5% sát thương gây ra, đồng thời giảm/tăng 1,5% sát thương nhận vào.
- Ngũ hành NPC chỉ hiện sau trinh sát và được ghi vào chiến báo; hiệu ứng chỉ áp dụng trận chiến dịch, còn cộng hưởng đồng nguyên tố theo đội hình vẫn riêng biệt.


## 2026-11-24 · Nối từng loại trang bị vào combat

- Vũ khí trong ba vị trí đội hình cộng hệ số sát thương theo `ITEMS.bonus`; giáp cộng giảm sát thương nhận; pháp bảo cộng trực tiếp vào hệ số kỹ năng chủ động và độ tinh thông PvE. Cả ba loại vẫn cộng lực chiến nền như trước.
- Thông số phần trăm được chiến báo tổng hợp theo đội hình; công thức và mức cộng đều SIMULATED. Rèn/trang bị vẫn dùng inventory và slot hiện có, không tạo nhánh nâng cấp vật phẩm riêng ở lô này.
