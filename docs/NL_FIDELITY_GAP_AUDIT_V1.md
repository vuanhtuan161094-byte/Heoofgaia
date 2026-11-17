# NL-REF-REV-A — Kiểm toán sai lệch Ngọa Long / Mưu Định Tam Quốc

**17/11/2026 — REPORT PHASE A / RESEARCH PARTIAL**. Repository vuanhtuan161094-byte/Heoofgaia, branch main-ngoalong. Mã gameplay kiểm toán ở baseline 66fb0fcfdde782dd803db4e6dd6a3ecee198d388. Đối chiếu nguồn tại docs/NL_REFERENCE_MATRIX.md. Lần kiểm toán này **không sửa gameplay, save, atlas, test hay Hero**.

## Evidence và giới hạn

- Đã xác nhận workflow 44001013453 (baseline 66fb0fcf) SUCCESS, gồm build portal Ngọa Long, Chromium NL-R01 3x3/route/battle và regression P2/P3/CL; video và artifact hiện vẫn có tên CL. Không có bằng chứng R02/R03 đã được owner nghiệm thu.
- Đã xem source qua diff commit 3db3976b (P3) và các test qa/ngoa_long_mode.py, qa/p2_full.py, qa/p2_advanced.py, qa/p3.py, qa/p3_balance.py, qa/cl_p4.py cùng build generator. File index.html 5.5 MB **không được GitHub connector trả toàn bộ trong lần kiểm toán**, do vậy các kết luận về engine hiện tại chỉ dựa trên phần diff+test có thể kiểm chứng.
- Hai screenshot người dùng cung cấp cho thấy màn P03 Ngã Rẽ Binh Chủng và màn chiến Thiết Môn Quan; ảnh chưa có SHA liên kết, không thể xác nhận đó là artifact HEAD mới nhất.
- Trang Wiki chính thức có hàng nghìn entry, chưa đọc toàn bộ. Kết luận phía dưới là danh sách sai lệch đã tìm ra, **không phải audit đầy đủ mọi tướng/kỹ năng/map**.

## Tóm tắt đánh giá

**PHASE A: RESEARCH DOCUMENTED / TECHNICAL FIDELITY NOT ACCEPTED.** Hệ thống có chiến đấu theo lượt, sĩ khí, replay, 3x3 và 24 preset; tuy nhiên số lượng preset không phản ánh 24 bản sắc trận pháp, vòng khắc chế hiện tại thiếu Thương so với VNG Wiki, biến thể binh chủng chưa được kiểm chứng trên main-ngoalong và test chưa chứng minh game buộc người chơi điều chỉnh chiến thuật theo phó bản.

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
| NL-GAP-10 | P1 | Chưa có source matrix theo phiên bản tại thời điểm R01 | docs/NGOA_LONG_REBUILD_SPEC_V1.md có 3 link, chưa đủ traceability. Wiki hiện hành không mặc nhiên là bản classic | Tạo docs/NL_REFERENCE_MATRIX.md và maintenance gate. Giữ lớp CLASSIC-2012 / VNG-WIKI-2026, ghi VERIFIED/DERIVED/SIMULATED/UNKNOWN |
| NL-GAP-11 | P2 | Tài liệu Codex cũ còn chỉ thị game Chiến Loạn ưu tiên | docs/NGOALONG_CODEX_AGENT.md mở đầu bằng lời đổi sang Chiến Loạn; AGENTS.md/CURRENT_CHECKPOINT.md có đoạn lịch sử tự gọi high priority | Chuẩn hóa effective instructions, đổi đoạn lịch sử thành heading archival, chỉ dẫn đọc ưu tiên đơn nhất. Không mất ràng buộc save/IP/REV |
| NL-GAP-12 | P2 | 'Balance 360' chưa tương đương độ khó người chơi và tránh deadlock kinh tế | qa/p3_balance.py set fixture quân/cấp/tiền cao không đo thời gian kiếm tài nguyên; chính docs/P3_BALANCE.md cảnh báo | Test onboarding 30 phút thực, 3 profiles with cost-bound inventory, tình huống thua hồi quân/mua binh, 0 softlock |
| NL-GAP-13 | P2 | Fidelity visual so với Ngọa Long và direction art mới chưa được duyệt | Art Bible đã chốt chibi hắc ám mắt sáng, nhưng user battle screenshot cho thấy sprite giống nhau và khó đọc | Pilot 2 tướng / 2 loại lính, 4 hướng, Idle/Walk/Attack/Hit/Fall, VFX alpha thật, ảnh/video Chromium source-identical; owner phê duyệt sau pilot |
| NL-GAP-14 | P2 | Tên artifact/clips/CI còn CL-P6 dù sản phẩm đã đổi | .github/workflows/ngoalong-qa.yml xuất muu-dinh-tam-quoc-cl-p6-playable, video P4.1 cũ | Khi gameplay đã chuyển, đổi tên artifact/ngôn ngữ release mà vẫn giữ CL test tương thích; báo đúng SHA, không đánh tráo chứng cứ |

## Ba kiểm thử đối chứng mới đề xuất

1. **Counter matrix A/B**: 5 tướng cùng chỉ số, cùng seed; đổi duy nhất type Bộ/Thương/Kỵ; đo sát thương/target hiệu lực, không thay costume hay tạo quân. Nhánh Cung/Quan Văn phải có specialty thay vì nhét vào vòng 3 lớp.
2. **Morale tempo A/B**: cùng ải/seed, đội x1 vs x2 trống; đo lượt đầu tiên tướng chính dùng chiến pháp, số lượt mất sĩ khí, sát thương chịu và khả năng khắc chế bằng quân giảm sĩ khí.
3. **Map puzzle A/B**: quân cùng cấp và gear, AI boss cố định, so sánh hai trận pháp; một phương án thắng nhờ đổi tuyến/ngắt buff, phương án còn lại thua. Combat log và Chromium video phải khớp seed, no reward twice.

## Lộ trình xử lý sau kiểm toán

- **Gate N0:** đọc/tóm tắt có phiên bản và traceability nguồn (ma trận đang PARTIAL; chưa full Wiki).
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

**Kết luận hạn chế phạm vi:** Tình trạng được kiểm chứng hiện tại là *NL-R01 technically integrated; R02/R03 fidelity review pending*. Ngọa Long Wiki quá lớn để đọc hết tại thời điểm kiểm toán đầu tiên. Không dùng tài liệu này để tuyên bố đã hoàn thiện Ngọa Long, không merge hoặc xóa CL data.
