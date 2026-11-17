# NL-REF-01 — Nguồn tham chiếu và mức độ khảo sát Ngọa Long

Ngày khảo sát: 17/11/2026. Repo: vuanhtuan161094-byte/Heoofgaia, branch main-ngoalong. Baseline kiểm toán: 66fb0fcfdde782dd803db4e6dd6a3ecee198d388.

**Trạng thái: PARTIAL RESEARCH / NOT FULL WIKI READ.** Đây là ma trận phiên đầu, không phải tuyên bố đã đọc tất cả mục hoặc xác thực toàn bộ cơ chế Ngọa Long. Không sử dụng trực tiếp hình ảnh, code, âm thanh, tên thương hiệu nhận diện game chính thức làm asset Mưu Định Tam Quốc.

## A. Phân biệt phiên bản

- CLASSIC-2012: bài viết/cẩm nang cùng thời webgame Ngọa Long, phản ánh cách chơi thực tế được tác giả ghi nhận. Không suy ra công thức engine đóng.
- VNG-WIKI-2026: dữ liệu có trên Ngọa Long Mobile Wiki hiện hành, không mặc nhiên là cơ chế webgame 2012.
- VERIFIED: mệnh đề có mô tả nguồn công khai cụ thể; DERIVED: thiết kế nội suy; SIMULATED: hệ số, lựa chọn độc lập của dự án; UNKNOWN: chưa đủ chứng cứ.
- CODE-CONFIRMED: đã thấy trực tiếp code qua diff/QA hoặc source được GitHub trả về. QA-GATED: đã có test, nhưng không chứng minh cảm giác chơi hoặc tính trung thành với game tham chiếu.
- USER-SCREENSHOT: quan sát hai ảnh UI ngày 17/11/2026; chưa liên kết với source SHA đang được QA.

## B. Danh mục Wiki chính thức

Nguồn danh mục: https://ngoalong.vnggames.com/ngoa-long-wiki (truy cập 17/11/2026).

| Nhóm Wiki | Quy mô được trang chủ công bố | Tình trạng kiểm tra 17/11 | Hành động còn thiếu |
| --- | ---: | --- | --- |
| Võ Tướng | 364 | Mở trang danh sách, chưa kiểm từng tướng | Đối chiếu tập lõi theo phe/vai trò/kỹ năng và bổ sung provenance |
| Binh Chủng | 372 | Kiểm trang danh sách và ví dụ khắc chế/tiến hóa | Ma trận toàn bộ nhánh binh chủng cấp thấp ưu tiên trước |
| Hiệu Ứng | 320 | Kiểm trang danh sách và một số mô tả sĩ khí | Lập taxonomy buff/debuff, cộng dồn, thời gian và khống chế |
| Vật Phẩm | 674 | Kiểm trang danh sách | Phân loại vật liệu/tài nguyên cần cho tiến triển |
| Trang Bị | 392 | Đã mở, chưa đọc toàn danh sách | Ghép slot / loại sát thương / nâng cấp |
| Phó Bản | 249 | Mở danh sách và quan sát cấp/NPC/thưởng | Chọn 5–10 mẫu gameplay/map tiêu biểu |
| Binh Thư | 11 | Đã mở, chưa phân tích toàn bộ | Kiểm tra đòn bẩy cân bằng |
| Tri Kỷ | 17 | Chưa khảo sát | Chưa ưu tiên cho core |
| Võ Khôi Tháp | 4 trụ / 26 độ khó | Đã mở, chưa phân tích | Xây khung thử thách có cấp độ |
| Chiến Kỳ | 186 | Đã mở | Lùi sau core |
| Tướng Khí | 90 | Đã mở | Lùi sau core |
| Ấn Kế Thừa | 66 | Chưa khảo sát | Lùi sau core |
| Ấn Thành Tựu | 4 | Đã mở | Lùi sau core |
| Thống Soái | Không công bố số tại index | Đã mở | Lùi sau core |
| Ấn Trận / Mã Trường / Khắc Văn / Cao Cấp | Các trang riêng | Đã mở trang danh mục | Kiểm liên kết đến trận pháp/tiến triển |
| Triệu Hồi, Dinh Phủ, Khoa Kỹ | Menu/phân hệ | Chưa có bảng đầy đủ | Cần nghiên cứu theo mechanic trước khi mở rộng |

**Cảnh báo số lượng:** số liệu trang chủ phản ánh trạng thái Wiki hiện hành; trang lọc Binh Chủng có thể hiển thị một tập con, không xem bộ lọc mặc định là số tổng.

## C. Nguồn bằng chứng có thể trích dẫn

| ID | Link | Phiên bản / mức sử dụng | Mệnh đề được nguồn hỗ trợ |
| --- | --- | --- | --- |
| NL-01 | https://ngoalong.vnggames.com/ngoa-long-wiki/binh-chung | VNG-WIKI-2026 / VERIFIED | Bộ khắc Thương, Thương khắc Kỵ, Kỵ khắc Bộ; các nhánh binh có kỹ năng/hành vi đặc thù, ví dụ phản kích, xuyên tuyến, hút/tước sĩ khí |
| NL-02 | https://ngoalong.vnggames.com/ngoa-long-wiki/hieu-ung | VNG-WIKI-2026 / VERIFIED | Nhiều nhóm hiệu ứng lợi/hại/khống chế; có trường hợp không thể tăng sĩ khí hoặc bị giảm sĩ khí mỗi lượt |
| NL-03 | https://ngoalong.vnggames.com/ngoa-long-wiki/an-tran | VNG-WIKI-2026 / VERIFIED | Ấn liên kết trận Ngư Lân / Phong Thỉ / Hạc Dực; tác dụng lên nhóm chỉ số khác nhau; không chứng nhận 24 preset của dự án |
| NL-04 | https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban | VNG-WIKI-2026 / VERIFIED | Các phó bản có tên, phe/nhóm NPC, cấp yêu cầu, thành tựu, phần thưởng/đồ rơi |
| NL-05 | https://ngoalong.vnggames.com/ngoa-long-wiki/vo-tuong | VNG-WIKI-2026 / VERIFIED | Danh sách 364 tướng theo nhóm phe và phẩm, chưa chứng thực toàn bộ kỹ năng |
| NL-06 | https://ngoalong.vnggames.com/ngoa-long-wiki/vat-pham/trang-bi | VNG-WIKI-2026 / PARTIAL | Danh mục 392 trang bị; cần rà soát công năng/slot |
| NL-07 | https://ngoalong.zing.vn/tin-tuc/huong-dan/thu-thach-thuc-vuot-tu-ma-y-chung-ho-co-muu.html | CLASSIC-2012 / VERIFIED-PLAYER-GUIDE | Người chơi đổi đội hình, ấn, sĩ khí hỗ trợ và vị trí tướng để giải từng phó bản, không chỉ tăng sức mạnh |
| NL-08 | https://gamelandvn.com/tim-hieu-ngu-dai-tran-phap-trong-ngoa-long-2/ | CLASSIC-2012 / HISTORICAL EDITORIAL | Kết hợp trống tăng sĩ khí để chủ lực kích kỹ năng sớm, đổi lại khả năng chống chịu và bố cục; ví dụ điển hình về trade-off |
| NL-CODE-01 | https://github.com/vuanhtuan161094-byte/Heoofgaia/commit/3db3976b91de9863491528dc571206c4cdd0d9b4 | Dự án / CODE-CONFIRMED | P3 có P2_COUNTERS, p3CounterFactor, 24 presets = 6 formation x 4 variants, AI scoring và buff tier |
| NL-QA-01 | https://github.com/vuanhtuan161094-byte/Heoofgaia/blob/main-ngoalong/qa/p3.py | Dự án / QA-GATED | 24 preset được áp dụng, test chi phí và battle trong fixture, nhưng không có đối chiếu chiến thuật từng mẫu với Wiki gốc |
| NL-QA-02 | https://github.com/vuanhtuan161094-byte/Heoofgaia/blob/main-ngoalong/qa/p3_balance.py | Dự án / QA-GATED | 360 mô phỏng có seed cố định: 3 profile x 5 ải x 24 preset; không phải playtest người hoặc bằng chứng 24 mẫu có chiến thuật duy nhất |

## D. Những nguyên tắc thiết kế rút ra, KHÔNG sao chép công thức

1. Khắc chế nền phải lựa chọn nhất quán giữa cơ chế Ngọa Long cổ điển, Wiki hiện hành và luật riêng của game; mọi khác biệt phải công khai SIMULATED. Với hướng Ngọa Long-first, cần thêm lớp Thương trước khi tự nhận tương đương.
2. Sĩ khí có vai trò về thứ tự ra đòn, lịch kích kỹ năng và tương tác hỗ trợ-phản hỗ trợ; các tổ hợp có trade-off sống còn thay vì một hệ số DPS.
3. Nhánh binh không chỉ tăng attack/defense/HP theo level mà thay đổi chức năng combat, điều kiện chọn mục tiêu, khả năng gây trạng thái.
4. Trận pháp là vị trí + buff/debuff + ưu tiên hành động; cần chứng minh bằng cặp battle cùng seed.
5. Tiến triển phải gồm phó bản có đặc điểm NPC/giới hạn, phần thưởng rõ và giải pháp thay đổi build hợp lý.

## E. Trạng thái tài liệu

Đây là tài liệu nghiên cứu **chưa exhaustive**; không dùng làm giấy chứng nhận Fidelity PASS. Tiếp theo: nghiên cứu sâu các nhánh Bộ/Thương/Kỵ/Cung/Quan Văn, sĩ khí và status, trận hình, 5–10 encounter classic; sau đó ghi rõ item-level links, version, và test thiết kế độc lập. KHÔNG scrape và chép nguyên hàng ngàn mục để nhập thẳng vào game.
