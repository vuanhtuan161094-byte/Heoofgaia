# CHAT 01 — A1/A2/A3 V7: Nguồn Trung Quốc + hồ sơ cân bằng 207 tướng (19/11/2026)

## Phạm vi
- Repo `vuanhtuan161094-byte/Heoofgaia`, nhánh `feature/nl-v2-heroes`, không merge, không Codex Cloud.
- Không sửa `index.html`, `alpha_content.json`, combat resolver, NPC maps, Save, generator game hoặc workflow CI.
- Kế thừa bảng audit V5/V6, **chỉ xử lý 207 hồ sơ tồn đọng** (17 Ngụy, 121 Quần, 69 Trung lập), không đổi roster 364 ID nguồn.
- Owner đã cho phép **tự cân bằng thông số khi không có nguồn**; toàn bộ số do dự án tính gắn `SIMULATED`, không gắn nhãn `VERIFIED`.

## Tìm kiếm ngoài VNG bổ sung
Nguồn nước ngoài (Trung Quốc đại lục, bảng web cổ, thông báo Mobile Trung Quốc và website Đài Loan) được tách edition:

1. Lequ 2012 về tướng đánh liên tục, kỹ năng Khiên Kích: https://www.lequ.com/wly/201207/32916.html
   - Văn Khâm 文钦: 76 / 82 / 56; sau 10 chuyển sinh 88 / 106 / 79 (phiên bản cổ).
   - Vương Song 王双: 76 / 89 / 48; skill Khiên Kích (2012).
2. Bảng tướng chiến dịch cổ: https://www.snsfun.com/wly/m/ziliao/20121123/41617.html
   - Ngưu Kim 牛金 73 / 80 / 44, Liên Hoàn `连环`.
   - Triệu Phạm 赵范 48 / 50 / 61, Tự Hủy `自毁`.
   - Chu Chỉ 周旨 74 / 84 / 42, Kỵ Đạp `骑踏`.
   - Lý Điển 李典 77 / 78 / 78, Đột Kích `刺击`.
   - Vương Song, Vương Uy cũng có số liệu và kỹ năng nguồn cổ bổ sung.
3. Lequ 2026 sự kiện Hội Đàm: https://h5.lequ.com/wly/202609/145641.html — Quản Lộ 管辂 xuất hiện là NPC nói chuyện nhận thưởng, không chứng minh có thể chiêu mộ.
4. Mobile Trung Quốc/Android 6.1.0.8, cập nhật 30/09/2026: https://www.taptap.cn/app/45385/all-info — Tiên Vu Phụ 鲜于辅 và Hoàng Loạn 黄乱 có mặt trong danh sách **tướng Cam bổ sung**; không có công thức kỹ năng Cam trong phần công bố này.
5. Hướng dẫn kế thừa kỹ năng Lequ 20/06/2024: https://www.lequ.com/wly/202406/142697.html — `陷阵摧坚` ghi Tiên Vu Phụ/Hoàng Loạn là **tướng nguồn kế thừa**, có hệ số 28.000–56.000% theo cấp; **không** gán những hệ số này vào kỹ năng Cam đang trang bị năm 2026.
6. Các nguồn V6 trước đây vẫn độc lập: bảng 2011–2014, nhật ký đổi chiêu mộ 04/06/2021 (69 ca) và hồ sơ Tây/Đài; không biến luật Trung Quốc thành quy tắc VNG Mobile 2026.

### Mức độ chứng cứ 207 backlog
- **200/207** có ít nhất một nguồn bổ sung tên/cơ chế/chỉ số/điều kiện tuyển theo một edition ngoài Wiki; **199** có nguồn toàn trang được đọc hoặc bảng công bố, **1** (Tỏa Nô) chỉ là snippet chưa truy cập được toàn văn.
- **7** không có nguồn nhân vật Ngọa Long mới ngoài Wiki: **Dương Cổ, Kha Ngô, Dương Nghi, Đinh Nguyên, Lâu Ban, Vô Khâu Kiệm** (Quần); **Nghiêm Dư** (Trung lập).
- 200 có nguồn không có nghĩa là 200 bộ chỉ số Mobile, cũng không có nghĩa có thể chiêu mộ ở bản Việt Nam hiện nay.

## Thiết kế gameplay tự tạo V7 — 207/207
`a123_simulated_207_design_v7.json` (tái tạo bằng `node data/ngoalong/modules/heroes/a123_simulated_207_builder_v7.js --check`) chứa:
- 3 chỉ số dự kiến **Chỉ Huy / Võ Lực / Trí Lực** và 7 combat fields (HP, ba công, ba thủ, morale);
- 7 role `DEFENDER/STRIKER/CAVALRY/ARCHER/STRATEGIST/SUPPORT/DISRUPTOR`, 5 troop families đề xuất (không tự tham chiếu IDs của Chat 02);
- 207 kỹ năng gốc **đặt tên khác nhau theo từng tướng**, 207 passives có id duy nhất; target, lane, damage, heal/control/status, duration và cooldown, giới hạn target/cap;
- đề xuất tuyển tướng cho 28 ải: không dùng random chance; nhận một lần khi hoàn thành mục tiêu, không tự cấp thưởng khi replay. Trung lập có thể là Boss trước, hoàn thành nhiệm vụ mới thành đồng minh **chỉ theo luật mô phỏng dự án**;
- hệ phát triển `VETERAN` rồi `ELITE`, level yêu cầu 15/30, bạc và hero-seal mô phỏng; **không tự suy ra tương ứng các màu giác ngộ VNG**.
- Mọi hiện hành VNG (chỉ số, kỹ năng đang mặc, xác suất, nguyên liệu riêng, chiêu mộ) chưa chứng minh thì `UNKNOWN`, không ghi đè fact.

### Ví dụ thiết kế SIMULATED (KHÔNG phải số VNG)
| Tướng | Chỉ Huy/Võ/Trí | Vai trò | Active đề xuất |
|---|---:|---|---|
| Lý Điển | 76/82/68 | STRIKER | Thương Phong Truy Kích · Lý Điển |
| Vương Song | 80/83/51 | DEFENDER | Thiết Trận Trấn Quân · Vương Song |
| Ngưu Kim | 73/74/62 | DISRUPTOR | Kỳ Mưu Nhiễu Quân · Ngưu Kim |
| Văn Khâm | 79/78/58 | DEFENDER | Huyền Giáp Phản Kích · Văn Khâm |
| Quản Lộ | 61/42/87 | SUPPORT | Hồi Sinh Quân Khí · Quản Lộ |
| Nghiêm Dư | 76/87/52 | STRIKER | Thương Phong Truy Kích · Nghiêm Dư |

## QA, giới hạn và handoff
- Có unit test `qa/modules/heroes/a123_simulated_207_v7.test.cjs` kiểm đầy đủ 207 ID, identity/rank, 7 roles, source boundaries, 28 stages, one-time receipts, no auto-promotion; generator có `--check` để so snapshot byte-for-byte.
- Đã thực hiện **2.486 kiểm tra dữ liệu trong V8 logic phiên làm việc** khi tạo candidate. Đây **không** phải native Node, GitHub CI, Chromium hay kiểm thử chiến đấu thật. Cần kết quả thực tế trên exact-SHA trước khi ghi TESTED native.
- **0/207 tướng được nhập gameplay runtime** ở Chat01, mọi record `DESIGN_CANDIDATE_NOT_INTEGRATED`; combat owner Chat05, runtime/Save owner Chat08. Không ghi nhận 207 playable.
- 207 skill prototype mới sử dụng **kiểu tác dụng mô phỏng**; Chat05 cần xác nhận support/bleed/dot, no double heal/status, check Morale, kiểm thử deterministic/replay/PvE trước khi chuyển sang executable.
- Chat08 cần kiểm tra Save v5, authorititative ownership, balance 28 ải, receipts chống exploit, UI/Chromium, CI exact SHA. Không merge khi chưa nghiệm thu.
