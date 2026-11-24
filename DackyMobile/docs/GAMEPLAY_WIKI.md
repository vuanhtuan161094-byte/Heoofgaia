# Wiki gameplay (bản mô phỏng hiện tại)

> Nội dung dưới đây mô tả runtime của dự án này. Không phải trích xuất chính thức từ game Mobile hoặc legacy.

## Thành trì

Chỉ dẫn nhập môn lần lượt mở xây Phong Mộc Trường, nghiên cứu Nông Chính, dựng Phong Thần Đàn, chiêu mộ thần tiên, trang bị, huấn luyện và trận thắng đầu tiên. Các nút dùng hành động runtime; chỉ dẫn lưu theo save và nhận biết khi queue/trận hoàn tất.

Tử Vi Thành quản lý cấp thành, dân số và mở khóa. Hai mươi công trình khác được chia thành nội thành, kinh tế, quân sự, nghiên cứu, thần tiên và ngoại thành. Bấm Xây dựng/Nâng để trừ chi phí ngay; cấp mới chỉ có hiệu lực khi bộ đếm hoàn tất. Mỗi công trình có giới hạn cấp 30, một hàng đợi chung.

| Công trình | Tác dụng runtime |
| --- | --- |
| Ngũ Cốc Viên, Phong Mộc Trường, Địa Mạch Khoáng, Xích Kim Quặng | Tăng lương thực, gỗ, đá, sắt theo giờ |
| Linh Thương, Càn Khôn Khố | Tăng sản lượng lương thực và dung lượng kho |
| Triều Ca Thị, Vạn Lý Trạm | Tăng đồng mỗi giờ; Vạn Lý Trạm giảm phí đổi NPC |
| Thái Học Viện | Mở queue 19 nhánh khoa kỹ, tối đa 30 cấp mỗi nhánh |
| Thần Binh Doanh, Bách Chiến Đài | Quản lý và tăng tốc huấn luyện quân |
| Tiên Gia Phủ, Phong Thần Đàn | Tăng chỗ roster, cho phép chiêu mộ |
| Huyền Thiết Lò | Rèn trang bị theo công thức tài nguyên |
| Hồi Xuân Đường | Hồi quân bị thương với lương và đồng |
| Huyền Vũ Thành, Thiên Lý Đài | Phòng thủ và tốc độ hành quân (mô phỏng) |
| Bát Phương Quán, Vạn Lý Trạm | Ngoại giao NPC và giao thương offline |

Chính sách thuế có ba mức mô phỏng: khoan giảm tạo 75% đồng cơ sở và phục hồi 0,12 dân tâm/giờ; trung dung là mức chuẩn; thuế nặng tạo 130% đồng nhưng giảm 0,24 dân tâm/giờ. Dân tâm và cấp Tử Vi Thành cùng điều chỉnh tốc độ tăng dân số. Chính sách được lưu và vẫn áp dụng trong tiến trình offline. Mỗi danh thành chiếm được trở thành thành phụ; có thể nâng đến cấp 10 qua hàng xây dựng để tăng sản lượng cả năm tài nguyên, với cấp Tử Vi Thành mở khóa từng mốc.

Thái Học Viện có 19 nhánh, mỗi nhánh 30 cấp. Nông/Lâm/Khai Sơn/Luyện Kim và Trị Thủy tăng sản xuất; Thị Thương tăng thu đồng; Quản Dân tăng dân số; Kiến Trúc, Cơ Quan và Binh Pháp rút ngắn thời gian xây, huấn luyện và tăng lực quân. Thủ Thành, Kỵ Thuật, Cung Nỏ, Y Đạo, Trận Đồ, Dịch Trạm, Luyện Khí, Tinh Tượng và Ngoại Giao lần lượt thay đổi phòng thủ, nhóm quân, hồi phục, tương khắc, hành quân, thần tiên, do thám và phí/tỷ lệ giao thương với NPC. Mọi hệ số là SIMULATED.

Thương nhân vật phẩm bán 540 món tiêu hao mô phỏng theo 23 trang. Túi chứa tối đa 500 món; món bậc 8 trở lên cần thêm linh ngọc. Bốn pháp môn đội hình lần lượt tăng sát thương, giảm sát thương nhận vào, tăng đòn mở đầu và sức bền; XP từ tu luyện, tiêu hao hoặc PvE tự tính cấp mới và mốc kỹ năng.

## Thần tiên và túi đồ

Roster có 540 hồ sơ thần tiên mô phỏng, hiển thị theo trang; Tiên Gia Phủ mở tối đa 60 chỗ theo cấp. Chiêu mộ dùng đồng + linh ngọc; tu luyện và đan XP cộng kinh nghiệm, tự tăng cấp khi đủ ngưỡng; mỗi mốc cấp 4 tăng một cấp kỹ năng. Đội hình cho tối đa ba vị trí theo cấp thành. Vũ khí, giáp, pháp bảo cộng chỉ số trong tính lực chiến. Bốn pháp môn (Hỏa Phù, Huyền Thủy, Phong Lôi, Thất Tinh) có tác dụng riêng với sát thương, giảm thương, đòn mở đầu và sức bền đội hình ở cả combat quân đội lẫn thử thách thần tiên; hệ số đều SIMULATED. Thương nhân NPC bán toàn bộ vật phẩm tiêu hao theo trang; giá dùng đồng + lương thực, vật phẩm bậc cao cần thêm linh ngọc, sức chứa tối đa 500 món. Mua xong dùng vật phẩm để áp dụng hiệu ứng runtime. Huyền Thiết Lò rèn món theo bậc; chiến thắng có tỷ lệ rơi trang bị.

## Quân đội và combat

Runtime có 39 loại binh chủng theo vai trò bộ binh, xạ thủ, kỵ binh, công thành, trinh sát và đạo binh. Quân huấn luyện vào kho thành sau khi queue kết thúc. Một lệnh hành quân có thể kết hợp nhiều loại quân; chọn số lượng chính và mở phần hỗ trợ để tận dụng tương khắc vai trò. Tốc độ, đội hình và sĩ khí điều chỉnh sức mạnh. Combat seeded tối đa sáu hiệp; chiến thắng ghi danh vọng/loot, quân chết mất, quân bị thương đi vào Hồi Xuân Đường.

## Thử thách

- Phong Thần Tháp: leo tối đa 8992 tầng procedural, độ khó tăng theo tầng; thắng thưởng tài nguyên, kinh nghiệm và một số pháp bảo theo mốc.
- Bất Chu Sơn: năm cửa NPC, tăng mạnh độ khó; phần thưởng cuối có pháp bảo. Tiên Sơn: 624 thử thách đấu pháp có thể tái đấu, thưởng tài nguyên và pháp bảo theo mốc.
- Vật phẩm: 2.155 hồ sơ mô phỏng gồm trang bị và vật phẩm tiêu hao; hiệu ứng tiêu hao nối vào runtime. Thị trường đổi sáu loại tài nguyên với phí NPC, không phải multiplayer.
- Nhiệm vụ: 1.158 mục tiêu mô phỏng qua tám chương, có nhiệm vụ cuối đánh bại Trụ Vương. Tất cả liên kết với xây, quân, thần tiên, combat và PvE.

## Save/offline

Autosave ghi IndexedDB và localStorage backup. Thời gian offline tối đa 8 giờ. Cài đặt xuất tệp JSON; import kiểm tra cấu trúc, version và danh mục trước khi thay save. Save không đồng bộ lên server.
