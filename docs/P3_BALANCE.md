# P3 — Kiểm toán cân bằng 360 kịch bản cố định

Mô phỏng độc lập (SIMULATED), không phải thông số Ngọa Long gốc. Mục tiêu là phát hiện độ khó đột ngột, phân biệt đội yếu/trung bình/mạnh, không phải chứng minh cân bằng hoàn hảo.

## Phương pháp

- **360 trận** thực hiện từ lõi chiến đấu trong Chromium: 3 nhóm sức mạnh × 5 mốc ải (1/4/9/16/24) × 24 preset.
- Đặt seed cố định `7777+stage` và khởi tạo mới game state ở mỗi lần thử, tránh biến động kết quả từ tài nguyên trận trước. Đây là sweep DETERMINISTIC, không phải Monte Carlo hay tỷ lệ thắng thực tế.
- Nhóm yếu: level 1/3/6/10/15, quân 220/280/320/380/450, tier 1/1/1/1/2.
- Nhóm thường: level 2/5/9/15/23, quân 300/370/470/620/730, tier 1/1/2/2/3.
- Nhóm mạnh: level 3/7/13/22/32, quân 380/510/650/800/900, tier 1/1/2/3/4.
- Ải 1/4 có 3 tướng; ải 9/16/24 có 5 tướng đã chiêu mộ trong fixture. Test không chứng minh tốc độ thực tế đạt tướng/cấp/đồ trong kinh tế game.

## Kết quả deterministic ở P3

| Ải | Yếu | Thường | Mạnh |
|---:|---:|---:|---:|
| 1 | 24/24 | 24/24 | 24/24 |
| 4 | 16/24 | 24/24 | 24/24 |
| 9 | 0/24 | 24/24 | 24/24 |
| 16 | 0/24 | **14/24** | 24/24 |
| 24 | 0/24 | **12/24** | 24/24 |

Quan sát ban đầu: nhóm Thường ải 16 chỉ thắng **2/24**. Giảm 10% công/thủ/HP phe địch ở ải **13–20** cho tỷ lệ mô phỏng 14/24, không thay thông số của những mốc khác. Địch ải 17 tiếp tục được hưởng cấp quân riêng, nên vẫn cần playtest dài hạn.

## Acceptance gate

- P2 full 31/31; P2 advanced 12/12; P3 functional 74/74.
- Balance profile monotonic: yếu ≤ thường ≤ mạnh tại mọi mốc ải.
- Nhóm thường ải 16 phải đạt 5–20/24 và ải 24 4–20/24 theo sample seed. Đây là **gác cổng chống hồi quy**, không áp đặt quy tắc game tương lai.
- Bản build và screenshot thật phải cùng SHA; nghiệm thu máy thật, thời gian lên cấp, độ khó cấp độ xa hơn và cảm giác trận đấu: PENDING.
- Chi tiết từng trận ở artifact `qa/balance-probe.json` của GitHub Actions.
