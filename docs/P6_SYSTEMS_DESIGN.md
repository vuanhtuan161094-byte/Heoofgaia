# CL-P6 · Thế cục NPC và Chinh Phạt Vô Tận

## Phạm vi

CL-P6 mở rộng game offline với ngoại giao, mùa và thời tiết, hai đạo quân đồng thời, máy công thành, một kỳ quan tại Lạc Thành và chiến dịch PvE tăng tầng. Đây là luật chơi nguyên bản được **SIMULATED** theo thể loại; không sao chép quy tắc nội bộ hoặc mỹ thuật của Chiến Loạn Tam Quốc. Không có người chơi thật, bang hội trực tuyến hay PvP.

P6 bổ sung `game.cltq.p6` vào save `muu_dinh_tam_quoc_v1`, schema v5. Dữ liệu P6 được khởi tạo khi mở save cũ; schema và migration trước đó không đổi. Kết quả trận, thương vong và phần thưởng vẫn đi qua bộ quyết toán trận CL hiện hành.

## Ngoại giao NPC

Bốn nhóm NPC — Ngụy, Thục, Ngô và Quần Hùng — được gắn lên các cứ điểm bản đồ hiện có. Quan hệ khởi điểm lần lượt là −1, 0, −1 và 0, giới hạn từ −3 đến +3. Mỗi sứ giả tiêu tốn 650 bạc và 180 lương để tăng quan hệ một bậc. Từ +2 có thể ký minh ước với giá 1.200 bạc và 260 sắt.

Minh ước cấm tấn công các cứ điểm NPC mang phe đó và cộng 4% vào sản lượng lãnh địa của mỗi phe kết minh. Bãi ước giảm quan hệ hai bậc. Quan hệ NPC làm biến thiên chỉ số quân phòng thủ trong giới hạn ±12%. Đây là mô hình offline; không đồng bộ với server hay người chơi của sản phẩm tham chiếu.

## Mùa, thời tiết và hành quân

Một hành động chiến lược tăng lượt. Mỗi mùa có ba lượt; chu kỳ lặp qua Xuân, Hạ, Thu, Đông và mỗi tổ hợp thời tiết/lượt được xác định từ số lượt đã lưu. Thời tiết điều chỉnh lương và thời gian tuyến. Hệ số lương gồm mưa 1,18; bão 1,30; tuyết 1,22; sương giá 1,12; nắng nóng 1,10; mùa thu hoạch 0,90. Mưa, bão, tuyết, sương giá và nắng nóng thêm lần lượt 2, 5, 4, 2 và 1 giây. Trận đánh dùng giảm nhẹ sát thương theo điều kiện thời tiết đã ghi trên lệnh hành quân.

Đạo chủ lực giữ tuyến và lệnh P1/P2 cũ. Đạo quân cánh có năm ô tướng riêng, không thể dùng trùng tướng với chủ lực hoặc tướng đồn trú; có vị trí đóng quân, đường đi, ETA, phí lương, trạng thái đến nơi, rút lui và đánh riêng. Hai đội có thể hành quân đồng thời tới hai cứ điểm. Cả hai dùng cùng bộ chiến đấu, tính thương vong và biên nhận chiếm thành của CL.

## Máy công thành

Mỗi máy tiêu tốn 550 bạc, 700 gỗ và 420 sắt; kho tối đa sáu máy. Mỗi trận công thành dùng một máy, bất kể thắng hay thua. Máy giảm 28% phòng thủ vật lý, chiến pháp và mưu thuật của quân NPC. Nếu không có máy, công thành vẫn chơi được.

## Cửu Đỉnh và Chinh Phạt Vô Tận

Chiếm Lạc Thành mở nâng cấp Cửu Đỉnh ba cấp. Chi phí cấp 1/2/3 lần lượt là 2.200/4.800/8.500 bạc, 1.800/3.600/7.000 gỗ và 1.000/2.600/5.500 sắt. Mỗi cấp tăng 2,5% công/thủ của quân ta trong chiến đấu cương vực.

Cấp 1 mở Chinh Phạt Vô Tận, một chuỗi PvE lưu tầng, số trận thắng/thua và tối đa 200 receipt gần nhất. Cần Lạc Thành, tối thiểu ba tướng đủ quân trong chủ lực và các đạo quân đang rảnh. Trận dùng engine chiến đấu CL; thắng nâng tầng và cấp tài nguyên/EXP, thua giữ nguyên tầng và vẫn lưu tổn thất. Kẻ địch nhận thêm 12% chỉ số mỗi tầng, tối đa +180%. Một receipt dựa trên ID trận ngăn thưởng trùng.

## Thiên Hạ Hiệu Lệnh

Trong mỗi trận cương vực, người chơi có thể trả 600 lương và 220 sắt để dùng hiệu lệnh một lần. Quân ta còn sống nhận +22% công, +15% thủ và +24 sĩ khí. Hiệu lệnh ghi một snapshot vào chiến báo; phát lại đọc snapshot, không trả tài nguyên hoặc thay đổi kết quả trận lần nữa.

## Kiểm chứng

`qa/cl_p6.py` kiểm 30 luồng Chromium: migration/save schema, quan hệ và chi phí, minh ước chặn tuyến, biến thiên mùa/thời tiết, hai đạo quân hành quân cùng lúc, công thành và receipt, Cửu Đỉnh, PvE thắng/thua và thưởng một lần, kỹ năng và replay frame, tải lại file save, bố cục 390px và lỗi JavaScript. Mốc P6 chỉ được phát hành khi workflow GitHub Actions toàn bộ hồi quy đạt **SUCCESS trên exact commit SHA**.

P6 không hoàn tất cổng Windows/Android vật lý, cân bằng do người chơi duyệt, duyệt mỹ thuật của chủ dự án, video tạo sinh hoặc âm thanh có giấy phép mới. Xem `CLTQ_GAP_AUDIT.md` để biết trạng thái phát hành hiện hành.
