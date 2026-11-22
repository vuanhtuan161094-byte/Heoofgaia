# Mưu Định Tam Quốc — Giai đoạn A2: kinh tế công trình và 207 tướng

**22/11/2026 · nhánh** `feature/nl-web-review-20261122` · **không merge / không Codex Cloud**. Thiết kế hướng tới Ngọa Long WEB giai đoạn cổ điển; công thức và cách gán tuyến 207 nhân vật đều `SIMULATED`, KHÔNG phải công thức/chính sách chiêu mộ chính thức của VNG.

## Kinh tế — nguyên tắc và dữ liệu

- HUD đã có năm loại tài nguyên chính từ A1: **Bạc / Lương / Uy danh / Chiến công / Quân lệnh**. A2 dùng Bạc/Lương cho toàn bộ **7 công trình legacy runtime** và **31 công trình project**, đồng thời cho các lệnh kinh tế mới của 31 công trình; không đòi Sắt làm phí xây dựng.
- **Giá chuyển đổi chỉ áp dụng cho khoản chi phí tương lai, KHÔNG chuyển đổi tồn kho:** với mỗi `baseCost` công trình, `newSilver = oldSilver + oldIron×4` và `newGrain = oldGrain + ceil(oldIron/2)`; ở công trình gốc lấy giá gốc theo cấp rồi đổi như trên. Đơn vị & hệ số là `PROJECT_SIMULATED_A2`, không có nguồn chứng minh tính đúng của phép đổi.
- **Mỏ Bạc** thay vai trò hiển thị của mỏ sắt cũ; tick tài nguyên chỉ do hệ thống cũ gọi, phần sắt sinh ra từ tick gốc được chuyển sang bạc ở cùng lần tick; không tạo timer riêng và không cấp phát hai lần. Trạng thái `iron`, `wood`, `gems` cũ vẫn tồn tại trên Save v5, để không mất tài sản của người chơi và không phá 411 mẫu trang bị vẫn cần nguyên liệu cũ.
- **Thành Chính** được đưa lên vị trí đầu tiên trong catalog; 31 công trình vẫn giữ ID, công thức cấp/giới hạn, stock, action receipts và save owner ban đầu. Hải quân, Lò Luyện Thiết, Ngân Hàng... được gắn khu *mở rộng/tương thích* và chỉ hiển thị khi người chơi mở mục này; dữ liệu không bị xóa.
- **Khoa kỹ** không được hiển thị hai chủ sở hữu: giao diện khoa kỹ cũ riêng trong bảng city project được ẩn khỏi thành chính, người chơi sử dụng trang **Quân Sư Phủ** do `NL-R03` + A1 research-late quản lý với Bạc/Chiến công. Engine city cũ vẫn tồn tại để tương thích dữ liệu/hồi quy.
- **Trang bị C10 chưa di cư hoàn toàn**: shop/upgrade của 411 mẫu và công cụ tinh luyện vẫn có thể sử dụng Sắt **như nguyên liệu di sản**. Đây là tồn đọng công khai, không tuyên bố xong toàn bộ item economy.

## 207 võ tướng — ba đường mời tướng, một chủ sở hữu

- Không bổ sung bản sao danh sách 207, không thay `id`, `HEROES`, `P2_SKILLS`, `game.roster` hoặc `game.hero`. Bộ chuyển tiếp A2 chỉ tăng điều kiện trước khi gọi nguyên hàm `nlHero207Recruit()` gốc, có một lượt thanh toán bạc từ hàm đó.
- **Gán phương pháp tạm của dự án**: các tướng mở từ ải 1–2 thuộc *phó bản*; các tướng hệ `strategist`/`support` sau ải 2 thuộc *Uy danh* (ngưỡng `max(30, stage×10)`); nhóm khác thuộc *Hội đàm Tửu Quán*, tối đa 3 lần/ngày chung với 14 tướng gốc. Tất cả phương pháp của 207 tướng cần rà lại bằng chứng từ các bản Ngọa Long riêng trước khi gắn `VERIFIED`.
- Tính khả dụng đồng thời yêu cầu **vượt ải gốc**, không sở hữu, đủ Bạc, đủ Uy danh/Hội đàm khi phù hợp. Biên nhận được thêm vào `game.nlClassicA.recruitReceipts`; không có grant 2 lần, không tự mở tướng không đúng ải.
- Giao diện 207 có lọc 3 đường, tìm theo tên, phân trang 8 nhân vật và tiếp tục giữ `data-nl207-select` / `data-nl207-recruit` để tương thích test trang bị, Save/reload.

## Các cổng kiểm thử và giới hạn

1. Lệnh build canonical `index.html` chạy đúng một lần; `node --check` các JS A2.
2. `qa/nl_classic_phase_a2_browser.py` kiểm tra 7+31 cost, giao dịch nâng Thành Chính, tick Mỏ Bạc, đúng 207 ID, 3 nguồn, hạn ngạch Hội đàm, không nhân đôi tướng và Save v5 sau reload.
3. Chromium 14 màn desktop / 14 màn mobile và `qa/nl_premerge_hero207_items.py` giữ PASS; Build/Deploy Pages chỉ sau QA PASS.
4. Bản này chưa đánh giá full 30/60 phút onboarding cũ (test đó còn gắn kỳ vọng gacha 1800 bạc); cần cập nhật test gốc sau khi chính thức khóa đường tân thủ.
5. Không phải full release 1.0 và chưa đạt độ trung thành 100% Ngọa Long (chức năng thế giới, ảnh, skill vẫn PENDING).
