# AGENTS.md — Mưu Định Tam Quốc

## Quyền ưu tiên sản phẩm

Owner quyết định ngày 17/11/2026: Mưu Định Tam Quốc là game chiến thuật nguyên bản lấy **Ngọa Long cổ điển** làm tham chiếu gameplay chính. Tài liệu có quyền ưu tiên:

1. `docs/NGOA_LONG_REBUILD_SPEC_V1.md` và GitHub Issue #4 bản hiện hành.
2. Chỉ thị trực tiếp mới hơn của owner trong phiên làm việc.
3. `docs/NGOALONG_CODEX_AGENT.md`, `docs/REV_PROTOCOL.md`, `docs/CURRENT_CHECKPOINT.md` và các thiết kế chuyên môn đang hiệu lực.
4. Tài liệu Chiến Loạn/hybrid và chỉ thị trước 17/11/2026 chỉ là lịch sử. Không dùng chúng làm yêu cầu gameplay hay roadmap.

Không diễn giải quyết định này thành game lai hoặc ưu tiên điều quân chiếm thành. Giữ hệ thống CL cũ và dữ liệu người chơi tương thích; chỉ xem là nội dung phụ/lịch sử cho đến khi có quyết định mới.

## Phạm vi, nhánh và dữ liệu

- Chỉ sửa game Mưu Định Tam Quốc trong repo `vuanhtuan161094-byte/Heoofgaia`, nhánh đích `main-ngoalong`.
- Nếu phiên làm việc dùng task branch, tạo từ HEAD đã fetch của `main-ngoalong`; PR (nếu có) chỉ trỏ về `main-ngoalong`. Không tự merge, không reset, không force-push. Không đụng Hero, default branch, Tông Môn Bá Đạo hoặc CMP.
- Phát hành đúng một HTML offline: `index.html`. Giữ build lặp lại được qua `tools/build_ngoa_long_mode.py`; không tạo HTML phát hành song song.
- Giữ Save key `muu_dinh_tam_quoc_v1`, schema v5, migration v1–v4, JSON import/export, chiến báo/replay, `p3PresetId`, `p3TroopTier` và toàn bộ dữ liệu cũ. Không tự xóa hoặc chuyển đổi phá hủy.
- Không chép code, UI, hình, âm thanh hoặc công thức độc quyền của VNG, CMN hay game khác. Ghi provenance cho asset mới; áp dụng `docs/ART_DIRECTION_DARK_CHIBI_V1.md`; không dùng rig.

## Gameplay và state authority

- Mốc hiện tại là NL-R02: trận 3×3 tối đa 5 tướng; ba loại sát thương; sĩ khí/chiến pháp/buff/debuff/hỗ trợ; khắc chế và AI deterministic; thành, tướng, binh chủng, trang bị, khoa kỹ, chiến dịch và Save phải liên kết bằng state thật.
- Công thức, xác suất, chỉ số và nội dung do dự án tự đặt phải ghi SIMULATED. Nguồn tham khảo chính thức và giới hạn chứng cứ ghi ở `docs/NL_REFERENCE_MATRIX.md`.
- Combat engine là authority duy nhất cho HP, sĩ khí, tổn thất, EXP, thưởng và receipt. Replay chỉ đọc snapshot bất biến, không quyết toán lại. Chi phí, mở khóa và phần thưởng chỉ hạch toán một lần.
- Thắng mới mở ải kế tiếp; thua không được nhận thưởng chiến thắng. Đừng giả lập nút chức năng hoặc tuyên bố tính năng chỉ dựa trên giao diện.

## REV và cổng giao hàng

Tuân thủ `docs/REV_PROTOCOL.md`: Research → Engineering → Verification. Làm vertical slice code chạy được, rồi nghiệm thu trước khi mở cổng kế.

- NL-R02 phải chứng minh hành trình tạo thành chủ → bố trận → chiến đấu/chiến pháp → kết toán → nâng cấp → mở ải → lưu/tải/replay; có loss, double-click, thiếu tài nguyên, 24 preset, khắc chế, morale, AI và migration.
- NL-R03 chỉ bắt đầu sau khi R02 đạt cổng kỹ thuật; NL-R04 chỉ bắt đầu sau khi R03 đạt cổng. Không tự nhận owner art/device PASS.
- Mỗi milestone: syntax/static, focused QA, Chromium 1280×720 và 390px, hồi quy hiện có, GitHub Actions trên exact SHA, artifact chơi được chỉ sau workflow SUCCESS. Bằng chứng và phần còn thiếu được ghi trong checkpoint.
- Không xóa, bỏ qua hoặc làm yếu regression để có CI xanh. Nếu cổng chưa chạy hoặc chưa được con người nghiệm thu, ghi PENDING/BLOCKED đúng trạng thái.
