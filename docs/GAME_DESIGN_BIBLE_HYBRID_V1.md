# MƯU ĐỊNH TAM QUỐC — GAME DESIGN BIBLE V1 (HYBRID, ĐÃ THAY THẾ)

> **Quyết định mới nhất 17/11/2026:** người dùng hủy hướng hybrid, chuyển hoàn toàn sang game Ngọa Long-inspired; xem [NGOA_LONG_REBUILD_SPEC_V1.md](NGOA_LONG_REBUILD_SPEC_V1.md). Phần dưới đây chỉ là lưu trữ định hướng cũ, không còn là quy tắc roadmap.

**Owner decision: LOCKED 17/11/2026.** Đây là tài liệu sản phẩm có quyền ưu tiên cao nhất. Sản phẩm là **một game độc lập** kết hợp Ngọa Long và Chiến Loạn Tam Quốc; KHÔNG xây hai game, KHÔNG sao chép bản quyền, KHÔNG đổi tên nhánh lịch sử `main-ngoalong`, KHÔNG reset Save. Tên game chính thức: **Mưu Định Tam Quốc**. “Hắc Ám Chiến Kỷ” là tên mỹ thuật nội bộ, không tự ý đổi branding.

## 1. DNA và vòng chơi vàng
- **Chiến Loạn:** chọn đạo quân → click thành/mỏ/quan ải → xem tuyến/ETA/lương → hành quân có hình ảnh thật → đánh NPC, công thành/chiếm/đồn trú/thu hoạch/giữ thành.
- **Ngọa Long:** 5 tướng đứng trên **lưới 3×3** (sử dụng 5/9 ô), 24 mẫu bố trận hiện có = 6 hình trận × 4 tư thế, sĩ khí, kỹ năng, 3 đường sát thương, khắc chế, mưu kế và phối hợp tướng.
- **Mưu Định Tam Quốc riêng:** hậu cần quyết định sức chiến, chiến thuật chặn tiếp tế, tướng chỉ huy quân có thương vong thật, NPC tranh đất và cung ứng tài nguyên ảnh hưởng thành.
- **Loop:** xây thành → thu lương/bạc/gỗ/sắt → chiêu mộ/luyện quân → chọn 5 tướng + bố trận → trinh sát → hành quân → đấu lính thật + dùng chiến pháp → quyết toán quân chết/thưởng/đất **một lần** → hồi quân và củng cố thành.

## 2. Bốn màn chơi chức năng
**THÀNH:** 9 loại công trình từ CL-P3 tiếp tục là state thật: Phủ, Điền, Chợ, Mỏ, Doanh Trại, Học Viện, Quán, Tường, Lâm Trường. Click luôn có phản hồi, nâng cấp có chi phí, tiền/tài nguyên/ETA được quyết toán, không có trang trí chết.

**BẢN ĐỒ:** giữ 10 nút bản đồ CL-P2 làm vùng khởi đầu, sau đó mở 30+ nút theo chunk; thành/điền/mỏ/ải đều có lựa chọn chiếm, khai thác hoặc lý do khóa. 2 đạo quân CL-P6 di chuyển độc lập. UI: chọn quân → click mục tiêu → xem preview tuyến/ETA/lương/quân thủ → xác nhận → thấy quân đi → gặp thủ thành → đánh/chiếm/rút/đồn trú → lưu và nạp lại.

**QUÂN ĐỘI:** một đạo quân tối đa 5 tướng, mỗi tướng chỉ huy một đơn vị binh lính (chủng, tier, số quân, sĩ khí, thương binh, trang bị). Giữ các ID 24 preset P3, 49 tướng CL-P4 và 2 đạo quân CL-P6; **không** tạo mô hình 5×5 cạnh tranh hệ thống bố trận 3×3 hiện tại. Đội hình chọn từ 9 ô; các tướng đã sở hữu mới được dùng.

**CHIẾN TRƯỜNG:** hình ảnh 2D có 5 tướng và đội quân thật mỗi bên; lính tiến lên, va chạm, tấn công, trúng đòn, ngã hoặc rút. Có x1/x2/x3, dừng, auto/manual dùng skill, log/tua lại. Đội ít quân → lực chiến ít, tổn thất ghi save, hồi quân cần tài nguyên. Một trận thắng/chiếm đất có một receipt duy nhất.

## 3. Combat contract thống nhất
1. **Deployment:** 5 tướng xếp trong 9 ô, tiền/hậu tuyến ảnh hưởng khả năng bị chọn mục tiêu, sát thương, phòng thủ, tốc độ tích sĩ khí. 6 hình × 4 tư thế là 24 preset có buff và khắc chế minh bạch, không tạo tướng/quân miễn phí.
2. **Binh chủng:** Bộ, Thương, Kỵ, Cung, Mưu, Hỗ trợ; máy công thành là công cụ trợ chiến. Không nhận các hệ số tự thiết kế là công thức Ngọa Long/Chiến Loạn thật. Kiểm thử nhiều seed trước khi đổi P3 modifiers.
3. **Morale & skills:** sĩ khí tăng/giảm theo event; kỹ năng tướng và chiến pháp kích hoạt trong giới hạn, có chỉ số rõ, không tự động nổ vô hạn. Manual có lựa chọn thời điểm, auto có AI chọn hợp lệ.
4. **Mưu Lệnh (đề xuất độc quyền):** mỗi trận chọn tối đa một lệnh trả phí chiến ý hoặc lương: Tập Kích (sát thương đầu), Hộ Quân (giảm thương), Cắt Lương (giảm hồi sĩ khí quân địch). Có phản khắc chế, có cooldown/giới hạn, phải test.
5. **Sprite lính vs state:** tối ưu hiển thị 3–8 sprite đại diện mỗi squad theo LOD, không giả rằng 500 quân là 500 vật lý độc lập. Nhưng mọi động tác tấn công/trúng đòn chết/rút phải dựa trên combat event thật và số quân thật; không cho sprite trang trí đánh mà engine không tính.
6. **One authority:** combat engine tính hit, HP, sĩ khí, morale, troop losses, loot, EXP, report. VFX/replay chỉ đọc events, không thay state hoặc tạo thưởng. BattleID/receipt chống click lặp, reload, tua nhanh, replay farming.
7. **AI:** ưu tiên bảo vệ hậu tuyến, đánh nguồn hỗ trợ, áp dụng khắc chế/tập kích, có lý do ra quyết định; NPC tuân cùng cơ chế hậu cần và chiến pháp như người chơi.

## 4. Thế giới, kinh tế, progression
- Vùng đất có tuyến đường/tắc đường, địa hình/4 mùa và trạng thái tiếp tế; quân mang lương, tiêu hao khi hành quân/đồn trú, thiếu lương ảnh hưởng sức chiến. Thủ quân địch không tự sinh tài nguyên vượt luật.
- Thành/mỏ/ruộng có nguồn tài nguyên được nối vào sổ giao dịch: bạc/lương/gỗ/sắt; thu hoạch/đóng quân/chiếm mỗi sự kiện chỉ settle một lần, offline cap theo CL-P3; chống đổi giờ đồng hồ.
- P4 có 49 tướng, 25 skill, 7 nhóm phe, 15 trận qua 5 chương: giữ làm baseline, bổ sung bản đồ mở và hiệp lực có UI giải thích. CL-P6 ngoại giao NPC/2 đạo quân/máy công thành/Cửu Đỉnh/PvE vô tận tiếp tục được bảo tồn.
- Vòng hướng dẫn mục tiêu: 20–30 phút trải nghiệm hoàn chỉnh gồm xây–luyện–chiêu–bố trận–đánh–chiếm–hồi quân–save; đây là **mục tiêu UX**, chưa có nghiệm thu người thật.
- Online multiplayer/guild chỉ khi có server thực và owner cho phép; NPC không được giả làm người chơi thật.

## 5. Art, âm thanh và UI
**Art bible bắt buộc:** `docs/ART_DIRECTION_DARK_CHIBI_V1.md`. Chibi hắc ám **tranh vẽ tay 2D**, tỉ lệ 3–3,5 đầu, mắt sắc phát sáng, vũ khí/giáp rõ, chống pixel/chibi trẻ con, **NO RIG**. Triệu Vân xanh bạc, Lữ Bố đen đỏ chỉ là 2 mốc thẩm mỹ, không sao chép mẫu game khác.
- Map và thành vẽ tay nhiều lớp, nhưng đường và node/công trình luôn click được. Trận có nền cảnh phân lớp, lính đủ to trên 390px, UI chữ có tương phản tốt.
- Animation frame-by-frame bốn hướng: Idle/Walk/Attack/Hit/Fall, sau đó Cast/Guard. Xem GIF kiểm tra trước khi atlas; alpha trong, pivot ổn, không giả chuyển động bằng lắc ảnh tĩnh hay rig.
- VFX thuần màu và bám quái đang di chuyển: charge → release → travel → contact → fade; hạn chế vòng tròn như giao diện và halo hình vuông.
- Source/provenance, master, rejected candidates, manifest, SHA, atlas optimized, native Chromium screenshot/video và owner art review; không gọi hình AI là “họa sĩ vẽ tay thủ công”.

## 6. Quy tắc kỹ thuật / lưu game / kiểm thử
- Game duy nhất `index.html` offline, save key `muu_dinh_tam_quoc_v1`, schema v5, migration v1–v4, giữ ID `p3TroopTier`/`p3PresetId` và nested CL state. Không đụng Hero Save v07.
- Không sửa Hero branch `feature/hog1-research-to-playable-20261102`, không merge/force-push, không thay default branch. Codex chuyên biệt chỉ branch `main-ngoalong`.
- V0 syntax → V1 QA P2/P3/P4/P4.1 + CL-P1…P6/deterministic balance → V2 Chromium 1280×720/mobile 390, click/reload/portrait/animation/video → V3 CI SUCCESS exact SHA → V4 máy vật lý → V5 owner art. Không xóa test để PASS, không báo nghiệm thu giả.

## 7. Thứ tự phát triển (không viết lại game từ đầu)
| Milestone | Deliverable thực | Cổng chứng minh |
|---|---|---|
| **H0** | **Sửa lỗi atlas Bộ binh CL-P5**: CI đang sai hash giữa WebP source/codec Pillow; giữ cmp/manifest, reproduce và chạy workflow mới exact SHA | CI PASS, playable artifact trên HEAD |
| **H1** | Chiến trường **5 tướng + đội lính + 3×3/24 preset + morale/skills**; 1 Bộ + 1 Kỵ động tác và va chạm thật, thương vong/settlement | 3 trận incl. thua & boss, event/unit tests, Chromium screenshots/video |
| **H2** | 10-node province capture end-to-end + token walk trên map + phòng thủ và trả phí lương thật | Chọn quân/click thành/path/ETA/đi/đánh/chiếm/đồn trú/reload |
| **H3** | **Pilot mỹ thuật** 2 tướng Triệu Vân/Lữ Bố, 2 quân, 1 thành, 1 vùng bản đồ, 1 battlefield, 2 VFX đẹp đồng bộ | 1280/390 + video, owner duyệt hình riêng trước khi mở rộng |
| **H4** | Mở vùng 30+ node và nhiều tỉnh theo chunk, đội quân/phân vai/kinh tế/chiến thuật sâu, content/balance, hiệu năng | 1–2h long-run simulated+human QA, save/memory/fps |
| **H5** | Hướng dẫn, license audio, đóng release và stress kiểm thử | Github artifact exact-SHA, Windows/Android vật lý + owner review |

**Status tại 17/11/2026:** sản phẩm và mỹ thuật **OWNER DIRECTION LOCKED**; H0–H5 theo hybrid là **backlog**, chưa được xem là code hoàn tất; baseline CL-P6 đã có, nhưng HEAD gần nhất CI FAIL ở tái tạo WebP Bộ binh. Không tuyên bố game đã phát hành khi còn gate FAIL.
