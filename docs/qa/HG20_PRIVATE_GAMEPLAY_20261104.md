# HG-20 — Private Power-Fantasy PvE, Điều binh theo tướng và Bí Cảnh Tháp
**Checkpoint:** 04/11/2026 · **repo:** `vuanhtuan161094-byte/Heoofgaia` · **branch:** `feature/hog1-research-to-playable-20261102` · **Save:** v07.

## Quyết định chủ dự án
Ưu tiên sản lượng và sức mạnh cao, sưu tầm thành đặc biệt, quân riêng, Boss hiếm và trang bị độc quyền; **không khóa cân bằng theo HoG gốc**. Game offline/private, không PvP. Chủ dự án giao phiên khác quản lý animation và các thay đổi mỹ thuật rộng; HG20 chỉ thêm giao diện gameplay cần dùng.

## Đã triển khai — Gameplay thực
### Điều binh và hành quân
- `Quân đội` → bảng `Điều binh theo từng tướng`: mỗi tướng hiển thị trạng thái `Sẵn sàng`, `Đang hành quân`, `Đang chiến đấu`, `Đang trở về`, `Đồn trú`, `Castellan`; và số quân thực sự đang đi hoặc đã đặt trước.
- Chọn **đúng tướng** → 7 ô bố trận (4 hậu quân, 3 tiền quân) → chọn binh chủng và số lượng → **Lưu đội hình**. Mỗi tướng được lưu một plan theo ID thành; số quân đã đặt trước cho tướng khác không thể phân trùng.
- Khi bấm **Xuất chinh**, quân thật rời kho thành và đi theo `expedition.heroId`; quay về mới nhập lại thành xuất phát, bảo toàn người sở hữu và Save v07. Bấm xuất chinh lần đầu khi không có đội hình sẽ tự phân quân hợp lệ để không chặn người chơi mới. Trận chiến thật hiển thị tên tướng dẫn quân.
- Điều binh là kế hoạch chiếm dụng quân trong thành, **không phải nhân bản quân**. Tướng đang đi có ledger riêng `expedition`, `parallelMarches`, `stationedHeroes`. Tối đa 7 stack/tướng và 3 tướng đồng thời đi ngoài thế giới theo engine hiện tại; tổ đội Bí Cảnh có giới hạn riêng tối đa 3 tướng.

### Bí Cảnh Tháp vô hạn tầng
- Mở `Bí Cảnh` → chọn 1–3 tướng ở thành và có đội hình được phân → khóa đội → đánh tầng hiện tại.
- Kết quả tháp dựa trên **lực chiến tổng hợp và khắc chế vai trò**: cận chiến chống bạo kích, tầm xa phá giáp, Tri thức chống phép, quân độc quyền chống hút sinh lực. Có 4 nguyên mẫu quái thay đổi từng 10 tầng. Đây là **mô hình đối chiếu lực chiến**, *chưa phải trận HG09 tactical điều khiển 3 hero*.
- Lực chiến quái tăng **tuyến tính** theo tầng; thêm lượng tăng cố định sau mỗi 25 tầng. Thăng hoa bằng tinh hoa tăng 18% lực chiến tháp/cấp cộng dồn, không RNG. Cấp tầng không đặt trần nội dung; chỉ chịu giới hạn số nguyên hợp lệ của Save/JS.
- **5 lần thắng và leo tầng có thưởng/ngày UTC game**. Hết lượt vẫn được thử chiến đấu/luyện tập ở tầng hiện tại; không tự bỏ qua tầng có thưởng khi hết quota. Trận Bí Cảnh không mất quân/AP; chiến trường ngoài thế giới vẫn dùng quân, AP và thương binh thật.
- Thưởng vàng, 4 nguyên liệu và tinh hoa tăng theo tầng. Mỗi tầng bội 10 trao quân chủng tộc độc quyền; mỗi tầng bội 25 trao **trang bị có UID thật**, có thể mặc, có chỉ số tăng theo tầng nhận. Mở khóa biểu trưng `Thiên Ngoại Bí Thành` từ tầng 25; biểu trưng này **không phải** một thành bản đồ riêng.

### Sưu tầm private
- **4 quân không thể tuyển đại trà:** `human_tower_sovereign` Thiên Giới Thánh Vệ; `elf_tower_sovereign` Ngân Nguyệt Long Linh; `orc_tower_sovereign` Viễn Cổ Chiến Thần; `undead_tower_sovereign` U Minh Bất Diệt Vương. Thông số cao hơn quân cấp 10 thông thường, tiêu điểm chỉ huy thật, rơi từ Bí Cảnh hoặc chuỗi Boss private.
- **3 trang bị:** Thần Kiếm Vô Tận, Huyền Giáp Vạn Giới, Thiên Ngoại Thánh Ấn; nhận qua tầng 25/50/75 luân phiên hoặc săn đủ Boss đặc biệt; UID trong inventory và có hiệu ứng HeroStats thật. Thẻ/hệ thống đồ HG18 vẫn tồn tại.
- **Thành Huyền Tích (87,79):** thành AI *thật* trong `E.TILES`, có quân phòng thủ, có thể đánh chiếm theo giao dịch HG10, Save/Load và chức năng thành bình thường; khi đã chiếm cộng **50% sản lượng cả 5 tài nguyên** và 30 tinh hoa. Không phải thành thưởng miễn phí.
- **Hai Boss thế giới có thể săn lại:** Vực Thẳm Quỷ Hoàng và Thời Không Tà Thần, đặt tại tọa độ rảnh. Dùng battle scheduler HG09 thật; đối thủ HP ×6, ATK ×3,5, DEF ×2,5; thắng thưởng tinh hoa; mỗi 3 thắng có quân đặc biệt, mỗi 5 thắng có một trang bị exclusive. Bốn Boss T11/T12 HG18 gốc vẫn giữ riêng.
- Bốn chủng tộc gốc và 40 quân cấp T1–T10 giữ nguyên. Những quân và quái ở trên là mở rộng private, không được nhầm với tư liệu Heroes of Gaia 2009.

### Nền kinh tế
- Private `rate` ×5 và `warehouse capacity` ×10. New Game được cộng 25.000 vàng, 8.000 gỗ/quặng, 3.000 lưu huỳnh/pha lê, trên starter gốc; **save cũ không tự nhận quà này**, giữ nguyên tài sản đã có.
- Tất cả sản xuất, thanh toán xây dựng, trả tiền tuyển, tự vận chuyển, nguyên tắc trả quân vẫn đi qua engine gốc. Vàng nhận theo tầng chịu giới hạn kho hiện tại; tinh hoa là tài nguyên sưu tầm riêng.

## Chấp nhận / Giới hạn
- Dùng `hg20-private.js` và `hg20-world-bosses.js`, nội dung HTML offline; phần game khác giữ v07, không merge main, không dùng Codex.
- Kiểm thử tập trung `qa-hg20-private.cjs` bao gồm 4 tộc trả tiền tuyển quân từ New Game, team tối đa ba tướng, chống double-allocate, 5 lần thưởng, reset ngày, thưởng tầng25 có trang bị thật, 2 Boss được tạo trong combat engine, Save v07 và tương thích save cũ. Thêm một luồng Chromium chọn tướng, quân, popup Bí Cảnh, thắng tầng1 và kiểm tra lưu.
- **Chưa đạt:** Tháp chưa chiến đấu tactical 3 tướng; nhà kho không chứa được vô hạn vàng khi đầy; sức mạnh vô hạn là độ dài progression thực tế trong phạm vi số học an toàn, không phải số học vô hạn tuyệt đối. Thành private hiện tái sử dụng giao diện/AI thành cơ bản; chưa có bộ công trình, skill Boss, bộ nhiệm vụ private riêng hay sprite/animation mới. Các phần này là backlog gameplay hoặc mỹ thuật độc lập.
- **Không công bố** 4 tộc đều đã organic phá Boss 13 từ New Game; QA hiện có test từng tộc và endgame Human cũ. Kiểm tra chơi thủ công Windows vẫn chưa có.

## Ưu tiên nếu triển khai tiếp
1. Sửa sâu tactical **3 hero cùng đánh trong một trận Bí Cảnh** với đội hình & lệnh riêng; thêm hiệu ứng quái đặc biệt, lựa chọn nhánh leo tháp.
2. Mở rộng sưu tầm thêm thành đặc biệt, quân dị chủng, trang bị có phẩm/thuộc tính ngẫu nhiên có kiểm soát, Boss hàng ngày/tuần và nhiệm vụ bộ sưu tập.
3. Thử game thực qua các chủng tộc với tốc độ private để phát hiện cách chơi quá rườm rà; không cần cân bằng tuyệt đối.
