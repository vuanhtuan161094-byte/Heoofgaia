# AGENTS.md — Mưu Định Tam Quốc / Wiki-driven Ngọa Long

## Chủ đích phát triển và CI tối ưu — quyết định Owner 18/11/2026
- **Đích phát hành là game V1.0 hoàn chỉnh, không phải thêm các bản Alpha/Demo để chủ dự án chơi thử.** Milestone nhỏ vẫn được làm và QA nội bộ nhưng không coi đó là nghiệm thu sản phẩm; chỉ gửi bản final khi vòng chiến dịch/tiến hóa/nội dung/mỹ thuật/Save đủ tiêu chí đã thống nhất.
- **Ưu tiên nội dung thật:** Wiki hiện hành là tư liệu nghiên cứu; phải phân biệt Mobile/classic, ghi nguồn từng dữ kiện, kiểm chứng quyền sử dụng, không sao chép hình/công thức/biểu đạt độc quyền. Phải biến catalog thành gameplay hoạt động (cấp quân, binh chủng riêng, NPC nhiều trận trong bản đồ, boss) chứ không chỉ thêm source registry hoặc danh sách đếm.
- **QA 2 luồng nhưng bảo toàn tất cả test:** Workflow `.github/workflows/ngoalong-qa.yml` chạy job `quick` trên commit thay code/data/asset/QA, gồm validator, R02/R03, progression, Save và legacy-safety liên quan. Docs-only chỉ cần job `changed_sources`, không dựng video/atlas. Job `game` đầy đủ (toàn bộ legacy CL/P4.1, video, 30/60-minute simulation và artifact phát hành) chỉ chạy khi push `main-ngoalong`, dispatch hoặc commit task branch có chính xác nhãn `[full-ci]` trong subject/message.
- Vì default branch của repo hiện là nhánh Hero, **để bảo đảm full CI chạy trên task branch Ngọa Long, dùng nhãn commit `[full-ci]` và đối chiếu run exact SHA** thay vì giả định workflow_dispatch trên default branch hoạt động trên nhánh này.
- Ghi DONE/TESTED chỉ theo từng gate có kết quả; `quick` PASS không phải full release PASS, càng không phải nghiệm thu người dùng. Không dùng một seed / fixture mô phỏng duy nhất để khẳng định gameplay cân bằng hoặc V1.0 hoàn chỉnh.
- Giữ Save v5/key, replay, kinh tế idempotent và toàn bộ test lịch sử trong job full; **không được gỡ test chỉ vì muốn workflow xanh hoặc nhanh**. Không sửa Hero, không tự merge/force push; chủ dự án chỉ định tiếp tục ở PR #6.

## Thẩm quyền hiện hành — Issue #4 và Wiki-driven V2, 17/11/2026
- GitHub Issue #4 mới nhất và chỉ thị V2 của owner cùng chọn gameplay Ngọa Long làm định hướng, dùng Wiki VNG chính thức làm nguồn tham khảo ưu tiên. `docs/NGOA_LONG_REBUILD_SPEC_V1.md` giữ hợp đồng gameplay; `docs/NL_DATA_DRIVEN_V2.md` bổ sung schema, provenance và lộ trình kỹ thuật hiện hành.
- Nghiên cứu Wiki Mobile hiện hành và Ngọa Long web cổ điển phải tách riêng; không tuyên bố parity khi chưa có bằng chứng. Dùng `VERIFIED / DERIVED / SIMULATED / UNKNOWN`; giá trị chưa có nguồn phải để null hoặc ghi là mô phỏng của dự án.
- Ưu tiên P0–P4: sửa/kiểm tra CI, schema+validator, chuyển binh chủng/tiến hóa/trạng thái sang dữ liệu, cấu hình 10–20 phó bản đầu, tích hợp R02/R03 và phát hành HTML Alpha. P5 mỹ thuật chỉ mở sau khi Alpha chơi được được nghiệm thu.
- Các chỉ thị Chiến Loạn/hybrid trong lịch sử chỉ còn là regression hoặc dữ liệu tương thích; không dùng làm hướng gameplay chính. Không xóa CL state hay regression gate.
- Giữ mã và mỹ thuật nguyên bản; không sao chép code, hình, âm thanh, UI đặc thù, lời mô tả sáng tạo hoặc công thức nội bộ của VNG. Không sửa Hero/Tông Môn/CMP, không đổi default branch, không merge hoặc force-push.

## Repo, branch, build và quyền truy cập
- Repo duy nhất: `vuanhtuan161094-byte/Heoofgaia`; làm trên task branch do owner chỉ định từ `main-ngoalong`. Không tự chuyển sang Hero hoặc mở rộng sang repo khác.
- Trước khi sửa, xác nhận exact HEAD từ GitHub và đọc `AGENTS.md`, `docs/REV_PROTOCOL.md`, `docs/CURRENT_CHECKPOINT.md`, spec hiện hành, Issue #4 và code liên quan.
- Một bản phát hành offline `index.html`; generator và dữ liệu có cấu trúc phải build lặp lại trong `.github/workflows/ngoalong-qa.yml`. Không giao một HTML thay thế ngoài luồng build.
- Chỉ ghi DONE/TESTED khi có test, screenshot/video đúng build và GitHub Actions trên exact SHA. V4 máy thật và V5 owner approval luôn tách khỏi CI.
- Chỉ thị cũ có thể còn bên dưới để giữ regression. Nếu mâu thuẫn về hướng gameplay hoặc thứ tự milestone, áp dụng Issue #4 mới nhất và V2 của owner.

## Gameplay data/authority
- Dữ liệu JSON đã kiểm chứng qua schema/validator là nguồn runtime cho troop taxonomy, project counter coefficients, status, evolution, formation plans và các NPC/map Alpha được chuyển đổi. NPC không có nguồn phải giữ level/soldiers/stats null với provenance UNKNOWN.
- Trận chính tối đa 5 tướng trên 3×3; trận thắng mới quyết toán tiền/EXP/tổn thất/phần thưởng. Replay immutable và không cấp thưởng lần hai.
- Giữ Save key `muu_dinh_tam_quoc_v1`, schema v5, migration v1–v4, receipts, replay, `p3TroopTier`, `p3PresetId`, và toàn bộ `cltq` legacy state. Không sửa Save Hero v07.
- Giá, hệ số combat, tiến hóa, nhánh kỹ năng và phần thưởng do dự án tự chọn phải gắn SIMULATED; không tự bơm tài nguyên hoặc xóa dữ liệu cũ.
- CL-P1–P6 và P4.1 còn là regression gates/dữ liệu lịch sử; giữ chúng chạy trong Actions và phân biệt rõ với nội dung game Ngọa Long hiện hành.

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
