# NL-REF-REV-A — Kiểm toán sai lệch Ngọa Long / Mưu Định Tam Quốc

**17/11/2026 — NL-WIKI-01 CORE RESEARCH COMPLETE, COVERAGE PARTIAL**. Repository vuanhtuan161094-byte/Heoofgaia, task branch `codex/nl-wiki-01-r02-20261117`, based on latest `main-ngoalong` SHA 05cb413b08e917e1aa4026fb54a5ff621373153e. Hai commit sau baseline cũ 66fb0fc chỉ cập nhật tài liệu; code combat được kiểm toán không đổi. Đối chiếu nguồn tại docs/NL_REFERENCE_MATRIX.md. NL-WIKI-01 chỉ sửa tài liệu nghiên cứu/checkpoint; không sửa gameplay, save, atlas hay Hero.

## Evidence và giới hạn

- Đã fetch exact latest branch HEAD 05cb413b08e917e1aa4026fb54a5ff621373153e; đọc AGENTS.md, REV, product spec, checkpoint, Issue #4, NL_REFERENCE_MATRIX.md và tài liệu audit.
- Đã inspect trực tiếp code ở index.html tại P2_COUNTERS, p2Hit, p2Morale, p2Target, P3_PRESETS, p3Upgrade và p3CounterFactor; code counter/tier/save IDs được đối chiếu với source, không chỉ suy từ screenshot.
- Đã mở Wiki chính thức cho Binh Chủng, Võ Tướng, Hiệu Ứng, Ấn Trận, Phó Bản, Trang Bị, Vật Phẩm, Cao Cấp, Quý Tử và Tri Kỷ; đã đọc các guide webgame 2012 có ngày xuất bản. Mức đọc theo từng nhóm là READ/PARTIAL/NOT_READ trong NL_REFERENCE_MATRIX.md. **Không đọc hết hàng nghìn mục.**
- Reproducible NL-R01 build check and inline syntax passed locally; the built canonical HTML passed `qa/ngoa_long_mode.py` 18/18 in Chromium at 1280×720 and 390×844. Screenshots: `qa/nl-rebuild-desktop.png` and `qa/nl-rebuild-mobile.png`. Exact-SHA Actions for this research commit remain pending.
- GitHub latest code HEAD contains NL-R01; prior task-branch code is not evidence for current HEAD. Full exact-SHA validation remains required after the research and NL-R02 commits land.

## Tóm tắt đánh giá

**NL-WIKI-01: RESEARCH DOCUMENTED / CORE COVERAGE PARTIAL / TECHNICAL FIDELITY NOT ACCEPTED.** Hệ thống có chiến đấu theo lượt, sĩ khí, replay, 3x3 và 24 preset; tuy nhiên số lượng preset không phản ánh 24 bản sắc trận pháp, vòng khắc chế hiện tại dùng Bộ/Kỵ/Cung cộng thêm Mưu sĩ→Bộ và thiếu Thương, biến thể binh chủng trên latest main vẫn chủ yếu cộng chỉ số, và test chưa chứng minh game buộc người chơi điều chỉnh chiến thuật theo phó bản.

| ID | Ưu tiên | Sai lệch / thiếu bằng chứng | Bằng chứng và tác động | Hành động cụ thể + cổng nghiệm thu |
| --- | --- | --- | --- | --- |
| NL-GAP-01 | P0 | Khắc chế lõi Bộ > Kỵ > Cung > Bộ, thiếu Thương | docs/P3_DESIGN.md và code diff P3: P2_COUNTERS / p3CounterFactor. Wiki hiện hành rõ Bộ > Thương > Kỵ > Bộ, Cung và Quan Văn có vai trò riêng | Thiết kế lại taxonomy gồm Bộ, Thương, Kỵ, Cung, Quan Văn, giữ migration. Chạy cùng attacker/defender/seed và xác nhận 3 cặp chính, trường hợp trung tính; đánh dấu hệ số SIMULATED |
| NL-GAP-02 | P0 | Chưa có test chứng minh đổi bố trận giúp vượt một ải đang thua | qa/p3.py kiểm tra có 24 ID, triển khai, mô phỏng với fixture; qa/p3_balance.py sweep 360 seed nhưng không tìm bản đối chứng chỉ thay một quyết định | Tạo trận puzzle có kịch bản: cùng cấp/tướng/trang bị/seed, thất bại với bố trận A, qua với bố trận B nhờ target/đòn/khắc chế; xuất battle event diff và Chromium video |
| NL-GAP-03 | P0 | Trống/sĩ khí chưa chứng minh loop combo-counters thực sự đủ sâu | P2 full kiểm tra trống tạo event, P2 advanced có 1 ca Chu Du và DOT; bài Ngọa Long cổ điển 2012 cho thấy trống tăng sĩ khí, chủ lực cast sớm nhưng đánh đổi chịu đòn | Tạo QA 5v5: trống x1/x2/x3, hành động trước/sau, ngưỡng sĩ khí, bị trừ/tước sĩ khí, không double cast; log lý do AI; kịch bản có đối sách |
| NL-GAP-04 | P1 | 24 presets = 6 formation x 4 biến thể; không phải 24 trận pháp độc lập | P3_PRESETS = Object.entries(FORMATIONS).flatMap(P3_VARIANTS); 4 biến thể chính là pressure/counter/protect/finish và mask. Nhãn '24 đội hình thực' dễ gây hiểu lầm | Đổi nhãn thành '6 trận pháp / 24 phương án' và bảo đảm mỗi phương án tạo khác biệt hữu ích; giữ p3PresetId và tất cả 24 save ID |
| NL-GAP-05 | P1 | Hiện nâng binh chủng P3 chủ yếu cộng stats; không có tiến hóa vai trò theo nhánh ở P3 baseline | p3Upgrade chỉ tăng tier 1–4, p2Unit được nhân Công/Thủ/HP, bất biến quân số. Wiki có cây tiến hóa với hiệu ứng chức năng | Kiểm tra feature P03 người dùng chụp có SHA/code chưa; thiết kế mỗi nhánh 2+ lựa chọn có trade-off, riêng build test chức năng hơn là % stats |
| NL-GAP-06 | P1 | AI đánh mục tiêu có scoring nhưng lý do hành động thiếu khả năng kiểm toán trên UI | p2Target ưu tiên HP/counter/role/lane; bài 2012 cho thấy chiến thuật khắc chế NPC cụ thể. Chưa có telemetry 'AI chọn vì...' trong các QA NL-R01 | Combat log chứa target candidates/ưu tiên/threat/skill-ready dưới dạng inspectable debug; kiểm tra cùng seed cùng đầu vào ra cùng quyết định |
| NL-GAP-07 | P1 | NL-R01 có hub Ngọa Long nhưng chưa thay toàn vòng CL bằng vòng chiến thuật | Generator nối nlRebuildHub() vào renderCity; các CL-P1..P6 vẫn giữ ở workflow và xuất artifact tên CL-P6; điều này đúng bảo tồn dữ liệu nhưng không phải chứng cứ R02 | Điều hướng Game Home -> Bày Trận -> Phó Bản -> chiến đấu -> kết toán -> luyện -> save/reload, không qua CL map. Test ngã rẽ không mở CL màn chính |
| NL-GAP-08 | P1 | Giao diện chiến đấu còn khó đọc | Screenshot từ người dùng: tướng, cờ, tên tướng, thanh HP và số quân xếp chồng ở khoảng 1280x720; UI P03 dropdown cắt mô tả dài | Có fixture 5v5 ảnh desktop và 390px; visual QA bounding boxes không overlap text/HUD, số lính rõ, hit effects đúng đơn vị; owner visual PENDING |
| NL-GAP-09 | P1 | Khác biệt địch/ải/boss theo cơ chế chưa được chứng minh đủ | qa/cl_p4.py có stage 15, boss, thưởng chỉ một lần; đó là hệ CL. Wiki phó bản có NPC/level/rewards và bài 2012 thay build theo trận | 5 map Ngọa Long-first (ít nhất 3 bài toán chiến thuật khác nhau) có enemy formation/skill khác, kết quả thắng mở đúng ải và tính thưởng đúng một lần |
| NL-GAP-10 | P1 | Source traceability vừa được hoàn thiện cho nhóm core, nhưng chưa exhaustive | `docs/NL_REFERENCE_MATRIX.md` now records URLs, access date, version scope, READ/PARTIAL/NOT_READ, current code state and QA assertions. Wiki coverage remains partial. | **NL-WIKI-01 core slice DONE locally**; keep unresolved categories marked PARTIAL/NOT_READ and extend the matrix when R02/R03 add systems. Full Wiki reading is not claimed. |
| NL-GAP-11 | P2 | Tài liệu Codex cũ từng ưu tiên Chiến Loạn/hybrid | `docs/NGOALONG_CODEX_AGENT.md` now opens with Issue #4 and marks prior roadmap/game-loop material archival; `docs/CURRENT_CHECKPOINT.md` now marks CL direction archival. `AGENTS.md` contains conflicting historical sections, resolved by the more recent owner Issue #4 precedence. | **Effective task docs normalized in NL-WIKI-01.** Keep `AGENTS.md` intact as repository policy/history; apply the latest Issue #4 for the active product direction. Retain compatible save/IP/REV constraints. |
| NL-GAP-12 | P2 | 'Balance 360' chưa tương đương độ khó người chơi và tránh deadlock kinh tế | qa/p3_balance.py set fixture quân/cấp/tiền cao không đo thời gian kiếm tài nguyên; chính docs/P3_BALANCE.md cảnh báo | Test onboarding 30 phút thực, 3 profiles with cost-bound inventory, tình huống thua hồi quân/mua binh, 0 softlock |
| NL-GAP-13 | P2 | Fidelity visual so với Ngọa Long và direction art mới chưa được duyệt | Art Bible đã chốt chibi hắc ám mắt sáng, nhưng user battle screenshot cho thấy sprite giống nhau và khó đọc | Pilot 2 tướng / 2 loại lính, 4 hướng, Idle/Walk/Attack/Hit/Fall, VFX alpha thật, ảnh/video Chromium source-identical; owner phê duyệt sau pilot |
| NL-GAP-14 | P2 | CI artifact từng mang tên CL-P6 dù sản phẩm đã đổi | `.github/workflows/ngoalong-qa.yml` now scopes push validation to `main-ngoalong` and `codex/**`, and publishes `muu-dinh-tam-quoc-ngoa-long-playable` plus `muu-dinh-tam-quoc-qa-evidence`. Historical CL tests/video remain labeled as legacy test steps. | **Naming/branch trigger corrected in NL-WIKI-01.** Verify successful artifact publication in Actions on this exact commit; keep legacy test labels truthful. |

## NL-WIKI-01 result

- **DONE (core scope):** current official Wiki research was opened for troop types, heroes, effects, formations/seals, dungeons, gear/items, advanced technology, and linked residence systems; dated classic guides were used only as historical evidence. Per-group coverage is in `docs/NL_REFERENCE_MATRIX.md`. The stale Codex direction and checkpoint headers now defer to Issue #4 while preserving compatible safeguards.
- **RESEARCH LIMIT:** individual hero/troop/effect/map entries and several late systems remain PARTIAL/NOT_READ. Wiki totals conflict across the home and subpages. Current Mobile rules are not asserted as classic webgame rules.
- **LOCAL TESTED:** reproducible NL-R01 build check, inline syntax, and actual Chromium hub/navigation/battle entry at desktop/mobile passed. Generated screenshots are from the current source after the documented build step.
- **PENDING:** exact-SHA Actions for the research commit; no gameplay fidelity acceptance is claimed before NL-R02 same-seed tests.

## Ba kiểm thử đối chứng mới đề xuất

1. **Counter matrix A/B**: 5 tướng cùng chỉ số, cùng seed; đổi duy nhất type Bộ/Thương/Kỵ; đo sát thương/target hiệu lực, không thay costume hay tạo quân. Nhánh Cung/Quan Văn phải có specialty thay vì nhét vào vòng 3 lớp.
2. **Morale tempo A/B**: cùng ải/seed, đội x1 vs x2 trống; đo lượt đầu tiên tướng chính dùng chiến pháp, số lượt mất sĩ khí, sát thương chịu và khả năng khắc chế bằng quân giảm sĩ khí.
3. **Map puzzle A/B**: quân cùng cấp và gear, AI boss cố định, so sánh hai trận pháp; một phương án thắng nhờ đổi tuyến/ngắt buff, phương án còn lại thua. Combat log và Chromium video phải khớp seed, no reward twice.

## Lộ trình xử lý sau kiểm toán

- **Gate N0 / NL-WIKI-01:** core source/version traceability completed, Wiki coverage remains PARTIAL; exact-SHA Actions pending.
- **Gate N1:** sửa/định chuẩn khắc chế 5 lớp, sĩ khí, 5v5 trận pháp và 3 test A/B; giữ migration v1-v5, receipts, replay.
- **Gate N2:** kiểm tra gameplay R03 branch evolution và skill riêng; đối chiếu mỗi lựa chọn thực sự khác lối chơi.
- **Gate N3:** kiểm thử Ngọa Long full loop, cân bằng/kinh tế và Chromium visual; owner QA PENDING.
- **Gate N4:** chốt pilot art và tiến độ R04; không sửa toàn bộ nhân vật trước khi owner duyệt.

## Quy tắc nghiệm thu

- V0: syntax/build reproducibility, static checks.
- V1: focused tests trên combat authority, bất biến save/receipt, P2/P3/CL regression không được loại bỏ.
- V2: Chromium desktop 1280x720, mobile 390; click thực, scene thật, report replay và ảnh/video đúng build.
- V3: GitHub Actions SUCCESS đúng commit SHA + evidence + playable artifact.
- V4: chơi Windows/Android vật lý vẫn PENDING.
- V5: owner art/fidelity approval vẫn PENDING.

**Kết luận hạn chế phạm vi:** *NL-WIKI-01 core research is documented and locally tested; exact-SHA Actions are pending. NL-R02 has not yet been implemented on this task branch; gameplay fidelity remains unaccepted.* Ngọa Long Wiki chưa được đọc toàn bộ. Không dùng tài liệu này để tuyên bố đã hoàn thiện Ngọa Long, không merge hoặc xóa CL data.
