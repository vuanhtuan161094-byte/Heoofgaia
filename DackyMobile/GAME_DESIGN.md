# Thiết kế tổng thể · Mưu Định Phong Thần

## Định vị

Game chiến thuật 2D chơi đơn, offline-first, tiếng Việt; dùng bối cảnh thần thoại Phong Thần với nội dung và hình ảnh tự tạo. Đây là một dự án độc lập lấy cảm hứng từ thể loại; các cơ chế chưa đối chiếu nguồn chính thức được ghi SIMULATED.

## Vòng chơi

1. Thu tài nguyên theo giờ và quản lý giới hạn kho.
2. Xây/nâng công trình; công trình kinh tế tăng sản xuất, học viện mở nghiên cứu, doanh trại mở huấn luyện, phủ/đàn mở chiêu mộ, lò luyện mở chế tạo.
3. Tuyển thần tiên, tăng cấp, phân công tối đa ba vị trí và trang bị vũ khí/giáp/pháp bảo.
4. Huấn luyện quân, trinh sát một tọa độ, chọn đơn vị và số lượng, hành quân đánh NPC.
5. Combat tính lực lượng, tương khắc vai trò, tốc độ, sĩ khí, đội hình thần tiên và hệ số seeded; settlement trừ quân chết, tách quân bị thương, ghi loot và chiến báo đúng một lần.
6. Dùng phần thưởng mở cấp thành, công nghệ, địa điểm và tầng PvE cao hơn; claim nhiệm vụ chính tuyến.

## Kinh tế và thời gian

- Sáu loại tài nguyên: lương thực, gỗ, đá, sắt, đồng, linh ngọc. Sản lượng được sinh từ cấp công trình và công nghệ.
- Mỗi loại thường bị giới hạn bởi dung lượng kho; linh ngọc có mức trần riêng. Hành động kiểm tra đủ tài nguyên trước khi trừ.
- Xây dựng, huấn luyện, nghiên cứu và hành quân lưu mốc bắt đầu/kết thúc; không tự hoàn tất hai lần.
- Khi mở lại, thời gian offline được tính tối đa 8 giờ. Không yêu cầu đồng hồ mạng hoặc máy chủ.
- Giao thương đổi tài nguyên qua NPC với phí mô phỏng; không có giao dịch tiền thật.
- Chiếm danh thành NPC tạo thành phụ lưu trong save. Mỗi thành phụ tăng sản lượng tài nguyên; minh hội NPC và minh ước qua Bát Phương Quán giảm phí/độ khó theo hệ số mô phỏng.

## Chiến đấu và thế giới

- Thế giới local có danh thành kiểu NPC, dã địa, tiên sơn, Phong Thần Tháp và Bất Chu Sơn. Các tọa độ/công thức hiện mô phỏng.
- Hành quân sử dụng số quân thật trong save; combat có nhiều hiệp, tỷ lệ thương vong, thương binh và loot.
- Chiến dịch có 8 chương, 49 mục tiêu và Boss Trụ Vương tại Triều Ca; yêu cầu 20 trận thắng và chiếm 7 danh thành. Lần thắng đầu ghi kết cục Phong Thần và thưởng một lần.
- Sau kết cục vẫn có thể tái chiến NPC và tiếp tục endgame: Tháp procedural tới 8992 tầng, Bất Chu năm cửa, kinh tế thành phụ và nâng cấp thành trì.
- Không có PvP trực tuyến, bang hội người thật hoặc kết nối game gốc trong bản này. Hoạt động liên quan người chơi khác được mô hình hóa như NPC và phải tiếp tục được hoàn thiện.

## UX và mỹ thuật

- Responsive desktop và mobile; màn hình ngang ưu tiên trên mobile. Điều hướng gồm thành, thần tiên, túi đồ, quân, thế giới, thử thách, khoa kỹ, nhiệm vụ, chợ, chiến báo và cài đặt.
- Hình thành trì, huy hiệu và bộ chân dung là SVG tự tạo; game không tải ảnh/asset qua mạng.
- Save local IndexedDB, bản dự phòng localStorage, tệp JSON import/export; không gửi save lên server.

## Phần chưa khóa bằng dữ liệu

Roster hero 540, 2155 item legacy, 1158 quest, cấu hình combat Mobile và các bảng lớn Tiên Sơn/Bất Chu chưa được nạp hoặc xác minh. Chúng không được thay thế bằng tuyên bố tương đương; coverage liệt kê riêng runtime mô phỏng và count tham chiếu.
