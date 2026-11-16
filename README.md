# Mưu Định Tam Quốc

Game chiến thuật Tam Quốc độc lập, lấy **Chiến Loạn Tam Quốc (CMN Online, 2025)** làm tham chiếu gameplay chính. Ngọa Long chỉ còn là ảnh hưởng lịch sử trong một số hệ thống cũ. Mã nguồn, mỹ thuật và cách trình bày của dự án vẫn nguyên bản; không có liên kết chính thức với CMN Online, VNG hay sản phẩm được tham chiếu.

## Bản chơi mới nhất

CL-P0 đến CL-P3 đã phát hành trên nhánh `main-ngoalong`. SHA `7a43cc650d77bbceef800994e6491d5694f2a8ec` vượt GitHub Actions run [43915734348](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43915734348) và tạo artifact `muu-dinh-tam-quoc-cl-p3-playable` cùng `muu-dinh-tam-quoc-cl-qa-evidence`. Mở trang run để tải HTML offline. Bản CL-P1/P2 trước đó ở run [43909024419](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43909024419).

CL-P4 đang được kiểm tra trước khi phát hành. Bản cục bộ hiện có 49 tướng, 30 chân dung lịch sử minh họa riêng, bảy liên minh, hiệp lực phe, năm chương/15 ải và trận boss 5v5. Sweep 360 trận cho thấy tỷ lệ thắng giảm theo cấp đội hình, hai ải đầu đạt 100%, boss cuối 25%; exact-SHA Actions của bản này chưa chạy.

## Gameplay đã phát hành

- Năm tướng chỉ huy các đội lính hiện diện và tham chiến; quân số còn lại ảnh hưởng sát thương, thương vong được lưu và hồi phục bằng tài nguyên.
- Bản đồ có 10 cứ điểm tương tác: chọn quân, xem đường/ETA/lương, hành quân, công thành NPC, chiếm, đồn trú, phòng thủ và thu hoạch.
- Thành có chín hạng mục nâng cấp. Tỉnh nối đường tạo bạc, lương, gỗ, sắt; quân đồn trú tiêu hao lương; sản xuất offline có giới hạn và sổ giao dịch chống cộng trùng.
- Game chạy offline bằng một file `index.html`, dùng Save `muu_dinh_tam_quoc_v1`, schema 5 và giữ migration v1–v4 cùng hệ thống trận hình 3×3 cũ.

## Bắt đầu

Trên GitHub vào workflow run **SUCCESS** mới nhất của `main-ngoalong`, tải artifact playable tương ứng với mốc cần chơi, giải nén và mở `index.html` bằng Chrome hoặc Edge. Artifact của P3 sẽ tiếp tục có sẵn trong lịch sử Actions sau khi P4 được phát hành.

## Kiểm chứng và tài liệu

- `docs/CHIEN_LOAN_MASTER_SPEC.md` — đặc tả tham chiếu Chiến Loạn Tam Quốc và lộ trình CL-P0 đến CL-P6.
- `docs/CLTQ_REFERENCE_MATRIX.md` — nguồn tham khảo cùng phân loại OBSERVED / DERIVED / SIMULATED / UNKNOWN.
- `docs/CLTQ_GAP_AUDIT.md` — kiểm toán hệ thống, bằng chứng và phần còn thiếu.
- `docs/CURRENT_CHECKPOINT.md` — SHA, trạng thái và cổng kiểm thử hiện tại.
- `docs/REV_PROTOCOL.md` — Research, Engineering, Verification.
- `docs/P4_ASSET_PROVENANCE.md` — nguồn mỹ thuật, nguồn PNG, WebP và hash.

Mỗi mốc cần Chromium thực tế, hồi quy và GitHub Actions trên exact SHA. Mốc Actions không thay QA thiết bị Windows/Android hoặc duyệt mỹ thuật của chủ dự án; hai cổng đó đang **PENDING**.

Nhánh Hero `feature/hog1-research-to-playable-20261102` là dự án riêng, không được sửa hoặc hợp nhất vào nhánh này. Không merge hoặc force-push.
