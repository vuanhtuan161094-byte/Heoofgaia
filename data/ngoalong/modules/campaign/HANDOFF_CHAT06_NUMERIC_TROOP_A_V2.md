# CHAT06 / CHAT02 — Numeric NPC troop ID crosswalk V2 (19/11/2026)

## Quyết định và phạm vi
- CHAT06 sở hữu data/ngoalong/modules/campaign/** và qa/modules/campaign/**. Không sửa module CHAT02, dữ liệu gốc, runtime, canonical generator, Save v5, replay hoặc GitHub workflows.
- Nhánh nghiên cứu CHAT06: feature/nl-v2-campaign tại baseline 828106bc1b63c341e19dde7e6cfa4db3346ecdac; nhánh nguồn CHAT02: feature/nl-mcv2-02-troops tại 6f3b01464437e3e78a4548e5bf677692105d43ba.
- Source edition: CURRENT_VNG_MOBILE. Classic parity: UNKNOWN. Hệ thống luôn REFERENCE_ONLY; numeric ID -> CHAT02 identity theo tên KHÔNG phải runtime binding đã phê duyệt.

## Nội dung code và dữ liệu
- nl_campaign_troop_id_crosswalk_v2.js: kiểm kê ID số, tên nguồn, các vị trí 3×3, phát hiện ID nhiều tên, tên nhiều ID, khớp duy nhất/trùng tên/thiếu hồ sơ; resolve() không trả về runtimeTroopId.
- npc_numeric_troop_crosswalk_v2.json: bảng đầy đủ theo 346 numeric ID, thống kê 23.914 lượt dùng, 2 ví dụ nguồn từng cặp, 372 identity CHAT02 theo snapshot và cờ chặn nhập game.
- troop_id_source_pins_v2.json: SHA của 21 shard nguồn, manifest, snapshot CHAT02 và SHA CHAT06 baseline.
- qa/modules/campaign/nl_npc_troop_id_v2.test.cjs: 7 bài kiểm thử mock/fail-close + 1 bài QA đầy đủ toàn bộ 21 shard; dùng CLI build và --check đối chiếu chính xác.

## Kết quả dữ liệu thật
- 249/249 maps, 4.903/4.903 NPCs, 23.914 observed unit positions, không thiếu ID số hoặc tên quân tại các vị trí đã trích xuất.
- 346 numeric troop IDs riêng biệt. 0 ID số có nhiều tên chuẩn hóa mâu thuẫn trong 21 shard.
- 302 numeric IDs / 23.063 unit occurrences có đúng một ứng viên tên trùng duy nhất ở CHAT02. Status: EXACT_UNIQUE_NAME_CANDIDATE, KHÔNG VERIFIED_NUMERIC_BINDING.
- 9 IDs / 184 lượt dùng có tên trùng nhiều identity trong CHAT02, gồm Ngân Thương, Diệm Cung, Vuđộc Sĩ và Bất Diệt Vương.
- 35 IDs / 667 lượt dùng chưa có tên tương ứng trong 372 hồ sơ của CHAT02. Giữ tại NOT_IN_CHAT02_CATALOGUE; không tự chế registry ID/tier/công thức.
- 0 runtime bindings approved, 0 gameplay ID enabled. Không có thay đổi Save/war/receipt/generator.

## Quy trình kiểm tra
node --max-old-space-size=3072 --test qa/modules/campaign/nl_npc_troop_id_v2.test.cjs
node --max-old-space-size=3072 data/ngoalong/modules/campaign/nl_campaign_troop_id_crosswalk_v2.js --check

Đã thực thi 7/7 kiểm thử giả lập qua JS isolate. Kiểm tra sourcePairs trực tiếp trên cả 21 shard theo 5 nhóm, tất cả 5 nhóm khớp chính xác với snapshot cặp ID–tên đã dùng tạo báo cáo.
Node test suite trên checkout đầy đủ, GitHub Actions exact-SHA, Chromium/Save và thực tế gameplay PENDING; workflow hiện tại không trigger task branch CHAT06, không báo PASS sai.

## CHAT02 cần xử lý
1. Xác minh mã số Wiki thực từ backend/source độc lập hoặc trang nguồn phiên bản tương ứng; không duyệt chỉ bởi trùng tên.
2. Phân tách 9 ID thuộc nhóm tên trùng (cấp khác nhau hoặc biến thể) bằng chứng đúng từng ID.
3. Nghiên cứu và bổ sung 35 tên còn thiếu ở registry CHAT02 hoặc xác định chúng chỉ là NPC-scope không tuyển được; dữ liệu phiên bản phải tách.
4. Cung cấp bảng numeric Wiki ID -> chat02 troop identity ID, status VERIFIED/DERIVED/SIMULATED/UNKNOWN cho từng bản ghi; CHAT06 chỉ cập nhật source crosswalk và CHAT08 mới nhận tích hợp combat.

## Next options
- B1: CHAT02 kiểm 44 ID ngoại lệ (9 ambiguous + 35 missing), xuất registry số và ghi bằng chứng.
- B2: CHAT06 rà soát 346 mapping với backend/nguồn Wiki và bổ sung bằng chứng xác minh độc lập.
- C: CHAT08 tích hợp subset được duyệt vào trận chiến thật, kiểm thử Chromium, Save v5/replay, receipts và CI exact SHA, không merge khi chưa nghiệm thu.
