# NL GROUP 04 — 674 WIKI VẬT PHẨM / VẬT TƯ — HANDOFF V2

**Branch:** `feature/nl-mcv2-04-items-674` (được tạo từ Group04 `feature/nl-v2-items@90c098d45edb99a78f5289221d802615573b0c45`).  
**Nguồn Wiki Mobile:** https://ngoalong.vnggames.com/ngoa-long-wiki/vat-pham (công bố **674** vật phẩm).

## Nội dung đã code

- `item_groups_v1.json`: 11 nhóm chỉ mục, gồm Rương 323 / Vật Liệu 145 / Tài Nguyên 82 / Túi Phúc 64 / Ấn Thạch 27 / Danh Phẩm 17 / Bí Tịch 9 / Truyền Thừa Lệnh 1 / Lệnh 1 / Chìa Khóa 1 / Khác 4.
- `wiki_parser.js`: parser cho nội dung công khai ở dạng danh sách và accordion. Không tự tạo mục không thấy; ghi `declaredCount`, `extractedCount`, `missingCounts`. Crawler thật chạy trên nhánh ứng viên nhóm 08 bằng Playwright, tách snapshot ra khỏi phiên bản web cổ điển.
- `index_builder.js`: từ hồ sơ tham chiếu có tên thật tạo **hai hồ sơ khác nhau**: `REFERENCE_ONLY` (tác dụng/nguồn rơi UNKNOWN) và `PLAYABLE` luật nguyên bản `SIMULATED`. Bảo toàn bốn reference cũ + hai vật phẩm project hiện có; fail-closed với source count không đủ. Không tạo nhân vật hoặc asset VNG.
- `consumables_engine.js`: giao dịch nguyên tử `use/process` trên cùng `nlItemsV1.receipts`, tác dụng mô phỏng gồm mở rương thành bạc/sắt/nguyên liệu, dùng tài nguyên, chế biến vật liệu thành tinh khoáng, Danh phẩm -> uy danh, Bí tịch -> EXP tướng (level cap 40). Có chống nhận trùng, tài nguyên âm/overflow, mất vật tư khi lỗi, kho quá giới hạn.
- `consumables_ui.js`: kho dùng thật, tìm kiếm, 11 bộ lọc, phân trang 25 mục, sổ Wiki chỉ đọc, nút Mở / Sử dụng / Gia công; mọi thao tác cần host Save và receiptId riêng, không tự nạp vào index.html.
- `rules.json` trong vùng module mới: tăng stackKinds lên 800 để chứa nhiều vật phẩm, giữ schema v5 và receipt ledger.

## Phân loại nguồn / ranh giới quyền

- VERIFIED: tên + nhóm + cấp hiển thị trích xuất từ **mục Wiki công khai khi có hàng thực thấy**.
- DERIVED: quy loại vật phẩm theo tên/ngữ cảnh khi cần, không coi là Wiki effect.
- SIMULATED: *mọi* số thưởng mở rương, chi phí gia công, nguồn cấp, chất lượng, XP, loại tài nguyên.
- UNKNOWN: phần thưởng VNG trong rương, xác suất rơi, hạn chế sử dụng, recipes chính thức; không copy.
- Chỉ mục 674 không đồng nghĩa có 674 item playable. Nếu trang không hiển thị tên của nhóm, giữ `unresolved`, không tự điền tên hoặc đánh dấu đã nhập.

## Lệnh QA nhóm 04

`node --test qa/modules/inventory/*.test.cjs`

Gates hiện đã thiết kế: item model 8 cases, UI 4, Wiki parser 4 = **16 focused cases**. Bằng chứng đã thực thi tách riêng trong JavaScript V8 độc lập, **không thay Node CLI/Chromium/CI**.

## Nhiệm vụ Group08 tiếp nhận

1. Đối chiếu HEAD hiện tại nhóm 08 với Group04 trước khi port source, dùng authoritative item catalogue và tránh copy hai phiên bản.
2. Nạp `consumables_engine.js` + `consumables_ui.js` sau runtime equipment domain. Mount vào tab trang bị hoặc tab Vật tư qua **generator canonical**, không xuất HTML rời.
3. Bảo vệ Save `muu_dinh_tam_quoc_v1` v5, lưu `nlItemsV1.stacks/receipts`, tách thưởng campaign một lần, không tự cấp rương từ chỉ mục tham chiếu.
4. Kiểm tra kho 390px, các UI receipt, mở rương/dùng vật phẩm/save reload, failure rollback, real 3x3 battle unaffected, Chromium exact SHA/CI.
5. Không tự merge PR #10; owner nghiệm thu máy thật riêng.

**Không Codex Cloud; không merge; không thay dữ liệu Wiki nguồn lịch sử và không sửa Hero.**
