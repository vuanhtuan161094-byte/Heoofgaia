# MƯU ĐỊNH TAM QUỐC — KINH TẾ THÀNH TRÌ V2 (19/11/2026)

**Phạm vi:** 31 công trình module + 7 công trình legacy giữ nguyên; không đổi Save key/version hoặc canonical generator. Tất cả công thức mới đều **SIMULATED**, không khẳng định là công thức Wiki.

## Cân bằng đã code

- Kho escrow cơ bản tăng lên **2 giờ sản lượng/cấp** (trước đó 15–22 phút); tổng thời gian offline được tính vẫn tối đa **6 giờ**.
- Ngân Khố +2.500 sức chứa bạc/cấp, Kho Lương +1.800 sức chứa lương/cấp, Quân Nhu Doanh +180 sức chứa sắt/cấp. Đây là sức chứa, không tự tạo nguyên liệu.
- Xưởng Đúc Tiền +1% sản lượng bạc Dân Cư/cấp (tối đa 6%); làm tròn với số dư cố định để không phụ thuộc số lần tick.
- Thuế và thương mại thưởng thêm bạc có trần cộng dồn +25%; Rừng Săn Bắn thưởng bạc và uy danh đến +12%; Hải Đăng giảm thời gian hải thương tối đa 12%.
- Thu thuế cơ bản 4 lượt/ngày UTC, Quốc Chính +1 lượt/cấp; hải thương 2 lượt/ngày, Hải Cảng +1 lượt/cấp. Săn 4, tuần tra 6, Xưởng Đúc Tiền 6, Thương Xã 12, Chợ mua/bán 24 lượt/ngày; các hành động còn lại có limit riêng hoặc mặc định 12. Cooldown vẫn độc lập.
- Đường giá nâng cấp: bậc **1,30** (trước 1,35). Thời gian tăng +35%/cấp khi vượt cấp 3, thêm 15% đối với công trình mở Thành Chính 3–5 và 40% đối với Thành Chính 6 trở lên. Nghiên cứu 8 ngành, kinh tế legacy và chi phí nâng cấp legacy không đổi.
- Save bổ sung `nlCity.dailyUsage` và `nlCity.productionBonusRemainder`; đọc Save cũ thiếu hai trường sẽ khởi tạo tương thích. Receipt idempotent vẫn giữ nguyên.

## Tính toán ngân sách 187 lần nâng cấp **trả phí**

- Thành Chính cấp 1 là cấp được cấp sẵn, không tính phí lần nữa.
- Cả 31 công trình từ cấp xuất phát tới giới hạn: **702.948 bạc**, **189.525 lương**, **170.719 sắt**; xây nối tiếp có tổng thời gian đếm ngược **20.5 giờ**, chưa kể thời gian kiếm tài nguyên.
- Chưa tính nâng cấp công trình legacy, khoa kỹ, rèn đồ, tuyển quân hoặc chi phí trận chiến; người chơi không bắt buộc max tất cả.

## Mô phỏng 30 ngày, chỉ nguồn thụ động mới

Mô hình [`tools/nl_city_balance_sim.js`](../../../../tools/nl_city_balance_sim.js) **cho sẵn** cấp nhà ngay từ đầu; không trả tiền xây và không cộng Chợ/Nông Trại/Mỏ/chiến dịch, vì vậy **đây không phải dự đoán tổng tài sản game**. Mỗi lần vào game thu hoạch cả ba nhà sản xuất.

| Trường hợp, thu hoạch 2 lần/ngày | Bạc 30 ngày | Lương 30 ngày | Sắt 30 ngày |
|---|---:|---:|---:|
| 3 nhà sản xuất cấp 1, chưa có kho | 36.000 | 108.000 | 21.600 |
| Như trên + Ngân Khố 1, Kho Lương 2, Quân Nhu 4 | 108.000 | 324.000 | 64.800 |
| Sản xuất 6/5/5, có kho trên + Đúc Tiền 1 | 366.000 | 756.000 | 151.200 |

Dòng tiền đã bị chặn bằng giới hạn kho/cap ngày, nhưng người chơi vẫn cần nhiệm vụ, chinh phạt và nguồn legacy để phát triển nhanh; không áp dụng tỷ lệ Wiki chính thức cho bản cổ điển.

## QA & phạm vi chưa nghiệm thu
- Các điều kiện cần thử: 187 nâng cấp, 34 loại hành động, kho offline, bonus khi có/không có công trình, hạn mức ngày/đổi ngày, chống mua–bán sinh bạc, Save v5 roundtrip, không ghi đè kinh tế legacy.
- **PENDING Chat 08:** nối vào generator và game thật, xem màn hình 1280×720/390, Save reload/import/migration v1–v4, sức chứa hiển thị đúng, CI exact SHA.
- **PENDING các chat 01/02/04/05/06:** hiệu ứng ngoài kinh tế lên quân/tướng/trang bị/chiến dịch, không báo INTEGRATED khi mới có descriptor.
- Không merge PR #10; không dùng Codex Cloud.

**Bảo vệ bổ sung:** thao tác mới bị từ chối nếu đồng hồ thiết bị lùi trước `nlCity.lastAt` (`CLOCK_ROLLBACK`); receipt cũ vẫn trả lại không trừ thêm. Kho token city giới hạn mềm 10.000.000 đơn vị/mỗi loại, không giới hạn bạc/lương/sắt/uy danh theo trần này. Save cũ được bổ sung trường trạng thái còn thiếu khi đọc.
