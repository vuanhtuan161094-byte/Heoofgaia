# HG28 — Chuẩn animation nguồn thật cho 40 binh chủng / 06-11-2026

**Repo:** `vuanhtuan161094-byte/Heoofgaia` · **nhánh duy nhất:** `feature/hog1-research-to-playable-20261102` · **offline duy nhất:** `Play-Heoofgaia-HG11.html` · **Save v07 không đổi**.

## 1. Quyết định mỹ thuật và kỹ thuật

**HTML không giới hạn chất lượng.** Lớp Canvas2D hiện tại đang vẽ grid đường nét nhân tạo trên nền phong cảnh; vấn đề là thiết kế overlay, sai tỷ lệ và nguồn pose. Cải tiến có thể làm bằng Canvas2D trước, **không cần đổi engine/WebGL**, trừ khi đã có chứng cứ GPU fill-rate khiến 8GB RAM không chịu được.

- PvE mặc định **không hiển thị khung lưới 108 ô**. Vùng tương tác và hit testing 12×9 vẫn tồn tại; khi bật `Lưới`, đường viền mảnh mờ, không có dấu chấm tọa độ/đường nối chân khắp cảnh. Khi dùng lệnh **Đặt điểm đến**, chỉ những ô đi được mới nổi bật. HP vẫn hiện mặc định. Cài đặt hiển thị độc lập Save v07.
- Nhân vật luôn đứng tại chân logic của ô (độ lệch trình bày tối đa 18 px); frame đóng băng chân trong Idle/Attack/Hit, dịch chính xác theo đường đi trong Walk; Death không làm lệch hitbox/nhận thưởng.
- Camera/địa hình/ánh sáng/hitbox tách rời animation. Chỉ hiện nhãn chọn/hover/địch quan trọng theo bố cục, không phủ nhãn lên mặt.
- **Thay đổi hình sprite không được thay HP, ATK, lượt chiến đấu, AI, Save, ngân sách HG29–HG32 hoặc quyền sở hữu stack của từng tướng.**

## 2. Mốc nguồn thật: 40 nhân vật / 200 clip

**Tệp máy đọc được:** `assets/animations/hg28/coverage.json`.

| Mốc thực có lúc bắt đầu | Số lượng | Chi tiết |
|---|---:|---|
| Binh chủng gốc theo catalog | **40** | Human, Elf, Orc, Undead: mỗi tộc 10 |
| Clip yêu cầu | **200** | 40 × Idle/Walk/Attack/Hit/Death |
| **Clip hiện có frame nguồn thật** | **22/200** | Không tính chuyển động xoay/dịch một ảnh |
| Binh chủng có đủ 5 clip | **4/40** | `human_3` Archer, `human_4` Heavy Soldier, `human_7` Knight, `undead_1` Skeleton |
| Binh chủng có Idle nhưng thiếu 4 clip | **2** | `human_2` Scout, `human_6` Monk |
| Binh chủng còn thiếu toàn bộ action | **34** | Gồm **8 master T9–T10** chưa có clip riêng |
| Tổng frame nguồn trong 22 clip | **215** | 48 Archer, 57 Heavy, 44 Knight, 50 Skeleton, 8 Scout Idle, 8 Monk Idle |
| **Clip cần sản xuất bổ sung** | **178** | Không gọi 40/40 FULL trước khi hoàn tất |

**Lưu ý:** số frame có thật không đồng nghĩa mỹ thuật 40 quân đã đồng nhất. Bốn bộ có sẵn khác phong cách/nguồn. Thành tích “40 nhân vật có ảnh” và “40 nhân vật có 5 animation” là hai cổng nghiệm thu **hoàn toàn khác nhau**.

## 3. Quy trình sản xuất, thứ tự không chồng lấn

### HG28-ANIM-P0: 8 quân T9/T10 — 40 action clip mới

| Chủng tộc | T9 | T10 |
|---|---|---|
| Human | Angel `human_9` | Archangel `human_10` |
| Elf | Green Dragon `elf_9` | Fairy Dragon `elf_10` |
| Orc | Monster `orc_9` | Behemoth `orc_10` |
| Undead | Bone Dragon `undead_9` | Ghost Dragon `undead_10` |

- Dùng **8 PNG MASTER 512×512** và provenance đã tích hợp; không xóa/ghi đè master. Kỹ thuật hình chọn: dựng **rig modular 2D từ các bộ phận vẽ riêng** hoặc **video có năm hành động với chuyển động thực**, xuất frame; không lấy một PNG hoàn chỉnh xoay/lắc/scale rồi giả thành một clip.
- Động vật và rồng cần chuyển động thực sự ở **cánh, cổ, đuôi, thân, chân**, không áp bộ xương người cho rồng. Kiếm binh cần rút/nâng vũ khí, hướng đòn, recoil; phép/đạn/VFX ở layer riêng, không nhúng VFX vào sprite.
- 8 quân × 5 hành động × tối thiểu 8 frame = **ít nhất 320 frame** mới. Yêu cầu khác biệt pose giữa clip, không copy 8 ảnh hệt nhau.

### HG28-ANIM-P1: T1–T4 của cả bốn tộc — 64 clip còn thiếu

- 16 binh chủng; Archer/Heavy/Skeleton đã đủ; Scout mới có Idle. Ưu tiên quân thường xuất hiện từ New Game, cung thủ, kỵ binh và tương tác với chiến trường.
- Không phá bốn bộ animation nguồn thật hiện tại; nếu nâng chất lượng thì làm migration có ảnh before/after và regression riêng.

### HG28-ANIM-P2: T5–T8 của cả bốn tộc — 74 clip còn thiếu

- 16 binh chủng, Knight đã đủ; Monk còn bốn action. Làm nhóm bay, pháp sư, kỵ binh, cận chiến theo hệ rig đúng chủng loại.
- Sau khi đủ 200/200 mới mở nhánh phụ **8 đơn vị thưởng HG30** và các Boss ngoài catalog; nhóm này **không được tính gian vào 40/40**.

## 4. Tiêu chuẩn kỹ thuật bắt buộc cho từng quân

| Action | Mẫu frame khuyến nghị | Nhịp phát | Điều kiện |
|---|---:|---:|---|
| Idle | 10–12 | 10–12 fps | thở, chuyển trọng tâm, cánh/tóc/đuôi; loop không giật |
| Walk | 10–12 | 12–15 fps | tiếp đất/nhấc chân thật, tốc độ khớp logic đường đi |
| Attack | 12–16 | 14–18 fps | chuẩn bị → trúng đòn → thu vũ khí; ranged có Draw/Release |
| Hit | 8 | 12–16 fps | trúng đòn rõ ở vai/thân, phục hồi về Idle |
| Death | 10–12 | 12–15 fps | ngã/biến mất nhất quán, ngưng tại frame cuối; **không lặp** |

- MASTER giữ nguyên tối thiểu 512 px; source clip render transparent RGBA 256×256 hoặc 512×512, **chân pivot cố định**, độ lệch <=2px trong động tác không di chuyển.
- Runtime đóng gói WebP lossless từng action hoặc atlas gộp 5 hàng (cell 192/256). Mỗi unit 5 clip; đảm bảo texture <=2048 px mỗi chiều. Hiển thị 60Hz qua RAF, frame nguồn 10–18 fps; không gán một ảnh tĩnh thành “5 clip”.
- Chỉ decode và cache animation của quân đang xuất hiện trong trận; quản lý bộ nhớ cho PC 8GB. Giữ PNG gốc/provenance để tái xuất, offline HTML nhúng asset đã đóng gói, không tải mạng.
- `tools/pack_hg28_action_frames.py` nhận năm thư mục action frame, kiểm tra RGBA/alpha, canvas đồng nhất, số lượng và duplicate, xuất năm atlas WebP với SHA256/metadata. Nó **không tự tạo pose** và không được tuyên bố đã tạo animation nếu không có source frame.
- Playback dựa trên `battle.lastEvents` canonical: Idle, Walk, Attack, Hit, Death và bước đi mục tiêu; auto không lặp animation khi 1s economy tick render. Khung đòn đánh/ảnh nhận sát thương được đưa vào lịch RAF, nhưng chỉ số vẫn theo engine.
- Mọi nguồn ngoài phải có provenance/license; master AI gốc và hình tái dựng giữ metadata, không nhận là asset gốc Heroes of Gaia.

## 5. Cổng QA chặn báo hoàn thành

**Cổng 0 — kiểm kê:** `node qa-hg28-animation-coverage.cjs` đọc manifest 40 nhân vật, yêu cầu đúng clip source và PNG artifact, hiện báo **4/40 và 22/200**. Lệnh `node qa-hg28-animation-coverage.cjs --require-full` phải **FAIL** cho đến khi đủ 40/40 và 200/200 thật.

**Cổng 1 — atlas:** mỗi action >=8 frame khác nhau, đúng pivot/alpha, decoded WebP đúng số cell, mã hash và nguồn đối chiếu được. CI smoke pack 57 frame `human_4` có nguồn thật; sau mở rộng pack từng nhân vật.

**Cổng 2 — in-game:** Browser Chromium **1280×720 và 960×540**, chụp mỗi action cho 40 quân, tạo contact sheet của frame đầu/giữa/cuối. Kiểm tra không mất chi, đứt tay, biến dạng, co giãn, đi xuyên ô, lệch chân, sprite/nhãn chồng quá mức. Ảnh/clip được chụp từ game thật, không phải mô hình tĩnh.

**Cổng 3 — gameplay:** ít nhất **12 lượt auto liên tục** ở 3 trận: NPC, Boss ba tướng × hai stack và Tháp ba tướng × hai stack. Điều khiển tay/auto/move/focus/cast; không double tick, không giả sát thương, không phát thưởng trùng; Save v07 lạnh và Chrome CPU/RAM chấp nhận được.

**Cổng 4 — phát hành:** 40/40 nhân vật × 5/5 frame clip, full GitHub Actions SUCCESS trên **HEAD cuối**, kiểm tra HTML offline duy nhất. Bất kỳ unit thiếu clip nào phải hiện rõ `PARTIAL`, không được báo FULL.

## 6. Mốc đã thực thi trong checkpoint này

- Bỏ lưới phủ mặc định, giữ nút hiển thị tùy chọn và ô di chuyển highlight (không sửa battle x/y).
- Thêm coverage manifest đủ 40 ID và audit phân loại **source frame thật / still / biến đổi theo sự kiện**.
- Thêm atlas packer, nguồn alpha + duplicate + SHA + playback timing.
- CI kiểm định baseline 40×5 và smoke asset hiện có. Chưa sản xuất 178 clip nguồn mới; đây là **giai đoạn chuẩn hóa và khai triển pipeline**, không phải bản 40 quân đã hoàn tất.
