# HG-18.2 — Cân bằng EXP, AP và quân T9–T10 · Nghiệm thu 04/11/2026

## Phân định nguồn và mô hình
- **Đã đối chiếu:** SRC45 ghi EXP cơ bản NPC 4★=1.000, 5★=4.000, 6★=9.000, 7★=18.000, 8★=30.000. SRC20 ghi giới hạn AP và hồi AP theo danh vọng. Bảng EXP cấp 1–100 và điểm chỉ huy HG-07 vẫn giữ nguyên.
- **HG-18.2 tự thiết kế:** thưởng EXP đầu tiên khi chinh phục một trại NPC 4★+, EXP riêng Boss 9–10★, hiệu quả Hero Tower + Scouting, AP giảm theo Trinh sát và logistics T9–T10. Không nhận các số cân bằng này là chỉ số game gốc.
- **Save:** giữ version 7, không thêm trường persist, không RNG, không thưởng theo mỗi tick. Điều kiện thưởng khai phá sử dụng `cleared` hiện hữu; ghi đúng `battleReports[*].heroXp`, `E.strictSave` và cold reload qua các bài QA.

## Công thức cân bằng

### EXP chiến dịch
Chỉ áp dụng sau khi thắng NPC 4★ trở lên, không thay đổi `NPC_BATTLE_XP`:
`factor = 1 + 0.55 × max(0, HeroTower−1) + 0.22 × Scouting`.
Thưởng thêm từ XP cơ bản bằng `floor(baseXP × (factor−1 + (firstClear ? 1.5 : 0)))`.
Boss 9★ cộng `35.000 × factor`; Boss 10★ cộng `60.000 × factor`. Phần thưởng được tính vào `E.grantHeroExperience`, vẫn hưởng hiệu ứng EXP gốc của Hero Tower.
Ví dụ Hero Tower 9 và Scouting 3: factor=6,06; NPC 8★ kiếm 198.162 EXP mỗi chiến thắng tiếp theo, 247.212 EXP lần thắng đầu (đã tính bonus Hero Tower 9%).

### AP
- Mỏ: 6 AP như cũ; mục tiêu khác và NPC thấp cấp: 8 AP.
- NPC 4★ trở lên: `8 − min(3,Scouting)` AP, tối thiểu 5 AP.
- Kiểm tra và khấu trừ nguyên tử; thiếu AP không khởi hành và không mất AP. Không thay bảng hồi AP SRC20.

### Tuyển T9–T10
- Unit catalog gốc không sửa. Manufacturing vẫn giảm vàng 2%/cấp, tối đa 20%.
- Khi Blacksmith ≥8 và Manufacturing ≥6, nguyên liệu không phải vàng giảm `min(22%,5% × (Blacksmith−7) + 2% × (Manufacturing−6))`; mức Blacksmith10 + Manufacturing9 = **21%**.
- Khi Blacksmith ≥8 và Bootcamp ≥6, thời gian T9–T10 có khoản giảm riêng, tổng giảm tối đa 45% so với thời gian gốc. Mức Blacksmith10 + Bootcamp9: thời gian T10 2.250 giây/quân, so với 2.952 giây của Bootcamp9 trước HG18.2. Giao diện hiển thị `E.recruitDuration` cùng công thức engine, giá trừ thực bằng `E.recruitCost`.

## Kịch bản end-to-end — không cấp trước tài nguyên, EXP, quân cấp cao hoặc lõi
- New Game Human, 16 militia ban đầu; tuyển thêm militia trả tiền rồi đánh chiếm lần lượt 5 mỏ nguồn thật: **Wood (6,3), Gold (1,7), Crystal (8,7), Ore (10,2), Sulfur (12,6)**. Quân và tướng phải trở về sau từng trận.
- Sau khi chiếm 5 mỏ: sản lượng mỗi giờ game đạt **Gold 360, Wood 52, Ore 52, Sulfur 26, Crystal 26** tại giai đoạn khởi đầu. Sản lượng tiếp tục tăng khi nâng công trình.
- Nâng **56 lượt công trình**, làm **21 nghiên cứu** rồi tuyển **90 Archangel T10** bằng tài nguyên thật. Đội hình 90 quân tốn 450.000 điểm trong giới hạn tướng 514.833.
- Thắng Boss T11 (9★), claim nhiệm vụ tuần nhận lõi chuyển sinh và quân thưởng; farm 8★ nhận EXP; đạt Lv100 rồi chuyển sinh về Lv1 bằng lõi nhận được; cold reload Save v07 PASS.
- Kết quả: **5 trận mỏ + 1 Boss + 180 trận NPC 8★ = 186 trận**; **47** chu kỳ phải chờ tài nguyên (24 giờ game mỗi lần), tổng **1.227,655 giờ game mô phỏng** (~51,2 ngày game), 142 lượt tuyển quân (militia + 90 T10).
- Đối chiếu: baseline HG18.1 trước cân bằng **1.188 trận**, **5.319,023 giờ game**; HG18.2 không khai thác mỏ sớm **181 trận**, **5.113,390 giờ game**, 209 chu kỳ chờ tài nguyên. Như vậy luật mới giảm mạnh số trận; chiếm mỏ sớm mới thực sự rút ngắn đáng kể thời gian kinh tế.

## Kiểm thử và giới hạn
- `qa-hg182-balance.cjs`: 7 trường hợp kiểm thử EXP/AP không đổi theo nguồn, chi AP nguyên tử, giảm giá/giảm thời gian elite, thưởng một lần, chiến báo, Save v07.
- `qa-hg181-organic-endgame.cjs`: gameplay chính thức được thực thi bằng engine cùng thời gian game tăng tốc; không chạm trực tiếp quân T10, level, nguyên liệu hay lõi.
- `qa-hg18-core.cjs`, `qa-engine.cjs`, stress HG16, New Game HG17, Chromium HG18 và UI không cuộn phải tiếp tục PASS; workflow build HTML offline SHA deterministic.
- Thời gian 1.227,655 giờ là thời gian **game giả lập**, KHÔNG phải giờ chơi thật hoặc lời cam kết về pacing. Phần quản lý 90 quân, 7 stack, 180 trận vẫn cần playtest thủ công ở Windows để đánh giá thao tác, độ khó AI và cảm giác chơi. Không thiết kế PvP trong gói này.
