# Wiki gameplay (bản mô phỏng hiện tại)

> Nội dung dưới đây mô tả runtime của dự án này. Không phải trích xuất chính thức từ game Mobile hoặc legacy.

## Thành trì

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

## Thần tiên và túi đồ

Roster hiện có 18 hồ sơ mô phỏng. Chiêu mộ dùng đồng + linh ngọc; tu luyện dùng lương thực + đồng; đội hình cho tối đa ba vị trí theo cấp thành. Vũ khí, giáp, pháp bảo cộng chỉ số trong tính lực chiến. Đồ tiêu hao dùng trực tiếp. Huyền Thiết Lò rèn món theo bậc; chiến thắng có tỷ lệ rơi trang bị.

## Quân đội và combat

Runtime có 39 loại binh chủng theo vai trò bộ binh, xạ thủ, kỵ binh, công thành, trinh sát và đạo binh. Quân huấn luyện vào kho thành sau khi queue kết thúc. Một lệnh hành quân có thể kết hợp nhiều loại quân; chọn số lượng chính và mở phần hỗ trợ để tận dụng tương khắc vai trò. Tốc độ, đội hình và sĩ khí điều chỉnh sức mạnh. Combat seeded tối đa sáu hiệp; chiến thắng ghi danh vọng/loot, quân chết mất, quân bị thương đi vào Hồi Xuân Đường.

## Thử thách

- Phong Thần Tháp: leo tối đa 8992 tầng procedural, độ khó tăng theo tầng; thắng thưởng tài nguyên, kinh nghiệm và một số pháp bảo theo mốc.
- Bất Chu Sơn: năm cửa NPC, tăng mạnh độ khó; phần thưởng cuối có pháp bảo.
- Thị trường: đổi sáu loại tài nguyên với phí NPC, không phải multiplayer.
- Nhiệm vụ: 48 mục tiêu theo 8 chương cùng nhiệm vụ cuối đánh bại Trụ Vương; tất cả liên kết với xây, quân, thần tiên, combat và PvE.

## Save/offline

Autosave ghi IndexedDB và localStorage backup. Thời gian offline tối đa 8 giờ. Cài đặt xuất tệp JSON; import kiểm tra cấu trúc, version và danh mục trước khi thay save. Save không đồng bộ lên server.
