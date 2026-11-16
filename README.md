# Mưu Định Tam Quốc

Game chiến thuật Tam Quốc độc lập, lấy **Chiến Loạn Tam Quốc (CMN Online, 2025)** làm tham chiếu gameplay chính. Ngọa Long chỉ còn là ảnh hưởng lịch sử trong một số hệ thống cũ. Mã nguồn, mỹ thuật và cách trình bày của dự án vẫn nguyên bản; không có liên kết chính thức với CMN Online, VNG hay sản phẩm được tham chiếu.

## Bản chơi mới nhất

CL-P0 đến CL-P5 đã phát hành. Bản chơi công khai mới nhất là CL-P5 SHA `54c1b8591de76ac83f38ee0330f7343e4f4917cc`, vượt toàn bộ GitHub Actions exact-SHA run [43926009183](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43926009183), xuất bản artifact `muu-dinh-tam-quoc-cl-p5-playable` và `muu-dinh-tam-quoc-cl-qa-evidence`. Mở trang run để tải HTML offline. Bản P4 vẫn có tại workflow [43923305781](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43923305781); các bản P3 và P1/P2 ở [43915734348](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43915734348) và [43909024419](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43909024419).

CL-P6 đã được triển khai trong `index.html`: ngoại giao NPC, bốn mùa/thời tiết tác động hành quân, đạo quân cánh đánh độc lập, máy công thành, kỳ quan Cửu Đỉnh và chiến dịch PvE tăng tầng. Local Chromium hiện đạt 30/30, gồm cả chiến thắng và thất bại có lưu tiến độ. Exact-SHA Actions và artifact P6 đang chờ phát hành; tải P5 để chơi trong lúc workflow P6 chưa xác nhận. P4 bổ sung 49 tướng, 30 chân dung lịch sử minh họa riêng, bảy liên minh, hiệp lực phe, năm chương/15 ải và trận boss 5v5. Sweep 360 trận cho thấy hai ải đầu đạt 100%, boss cuối 25% theo bốn hồ sơ đội quân.

## Gameplay đã phát hành

- Năm tướng chỉ huy các đội lính hiện diện và tham chiến; quân số còn lại ảnh hưởng sát thương, thương vong được lưu và hồi phục bằng tài nguyên.
- Bản đồ có 10 cứ điểm tương tác: chọn quân, xem đường/ETA/lương, hành quân, công thành NPC, chiếm, đồn trú, phòng thủ và thu hoạch.
- Thành có chín hạng mục nâng cấp. Tỉnh nối đường tạo bạc, lương, gỗ, sắt; quân đồn trú tiêu hao lương; sản xuất offline có giới hạn và sổ giao dịch chống cộng trùng.
- Game chạy offline bằng một file `index.html`, dùng Save `muu_dinh_tam_quoc_v1`, schema 5 và giữ migration v1–v4 cùng hệ thống trận hình 3×3 cũ.
- Chiến dịch CL-P4 có 49 tướng có thể chiêu mộ, 25 kỹ năng riêng, hiệp lực +6% theo phe và 15 trận 5v5 với thưởng lần đầu lưu đúng một lần.
- P5 phủ bản đồ vùng bằng tranh địa hình riêng; các tỉnh, đường đi, quân hành quân và lệnh đánh vẫn là phần tử tương tác thật.
- P6 thêm kết minh/thuế thương mại, dự báo mùa và thời tiết, hai đạo quân hành quân đồng thời, máy công thành dùng một lần, Cửu Đỉnh mở chiến dịch PvE lâu dài và đại hiệu lệnh tốn tài nguyên trong trận.

## Bắt đầu

Trên GitHub vào workflow run **SUCCESS** của `main-ngoalong`, tải artifact playable tương ứng với mốc cần chơi, giải nén và mở `index.html` bằng Chrome hoặc Edge. Artifact P5 hiện là bản công khai mới nhất; P6 sẽ thay thế sau khi toàn bộ exact-SHA Actions đạt.

## Kiểm chứng và tài liệu

- `docs/CHIEN_LOAN_MASTER_SPEC.md` — đặc tả tham chiếu Chiến Loạn Tam Quốc và lộ trình CL-P0 đến CL-P6.
- `docs/CLTQ_REFERENCE_MATRIX.md` — nguồn tham khảo cùng phân loại OBSERVED / DERIVED / SIMULATED / UNKNOWN.
- `docs/CLTQ_GAP_AUDIT.md` — kiểm toán hệ thống, bằng chứng và phần còn thiếu.
- `docs/P6_SYSTEMS_DESIGN.md` — luật ngoại giao, mùa, hai đạo quân, Cửu Đỉnh và Chinh Phạt Vô Tận.
- `docs/CURRENT_CHECKPOINT.md` — SHA, trạng thái và cổng kiểm thử hiện tại.
- `docs/REV_PROTOCOL.md` — Research, Engineering, Verification.
- `docs/P4_ASSET_PROVENANCE.md`, `docs/P5_ASSET_PRODUCTION.md` — nguồn mỹ thuật, PNG, WebP, prompt và hash.

Mỗi mốc cần Chromium thực tế, hồi quy và GitHub Actions trên exact SHA. Mốc Actions không thay QA thiết bị Windows/Android hoặc duyệt mỹ thuật của chủ dự án; hai cổng đó đang **PENDING**.

Nhánh Hero `feature/hog1-research-to-playable-20261102` là dự án riêng, không được sửa hoặc hợp nhất vào nhánh này. Không merge hoặc force-push.
