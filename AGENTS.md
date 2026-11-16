# AGENTS.md — Ngọa Long / Mưu Định Tam Quốc

## Quyền sở hữu và cô lập
- Đây là NHÁNH game Ngọa Long riêng trong repo `Heoofgaia`: **main-ngoalong**. Nhánh Hero `feature/hog1-research-to-playable-20261102` độc lập, tuyệt đối không sửa hoặc merge. Không thay default branch.
- Canonical source/release: **index.html**; không sinh bản HTML thứ hai để giao phát hành. P3 QA và docs là bằng chứng, không phải game khác.
- Trước sửa đọc chính xác HEAD SHA từ GitHub, `AGENTS.md`, `docs/REV_PROTOCOL.md`, `docs/CURRENT_CHECKPOINT.md` và code liên quan.
- **Ủy quyền mới ngày 16/11/2026:** Chủ dự án cho phép **Codex chuyên trách Ngọa Long** triển khai toàn bộ phần việc được duyệt trong **riêng** nhánh `main-ngoalong`. Lệnh `KHÔNG dùng Codex` cũ chỉ hết hiệu lực đối với dự án Ngọa Long này, không mở rộng sang Hero, Tông Môn Bá Đạo hoặc CMP.
- **Project agent authority:** Đọc và tuân thủ `docs/NGOALONG_CODEX_AGENT.md` trước khi lập kế hoạch, sửa code hay giao việc. Không tự động merge hoặc tự nhận hoàn thành khi chưa có bằng chứng.

## Gameplay data/authority
- Combat duy nhất quyết toán tiền, EXP, quân chết, phần thưởng tại kết thúc trận; replay đọc bản ghi, không tạo đợt chi trả thứ hai.
- Save key `muu_dinh_tam_quoc_v1`, schema v3; nâng cấp quân lưu trong `p3TroopTier`, preset trong `p3PresetId`. Giữ migration v1/v2/v3 và JSON import/export, không sửa Save Hero v07.
- Giá luyện binh = bạc/lương/sắt thật, có gate cấp Doanh Trại; tier 1–4, không tự tăng số quân. Không tự phát tài nguyên.
- Combat AI, 24 trận hình, tier và cân bằng là SIMULATED. Không nhận là công thức chính thức Ngọa Long.
- Không đưa artwork/asset proprietary của VNG vào repo khi không có quyền sử dụng.

## REV và release gates
1. R: nguồn và phân loại VERIFIED/DERIVED/SIMULATED/UNKNOWN; quyết định thiết kế.
2. E: one vertical slice và một state owner; test failure, snapshot, migration, idempotence.
3. V0: syntax; V1: P2 31+12 và P3 74 + 360 balance scenarios; V2: Chromium screenshots + localStorage shim; V3: GitHub Actions same SHA; V4: người dùng chơi máy thật; V5: duyệt mỹ thuật của owner.
4. **Chỉ khẳng định các gate có bằng chứng**, không đánh đồng GitHub PASS với Windows/Android thật.
5. Không merge, force-push hoặc reset lịch sử của Hero. Mọi update branch dùng expected SHA.
6. Cuối báo cáo: DONE / TESTED / PENDING, exact SHA + Actions link + 2–3 lựa chọn tiếp theo.

## P4.1 sprite production / visual-only (16/11/2026)
- Chỉ ảnh 2D frame-by-frame; tuyệt đối không rig/xương. Từng frame xuất từ 2 pose gốc bằng 2D compositing được ghi rõ. Không tự nhận là hoàn toàn vẽ tay.
- Event clock/view chỉ đọc từ combat event. Charge/release/contact/fade không tự tạo lượt đánh, target, hit, phần thưởng. Replay immutable.
- Single-file offline `index.html`; atlas + generator + manifest là nguồn tái tạo, generated 288 PNG được CI đính kèm artifact.
- Gate bắt buộc: P2/P3/P4 regression + P41 18 checks + video Chromium native 1280×720/12fps + exact SHA. Art approval không thay bằng CI.
