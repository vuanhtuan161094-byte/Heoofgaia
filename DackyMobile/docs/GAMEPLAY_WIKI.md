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

Thương nhân vật phẩm bán 540 món tiêu hao mô phỏng theo 23 trang. Túi chứa tối đa 500 món; món bậc 8 trở lên cần thêm linh ngọc. Bốn pháp môn đội hình có nội tại tăng sát thương, giảm sát thương nhận vào, tăng đòn mở đầu và sức bền. Trong hành quân, Huyền Thủy hộ thể và Phong Lôi khai trận ở hiệp 1, Hỏa Phù gây sát thương ở hiệp 2, Thất Tinh hồi quân ở hiệp 3; cấp kỹ năng và linh căn làm mạnh hệ số. Chiến báo ghi lượng sát thương kỹ năng, sát thương đã chặn và hồi phục thực nhận. XP từ tu luyện, tiêu hao hoặc PvE tự tính cấp mới và mốc kỹ năng.

## Thần tiên và túi đồ

Roster có 540 hồ sơ thần tiên mô phỏng, hiển thị theo trang; phẩm chất Nhân/Địa/Thiên nhân lực chiến cơ bản ×1,00/×1,12/×1,28 và hệ số hiện ngay trong thẻ chiêu mộ; Tiên Gia Phủ mở tối đa 60 chỗ theo cấp. Chiêu mộ dùng đồng + linh ngọc; tu luyện và đan XP cộng kinh nghiệm, tự tăng cấp khi đủ ngưỡng; mỗi mốc cấp 4 tăng một cấp kỹ năng. Linh căn/độ gắn kết từ 0–100 tăng khi tu luyện, hành quân và đấu pháp; nó cộng lực chiến, cường hóa pháp môn và tạo cộng hưởng khi hai hoặc ba thần tiên cùng nguyên tố được xếp chung. Tu luyện tiếp tục tăng linh căn kể cả khi thần tiên đã đạt cấp 60. Đội hình cho tối đa ba vị trí theo cấp thành. Vũ khí, giáp và pháp bảo cộng lực chiến nền. Trong combat chiến dịch, vũ khí cộng sát thương, giáp giảm sát thương nhận và pháp bảo tăng hệ số kỹ năng chủ động; phần đóng góp theo đội hình được ghi trong chiến báo. Bốn pháp môn (Hỏa Phù, Huyền Thủy, Phong Lôi, Thất Tinh) có nội tại ở cả combat quân đội và thử thách thần tiên; lượt chủ động theo hiệp chạy trong combat quân đội. Đấu pháp tháp/Tiên Sơn dùng độ tinh thông để điều chỉnh lực chiến thay vì mô phỏng các hiệp riêng. Hệ số đều SIMULATED. Thương nhân NPC bán toàn bộ vật phẩm tiêu hao theo trang; giá dùng đồng + lương thực, vật phẩm bậc cao cần thêm linh ngọc, sức chứa tối đa 500 món. Mua xong dùng vật phẩm để áp dụng hiệu ứng runtime. Huyền Thiết Lò rèn món theo bậc; chiến thắng có tỷ lệ rơi trang bị.

## Quân đội và combat

Runtime có 39 loại binh chủng theo vai trò bộ binh, xạ thủ, kỵ binh, công thành, trinh sát và đạo binh. Xạ thủ/trinh sát đánh tuyến sau; công thành đứng tuyến phá thành; các quân còn lại giữ tuyến trước. Tầm đánh góp vào chủ động khai chiến; khắc chế theo vai trò, quân giữ trước bảo vệ đội sau, và Trận Đồ tác động hiệu quả phối hợp. Một lệnh hành quân có thể kết hợp nhiều loại quân; chọn số lượng chính và mở phần hỗ trợ để tận dụng tương khắc. Quân huấn luyện vào kho thành sau khi queue kết thúc. Sĩ khí và nội tại thần tiên tác động combat. Kỹ năng chủ động Huyền Thủy/Phong Lôi kích hoạt hiệp 1, Hỏa Phù hiệp 2 và Thất Tinh hiệp 3, nếu trận kéo dài tới lượt đó. Combat seeded tối đa sáu hiệp; chiến thắng ghi danh vọng/loot, quân chết mất, quân bị thương đi vào Hồi Xuân Đường. Mỗi trong 120 địa điểm có chủ soái, đội NPC 3–5 binh chủng và một ngũ hành; do thám cho biết quân số, chiến thuật và ngũ hành. Vòng mô phỏng Hỏa khắc Kim, Kim khắc Mộc, Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa; mỗi thần tiên thuận/nghịch hệ đổi ±2,5% sát thương gây ra và ±1,5% sát thương nhận. Thần tiên hệ Phong trung tính. Phục kích ưu tiên đòn mở đầu, thủ thành tăng sức bền, kỵ trận và pháp trận tăng sức đánh, Boss có cả phòng ngự lẫn công kích bổ sung. Đội hình địch, tổn thất, tỷ lệ khắc chế và diễn biến từng hiệp được giữ trong chiến báo. Các thông số và chỉ huy là SIMULATED.

## Bản đồ và chiến dịch

120 NPC được chia thành tám chương, mỗi chương 15 địa điểm gồm danh thành, dã địa và Tiên Sơn. Chương đầu mở sẵn; thắng ở dã địa hoặc Tiên Sơn trong chương đang mở mới tiến sang chương kế tiếp. Mục tiêu chương chưa mở không nhận trinh sát, hành quân hoặc ngoại giao. Do thám từng mục tiêu mở tên chủ soái, đấu pháp và từng stack quân trong save. Mỗi chương có một mục tiêu chính tuyến riêng ghi nhận thắng ải tại vùng đó; chương kế tiếp chỉ hiện mục tiêu sau khi vùng được mở. Nhiệm vụ của chương chưa mở cũng không thể nhận thưởng. Trụ Vương cần mở tới chương tám, đạt 20 trận thắng và chiếm bảy danh thành; đây là điều kiện thiết kế SIMULATED.

## Thử thách

- Phong Thần Tháp: leo tối đa 8992 tầng procedural, độ khó tăng theo tầng; thắng thưởng tài nguyên, kinh nghiệm và một số pháp bảo theo mốc.
- Bất Chu Sơn: năm cửa NPC, tăng mạnh độ khó; phần thưởng cuối có pháp bảo. Tiên Sơn: 624 thử thách đấu pháp có thể tái đấu, thưởng tài nguyên và pháp bảo theo mốc.
- Vật phẩm: 2.155 hồ sơ mô phỏng gồm trang bị và vật phẩm tiêu hao; hiệu ứng tiêu hao nối vào runtime. Thị trường đổi sáu loại tài nguyên với phí NPC, không phải multiplayer.
- Nhiệm vụ: 1.158 mục tiêu mô phỏng qua tám chương, có nhiệm vụ cuối đánh bại Trụ Vương. Tất cả liên kết với xây, quân, thần tiên, combat và PvE.

## Save/offline

Autosave ghi IndexedDB và localStorage backup. Thời gian offline tối đa 8 giờ. Cài đặt xuất tệp JSON; import kiểm tra cấu trúc, version và danh mục trước khi thay save. Save không đồng bộ lên server.
