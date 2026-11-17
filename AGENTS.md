# AGENTS.md — Mưu Định Tam Quốc / Chiến Loạn-style SLG

## QUYẾT ĐỊNH CUỐI 17/11/2026 — GAME HYBRID (QUYỀN ƯU TIÊN CAO NHẤT)
- **Một game duy nhất:** Mưu Định Tam Quốc = Chiến Loạn (điều quân/chiếm thành/lính đánh thật) + Ngọa Long (3×3/24 bố trận/sĩ khí/khắc chế/chiến pháp). **Bắt buộc đọc `docs/GAME_DESIGN_BIBLE_HYBRID_V1.md` trước thực hiện**.
- **Mỹ thuật đã chốt:** `docs/ART_DIRECTION_DARK_CHIBI_V1.md` = Dark Fantasy Sharp-Eyed Chibi, 2D tranh vẽ tay, tướng 3–3,5 đầu, mắt sắc sáng năng lượng. Không pixel, không rig, animation frame-by-frame. Dự án không còn theo hướng semi-realistic thử trước.
- Tài liệu Ngọa Long-first, Chiến Loạn-only và hand-painted bán hiện thực vẫn là **lịch sử** và không được ghi đè art/gameplay hybrid mới; quy định isolation/save/REV từ chúng vẫn tiếp tục áp dụng.
- Thứ tự H0 khắc phục lỗi CL-P5 atlas exact-byte CI trước → H1 hợp nhất chiến đấu 5 tướng + 3×3 → H2 map capture loop → H3 art pilot → H4 nội dung/balance → H5 release. Không báo DONE khi mới có doc.

## Quyền sở hữu và cô lập
- Đây là nhánh **Mưu Định Tam Quốc**, chiến thuật SLG lấy cảm hứng chính từ **Chiến Loạn Tam Quốc (2025)**. Tên nhánh lịch sử **main-ngoalong** được giữ để bảo toàn Git và Save, không có nghĩa giữ Ngọa Long làm bản mẫu chính. Nhánh Hero `feature/hog1-research-to-playable-20261102` độc lập, tuyệt đối không sửa hoặc merge. Không thay default branch.
- Canonical source/release: **index.html**; không sinh bản HTML thứ hai để giao phát hành. CL-P1–P6 QA và docs là bằng chứng, không phải game khác.
- Trước sửa đọc chính xác HEAD SHA từ GitHub, `AGENTS.md`, `docs/REV_PROTOCOL.md`, `docs/CURRENT_CHECKPOINT.md` và code liên quan.
- **Ủy quyền mới ngày 16/11/2026:** Chủ dự án cho phép **Codex chuyên trách duy nhất game Mưu Định Tam Quốc** trên `main-ngoalong`; ưu tiên mới là gameplay **Chiến Loạn Tam Quốc**. Không mở rộng quyền sang Hero, Tông Môn Bá Đạo hoặc CMP.
- **MASTER SPEC PIVOT (ưu tiên cao nhất về product):** đọc `docs/CHIEN_LOAN_MASTER_SPEC.md` trước mọi thiết kế hoặc triển khai. `docs/NGOALONG_CODEX_AGENT.md` giữ phần bảo mật/cô lập/QA và chỉ áp dụng roadmap khi không xung đột master spec. Không tự động merge hoặc tự nhận hoàn thành khi chưa có bằng chứng.

## Chủ định mỹ thuật — 17/11/2026
- **CHỈ ĐẠO MỚI CỦA OWNER:** đồ họa game phải chuyển sang phong cách **tranh vẽ tay 2D**. Đọc và tuân thủ `docs/ART_DIRECTION_HANDPAINTED_2D_V1.md` trước khi tạo, sửa hoặc tích hợp asset.
- Ưu tiên bản thử nhỏ có hình ảnh thực sự tích hợp game (bản đồ, thành trì, tướng, quân và chiến trường), không tiếp tục mặc định phong cách sprite cũ/pixel, hình học thô hoặc dựng giả 3D. Tranh vẽ tay nhiều màu / nét cọ rõ, phù hợp Tam Quốc. Tông cụ thể cần duyệt bằng mẫu.
- Giữ sprite-first frame-by-frame, **không rig**, đúng alpha/pivot và cho xem Chromium desktop/mobile thực tế. Mỗi hình chỉ chuyển sang diện sản xuất hàng loạt sau khi owner duyệt mỹ thuật; không tự nhận PASS nhờ CI.

## Gameplay data/authority
- Combat duy nhất quyết toán tiền, EXP, quân chết, phần thưởng tại kết thúc trận; replay đọc bản ghi, không tạo đợt chi trả thứ hai.
- Save key `muu_dinh_tam_quoc_v1`, schema v5; nâng cấp quân lưu trong `p3TroopTier`, preset trong `p3PresetId`, chiến dịch CL-P1–P4 trong `cltq` (kinh tế ở `cltq.economy`, chiến dịch ở `cltq.p4`). Giữ migration v1–v4→v5 và JSON import/export, không sửa Save Hero v07.
- Giá luyện binh = bạc/lương/sắt thật, có gate cấp Doanh Trại; tier 1–4, không tự tăng số quân. Không tự phát tài nguyên.
- Combat AI, 24 trận hình cũ, tier và cân bằng là SIMULATED. Thay mục tiêu gameplay bằng đội tướng 5v5 có quân lính thật, bản đồ điều quân/chiếm thành, giữ tính tương thích Save cũ và giải quyết thưởng một lần.
- Không đưa artwork, mã nguồn, UI sao chép, âm thanh proprietary của **CMN Online / Chiến Loạn Tam Quốc**, **VNG / Ngọa Long** hoặc bên thứ ba vào repo khi không có quyền sử dụng.

## REV và release gates
1. R: nguồn và phân loại VERIFIED/DERIVED/SIMULATED/UNKNOWN; quyết định thiết kế.
2. E: one vertical slice và một state owner; test failure, snapshot, migration, idempotence.
3. V0: syntax; V1: legacy smoke/P2 31+12/P3 74+360 balance/P4/P4.1 plus CL-P1/P2/P3/P4/P5/P6 focused QA; V2: actual Chromium desktop 1280×720/mobile 390, file-save reload and screenshots/video; V3: GitHub Actions same SHA; V4: người dùng chơi máy thật; V5: duyệt mỹ thuật của owner.
4. **Chỉ khẳng định các gate có bằng chứng**, không đánh đồng GitHub PASS với Windows/Android thật.
5. Không merge, force-push hoặc reset lịch sử của Hero. Mọi update branch dùng expected SHA.
6. Cuối báo cáo: DONE / TESTED / PENDING, exact SHA + Actions link + 2–3 lựa chọn tiếp theo.

## P4.1 sprite production / visual-only (16/11/2026)
- Chỉ ảnh 2D frame-by-frame; tuyệt đối không rig/xương. Từng frame xuất từ 2 pose gốc bằng 2D compositing được ghi rõ. Không tự nhận là hoàn toàn vẽ tay.
- Event clock/view chỉ đọc từ combat event. Charge/release/contact/fade không tự tạo lượt đánh, target, hit, phần thưởng. Replay immutable.
- Single-file offline `index.html`; atlas + generator + manifest là nguồn tái tạo, generated 288 PNG được CI đính kèm artifact.
- Gate bắt buộc: P2/P3/P4 regression + P41 18 checks + video Chromium native 1280×720/12fps + exact SHA. Art approval không thay bằng CI.

## CL-P5 regional visual slice
- Preserve source PNG, WebP derivative, prompt and SHA manifest under `assets/p5/`; verify exact bytes after deterministic rebuild.
- The scenic map is a single background, not a layered level; nodes/roads remain independent, live game controls. Generated image status is `RECREATED`; generation cost is unknown.
- Do not claim the full P5 animation/audio/device/owner gate from map-art QA. The current environment has no AI video-generation route; Chromium video evidence is real browser capture.

## CL-P6 offline grand strategy
- Persist additions under `game.cltq.p6` in Save schema v5: faction relations/pacts, deterministic season/weather turn, independent second army/marches, siege-engine stock, Cửu Đỉnh wonder and repeatable PvE endgame tier. Do not increment schema or alter the save key for additive P6 state.
- NPC diplomacy, economy multipliers, weather costs, combat modifiers, siege, wonder progression and endgame awards are original **SIMULATED** rules. Four NPC faction tags on the existing ten nodes are not real players or server factions.
- Second army has five exclusive commander slots and its own route/location; battle still uses the shared CL combat and receipt authority. Consume one siege engine at settlement and never settle troop/reward receipts twice.
- Cửu Đỉnh unlocks after capturing Lạc Thành. Endgame PvE retains its tier on loss and advances/rewards once on victory. Thiên Hạ Hiệu Lệnh is a paid once-per-battle buff recorded as an immutable combat event/replay frame.
- `qa/cl_p6.py` is the focused Chromium gate for diplomacy, climate, both concurrent armies, siege, wonder, persistent PvE, replay event, save reload and 390px layout. Keep it in exact-SHA Actions beside every prior regression and publish only after the full workflow passes.
