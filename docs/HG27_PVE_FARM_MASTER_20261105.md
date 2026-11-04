# HG27 → HG31 — Vòng farm PvE, đổi quân và trang bị (owner contract, 05/11/2026)

## Phân biệt trạng thái

- **ĐÃ CODE HG27:** vòng chiến thắng thật cấp token, đổi 12 lính cơ bản + chiến tích + Phù ấn Tháp + vàng thành 1 chiến vệ đặc biệt hiện có `race_quest_guard`; đổi 3 món Vệ Binh và 3 món Tinh Vân, dùng item thật của HG18, trừ kho/quân/vàng và lưu v07. Bốn tộc có hình vector riêng (8 SVG tĩnh: quest guard/tower sovereign).
- **CHƯA HOÀN THÀNH:** cinematic world art cho toàn bản đồ, animation độc lập của tất cả 40 binh chủng, chuỗi đổi quân tier cao mới, vòng farm có cân bằng tiến độ người chơi thật, ảnh minh họa trang bị hiếm và thử nghiệm Windows vật lý.
- **ĐÃ CÓ TỪ HG18/HG21/HG26:** nhiệm vụ ngày/tuần, nguyên liệu Tinh Vân, rương, phân giải, cường hóa +10, trang bị theo tướng, chuyển sinh Lv100, chiến đấu Boss 3×2, Tháp 3×2 và thưởng mốc Tháp. Không viết lại hoặc tính thưởng lần hai.

## Trục gameplay bắt buộc

1. Kinh tế: xây/nâng cấp, tài nguyên mỏ, nghiên cứu, tuyển quân và chi phí hồi phục. Không cấp nguồn giả.
2. NPC thường: đánh trận thật mới nhận chiến tích. NPC cấp 5+ nhận 2 thay vì 1. Tất cả dựa trên `battleAct`, không thưởng ở nút mở trận.
3. Boss T11+: thắng trận thật nhận Ấn Boss và 2 chiến tích; thua/thoát/không thắng không nhận. Các mảnh Tinh Vân riêng của HG18 vẫn giữ.
4. Tháp: thắng thật và còn hạn mức thưởng 5/ngày mới có Phù ấn Tháp (tầng bội 5 nhận 2). Tháp không tiêu hao lính thật; không đồng nhất với Boss thật.
5. Đổi thưởng: nguyên liệu và vàng tiêu hao đồng thời; lính thường chỉ trừ quân **rảnh**, không rút trộm đội hình đang phân công. Chỉ nhận trang bị/đơn vị sau khi hoàn tất tiền kiểm.
6. Tiến triển dài hạn: nâng bộ Vệ Binh → bộ Tinh Vân → quân nhiệm vụ → quân tối thượng; mỗi mốc phải có thứ người chơi muốn farm tiếp.

## HG27 công thức hiện hành (mô hình mới, không lấy nguyên bảng 2009)

| Đầu ra | Giá đổi | Điều kiện |
|---|---|---|
| 1 chiến vệ quest_guard mỗi tộc | 12 lính cơ bản rảnh + 12 chiến tích + 3 Phù ấn Tháp + 3.000 vàng | Đã qua Tháp tầng 3 |
| 1 trong 3 trang bị Vệ Binh | 8 chiến tích + 2 Phù ấn Tháp + 1.800 vàng | Không |
| 1 trong 3 trang bị Tinh Vân | 15 chiến tích + 3 Ấn Boss + 6 Phù ấn Tháp + 12.000 vàng | Đã qua Tháp tầng 5 |

## Kế hoạch tiếp theo, theo thứ tự triển khai và nghiệm thu

- **HG28 — Art/UI overhaul:** chụp cả 10 tab ở 1280×720, 960×540; sửa từng màn thay vì áp một screenshot tĩnh. Ưu tiên World (terrain/node art), City (hotspots/popup), Army (7 slot và tướng 3×2), Heroes (ảnh tướng và trang bị), Battle (sprite và hành động). Cho phép sprite vector độc lập khi chưa có PNG/atlas; không gọi đó là animation hoàn thiện.
- **HG29 — Farm/Drop V2:** loot pools có IDs và tỷ lệ rõ, quái thường/Elite/Boss/Tháp, mảnh rơi có nơi nhận/sink, hiển thị trước khi đánh, test xác suất và exact-once khi cold reload. Không phát thưởng trùng với HG18.
- **HG30 — Nhiệm vụ đổi quân:** chuỗi 3 bậc tộc-specific, quân thường → chiến vệ → quân tối thượng; nâng bậc có chi phí, vật liệu và chặn khi thiếu quân rảnh; test không trùng quân với HG20/HG26. Không biến quân trả thưởng thành cửa hàng bán thẳng.
- **HG31 — Trang bị & tiến độ:** bộ set nhiều bậc với icon/ảnh/hiệu ứng thật, fragment-target crafting có lựa chọn (không quay vòng ép buộc), Tháp vô hạn và Boss PvE liên kết tài nguyên; test từ New Game không QA seed đến 1 vật phẩm cấp cao.

## Screenshot QA và các P0 UX hiện thấy

| Màn | Nhận xét từ ảnh Chromium 1280×720 | Hạng |
|---|---|---|
| Thế giới | Địa hình còn dạng ký hiệu rất nhỏ, chưa có cảm giác bản đồ chiến thuật fantasy | P0 |
| Thành trì | Thành đã có ảnh thật; nhãn và thanh thông tin quá nhiều chữ, khó xem hành động | P1 |
| Quân đội | Chỉnh đội hình nhỏ, trải nghiệm quản lý 7 slot nhiều chữ | P0 |
| Tướng | Cần ảnh chân dung và phân vùng stats/equip/skill trực quan | P1 |
| Pháp thuật | Quá nhiều ô chữ, thiếu icon trạng thái nâng cấp | P1 |
| Rèn & Di vật | HG27 thêm ví token, công thức, nút đổi thật; còn phải tối giản nửa dưới | P1 |
| Nhiệm vụ | HG27 thêm đổi quân; bảng nhiệm vụ cũ quá dài, thiếu nhóm mục tiêu | P1 |
| Bí Cảnh | Cần thẻ đội 3 tướng×2 stack, thưởng tầng và nút tiến rõ hơn | P1 |
| Chiến báo | Bản rỗng gọn; báo cáo có trận cần bằng chứng mới | P2 |
| Tư liệu | Không phải gameplay chính; giữ trong màn tùy chọn | P3 |

## Gating release

- HTML offline duy nhất từ `index.html` + `build_offline.py`; root HTML là output, tránh push snapshot cũ rồi nhận là mới.
- Node G0, HG27 focused, 213 regression cũ, Chromium 10 tab + 3 landscape screenshots, Save v07 migration và no duplicate, Build SHA reproducible.
- Không dùng Codex trừ khi owner thay đổi chỉ thị. Không đổi visibility Public, không tạo nhánh khác, không merge main.
- `docs/evidence/hg27/` được CI xuất dưới artifact riêng, không giả là ảnh từ client 2009.
