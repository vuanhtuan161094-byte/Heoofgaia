# MƯU ĐỊNH TAM QUỐC — CHAT 01 | NGỤY → QUẦN → TRUNG LẬP · HANDOFF 19/11/2026

## Phân quyền
- Chuyên trách: `feature/nl-v2-heroes`, nguồn ban đầu `feature/nl-codex-cloud-v1-finish`, không merge.
- Tuân thủ `docs/operations/NL_MULTI_CHAT_V2.md`: mọi file **mới trong đợt này** nằm trong `data/ngoalong/modules/heroes/**` hoặc `qa/modules/heroes/**`.
- **Không Codex Cloud, không chạm runtime `alpha_content.json`, Save, generator, `index.html`, full CI**.

## Đã code trực tiếp lên GitHub

1. `archive_wei_2012_2013_v1.json`: 41 dòng chính xác theo hai bảng Ngụy được công bố, 21 tướng Tháp Thí Luyện và 20 tướng Uy Danh. Mỗi dòng có nguồn URL/ngày, tên, ba chỉ số gốc, ba hệ số chuyển sinh, tên kỹ năng gốc, chức tướng, điều kiện nhận tướng. Mọi record đánh dấu `HISTORIC_WEB`, `currentMobileBinding=false`.
   - Nguồn Tháp VNG ngày 10/07/2012: https://ngoalong.zing.vn/tin-tuc/huong-dan/vo-tuong-tu-thap-thi-luyen-nuoc-nguy.html
   - Nguồn Uy Danh Ngoạ Long FC 14/08/2013: https://ngoalongfc.wordpress.com/category/tao-nguy/
   - Đối chiếu bổ sung 18/04/2012: https://ngoalongcc.blogspot.com/2012/04/tuong-uy-danh-nuoc-nguy.html
   - **Hai mâu thuẫn nguồn chưa chốt:** Uy Danh Tào Phi 5.000 trong nguồn đang dùng so với 2.000 ở snippet Fandom; Chỉ Huy Lý Thông 71 so với 72. Không sửa số chính theo snippet thứ cấp chưa kiểm chứng toàn văn.
2. Tồn đọng 18 Ngụy trước đợt:
   - **12 có bản ghi cổ trùng tên duy nhất**: Tào Phi, Xa Trụ, Tào Hưu, Chung Dao, Dương Tu, Đặng Trung, Hạ Hầu Bá, Hoa Hâm, Lưu Diệp, Lý Thông, Trần Quần, Vu Cấm.
   - **3 cần đối chiếu alias**: Hách Chiêu ↔ Hắc Chiêu, Hí Chí Tài ↔ Hí Chỉ Tài, Lạc Tiến ↔ Nhạc Tiến. Không tự gán ID.
   - **3 không có chi tiết đáng tin trong hai bảng**: Lý Điển, Vương Song, Nghiêm Chính.
   - Bản lịch sử **không** hoàn tất dữ liệu Mobile 2026; mọi current stats, công thức chiến đấu/giác ngộ và khả năng chiêu mộ hiện hành đều UNKNOWN.
3. `wei_quan_purple_2019_v1.json`: 4 kỹ năng Tím từ VNG tháng 10/2019, gồm Tào Phi (Uy Áp), Trương Ninh (Quỷ Cốc Di Kế), Vương Doãn (Uy Áp), Tuân Vực (Diệt Thế Thiên Lôi). Trường thiếu hệ số giữ `null`; hiệu ứng, hành động, thời lượng, vũ khí đặc biệt lưu riêng, `executable=false`. Nguồn: https://ngoalong.zing.vn/su-kien/phien-ban-moi-bach-khi-hoang-to-chi-tu/truyen-thuyet-tuong-tim.html
4. `mobile_recruitment_guide_2022_v1.json`: 14 bản ghi tuyển tướng từ cẩm nang VNG Mobile 21/06/2022, bao gồm 11 tên khớp chính xác Wiki và 3 tên không map. Những tên khớp mới có chứng cứ tuyển tướng: **7 Quần** (Bùi Nguyên Thiệu, Ba Tài, Kỷ Linh, Thẩm Phối, Phàn Thị, Trương Bảo, Việt Cát) và **1 Trung lập** (Hứa Cống). Ba tên chưa map: Lương Nhan, Phong Điền, Mê Đang (nghi là Mê Đương, chưa chứng minh).
   - Nguồn: https://ngoalong.vnggames.com/tin-tuc-2022/tinh-nang/trai-nghiem-ngoa-long-890.html
   - Đúng phạm vi: chỉ chứng minh phương thức/khả năng chiêu mộ được nêu ở cẩm nang; không khẳng định phân loại vị trí cờ cụ thể, số bạc, xác suất hay quy tắc server 2026.
5. `hero_source_lanes_v4.js` và `hero_source_evidence_matrix_v4.json`:
   - Tất cả 364 ID Wiki tiếp tục giữ nguyên; bổ sung ba lane độc lập `mobile2022Recruitment`, `classicBase2012_2013`, `classicPurple2019`; không biến bất kỳ nguồn classic thành stat hiện tại.
   - Mỗi record có source URL, ngày, cơ chế gốc, `crossEditionParity:"UNKNOWN"`, `verifiedCurrentMobileStats:false`, `playable:false`.

## Độ phủ chính xác và không đánh tráo

| Chỉ tiêu | Giá trị |
|---|---:|
| Tướng Wiki Mobile index | **364** |
| Đã có dữ kiện bổ sung **trong nguồn Mobile** (bao gồm guide lịch sử 2022) | **142** |
| Chỉ có dữ kiện **Ngọa Long web đời cũ** ngoài index | **13** |
| Tổng có ít nhất một loại dữ kiện bổ sung, bất kể edition | **155** |
| Chỉ có index, không có thêm dữ kiện từ bất kỳ nguồn nào | **209** |
| Tướng Wiki mới playable qua đợt này | **0** |

Các thống kê theo nguồn Mobile ngoài index:
- Ngụy **22/40**, còn **18** chưa xác minh sâu theo edition Mobile; tuy nhiên có 12 hồ sơ cổ trùng tên dùng để nghiên cứu.
- Thục **34/38** (còn 4).
- Ngô **36/39** (còn 3).
- Quần **49/174** (còn **125**).
- Trung lập **1/73** (còn **72**).

Không ghi 155 là 155 tướng đã code xong, hoặc 12 hồ sơ cổ là 12 tướng Mobile có thể dùng ngay.

## Kiểm thử, hợp đồng tích hợp
- `qa/modules/heroes/hero_source_lanes_v4.test.cjs`: **20/20 PASS** qua V8 isolate mô phỏng filesystem chỉ đọc các file GitHub thật (kiểm tra 364 ID, 41 nguồn cổ, 18-way split, 14 recruitment, 4 Purple, chặn alias/auto-grant, null unknown, tái sinh matrix byte-for-byte).
- Không có bằng chứng native Node/Chromium/CI exact SHA/Save/replay. Cần Chat 08 chạy release gate nếu muốn tích hợp.
- Hệ thống 151 stage descriptors đã có ở V3, nguồn kỹ năng Tím 2019 giữ thành lane nghiên cứu độc lập (4 bản) chứ không tự bổ sung vào skill hiện hành.
- **Chat 05:** chỉ sử dụng dữ kiện theo đúng edition; không coi skill Tím đời cũ là kỹ năng bản Mobile hiện tại.
- **Chat 08:** giữ gameplay engine, UI, Save và tích hợp, chỉ nhận dữ liệu được phê duyệt source parity. Không tự merge.

## Đường đi tiếp theo

A1. Xác minh và chốt tên Hách Chiêu/Hắc Chiêu, Hí Chí Tài/Hí Chỉ Tài, Lạc Tiến/Nhạc Tiến; tìm dữ liệu nguồn cho Lý Điển, Vương Song, Nghiêm Chính và bản Mobile của cả 18.
A2. Ưu tiên 125 Quần chưa có chi tiết Mobile; khai thác Wiki detail/announcements/recruitment page, giữ provenance từng field.
A3. Xử lý 72 Trung lập chưa có detail Mobile, phân biệt NPC/hero và cách thức tuyển tướng, không tự copy từ phe Quần.
