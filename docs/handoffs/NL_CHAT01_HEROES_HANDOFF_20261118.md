# CHAT 01 — Võ Tướng Wiki V2 | Handoff cập nhật 19/11/2026

## Nhánh / quyền hạn
- Repository: `vuanhtuan161094-byte/Heoofgaia`.
- Nhánh nguồn `feature/nl-codex-cloud-v1-finish`, SHA nguồn đã xác minh `a88b8449714ad48531f7c9e7e081ccac43edee92`.
- Nhánh chuyên trách: `feature/nl-v2-heroes`, giữ độc lập, chưa merge.
- Không Codex Cloud. Không sửa `index.html`, `alpha_content.json`, generator, Save, CI, hay module nhóm khác.
- Chỉ sử dụng dữ liệu công khai được kiểm chứng, phân biệt Ngọa Long Mobile và web cổ điển (classic parity `UNKNOWN`).
- Đọc AGENTS, REV, `NL_DATA_DRIVEN_V2.md` và content contract trước khi sửa.

## Đã code theo nguồn VNG
1. **Danh mục:** `wiki_catalogue_v1.json` chứa 364 ID và 364 tên/phe/phẩm hiển thị; 363 tên độc lập sau chuẩn hóa, 1 cặp trùng tên Trương Hoành (Ngô/Trung lập) vẫn chưa hợp nhất. 50 hồ sơ nghiên cứu cũ đều khớp. 14 tướng dự án vẫn tồn tại độc lập, SIMULATED, không sửa.
2. **Kỹ năng chi tiết có phiên bản:** Tổng **55 descriptor** chứa 51 bản kỹ năng liên quan 44 tướng từ danh mục 364, cùng 4 bản riêng cho tên có trong công bố chính thức nhưng chưa map an toàn sang Wiki index (`Lưu Bị`, `Tào Tháo`, `Tôn Quyền`, `Công Tôn Toản`). Những trường đã có căn cứ: damage coefficient, lane/target, hits, morale, status, duration, probability, PvE/PvP differences và bonus theo trạng thái. Giá trị không có công thức vẫn null/UNKNOWN.
3. **Bốn đợt công bố nguồn:**
   - 02/01/2024 — tướng Cam: 24 khả năng (21 thuộc 364).
     https://ngoalong.vnggames.com/su-kien-2022/pbm-hung-ba-thien-ha/he-thong-tuong-cam-13424.html
   - 12/12/2025 — tướng Vàng: 13 khả năng.
     https://ngoalong.vnggames.com/su-kien-2022/pbm-thien-uy-than-hoang/he-thong-tuong-vang-15067.html
   - 07/06/2026 — tướng Vàng: 8 khả năng.
     https://ngoalong.vnggames.com/su-kien-2022/pbm-than-binh-pha-tran/he-thong-tuong-vang-15536.html
   - 17/08/2026 — tướng Vàng: 10 khả năng (9 thuộc 364, 1 tên khác).
     https://ngoalong.vnggames.com/su-kien-2022/pbm-muu-ba-tam-quoc/he-thong-tuong-vang-15668.html
4. **Phát triển tướng:** `wiki_progression_rules_v1.json` và `tools/nl_hero_progression.js` thực thi điều kiện mở **hệ thống** giác ngộ Cam ở thành chính 300, Vàng ở 380, Mệnh Cách ở 400. Hệ thống đã mở ≠ từng tướng đã giác ngộ. Chi phí và EXP/huấn luyện chưa xác minh để UNKNOWN; tuyệt đối không sao chép curve SIMULATED của 14 tướng vào Wiki.
5. **Điều kiện chiêu mộ:** `detail_patches_v1.json` lưu chứng cứ riêng cho Trương Trọng Cảnh (đánh Boss → tửu quán, tỉ lệ UNKNOWN) và Tư Mã Viêm (đổi 200.000 điểm Đấu Trường ở cấp 240).
6. **Module:** `tools/nl_hero_catalogue.js` nạp + thẩm định toàn bộ tập tin, kết hợp theo `heroId` và stage, giữ nguồn từng skill; `--export-skills` cập nhật snapshot `skills_handoff_v1.json` cho Chat 05/08. Không viết combat engine thứ hai; `executable:false` trên mọi skill Wiki hiện tại.

## Phân biệt tình trạng
| Nội dung | Kết quả |
| --- | --- |
| Wiki index entries | **364/364** |
| Verified stage-ability records | **55** |
| Indexed generals with at least one detailed stage ability | **44/364** |
| Sourced acquisition rules | **2** |
| New DESIGN_READY | **0/364** (chưa đủ role + canonical equipped skill + complete version evidence) |
| New PLAYABLE in runtime | **0/364** (Chat 05/08 chưa tích hợp engine/Save) |
| Existing runtime generals | **14**, project-original SIMULATED, giữ nguyên |
| Unresolved current primary stats / EXP / tier cost | **UNKNOWN** |

**Không được báo 55 kỹ năng là 55 tướng playable, cũng không được báo cả 364 đã hoàn tất code chiến đấu.**
Dữ liệu kỹ năng có cấu trúc thực, nhưng chưa phải một trận chiến hoạt động.

## Vấn đề nhận diện / version
- `Trương Hoành` có 2 ID danh mục, cần kiểm chứng cùng nhân vật hay khác biến thể.
- Bản cập nhật 17/08/2026 gọi `Công Tôn Toản`, danh mục ghi `Công Tôn Toán`: không tự hợp nhất. Record nguồn tạm chưa gán `heroId`.
- `Lưu Bị`, `Tào Tháo`, `Tôn Quyền` xuất hiện trong thông báo kỹ năng 2024 nhưng không nằm trong danh mục 364; giữ riêng, không tự map.
- `Viên Thiệu` có kỹ năng Vàng ở thông báo 12/12/2025 và 07/06/2026: giữ cả hai theo phiên bản, `abilityForStage` từ chối tự chọn khi chưa chỉ định phiên bản.
- Các tướng sưu tầm hoặc tướng Cam có tiền tố danh hiệu phải được kiểm tra identity riêng, không dùng tên trùng làm bằng chứng.
- Những thông báo theo thời gian chưa đủ khẳng định đã thu thập toàn bộ bản vá mới nhất; cần đối chiếu trước khi Chat 08 áp vào bản phát hành.

## Kiểm thử tập trung
- `qa/nl_hero_catalogue.test.cjs`: **27/27 PASS**.
- `qa/nl_hero_development.test.cjs`: **12/12 PASS**.
- Kết quả đến từ việc thực thi JS source code đã commit bằng V8 isolate với môi trường file đọc từ GitHub, không phải Node host hoặc GitHub Actions, và không phải Chromium/Save/replay/full CI. **39/39 focused V8 PASS**.
- Chạy native Node cho nhóm 08: `node qa/nl_hero_catalogue.test.cjs` và `node qa/nl_hero_development.test.cjs`.
- Để tái sinh skill handoff: `node tools/nl_hero_catalogue.js --export-skills`. Kiểm thử tái tạo snapshot skill handoff đúng từng byte (LF) PASS. Dữ liệu nguồn không bị mutate ngoài phạm vi Chat 01.

## Handoff cụ thể
- **Chat 05:** đọc `skills_handoff_v1.json` và các pack bậc Cam/Vàng; dùng `stageSkills[].events` để thiết kế combat event mapping, kiểm tra 6 trạng thái legacy và status của Chat 05, chống giả công thức `N/X`, thời lượng/stack/dispels/PvP, kiểm thử replay/determinism. Không tự nhận `executable:false` là skill chạy được.
- **Chat 08:** dùng `loadCatalogue()`, `abilityForStage()`, `mainCityUnlocks()`; kiểm tra current version / skill equipped / awakening permissions rồi tự tích hợp vào runtime, Save, UI và QA sau khi được giao quyền. No auto-promotion from name or source stage.
- **Chat 00:** ghi `INDEX_COMPLETE`, `WIKI_STAGE_SKILL_PARTIAL`, `MODULE_CODE_READY`; **không** ghi `HERO_ALL_PLAYABLE`.

## Next action
Đối chiếu thêm các trang chi tiết Wiki thực tế và bản vá mới, chia batch lớn theo phe/đẳng cấp; thu thập chỉ số, quân, passive, acquisition; hợp nhất conflict theo version có chứng cứ. Chỉ khi đạt readiness mới chuyển Chat 05/08. Không yêu cầu mỹ thuật.

## Lưu ý đồng bộ điều phối mới (19/11/2026)
- Sau khi nhánh Chat 01 được tạo tại SHA nguồn `a88b8449714ad48531f7c9e7e081ccac43edee92`, nhánh nguồn `feature/nl-codex-cloud-v1-finish` đã tiến lên `e33e36255d62ea51af7f48386b8d3c56c6448369` với duy nhất thay đổi `docs/operations/NL_MULTI_CHAT_V2.md`, không sửa dữ liệu tướng.
- Bảng điều phối mới phân bổ `tools/nl_*` và `qa/nl_*` cho Chat 08, còn yêu cầu trực tiếp mở Chat 01 ban đầu cho phép `tools/nl_hero_*.js` và `qa/nl_hero_*`. Tác vụ này đã làm theo phạm vi được user chỉ định trong chat và không đụng runtime/CI/Save.
- **Chat 00/08 phải hòa giải thay đổi phân quyền đường dẫn/nhánh trước khi tích hợp**, chuyển những helper/test cần thiết sang owner path mới bằng commit của nhóm tích hợp nếu cần. Không cherry-pick mù quáng hoặc tự merge nhánh chuyên môn này.
