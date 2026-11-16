# REV — Research, Engineering, Verification / quy trình review game

Tên gọi REV trong dự án này là QUY TRÌNH REVIEW ĐƯỢC GHI NHẬN; hiện không có một plugin skill riêng tên REV trong danh mục được kết nối. Quy trình kế thừa evidence ladder và project direction đã áp dụng với game Tông Môn Bá Đạo, chỉnh cho HTML/Chromium.

## R — Research & requirements
1. Dùng Chiến Loạn Tam Quốc (CMN Online, 2025) làm tham chiếu gameplay chính theo master spec; Ngọa Long chỉ còn là ảnh hưởng lịch sử khi phù hợp. Lưu URL + bản/niên đại + phân loại chứng cứ.
2. Gắn OBSERVED / DERIVED / SIMULATED / UNKNOWN cho từng luật; không tự khẳng định chi tiết thiếu chứng cứ.
3. Chốt gameplay contract theo input → authoritative state → combat/event → receipt → save → UI; giữ hệ thống riêng biệt khỏi Hero.

## E — Engineering
4. Đọc HEAD và AGENTS.md; sửa theo vertical slice nhỏ, không phát tán bản HTML rời rạc.
5. Một canonical index.html; giữ bản đã được nhận vào Git với commit SHA thay vì ZIP phiên bản song song.
6. Giữ đội hình 3×3, sĩ khí, chiến pháp, 24 preset, khắc chế và 3 damage lanes; bổ sung đội chỉ huy 5 tướng, quân sống/chết/bị thương và bản đồ CL bằng state riêng, có deterministic QA.
7. Không cấp EXP/tài nguyên lần nữa khi replay; bảo toàn Save key, giữ migration v1/v2/v3 lên schema v4 và JSON import/export.

## V — Verification
8. Gate V0 syntax/static; V1 unit/focused; V2 Chromium render/interaction/replay/save; V3 CI exact SHA; V4 QA máy thật; V5 duyệt mỹ thuật của owner.
9. Bất kỳ gate nào chưa có bằng chứng phải ghi PENDING hoặc BLOCKED, không giả PASS.
10. QA screenshot phải từ runtime thực, có khung hình và SHA. Save test bằng shim khác nghiệm thu file:// thực tế.
11. Báo cáo cuối mỗi phiên: WHAT CHANGED → TEST RESULTS → FAIL/KNOWN RISKS → SHA/LINK → 2–3 OPTIONS.

## Trạng thái tác vụ
BACKLOG → DESIGN → CODE READY → TESTED → INTEGRATED → PLAYTEST → OWNER ACCEPTED. Nếu có lỗi: BLOCKED. Không coi CODE READY là DONE.

## Quy định về branch
main-ngoalong là main *logic* của game mới, nhưng nằm trong cùng repository Heoofgaia. Tạo một cây file riêng trên branch này; KHÔNG mở PR merge từ main-ngoalong sang nhánh Hero, vì đó là hai game khác nhau.
