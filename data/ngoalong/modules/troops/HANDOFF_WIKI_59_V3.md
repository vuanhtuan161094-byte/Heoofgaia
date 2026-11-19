# CHAT 02 / NGỌA LONG — KIỂM TRA 59 HỒ SƠ THIẾU CƠ CHẾ (2026-11-19)

VNG Mobile Wiki (nguồn chính): https://ngoalong.vnggames.com/ngoa-long-wiki/binh-chung

**59/59 occurrence IDs audited:** 1 có mô tả năng lực/hiệu ứng theo đơn vị đầy đủ hơn (**Thần Võ Kích**), 1 chỉ có mô tả định tính (**Đột Mạo**, thuyền vừa), 1 chỉ có luật khắc chế **cả hệ Thương** (không phải skill riêng), **56** còn lại chỉ thấy tên, truyện nền hoặc mô tả hình dáng, không đủ làm kỹ năng. Vì vậy **57/59 vẫn thiếu mô tả cơ chế cá thể** (bao gồm mục Thương cấp 0); 0/59 được tuyên bố playable. Báo cáo chính: `missing_59_source_review_v3.json`.

**Thần Võ Kích** (Wiki binh chủng, line 490, nhãn NPC): năng lực Pháp Công mạnh (định tính); bảo vệ tăng sĩ khí bản thân trong 2 lượt từ lượt kế tiếp; hiệu ứng **Kiên Thủ** 2 lượt. Wiki hiệu ứng tại https://ngoalong.vnggames.com/ngoa-long-wiki/hieu-ung (line 1071-1081) xác nhận Kiên Thủ tăng toàn bộ phòng thủ và cộng dồn, phân biệt với Kiên Thủ 2 không thể giải trừ. Công thức +%, xác suất, thời điểm kích hoạt chưa rõ; không gán cho Kiên Thủ 2, không gán effect ID runtime.

**Đột Mạo** (Wiki binh chủng, line 2151, Thuyền Vừa): chỉ ghi năng lực tổng hợp mạnh; không có con số. **Thương** (line 500) chỉ là quan hệ Bộ/Thương/Kỵ của hệ quân, không phải kỹ năng Thương cấp 0.

Nguồn ngoại phiên bản (Lèqu CN classic 2011 và bản kỹ năng mới 2024) được ghi nhận để truy nguồn nhưng **không chứng minh** tương đương game VNG Mobile. Tất cả bản ghi giữ `UNKNOWN` với chỉ số/công thức/tiến hóa cá thể/tuyển dụng. Không sao chép asset/code proprietary, không sửa Wiki source snapshots.

Bước cho CHAT08: không tự động nhập NPC Thần Võ Kích hoặc thủy binh Đột Mạo vào trận 3×3. Bất kỳ bản playable nào về sau phải được author riêng bằng `PROJECT_ORIGINAL / SIMULATED` và có quy tắc replay/status tương thích Save v5, engine p2Hit và hiệu ứng 6+7.

## Executable read-only preview (2026-11-19)
- `missing_59_rules_v3.cjs` consumes 59-row audit and exposes `plan(id)`, `eligible(id)`, `audit()`. 2 **non-activating** intent profiles: NPC Thần Võ Kích (2 sourced-duration status proposals, no numeric multiplier) and naval Đột Mạo (qualitative balanced profile, no numbers). Generic Thương only holds a family counter and is blocked as a unique active skill. No battle/Save/reward mutation, no live import.
- `troop_design_v2.cjs` exposes `getDesignData().sourceReview59`, `describeTroop(id).sourceReview59`, `wikiGapStatus(id).sourceReview59` and `wikiGapAudit().stillUnresolvedSpecific`.
- QA: `node qa/modules/troops/nl_troop_missing59_v3.test.cjs`, plus historical 137-gap and 25-troop tests. Source V3 is additive; historical 59 gap snapshot has NOT been rewritten.
