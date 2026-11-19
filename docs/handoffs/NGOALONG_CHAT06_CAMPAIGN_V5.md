# CHAT06 V5 — Hoàn thiện đối soát nguồn 249 phó bản

Branch: feature/nl-v2-campaign. Nguồn: current VNG Mobile Wiki. Classic-webgame parity UNKNOWN. Không Codex Cloud, không merge.

## 1. Kết quả dữ liệu đã commit

- 249/249 map, 4.903/4.903 NPC và 23.914 ô quân trong 21 shard nguồn: đã đối soát chi tiết.
- 170 map đầy đủ danh sách NPC; 79 map chưa đủ danh sách.
- 17.850 quân số đơn vị chưa có bằng chứng; 344 trường hợp tổng quân mâu thuẫn; 97 NPC chưa đủ đội hình.
- 3 trường hợp thiếu đúng một ô quân số nhưng phép trừ cho số dư 0: KHÔNG tự điền 0.
- 59 sự kiện publisher patch khớp tên bản đồ duy nhất; 11 chưa có map khớp duy nhất. Không dùng tên để suy diễn AI ID hoặc phiên bản combat.
- 7 hồ sơ selected-unit đối chiếu, 32 trường trùng khớp, 4 hồ sơ có kỹ năng mẫu chi tiết; không đồng nghĩa xác minh tất cả đơn vị một trận.
- 0 giá trị tự suy diễn được ghi thành dữ liệu Wiki; 0 map kích hoạt vào gameplay.

## 2. Các file bàn giao

- data/ngoalong/modules/campaign/nl_campaign_evidence_v5.js: bộ đối soát field-by-field, nguồn quân số, vị trí 3x3, dữ liệu lịch sử, snapshot, chặn nguồn mâu thuẫn.
- data/ngoalong/modules/campaign/evidence_batches/batch-001.json ... batch-003.json: 249 map và 4.903 NPC, các ô quân số chưa rõ, provenance từng NPC.
- data/ngoalong/modules/campaign/source_reconciliation_index_v5.json: chỉ mục 249 map với số lượng thiếu, sai lệch và nguồn.
- data/ngoalong/modules/campaign/verified_secondary_wiki_facts_v5.json: 7 selected-unit, 4 fact kỹ năng chi tiết và tham chiếu phụ; không tự cấp skill ID combat.
- data/ngoalong/modules/campaign/source_repair_queue_v5.json: xếp hạng đủ 249 map theo lỗi và hành động cần xử lý.
- tools/nl_campaign_evidence_v5.js và tools/nl_campaign_verified_facts_v5.js và tools/nl_campaign_repair_queue_v5.js: tái tạo và --check dữ liệu.
- qa/nl_campaign_evidence_v5.test.cjs: 10 test JS đã PASS trong môi trường thực thi tách biệt.

## 3. Ưu tiên xử lý kế tiếp

- P0: 8 map đủ cấu trúc nguồn, chưa duyệt cơ chế: IDs 21,22,23,24,25,27,28,80 (Giang Đình Trụ, Dịch Kinh Lâu, Dã Tùng Lâm, Kho Thành Đô, Thiên Thủy Đạo, Bạch Lâu Mật Thất, Hang Dị Nhân, Hắc Diệu Thâm Uyên).
- P1: Khúc Dương (Wiki map 1, thiếu 1 quân số Trương Bảo) và Quảng Tông (map 2, thiếu 3 ô). Không điền 0 theo phép trừ.
- P3/P4/P5/P6: 18/63/3/155 map theo bucket ưu tiên loại trừ lẫn nhau. 79 map thực sự thiếu roster được phân bố trong nhiều bucket, không chỉ P5.
- Hổ Lao map 3: 22 NPC, thiếu 73 quân số và một đội hình chưa được xác minh đầy đủ.
- Các nhãn kỹ năng và Wiki troop ID đã ghi nhận không tương đương với cơ chế combat chuẩn hay ID runtime được duyệt.

## 4. Kiểm tra và ranh giới

Đã kiểm thử 10/10 isolated JS trên code/hồ sơ chính xác ở GitHub, có kiểm tra 249 maps/4903 NPC, nguồn bổ sung và hàng đợi sửa.

Cần chạy trong checkout thực:
    node --max-old-space-size=2048 tools/nl_campaign_evidence_v5.js --check
    node tools/nl_campaign_verified_facts_v5.js --check
    node tools/nl_campaign_repair_queue_v5.js --check
    node --test qa/nl_campaign_evidence_v5.test.cjs

Chưa có kết quả exact-SHA CI hoặc nghiệm thu Chromium, Save/replay, gameplay thực. Không sửa Group02, generator, alpha_content.json, runtime hay Save v5.

CHAT01/02/05: xác minh ID nhân vật, quân, kỹ năng (đặc biệt NPC-exclusive), hiệu ứng theo phiên bản; không duyệt chỉ bằng so tên.
CHAT08: nối map đủ nguồn vào combat thật sau khi có approved bindings, xác minh slot 3x3, AI, chiến báo, thưởng và Save atomic receipts; chạy regression và CI exact-SHA trên nhánh tích hợp. PR #10 vẫn Draft; không merge.
