# MƯU ĐỊNH TAM QUỐC — NGỌA LONG FIRST / REBUILD V1
**Chỉ đạo chủ dự án ngày 17/11/2026: “Làm lại game đi. Tôi muốn game Ngọa Long cơ.”**
> **Implementation addendum (17/11/2026):** Owner's Wiki-driven V2 adds the data/provenance pipeline and P0–P5 delivery order without changing the independent Ngọa Long gameplay contract below. See [NL_DATA_DRIVEN_V2.md](NL_DATA_DRIVEN_V2.md) for the active schema, migration status, and evidence gates. Wiki coverage stays partial; Mobile-to-classic parity stays UNKNOWN.
Đây là **quyết định gameplay mới nhất**, thay thế mọi định hướng trước đó lấy Chiến Loạn hoặc hybrid làm trọng tâm. Không tự làm hai game. Tên sản phẩm gốc độc lập vẫn là **Mưu Định Tam Quốc**, không mạo danh game chính thức của VNG.

## 1. Sản phẩm và vòng chơi chủ đạo
Game chiến thuật Tam Quốc dạng **Ngọa Long cổ điển**, với:
- **Trận đồ 3×3:** 5 võ tướng đang sở hữu; 24 cấu hình trận pháp đã có; vai trò tiền–trung–hậu tuyến và khắc chế binh chủng.
- **Chiến đấu theo lượt:** Vật công, Chiến pháp, Mưu công, tích/tước sĩ khí, tướng kích hoạt kỹ năng, buff/debuff, AI ưu tiên mục tiêu, replay immutable và chiến báo.
- **Tiến triển:** xây thành, nghiên cứu, chiêu mộ, nâng cấp tướng, nâng cấp binh chủng, trang bị, luyện binh, phó bản, tháp/lôi đài NPC; hoàn thành ải mới mở ải kế.
- **Tài nguyên thật:** bạc, lương, sắt, uy danh; chi phí xây/nâng/luyện/quân dự bị/khởi chiến và thưởng chỉ hạch toán một lần.
- **Giao diện chính:** Quân Cơ Phủ (hiện 3×3, tướng, trận pháp, phó bản tiếp), Thành trì, Bày trận, Phó bản, Võ tướng, Luyện binh, Trang bị, Khoa kỹ. Người dùng có thể bắt đầu chơi bằng các nút thật.

Nguyên tắc: **đánh trận bằng trí tuệ bố trận**, không ưu tiên bản đồ kéo quân, thành chiếm đất, farm tài nguyên vô tận như Chiến Loạn. Không dùng hình thức 5×5 tướng làm trận pháp chính; đối thủ tối đa 5 tướng.

## 2. Nghiên cứu và IP
Nguồn tham khảo có thể kiểm chứng:
1. https://apps.apple.com/vn/app/ng%E1%BB%8Da-long-vng/id1058728157 — chiêu mộ, nâng võ tướng, trang bị, trận hình, khoa kỹ, phó bản.
2. https://play.google.com/store/apps/details?id=vn.zalo.ngoalongmb — thông tin chức năng thành trì, binh đoàn, PVE/PVP theo mô tả game.
3. https://ngoalong.vnggames.com/ngoa-long-wiki/binh-chung — binh chủng và các hiệu ứng/khắc chế/sĩ khí theo bản giới thiệu của nhà phát hành.

Ghi rõ **VERIFIED** (nội dung mô tả nguồn chính thức), **DERIVED** (cấu trúc thiết kế thích nghi), **SIMULATED** (hệ số/vật phẩm/giả lập chiến đấu do dự án tự đặt), **UNKNOWN** (chi tiết công thức nội bộ). Không sao chép tranh/ảnh/cơ chế cụ thể không được cấp phép, không lấy ảnh game khác vào repo.

## 3. Quyết định tái sử dụng (không phá dữ liệu)
- Giữ **cùng repo** `vuanhtuan161094-byte/Heoofgaia`, nhánh lịch sử `main-ngoalong` và duy nhất một `index.html` phát hành. **Không merge sang Hero**, không reset/force-push.
- Baseline có thể phục hồi: SHA `172c0ef2192cf5aee8a0054337b1af9f5684f533`, GitHub Actions PASS `43999433891`. CL-P1–P6 có trong lịch sử Git, nhưng không còn là nội dung game chính.
- Bảo toàn `muu_dinh_tam_quoc_v1`, save schema v5 và migration v1–v4, các nguồn nhà cửa/tướng/kho, IDs `p3PresetId`, `p3TroopTier`, receipt và replay, dữ liệu CL đã tồn tại; **đừng xóa save tự động**.
- Luồng hành quân/công thành CL-P6 có thể tồn tại như **ngoại truyện/legacy tùy chọn** trong ngắn hạn, nhưng không được dùng để đánh dấu mục tiêu Ngọa Long hoàn thành. Chỉ gỡ khi có migration/test/owner review.
- Mỹ thuật trước đó đã thử: **2D tranh vẽ tay Dark Fantasy Sharp-Eyed Chibi**, mắt sáng năng lượng, không rig, animation frame-by-frame. Giữ style này cho bản remake trừ khi owner ra lệnh mới; poster concept không tính là sprite tích hợp.

## 4. Mốc triển khai và nghiệm thu
### NL-R01 — First playable core landing
- Sắp xếp sidebar đưa Thành/Trận/Phó bản/Võ tướng lên đầu. Màn **Quân Cơ Phủ** dẫn thẳng đến 3×3, khoa kỹ, võ tướng, phó bản tiếp theo và nút xuất chiến thật.
- Không fork HTML phát hành; nguồn patch `tools/build_ngoa_long_mode.py` **được CI biên dịch vào index.html duy nhất** trước khi chạy QA và phát hành. Đây là giải pháp tạm do index nguồn cũ chứa 5.5MB hình nhúng; về dài hạn hợp nhất vào game source modular.
- QA `qa/ngoa_long_mode.py` xác minh nhấp điều hướng thật, chín ô 3×3, bấm xuất chiến khởi tạo chiến đấu và mobile 390px.

### NL-R02 — Hoàn thiện toàn bộ “Ngọa Long loop”
- 24 trận hình cân bằng, khắc chế tác dụng, thuật sĩ/trống hỗ trợ hồi sĩ khí, quyết định AI minh bạch, cấp binh chủng ảnh hưởng chiến đấu; thành/phó bản/tướng/trang bị liên thông thật.
- Đưa CL optional xuống nhóm phụ, không xóa thành quả không được backup.
- Tự động test toàn vòng từ tạo thành chủ → bố trận → trận đầu → nhận thưởng → nâng cấp → trận sau → save/reload/replay.

### NL-R03 — Binh chủng, chiến pháp, nội dung
- Hệ tiến hóa nhiều nhánh từ Bộ/Kỵ/Thương/Cung/Quan Văn, quyết định tướng–binh, chiến pháp/phép mưu và tinh anh; vẫn được thiết kế độc lập chứ không sao chép formula chính thức.
- Mở thêm phó bản có cơ chế riêng, mục tiêu/chặn hậu tuyến, AI khắc chế và dài hạn kinh tế; không bơm cấp vô hạn.

### NL-R04 — Mỹ thuật và phát hành
- Giao diện chibi hắc ám nhìn rõ ở 1280×720 và 390px; 2–3 tướng chuẩn, từng hướng Idle/Walk/Attack/Hit/Fall, VFX tách alpha; owner duyệt trước sản xuất hàng loạt.
- QA save nhập/xuất, fast click, replay/idempotence, loss case, 30 phút người thật, performance Windows/Android.
- P2 31+12, P3 74/360, P4/4.1, CL còn lại chạy regression hoặc phải chứng minh migration tương đương; exact SHA CI có artifact playable. **Không dùng CI PASS để tự nhận owner art/physical PASS**.

## 5. Dedicated Codex instructions
Codex chỉ được làm trên `main-ngoalong`; đọc HEAD, `AGENTS.md`, REV, tài liệu này và checkpoint trước sửa. Làm mã chạy được, không chỉ tài liệu. Không sửa Hero/Tông Môn/CMP, không branch/merge không cần thiết. Mỗi giao hàng ghi DONE/TESTED/PENDING/BLOCKED + exact SHA + CI + 2–3 lựa chọn tiếp.

**Status ngày lập:** Nền CL-P6 + P3 đã có. Ngọa Long-first **mới tái ưu tiên và mở R01**; R02–R04 chưa được nghiệm thu.
