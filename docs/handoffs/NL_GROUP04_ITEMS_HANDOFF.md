# CHAT 04 — VẬT PHẨM VÀ TRANG BỊ — BÀN GIAO 19/11/2026

## 1. Trạng thái hiện hành

- Repo: `vuanhtuan161094-byte/Heoofgaia`.
- Task branch: `feature/nl-v2-items`; ban đầu tạo từ `feature/nl-codex-cloud-v1-finish@a88b8449714ad48531f7c9e7e081ccac43edee92`. **Source branch đã phát triển độc lập sau điểm tách**; Chat 08 phải so sánh HEAD và conflict trước khi tích hợp.
- Phân quyền đã tuân thủ: chỉ sửa `data/ngoalong/modules/items/`, `tools/nl_item_*.js`, `qa/nl_item_*`, và handoff nhóm này.
- **CODE READY trong module**: 19 trang bị gốc giữ nguyên + 392 mô hình trang bị dự án dựa trên chỉ mục Wiki = **411 mẫu PLAYABLE trong module**. Tách biệt **392 hồ sơ Wiki REFERENCE_ONLY**. Chưa nối runtime generator/Save UI, chưa nghiệm thu game.
- **Vật phẩm ngoài trang bị**: 2 vật phẩm do dự án thiết kế có tác dụng; 4 tham chiếu Wiki trong pack. Chỉ mục vật phẩm Wiki công bố 674, chưa bóc tách đầy đủ.
- **Không Codex Cloud, không merge, không sửa Save key v5, không sửa Hero, không tự bật drop cho phần thưởng**.

## 2. Nguồn / chất lượng dữ liệu

Nguồn chính: https://ngoalong.vnggames.com/ngoa-long-wiki/vat-pham/trang-bi (Ngọa Long Mobile VNGGames). Kiểm kê chỉ mục vào 19/11/2026.

- `data/ngoalong/modules/items/wiki_equipment_index_20261119.json`: 392 tên + cấp hiển thị + 19 nhóm, đối chiếu tổng nhóm 392/392. Phần nguồn **VERIFIED**: tên, cấp hiển thị, nhóm (transcription from public Wiki). **DERIVED**: ô trang bị phân loại theo thứ tự nhóm và ngữ nghĩa; chưa có bằng chứng đã bấm cả 7 nút lọc để xác minh từng ô. **UNKNOWN**: chỉ số Wiki, cách rơi, xác suất, công thức, giá gốc, điều kiện equip (mức cấp hiển thị không mặc nhiên là cấp tướng).
- `data/ngoalong/modules/items/catalogue.json`: 392 bản ghi Wiki giữ `integration:REFERENCE_ONLY`, `stats:null`, `effectRule:null`; tách khỏi 392 mẫu `PLAYABLE` **PROJECT_ORIGINAL / SIMULATED**. Đồng thời giữ nguyên 19 project gear và 6 bản ghi item (2 playable / 4 reference).
- `data/ngoalong/modules/items/rules.json`: chi phí cường hóa R03 gốc của dự án; tinh luyện, kho, bộ đồ đều **SIMULATED**, không công bố là cơ chế VNG. Có **12 bộ cao cấp** (Cùng Kỳ, Thao Thiết, Xi Vưu, Hình Thiên, Viêm Đế, Nữ Oa, Phục Hi, Hiên Viên, Hỗn Độn, Bàn Cổ, Diệt Thế, Thần Hoàng), mỗi bộ gồm 7 món/7 ô, kích hoạt chỉ số mới ở 2/4/7 món.
- `wikiIndexCounts.equipmentRecorded = 392`. Không nhầm 392 tên chỉ mục với 392 cơ chế hay asset chính hãng.

## 3. Các module và câu lệnh

- `tools/nl_item_inventory.js`: UMD/Node module thuần, giao dịch `grant`, `buy`, `equip`, `unequip`, `reinforce`, `refine`, `use`, `bonuses`, `sets` và `validateState`. Mỗi mutation dùng `receiptId` duy nhất; cùng receipt/payload thì no-op, receipt xung đột bị từ chối, state cũ không đổi khi lỗi. Mỗi instance có UID riêng; trang bị không thể được một lúc bởi hai tướng.
- `tools/nl_item_equipment_ui.js`: giao diện đáp ứng mobile, có CSS tự chứa, 7 ô, lọc tên/slot, túi trang bị, tiệm đồ, chỉ số, thưởng bộ, nút mua/mặc/tháo/cường hóa/tinh luyện. `mount(host,{pack,inventory,heroId,getState,setState,receiptId,onMessage})` yêu cầu host Save/receipt của chat 08. Chưa mount trong game thực.
- `tools/nl_item_import_curated.js`: **nguồn chuẩn hiện hành** chuyển 392 danh mục thành 392 trang bị gốc dự án (giữ nguyên các ID đã có). Lặp lại ổn định; lệnh `node tools/nl_item_import_curated.js --check` hoặc `--write`.
- `tools/nl_item_build_equipment.js`: bộ 29 ban đầu để tương thích, không chạm 363 món bổ sung khi catalogue đã đủ 392. `node tools/nl_item_build_equipment.js --check`.
- `tools/nl_item_wiki_index.js` + `tools/nl_item_full_equipment.js`: **luồng kiểm chứng độc lập khắt khe hơn** bằng Chromium/7 nút lọc; cần hoàn tất snapshot live. Không được ngụy tạo snapshot này từ file curated hoặc nhận dạng slot DERIVED là VERIFIED.

## 4. Hệ thống chiến đấu và kinh tế

- 7 ô chuẩn: `weapon, armor, horse, book, cloak, shield, artifact`. Save legacy `banner` giữ tương thích; không xóa/ghi đè ngầm.
- Chỉ số đầu ra: `atk, def, int, hp, tdef, mdef, weaponAtk, horseAtk`. Các hệ số và set bonus là luật gốc dự án. Phải cộng **một lần**, tuyệt đối không cộng cả `nlr03.equipmentStats()` cũ và `inventory.bonuses()` mới trong cùng một lane.
- Đồ nhóm `Thường` và `Chiến` có đường mua bằng bạc/sắt gốc dự án. Hàng cao cấp chỉ nhận từ kết quả/receipt được game cấp quyền; không có tỉ lệ drop Wikipedia mặc định; không tặng miễn phí.
- Cường hóa gốc giữ max 12, tăng 22% chỉ số nền mỗi level, bạc 350 × level², sắt 105 × level. Tinh luyện mới max 3, tiêu 2 `mdt-tinh-khoang`/bậc và bạc 600 × bậc, nhân 8%/bậc. Toàn bộ mang `SIMULATED`.
- Save v5 cũ sử dụng `items:[{uid,base,lv}]`, `gear[heroId][slot]`, `hero[heroId].level`, resource `silver/iron/prestige`. Module mới yêu cầu lưu thêm `nlItemsV1:{stacks,receipts,serial}` dưới schema v5. **Chưa chạy migration/game save thật.**

## 5. QA đã có và QA còn thiếu

- **Đã chạy tập trung 27/27 checks PASS** trên mã và dữ liệu chính xác từ GitHub bằng JavaScript V8 độc lập: catalog 411/392, 19 nhóm, 29 hồ sơ cũ, 12 bộ × 7 món, mua, kho, thống kê chiến đấu, chống thưởng lặp, cường hóa, tinh luyện, gian lận và nguồn cấp, UI, full builder repeatability.
- **Chưa chứng minh:** `node --test qa/nl_item_*.test.cjs` trên Node CLI thực tế; Chromium real interaction; file save/reload; battle/replay/economy receipt integration; exact-SHA GitHub Actions; Windows/Android; owner approval. GitHub Actions chưa trả về run cho task branch mới.
- Các kiểm thử không thay thế người dùng chơi game. Game vẫn sử dụng runtime trước đó cho đến khi Chat 08 tiếp quản.

## 6. Bàn giao phối hợp (không tự sửa nhánh nhóm khác)

- **Chat 01 — Võ tướng:** xác nhận shape `hero.level` và 7 ô/hero, đồng bộ bonus không cộng hai lần.
- **Chat 03 — Kinh tế:** xác nhận chi phí bạc/sắt shop, 2 vật phẩm gốc và vật liệu tinh luyện, giới hạn kho và nguồn cấp.
- **Chat 05 — Chiến đấu:** nối tám trường bonus vào ba lane real combat/replay; bảo toàn 6 trạng thái legacy và đúng 3×3.
- **Chat 06 — NPC:** chỉ thưởng qua receipt trận thắng duy nhất, không thưởng lại khi xem replay, chịu thua hoặc tải lại.
- **Chat 08 — Tích hợp:** kiểm tra source HEAD mới nhất, lấy toàn bộ module từ task branch, chọn authoritative state owner, nối UI vào generator chính rồi test Save v5, Chromium desktop/mobile, exact SHA CI. Không merge khi còn pending.

## 7. Các bước tiếp theo

A. **Chat 08 tích hợp 411 mẫu trang bị vào trận chiến thật và Save v5**, ưu tiên thay thế/móc nối `equipmentStats()` cũ, chạy Chromium + receipt QA.

B. **Tiếp tục nguồn Wiki cho vật phẩm (674), Tướng Khí (90) và Chiến Kỳ**, phân loại reference vs playable theo đúng phiên bản nguồn.

C. **Xác minh ô bằng bảy bộ lọc Wiki trực tuyến**, hiệu chỉnh các nhãn `DERIVED` thành `VERIFIED` chỉ sau khi có snapshot/QA, rồi mở đợt cân bằng gameplay.

Mọi bước đều không dùng Codex Cloud, không force push, không merge nếu chưa được owner duyệt.
