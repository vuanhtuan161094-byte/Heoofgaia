# HG31 — Bộ trang bị cao cấp và mảnh theo món (05/11/2026)

**Hợp đồng triển khai:** Hẻoofgaia offline; một repo, nhánh `feature/hog1-research-to-playable-20261102`, HTML `Play-Heoofgaia-HG11.html`, **Save v07**. HG31 là **SIMULATED / original gameplay** lấy cảm hứng Heroes of Gaia, không phải tỷ lệ rơi hoặc công thức gốc 2009 đã được xác minh.

## Nguồn và vòng chơi

- Boss Ma Giới **T11/T12** thắng thật: **1 mảnh Long Hồn** cho món đã theo dõi. **T13**: 2 mảnh. Chỉ tính trận NPC tier cao và sau verdict `win`; Boss 3 tướng/6 stack chỉ là **một lần** trả thưởng.
- Tháp Bí Cảnh: mỗi **chiến thắng còn lượt nhận thưởng** cho **1 mảnh Tinh Không** của món đã theo dõi; tầng chia hết cho 5 trả **2 mảnh**. Thắng lượt luyện tập sau giới hạn 5 lượt/ngày: **không** rơi HG31.
- Mỗi bộ có **ba mảnh mục tiêu riêng**, người chơi chủ động chọn vũ khí/giáp/ấn trên màn Rèn trước khi xuất chinh. Boss và Tháp có mục tiêu độc lập, nên không làm mất nguồn thưởng của nhau.
- Không đổi mục tiêu khi trận/hành quân còn chạy hoặc hệ tự săn HG26 bật. Lưu Save/reload giữ nguyên mục tiêu và mảnh; không phát thưởng hồi tố khi cập nhật Save v07.
- Các phần thưởng cũ HG18/HG27/HG29/HG30 và Tháp mốc 25 vẫn hoạt động, HG31 tạo **ví mảnh riêng** và chỉ có một receipt cho mỗi victory ordinal/counter.

## Danh mục trang bị thực (ITEMS canonical)

| ID | Tên | Ô | ATK | DEF | SPD | Mảnh/nguyên liệu chính | Điều kiện |
|---|---|---|---:|---:|---:|---|---|
| dragon_blade | Long Hồn Chiến Kiếm | weapon | 42 | 9 | 3 | 6 mảnh Kiếm, 4 Lõi Ma Giới, 3 Huy hiệu Thợ Săn, 1 Ấn Boss, 15.000 vàng | Thắng 1 Boss HG31; Tháp đã vượt tầng 10 |
| dragon_plate | Long Hồn Thần Giáp | armor | 6 | 49 | 2 | 6 mảnh Giáp, 4 Lõi Ma Giới, 3 Huy hiệu Thợ Săn, 1 Ấn Boss, 15.000 vàng | Tương tự |
| dragon_seal | Long Hồn Pháp Ấn | charm | 15 | 22 | 6 | 6 mảnh Ấn, 4 Lõi Ma Giới, 3 Huy hiệu Thợ Săn, 1 Ấn Boss, 15.000 vàng | Tương tự |
| star_blade | Tinh Không Thần Kiếm | weapon | 64 | 13 | 5 | 9 mảnh Kiếm, 12 Phù Văn Cổ Tháp, 4 Mảnh Ấn Anh Hùng, 2 Ấn Boss, 24.000 vàng | Thắng 3 tầng Tháp có thưởng HG31; đã vượt tầng 20 |
| star_plate | Tinh Không Thánh Giáp | armor | 12 | 68 | 3 | 9 mảnh Giáp, 12 Phù Văn Cổ Tháp, 4 Mảnh Ấn Anh Hùng, 2 Ấn Boss, 24.000 vàng | Tương tự |
| star_seal | Tinh Không Thiên Ấn | charm | 22 | 31 | 9 | 9 mảnh Ấn, 12 Phù Văn Cổ Tháp, 4 Mảnh Ấn Anh Hùng, 2 Ấn Boss, 24.000 vàng | Tương tự |

Trang bị **không bán tại Bazaar**, không tự sinh trong New Game, mọi vật phẩm ghép được đưa vào **kho `state.inventory` canonical**, mặc bằng `E.equipItem`, +10 dùng hệ thống HG18. Cấp công trình Bazaar không mở món trực tiếp.

## Bonus 2/3 và 3/3 có tác động vào combat

| Bộ | 2 món đang trang bị | 3 món đang trang bị |
|---|---|---|
| Long Hồn | +6,5% sát thương cận chiến và đánh xa | Thêm +6,5% giảm sát thương |
| Tinh Không | +8% sát thương đầu ra | Thêm +8,5% giảm sát thương |

Bonus qua `E.combatModifiers(s, heroId)` được chiến trường dùng **theo tướng sở hữu mỗi stack**, không áp dụng nhầm cả đội. Tổng giới hạn toàn hệ vẫn **damageBonus/melee/ranged ≤25%**, **damageReduction ≤20%** theo engine hiện tại. Stats `E.heroStats` tính ATK/DEF/SPD của item thật. Không viết lại chiến đấu HG26.1 hay 3×2 Tháp.

## Save và test

- `state.hg31`: v=1, 6 balance fragments, focusBoss/focusTower, 2 victory high-water counters, bossWins/paidTowerWins/crafted, last receipt, tối đa 20 lịch sử.
- `strictSave` kiểm tra IDs, số nguyên/giới hạn, counter không vượt victory đời thực, receipt hợp lệ. `parseSave` với Save v07 cũ khởi tạo ví trống, high-water counters từ những trận đã qua; tuyệt đối không phát thưởng lại.
- `qa-hg31-legendary.cjs` chạy: New Game 4 tộc, migration, thật Tháp, thật Boss trên fixture tăng sức chiến đấu (giao tranh vẫn thực), lượt Tháp không thưởng, khóa đổi focus giữa hành quân, ghép đúng món/đúng giá, bonus combat thật, từ chối Save giả/túi đầy.
- `qa-hg31-ui-chrome.py` chụp **10 màn 1280×720**, **5 màn 960×540**, **6 màn fixture trước/sau ghép/mặc và cold reload**. Cần không có uncaught JavaScript errors, các nút chọn/ghép/mặc thật, Save v07 đúng, ảnh thật chứ không phải mockup.
- Đóng gói duy nhất từ `index.html` và `build_offline.py`; workflow kiểm thử ngược HG21/HG26.1/HG27–30; chỉ coi bản chính thức khi GitHub Actions **SUCCESS** cùng SHA chứa code.

## Bảo lưu giới hạn

Đây là bước HG31 tính năng, **không phải** kiểm thử hàng chục giờ New Game tự nhiên tới Boss/Tháp 20 và ba bộ đồ. Fixture chỉ cấp nguyên liệu để test giao dịch. Vẫn cần HG28 nâng asset UI/sprite chiến đấu, đo tiến trình farm thực và nghiệm thu Windows/Android vật lý. Các giá trị được thiết kế để có sink và hướng phát triển, **chưa có thống kê thời gian farm đủ lớn để coi là cân bằng tối ưu**.
