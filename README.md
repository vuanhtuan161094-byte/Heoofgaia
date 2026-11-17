# Mưu Định Tam Quốc — Ngọa Long-first

> **Quyết định mới nhất 17/11/2026:** Chủ dự án yêu cầu **làm lại theo gameplay Ngọa Long**, hủy mục tiêu Chiến Loạn/hybrid. Source of truth: [NGOA_LONG_REBUILD_SPEC_V1.md](docs/NGOA_LONG_REBUILD_SPEC_V1.md). Core: bố trận 3×3/5 tướng, sĩ khí, chiến pháp, binh chủng, trang bị, thành trì và phó bản. Sản phẩm độc lập, không thuộc VNG; không sử dụng tài sản độc quyền của game tham chiếu. Phần CL-P6 cũ được giữ để tương thích Save, **không còn là gameplay ưu tiên**.

> **NL-REBUILD-01:** GitHub Actions chạy `tools/build_ngoa_long_mode.py` để lắp ghép một `index.html` offline chơi được từ nguồn gốc + dashboard Quân Cơ Phủ. Nút chức năng đi vào combat/trận hình/phó bản thật. Muốn chơi phiên bản mới phải tải artifact **từ workflow SUCCESS trên đúng SHA**, không mở trực tiếp `index.html` nguồn cũ khi chưa build. Thiết kế mới chưa phải remake hoàn chỉnh.

## Thông tin phiên bản cũ (lịch sử)


**QUYẾT ĐỊNH CHÍNH THỨC 17/11/2026:** Game nguyên bản **lai Chiến Loạn (điều quân, chiếm thành, binh lính đánh thật) × Ngọa Long (trận hình 3×3, 24 presets, sĩ khí, chiến pháp)**; đồ họa **Dark Fantasy Sharp-Eyed Chibi 2D hand-painted, mắt sáng năng lượng, không rig**. Xem [Game Design Bible](docs/GAME_DESIGN_BIBLE_HYBRID_V1.md) và [Art Bible](docs/ART_DIRECTION_DARK_CHIBI_V1.md). Trạng thái game hiện tại là CL-P6 baseline, hybrid/art mới chỉ chốt thiết kế, chưa xác nhận code hoàn tất. Không liên quan chính thức CMN/VNG.

> **LATEST HEAD CI BLOCKED:** bản sprite Bộ binh CL-P5 hiện bị lỗi atlas byte reproducibility; chỉ dùng [bản CL-P6 CI PASS trước đó](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43936181038) để chơi thử tới khi sửa. Không xem tài liệu chốt thiết kế là game đã hoàn thành.

## Bản chơi mới nhất

CL-P6 là bản chơi mới nhất, mã nguồn game ở SHA `71cf5a6ae35a35f0e470e2f160c2b409557c1224`, vượt toàn bộ GitHub Actions exact-SHA run [43934332430](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43934332430). Run xuất bản artifact `muu-dinh-tam-quoc-cl-p6-playable` và `muu-dinh-tam-quoc-cl-qa-evidence`; mở trang run để tải HTML offline. CL-P5 trước đó có tại [43926009183](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43926009183), P4 tại [43923305781](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43923305781), P3 và P1/P2 tại [43915734348](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43915734348) và [43909024419](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/43909024419).

CL-P6 trong `index.html` có ngoại giao NPC, bốn mùa/thời tiết tác động hành quân, đạo quân cánh đánh độc lập, máy công thành, kỳ quan Cửu Đỉnh và chiến dịch PvE tăng tầng. Chromium đạt 30/30; workflow exact-SHA P6 và artifact chơi được đã thành công. P4 bổ sung 49 tướng, 30 chân dung lịch sử minh họa riêng, bảy liên minh, hiệp lực phe, năm chương/15 ải và trận boss 5v5. Sweep 360 trận cho thấy hai ải đầu đạt 100%, boss cuối 25% theo bốn hồ sơ đội quân.

## Gameplay đã phát hành

- Năm tướng chỉ huy các đội lính hiện diện và tham chiến; quân số còn lại ảnh hưởng sát thương, thương vong được lưu và hồi phục bằng tài nguyên.
- Bản đồ có 10 cứ điểm tương tác: chọn quân, xem đường/ETA/lương, hành quân, công thành NPC, chiếm, đồn trú, phòng thủ và thu hoạch.
- Thành có chín hạng mục nâng cấp. Tỉnh nối đường tạo bạc, lương, gỗ, sắt; quân đồn trú tiêu hao lương; sản xuất offline có giới hạn và sổ giao dịch chống cộng trùng.
- Game chạy offline bằng một file `index.html`, dùng Save `muu_dinh_tam_quoc_v1`, schema 5 và giữ migration v1–v4 cùng hệ thống trận hình 3×3 cũ.
- Chiến dịch CL-P4 có 49 tướng có thể chiêu mộ, 25 kỹ năng riêng, hiệp lực +6% theo phe và 15 trận 5v5 với thưởng lần đầu lưu đúng một lần.
- P5 phủ bản đồ vùng bằng tranh địa hình riêng; các tỉnh, đường đi, quân hành quân và lệnh đánh vẫn là phần tử tương tác thật.
- P6 thêm kết minh/thuế thương mại, dự báo mùa và thời tiết, hai đạo quân hành quân đồng thời, máy công thành dùng một lần, Cửu Đỉnh mở chiến dịch PvE lâu dài và đại hiệu lệnh tốn tài nguyên trong trận.

## Bắt đầu

Trên GitHub vào workflow run **SUCCESS** của `main-ngoalong`, tải artifact playable tương ứng với mốc cần chơi, giải nén và mở `index.html` bằng Chrome hoặc Edge. Artifact P6 hiện là bản chơi mới nhất.

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
