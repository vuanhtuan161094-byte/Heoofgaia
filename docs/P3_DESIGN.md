# P3 — Chiến lược AI, binh chủng và 24 trận hình

**Trạng thái:** triển khai / mô phỏng độc lập (SIMULATED). Không sao chép công thức từ game Ngọa Long gốc. Game nhận input, tự tạo combat state, ghi event + snapshot, quyết toán thưởng một lần, save rồi render.

## AI chọn mục tiêu

- Vị trí ô 3×3: cột 3 (chỉ số `%3==2`) là tiền tuyến; bộ/kỵ thường bị chặn bởi quân trước còn sống. Tấn công cung thủ/chế độ đánh sau tập trung vào cột hậu tuyến gần nhất theo làn.
- Trong tập mục tiêu hợp lệ, AI chấm điểm theo: tướng trống/hỗ trợ có nguy cơ cao, mục tiêu yếu máu, hệ số khắc chế, độ lệch hàng. Player được điều khiển bằng kiểu ưu tiên đội hình; địch luân phiên 4 kiểu theo ải.
- **pressure** (Tiên Phong): ưu tiên gây áp lực; **counter** (Điều Quân): ưu tiên binh chủng bị khắc chế; **protect** (Thủ Hậu): ngăn nguồn hỗ trợ/đánh trống địch; **finish** (Kỳ Kích): ưu tiên mục tiêu ít HP.
- Hệ số Bộ thắng Kỵ, Kỵ thắng Cung, Cung thắng Bộ là 1.22; khi bị khắc chế 0.82. Mưu sĩ có lợi thế gây áp lực lên Bộ; hỗ trợ/trống không tạo chu trình khắc chế riêng.

## Luyện binh theo võ tướng

| Cấp | Danh hiệu | Điều kiện | Bạc | Lương | Sắt |
|---|---|---|---:|---:|---:|
| 1 | Tân Binh | Mặc định | 0 | 0 | 0 |
| 2 | Tinh Binh | Doanh Trại cấp 2 | 1.760 | 840 | 680 |
| 3 | Thiết Quân | Doanh Trại cấp 3 | 3.960 | 1.890 | 1.530 |
| 4 | Ngự Lâm | Doanh Trại cấp 4 | 7.040 | 3.360 | 2.720 |

Công thức nâng lên N: bạc `440*N²`, lương `210*N²`, sắt `170*N²`. Mỗi cấp tăng khoảng **11,5% công**, **9% phòng**, **7,5% HP** theo cấp cơ bản, với giới hạn 4 cấp. Địch đạt tier 2/3/4 từ ải 9/17/25; gain của địch thấp hơn gain của người chơi. Chỉ số quân số tuyệt đối không đổi khi nâng cấp. Trống đổi vai trò chiến thuật nhưng giữ level và định danh tướng.

## 24 mẫu có tác dụng thực

Mỗi ô dưới đây là một mã preset: đổi `formation`, `p3PresetId`, xếp tối đa 5 tướng đang sở hữu theo lớp vai trò. Không cấp tướng/quân/vật phẩm mới. Mỗi mẫu dùng một trong bốn bố cục có 5 ô hợp lệ, đồng thời có ưu tiên AI tương ứng.

| Trận pháp | Tiên Phong | Điều Quân | Thủ Hậu | Kỳ Kích |
|---|---|---|---|---|
| Phong Thỉ | `spear-van` | `spear-dieu` | `spear-thu` | `spear-kich` |
| Phương Viên | `shield-van` | `shield-dieu` | `shield-thu` | `shield-kich` |
| Hạc Dực | `arc-van` | `arc-dieu` | `arc-thu` | `arc-kich` |
| Ngư Lân | `fish-van` | `fish-dieu` | `fish-thu` | `fish-kich` |
| Nhạn Hành | `goose-van` | `goose-dieu` | `goose-thu` | `goose-kich` |
| Huyền Vũ | `turtle-van` | `turtle-dieu` | `turtle-thu` | `turtle-kich` |

Bốn tập ô được dùng là `van=[2,5,8,4,7]`, `dieu=[2,5,1,4,7]`, `thu=[2,5,0,3,6]`, `kich=[2,5,8,1,4]` (mã ô 0–8, cột 3 tiền tuyến).

## Tương thích và bằng chứng

- P2 kỹ năng, sĩ khí, ba dạng công/thủ, replay snapshot, nhận thưởng một lần giữ nguyên.
- Các thuộc tính mới `p3TroopTier`, `p3PresetId` là trường tùy chọn của schema v3, được nạp bổ sung cho save cũ, không tạo key localStorage mới.
- Ảnh Chromium, nguồn exact SHA và kết quả test được lưu bằng GitHub Actions, không nhận là đã duyệt mỹ thuật.
