# MƯU ĐỊNH TAM QUỐC — CHAT 01 | PHƯƠNG ÁN A | HANDOFF 2026-11-19

## Kết quả triển khai có chứng cứ

- Repo `vuanhtuan161094-byte/Heoofgaia`, nhánh chuyên trách `feature/nl-v2-heroes`. Không merge.
- Tất cả thay đổi **mới của đợt này** giới hạn trong `data/ngoalong/modules/heroes/**` và `qa/modules/heroes/**` theo `docs/operations/NL_MULTI_CHAT_V2.md`.
- Không sử dụng Codex Cloud. Không sửa `alpha_content.json`, generator, `index.html`, Save, chiến đấu runtime, CI hoặc asset của nhóm khác.
- Dữ liệu duy nhất có quyền kích hoạt runtime vẫn là nguồn project gốc dưới quyền Chat 08.

### Số lượng sau Phase A

| Hạng mục | Trước | Sau |
| --- | ---: | ---: |
| Wiki index | 364 | **364** |
| Võ tướng có ít nhất một hồ sơ chi tiết ngoài index | 93 | **134 (+41)** |
| Hồ sơ index-only không có dữ liệu chi tiết | 271 | **230 (−41)** |
| Kỹ năng theo giai đoạn / phiên bản nguồn có ngày | 55 | **151 (+96)** |
| Kỹ năng lịch sử gắn Wiki ID | 51 | **140** |
| Kỹ năng có tên nguồn không liên kết ID an toàn | 4 | **11** |
| Guide base stats / hướng chiêu mộ (Thục + Ngô, ngày 30/09/2026) | 82 dòng / 67 tướng | Không đổi |
| Tướng Wiki mới PLAYABLE | 0 | **0** |
| Tướng runtime SIMULATED gốc | 14 | Không đổi |

**Phân lớp 364 tướng hiện tại:** 40 có dữ liệu guide + kỹ năng lịch sử, 27 chỉ có guide, 67 chỉ có kỹ năng lịch sử, **230** chỉ có danh mục.

**Theo phe:**
- Ngụy: 22/40 có thêm dữ liệu; **18** chỉ có index.
- Quần: 42/174 có thêm dữ liệu; **132** chỉ có index.
- Thục: 34/38 có thêm dữ liệu; 4 chỉ có index.
- Ngô: 36/39 có thêm dữ liệu; 3 chỉ có index.
- Trung lập: 0/73 có thông tin chi tiết ngoài index; 73 chỉ có index.

### Các nguồn mới nhập vào code

1. `wiki_orange_skills_2023_apr_v1.json`: **19** kỹ năng theo bậc Cam/Đỏ/Tím công bố **08/04/2023**, 17 nhân vật; gồm Tào Hồng, Nhan Lương, Văn Sửu, Văn Sính, Mã Vân Lộc. https://ngoalong.vnggames.com/su-kien-2022/pbm-loan-the-ky-muu/he-thong-tuong-cam-12903.html
2. `wiki_orange_skills_2023_sep_v1.json`: **12** kỹ năng Cam công bố **05/09/2023**, gồm Điển Vi, Tư Mã Ý, Tào Nhân, Trần Thái, v.v. https://ngoalong.vnggames.com/su-kien-2022/pbm-cuu-le-vuong-gia/he-thong-tuong-cam-13159.html
3. `wiki_orange_stage_supplement_2024_2025_v1.json`: **19** phiên bản kỹ năng (Tháng 5/2024, 1/2025, 5/2025), nhiều mốc tiến hóa Lý Nho/Lữ Linh Khởi.
   - https://ngoalong.vnggames.com/su-kien-2022/pbm-quyen-tuong-long-tranh/he-thong-tuong-cam-13706.html
   - https://ngoalong.vnggames.com/su-kien-2022/pbm-ky-mon-bat-tran/he-thong-tuong-cam-14285.html
   - https://ngoalong.vnggames.com/su-kien-2022/pbm-loan-the-kieu-hung/he-thong-tuong-cam-14566.html
4. `wiki_skill_stages_20240903_v1.json`: **23** phiên bản theo ngày công bố **03/09/2024**, bao gồm Lưu Biểu (5 bậc), Công Tôn Toán, Quách Gia, Chu Du, Mã Siêu và các dạng tướng độc lập chưa rõ alias. https://ngoalong.vnggames.com/su-kien-2022/pbm-muu-dinh-tam-quoc/he-thong-tuong-cam-13958.html
5. `wiki_gold_supplement_2025_2026_v1.json`: **23** phiên bản Vàng từ ba đợt 05/2025, 09/2025, 03/2026:
   - https://ngoalong.vnggames.com/su-kien-2022/pbm-loan-the-kieu-hung/he-thong-tuong-vang.html
   - https://ngoalong.vnggames.com/su-kien-2022/pbm-ky-muu-thien-ha/he-thong-tuong-vang-14768.html
   - https://ngoalong.vnggames.com/su-kien-2022/pbm-hoa-thieu-lac-duong/he-thong-tuong-vang-15340.html
6. `wei_awakening_tavern_guide_v1.json` ghi mốc giác ngộ guide Xanh 130/Đỏ 190/Tím 230/Cam 300, Tướng Đài 180, tửu quán đặc biệt từ 245 (Vu Cát/Tư Mã Huy/Đồng Uyên), nguồn community guide do VNG đăng, không đồng nhất với quy tắc server hiện hành: https://ngoalong.vnggames.com/tin-tuc/huong-dan/cam-nang-nguy-quoc-toi-uu-hoa-giai-doan-truoc-lv300.html

Bản cũ 55 kỹ năng vẫn nằm ở các pack V1, không bị ghi đè; skill cũ/mới cùng bậc đều giữ bản theo thời điểm công bố. Chưa thể tuyên bố phiên bản hiện hành nếu không xác minh chi tiết mới nhất.

### Code và hợp đồng dữ liệu

- `hero_research_index_v3.js`: `readExtraStageSkills()`, `verifyExtraPack()`, `editionHandoff()`, `selectHero()`; giữ tổng **151** source records, trong đó **96** ở 5 pack mới.
- `hero_evidence_matrix_builder_v1.js`: tạo bảng trạng thái từng trường cho 364 tướng, ưu tiên tìm nguồn Ngụy → Quần → Trung lập → Thục → Ngô.
- `hero_evidence_matrix_v3.json`: 364 hồ sơ có `heroId`, lịch sử tên/bậc, nguồn guide và skill theo ngày, trường chưa xác minh, `researchNext`, rủi ro version/alias, mọi tướng `REFERENCE_ONLY`.
- Không dùng phiên bản kỹ năng lịch sử làm skill tự trang bị, không giả tạo công thức tăng trưởng, tỉ lệ chiêu mộ, giá nâng cấp hoặc mối quan hệ parent/variant.
- Chat 05 sở hữu resolver chiến đấu, Chat 08 sở hữu gameplay/runtime/Save; Chat 01 không tự tích hợp.

### QA và hạn chế nghiệm thu

- `qa/modules/heroes/hero_research_index_v3.test.cjs`: **19/19 PASS** trong JavaScript V8 isolate với original indexed stage records từ GitHub (4 unindexed legacy được thay bằng test-only fixtures để tách khỏi Chat 08).
- `qa/modules/heroes/hero_evidence_matrix_v3.test.cjs`: **10/10 PASS**, snapshot regenerate trùng từng byte trong môi trường tương tự.
- `qa/modules/heroes/hero_apr2023_skill_batch.test.cjs`: **11/11 PASS** trên nguồn 08/04/2023 và bảng trạng thái thực.
- **96/96 phiên bản kỹ năng mới** qua `readExtraStageSkills()` validation, 89 liên kết chính xác Wiki ID, 7 chưa liên kết.
- **Chưa chạy Node native, GitHub Actions full CI, Chromium, Save/replay, Owner playtest.** Không coi QA isolate là bản game có thể chơi.

### Backlog cụ thể để tiếp tục A

**18 Ngụy chỉ còn Index:** Tào Phi, Xa Trụ, Hách Chiêu, Lý Điển, Tào Hưu, Vương Song, Chung Dao, Dương Tu, Đặng Trung, Hạ Hầu Bá, Hí Chí Tài, Hoa Hâm, Lạc Tiến, Lưu Diệp, Lý Thông, Trần Quần, Vu Cấm, Nghiêm Chính.

**132 Quần thiếu chi tiết:** ưu tiên Gia Cát Đản, Trương Ninh, Văn Ương, Bùi Nguyên Thiệu, Hàn Toại, Khoái Lương, Mã Đằng, Mã Thiết, Mê Đương, Nha Đan, Phí Sạn, Thẩm Phối, Tiên Vu Phụ, Tỏa Nô, v.v. Full queue trong `hero_evidence_matrix_v3.json`.

**73 Trung lập:** không có một hồ sơ chi tiết ngoài index; không tự copy từ Wiki Quần hay nhóm NPC.

**Thiếu xuyên suốt:** current-version equipped skill, current stats, một số recruitment methods, chỉ số thức tỉnh và chi phí nguyên liệu, xác suất, trigger/cooldown chưa được xác minh. Số 134 mang ý nghĩa có thêm *ít nhất một* sự kiện dữ liệu chi tiết, **không** phải 134 complete profiles.

**11 chưa map tên/variant ở các bản skill:** Lưu Bị, Tào Tháo, Tôn Quyền, Công Tôn Toản (Wiki ghi Công Tôn Toán), Văn Sinh (Wiki ghi Văn Sính), Tào Tiết, Trương Tinh Thái, Bộ Luyện Sư, Phục Thọ, Long Kỵ Phi Tướng Lữ Bố, Tuyệt Thế Vũ Cơ Điêu Thuyền. Không merge tên gần giống theo suy đoán.

**Handoff Chat 00/05/08:** Ghi trạng thái `INDEXED_364`, `SOURCED_PARTIAL_134`, `DATED_SKILLS_151`, `BACKLOG_230`, `NEW_PLAYABLE_0`; tuyệt đối không ghi `ALL_HEROES_CODED` hoặc `WIKI_ALL_INTEGRATED`. Lưu ý chính sách phân quyền đường dẫn/nhánh trong `docs/operations/NL_MULTI_CHAT_V2.md`; Chat 08 phải điều phối phần legacy `tools/nl_hero_*` trước khi merge.
