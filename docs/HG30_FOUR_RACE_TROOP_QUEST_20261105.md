# HG30 — Chuỗi nhiệm vụ chuyển quân bốn chủng tộc · 05/11/2026

**Nguồn chân lý:** `hg30-troop-ascension.js`, nạp sau `hg29-loot.js` trước UI. Một repo, một nhánh `feature/hog1-research-to-playable-20261102`, một bản `Play-Heoofgaia-HG11.html`, **Save v07**. Số liệu HG30 là **SIMULATED / ORIGINAL offline model**, không tự nhận là tỷ lệ/quy tắc 2009 đã xác minh.

## Hệ thống đã chốt

Quân tuyển bình thường `race_1` → `race_quest_guard` của HG18 → `race_tower_sovereign` của HG20. Có **3 nhiệm vụ** và **2 phép chuyển hóa có tiêu hao thật**, không thêm loại quân giả hoặc chỉnh combat stats:

1. **Thử thách tân binh:** thắng 2 NPC trên bản đồ + 1 tầng Tháp **có thưởng** sau khi cài HG30; bấm nhận chứng nhận, không nhận quân; mở công thức Chiến Vệ.
2. **Phong Chiến Vệ:** đã qua Tháp tầng 3 (floor >=4), tiêu hao 12 quân T1 **rảnh**, 12 Chiến tích HG27, 3 Phù ấn HG27, 6 Mảnh Hoang Dã HG29 và **3.000 vàng**. Nhận 1 `race_quest_guard`, mở nhiệm vụ Tối Thượng. Kể từ thời điểm đó mới ghi nhận thành tích yêu cầu cho bước 3.
3. **Thức tỉnh Tối Thượng:** sau bước 2 thắng **1 Boss T11+** (một trận thật, kể cả 3 tướng HG26.1 thì vẫn đếm 1) và **2 tầng Tháp còn lượt thưởng**; đã qua Tháp tầng 10 (floor >=11). Tiêu hao 1 Chiến Vệ **rảnh**, 4 Lõi Ma Giới, 8 Huy hiệu Thợ Săn, 4 Mảnh Ấn Anh Hùng, 12 Phù Văn Cổ Tháp (HG29), 2 Ấn Boss + 4 Phù ấn Tháp (HG27), **20.000 vàng**. Nhận 1 `race_tower_sovereign`, mở chuyển hóa lặp lại.

Mở nhiệm vụ chỉ một lần. Sau khi đạt bậc 3, người chơi có thể liên tục **farm và đổi thêm** Chiến Vệ/Tối Thượng, nhưng mỗi lần vẫn **trừ toàn bộ vật liệu và quân đầu vào**; không yêu cầu lại chuỗi một lần duy nhất. Bản quy định các suất này được phân biệt với **đơn vị thưởng trực tiếp theo nhiệm vụ HG18** hay **mốc Tháp HG21** để tránh thay thế/làm mất phần thưởng cũ.

## Quân có thật (từ catalog HG18/HG20), không tạo loại quân ngoài engine

| Chủng tộc | Chiến Vệ / Tier 8 (HP/ATK/DEF/SPD) | Tối Thượng / Tier 10 (HP/ATK/DEF/SPD) |
|---|---|---|
| Human | Thần Vệ Gaia: 240 / 85 / 71 / 7.6 | Thiên Giới Thánh Vệ: 1100 / 490 / 365 / 11 |
| Elf | Nguyệt Vệ Tinh Linh: 252 / 87 / 73 / 7.75 | Ngân Nguyệt Long Linh: 980 / 520 / 310 / 13 |
| Orc | Chiến Vệ Cuồng Phong: 264 / 89 / 75 / 7.9 | Viễn Cổ Chiến Thần: 1500 / 570 / 390 / 10 |
| Undead | U Minh Hộ Vệ: 276 / 91 / 77 / 8.05 | U Minh Bất Diệt Vương: 1230 / 535 / 345 / 11 |

Các hình vector khác nhau của hai bậc đã có từ HG27, chỉ để hiển thị và vào trận. **HG30 không tuyên bố đã có animation mới cho 8 quân này.** `tier 10` vẫn được engine đánh dấu `towerExclusive` theo HG20; tag này cũng dùng trong tính năng Tháp, không được HG30 gỡ bỏ.

## Authority — không cấp nguồn ảo

- Chỉ `E.battleAct` kết thúc `win` mới ghi tiến độ HG30. Tháp luyện tập hoặc thua trận **không tính**.
- `worldSeen`, `towerSeen` và `bossAfterGuard/towerAfterGuard` ngăn đếm trùng khi load lại hoặc khi Boss ba tướng cùng trận. Save cũ được nạp không nhận tiến độ hồi tố.
- Giá trị quân thực dùng `state.army`; kiểm tra toàn bộ đội hình `E.hg20HeroPlan` để không lấy quân đã phân tướng; không chuyển quân khi đang hành quân/chiến đấu hoặc bật auto-hunt HG26.
- Chi phí dùng canonical `state.hg29.shards`, `state.hg27` và `E.spend(s,{gold})`. Kiểm tra đủ toàn bộ trước khi trừ; không tiêu hao nếu thiếu điều kiện.
- Kết quả nhận đúng ID `race_quest_guard` và `race_tower_sovereign`; `E.getUnit`, combat và Save hiểu đây là đơn vị thật. Receipt giữ tối đa 30 lần đổi.
- Tướng và quân vẫn chạy theo cơ chế HG20/HG21/HG26.1; không thay 7 stack thường hay 3 tướng × 2 stack Boss/Tháp.

## UI / screenshot QA

- Tabs **Quân đội** và **Nhiệm vụ**: timeline 3 bước, tiến độ, ảnh unit thật 4 tộc, số dư/thiếu của mảnh và vàng, nút action real dispatch.
- `qa-hg30-ui-chrome.py`: New Game 1280×720 toàn **10 tab**, 960×540 ở World/Army/Tasks/Tower, và 6 ảnh fixture riêng: trial ready, trial claimed, guard made, sovereign ready, sovereign made, army after cold reload. Các ảnh fixture ghi rõ **được cấp nguyên liệu** để kiểm thử nút và strictSave, không thay cho chơi xuyên New Game–Boss.
- `qa-hg30-ascension.cjs`: New Game/legacy v07, live NPC/tower, 4 race conversions, thuộc tính bảo lưu, từ chối quân reserved, thiếu item không trừ, lưu/restoration, anti-duplicate. Kiểm tra kết quả quân Tối Thượng trong chiến đấu thật bổ sung.
- Đóng gói Builder hai lượt phải cùng SHA; workflow Chromium + QA không được đỏ. **Nếu không có CI SUCCESS thì không tuyên bố hoàn thành.**

## Next

- HG28: UI/UX & đồ họa bản đồ, popup, đầy đủ sprite/animation; chỉ ra ảnh thực và cải thiện theo ảnh.
- HG31: set cao cấp và mảnh ghép theo món. Quan trọng phải nghiên cứu thời gian farm thật để không có vật phẩm late-game đã lạc hậu.
- E2E Endgame: New Game không cấp sẵn → đủ 2 NPC, 1 Tháp → Chiến Vệ → boss sau chuyển vệ, thêm 2 tầng Tháp → quân Tối Thượng. Các kiểm thử dùng high-resource fixture được ghi rõ để không nhầm với acceptance người chơi thật.
