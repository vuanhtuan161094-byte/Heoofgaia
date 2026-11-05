# HG32 — Organic Economy / PvE Balance Audit, 05/11/2026

## Trạng thái và phương pháp

- **Phạm vi:** New Game → 5 mỏ → T10 → Boss T11 → Lv100 → HG30 Chiến Vệ / Tối Thượng → 40 tầng Tháp nhận thưởng → HG31 Long Hồn và Tinh Không 3/3 → chuyển sinh. **Không cấp gold, quân, item, mảnh, XP hay quyền thắng QA.** Chỉ `E.make`, engine commands (`recruit`, `upgrade`, `learn`, `tick`, `startMarch`, `battleAct`, `hg21TowerEnter`, `hg30ClaimTrial`, `hg30Convert`, `hg31Craft`, `equipItem`, `rebirthHG18Hero`, v.v.).
- **Thời gian:** mô phỏng engine có tăng tốc (60× khi chơi bình thường, **1× khi đợi reset theo ngày UTC**); không phải phiên người chơi thực tế kéo dài 20 ngày. Không tự sửa `state.lastTick`, `state.army`, `state.res`, `state.hgXX` để lấy thưởng. Các bài QA cũ dùng fixture vẫn giữ riêng, **không** được tính là bằng chứng organic.
- **Một repo/nhánh/HTML:** `vuanhtuan161094-byte/Heoofgaia`, `feature/hog1-research-to-playable-20261102`, `Play-Heoofgaia-HG11.html`. **Save v07**, HG28 của Codex không bị sửa UI.
- **CI SOURCE:** `6b0b9a869b39616b4141e3d143ab3590aad5d982`, full Actions [#41971073269](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/41971073269) **SUCCESS**. Tất cả cổng Node/Chromium, build và Save regression hiện có PASS.
- **Nguồn số liệu:** Actions artifact `HG32-organic-NoSeed-economy`, `docs/qa/hg32/organic-audit.json` và `docs/qa/hg32/organic-full-endgame.json`.

## Số đo trực tiếp từ engine

| Chỉ số | Tự chơi giai đoạn đầu | Chạy dài hạn không fixture |
|---|---:|---:|
| New Game bắt đầu | 16 quân T1, 33.000 vàng | Cùng dữ liệu canonical |
| NPC thắng | 15 | 188 NPC thắng (bao gồm Boss và farm Lv8) |
| Tháp có thưởng | 3 | 40 (5 lượt/ngày UTC, 7 lần đợi reset 1×) |
| Boss T11 thắng | — | 9 (1 trước Chiến Vệ, 8 sau) |
| Mỏ chiếm bằng trận thắng | — | 5 |
| Xây dựng / nghiên cứu | — | 53 / 21 |
| Trận farm NPC 8★ để đạt Lv100 | — | 179 |
| Số quân T10 tuyển bù từ kinh tế thật | — | 108 (6 đợt) |
| Tổng quân tuyển qua nguồn hợp lệ | 24 T1 đầu game + bổ sung | 250 |
| Thời gian game mô phỏng tích lũy | 0,197 ngày / 4,73 giờ | 20,55 ngày |
| Chiến Vệ HG30 | 1 | Đã chuyển hóa thật |
| Quân Tối Thượng HG30 | — | 1 chuyển hóa thật, **không có quân miễn phí ở tầng 10** |
| Long Hồn | — | 1 Kiếm ghép bằng Boss loot thật |
| Tinh Không | — | Đã ghép, mặc 3/3 món |
| Bonus set được đo | — | `damageBonus=0.08`, `damageReduction=0.085` |
| Save/Load / chuyển sinh Lv100 | Save v07 hợp lệ | PASS; sau chuyển sinh Lv1/Rebirth1 |
| Vàng còn trước/sau chuyển sinh | 41.596 lúc nhận Guard | 78.000 / 73.000 |

### Số liệu giới hạn dưới (không được dùng làm dự đoán hoàn thành)

- Tháp tới tầng 21: cần **20 lượt trả thưởng**, tối thiểu 4 ngày lịch theo mức 5/ngày.
- Ba món Tinh Không cần **27 mảnh mục tiêu**, **36 Phù Văn HG29**, **12 mảnh Ấn Anh Hùng**, **6 Ấn Boss**. Giới hạn dưới của 36 Phù Văn với mốc x2 mỗi tầng bội 5: **30 lượt nhận thưởng** (6 ngày); còn phải tính các nguyên liệu đã tiêu hao cho HG30.
- Chặng tích hợp thật có HG30 Tối Thượng, Long Hồn và Tinh Không 3/3 đã qua **40 lượt Tháp có thưởng**, sau 7 lần đợi reset lịch UTC. Điều kiện item, vàng và boss đều được đáp ứng mà không cấp nguyên liệu.
- Đây là mô hình tự thiết kế của Hẻoofgaia, **không phải** tỷ lệ máy chủ Heroes of Gaia năm 2009.

## Lỗi đã sửa có nguồn gốc rõ ràng

1. **P0 Save HG21:** sau khi chọn đội Tháp, đưa tướng ra bản đồ thì HG20 xóa kế hoạch quân của tướng để điều binh thật, còn HG21 lại đòi kế hoạch đó trong bộ kiểm tra Save dù tướng đang đi. **Sửa `hg21-tower-tactical.js`:** chỉ kiểm tra cấu trúc picks lưu trữ; khi **vào Tháp thật** vẫn kiểm tra quân/slot/tướng ở nhà nghiêm ngặt. Bài HG32 kiểm Save ngay trong march đã PASS.
2. **P0 tiến trình HG30:** HG21 trước đây trực tiếp sinh `race_tower_sovereign` tại Tháp tầng 10, bỏ qua chuỗi nhiệm vụ Boss/mảnh/vàng. **Sửa mốc:** ghi nhận mở mục tiêu nhiệm vụ thay cho phát quân miễn phí. Quân Tối Thượng từ Save cũ không bị xóa. Test organic khẳng định sau Tháp10 quân Tối Thượng vẫn là 0, chỉ tăng thành 1 khi thực thi `E.hg30Convert(s,'sovereign')` và trừ đủ giá.
3. **Khác biệt đồng hồ:** thời gian game ở chế độ 60× không tương đương ngày lịch UTC của hạn mức 5 lượt Tháp. QA HG32 chuyển qua **engine `E.setSpeed(s,1)` rồi `E.tick` 24 giờ** khi đợi reset. Không sửa `claims`/ngày để lách giới hạn.
4. **Sức bền quân:** T10 bị hao hụt đáng kể trong 179 trận NPC8 và 9 Boss; QA phải **tuyển bù 108 T10 bằng gold/vật liệu/doanh thu mỏ**, không được tự đặt lại số lượng.

## Cân bằng và quyết định

**Kết luận:** chưa chứng minh có softlock cho tuyến Human/PvE này. Mọi loại nguyên liệu/điều kiện để ghép một Kiếm Long Hồn và ba món Tinh Không đều đã được kiếm từ hành động thật. Vì vậy **không giảm đại trà giá công trình/chi phí/độ khó**, cũng không tạo vật phẩm mới khi chưa có bằng chứng.

**Cần giám sát:** 179 trận farm NPC8 để Lv100 là lặp lại nhiều; 108 T10 thay quân sau chuỗi săn là chi phí đáng kể. Đây là số đo cụ thể để nghiên cứu cải tiến nhịp độ / cơ chế hồi phục hoặc farm auto sau này, không tự tăng EXP/drop để che sự lặp.

**Giới hạn còn lại:** một nhánh Human đã có thử nghiệm toàn tuyến tự động, **không phải** 4 tộc đều đã chơi xuyên suốt tự nhiên, không có nghiệm thu Windows/Android vật lý hay chơi tay 20 ngày; art/UI/animation vẫn thuộc HG28 giao Codex. G3/G5 vật lý giữ BLOCKED, không gắn PASS giả.

## Lệnh kiểm thử

```bash
node qa-hg32-organic-economy.cjs
node qa-hg32-organic-full.cjs
node qa-hg30-ascension.cjs
node qa-hg31-legendary.cjs
python build_offline.py
```

Cổng CI đầy đủ chạy `.github/workflows/hog-combat-offline.yml` và xuất `docs/qa/hg32/*.json` trong artifact `HG32-organic-NoSeed-economy`.
