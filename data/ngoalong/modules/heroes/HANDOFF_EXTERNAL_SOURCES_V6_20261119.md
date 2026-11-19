# CHAT 01 — A1/A2/A3 | Bổ sung nguồn ngoài Wiki, V6, 19/11/2026

## Phạm vi và an toàn
- Repo `vuanhtuan161094-byte/Heoofgaia`, nhánh `feature/nl-v2-heroes`.
- Chỉ bổ sung **research/reference** vào `data/ngoalong/modules/heroes/**` và focused QA `qa/modules/heroes/**`.
- Giữ `364` Wiki IDs, không sửa runtime, generator, `index.html`, Save, không đụng module Chat 02–08, không merge, không dùng Codex Cloud.
- Chỉ số/skill/chiêu mộ web Trung Quốc, web Đài Loan, Mobile Trung Quốc và VNG Mobile Việt Nam là những **edition khác nhau**. Không chứng minh được Mobile Việt Nam năm 2026 bằng nguồn cổ.
- Không phát sinh tướng `DESIGN_READY` hoặc `PLAYABLE` trong lượt này.

## Thống kê sau V6
| Hạng mục thiếu từ V5 | Có đối chứng web cổ mới | Chưa có đối chứng |
|---|---:|---:|
| A1 Ngụy | 17/17 | 0 |
| A2 Quần | 110/121, gồm 109 toàn trang và 1 snippet-only | 11 |
| A3 Trung lập | 68/69 | 1 |
| **Tổng** | **195/207**, trong đó 194 có chứng cứ trang/toàn văn và 1 snippet-only | **12** |

**KHÔNG được hiểu `195` là tướng Mobile Việt Nam đủ dữ liệu**. `194` có đối chứng từ các bảng/hướng dẫn web cổ, một số là do cộng đồng viết và đăng trên cổng nhà phát hành. Một trường hợp `Tỏa Nô` chỉ có search snippet; trang đích Bahamut chặn truy cập (403), chưa xác minh được toàn văn.

### Nguồn nền
- Bảng chiêu mộ, tên kỹ năng và 3 thuộc tính cổ Lequ: https://www.lequ.com/wly/201109/17734.html
- Bảng bổ sung/blue/green skills công bố 20/09/2014: https://www.lequ.com/wly/201109/17720.html
- Bảng tướng chiến dịch: https://www.lequ.com/wly/201105/14503.html
- Bảng Uy Danh: https://www.lequ.com/wly/201105/14364.html
- Bảng Tháp: https://www.lequ.com/wly/201110/18089.html
- Nguồn Vương Song giác ngộ cổ: https://wly.lequ.com/activity/201606/11506.html
- Nguồn Lý Điển classic: https://games.sina.com.cn/w/n/2011-09-05/1049528013.shtml

### Dữ liệu đặc biệt mới đối chứng
- **Vương Cơ 王基**: Lequ giới thiệu tướng chiêu mộ tại tửu quán từ phó bản `王基势力—昶城之战` (bài 31/05/2012); bảng Lequ 2014 có skill cổ `缴械` → `践踏`: https://www.lequ.com/wly/201305/54621.html
- **Tân Tì 辛毗**: đánh tướng trong phó bản Công Tôn Uyên / Tương Bình, sau đó tuyển qua tửu quán; skill đời cũ `浪涛` → `玄冰` (sát thương mưu công đơn mục tiêu tăng khi binh lực thấp), không có %: https://games.sina.com.cn/w/n/2013-01-11/1551683375.shtml
- **Thái Diễm 蔡琰**: hướng dẫn người chơi 2013 ghi tên skill `銅牆`, đề xuất vị trí trống/nhạc hỗ trợ; không coi đây là skill Mobile 2026: https://www.lequ.com/wly/201305/53748.html
- **Hà Tiến 何进**, **Trần Đam 陈耽**, **Trịnh Thái 郑泰**, **Vu Độc 于毒**: bổ sung chỉ số cổ, loại tướng và skill tên cổ từ bảng Lequ 2014: https://www.lequ.com/wly/201109/17720.html
- **Lý Nghiêm 李严**: đã từng có nguồn tuyển tửu quán nhưng bị đổi sang không thể tuyển trong bản vá 04/06/2021 của web Trung Quốc: https://www.lequ.com/wly/202106/136798.html
- **Tỏa Nô 瑣奴**: tìm thấy dấu vết `火弩` ở search excerpt https://forum.gamer.com.tw/C.php?bsn=20848&snA=15579 ; full page 403, `SEARCH_SNIPPET_ONLY`, tuyệt đối không nhập vào chiến đấu.
- **Nghiêm Chính 严政**: Lequ 2014 ghi `52/59/38` cùng skill `突进` trong bảng cổ. **Vương Song 王双** có nguồn nâng cấp xanh riêng. Đều không chứng minh Mobile hiện hành.

## Bản vá chiêu mộ 04/06/2021: thay đổi có ngày, quan trọng hơn bảng 2011
Lequ phát hành 03/06/2021, hiệu lực 04/06/2021, danh sách thay đổi: https://www.lequ.com/wly/202106/136798.html

Trong 207 IDs tồn đọng có **69 đối chiếu chuyển trạng thái**:
- 17 `MAP_DIRECT_TO_UNAVAILABLE`: từng tuyển trực tiếp ở phó bản, sau bản 2021 không tuyển bằng cơ chế ấy.
- 9 `MAP_DIRECT_TO_TAVERN`: chuyển từ tuyển trực tiếp sang gặp ở tửu quán.
- 43 `MAP_TAVERN_TO_UNAVAILABLE`: đổi từ tuyển tửu quán sang không thể tuyển ở bản 2021.
- Có **26 tướng Quần** và **43 Trung lập** xuất hiện trong 69 thay đổi. Chú ý tên `Hậu Tuyển` (`侯选/候选`) và `Lưu Tuân` (`刘循/刘偱`) có khác biệt chữ, chưa xác nhận alias tuyệt đối.
- `UNAVAILABLE` chỉ là **trạng thái tuyển tại phiên bản web Trung Quốc 2021**; không tự gán `npcOnly=true` và không coi là quy tắc Mobile Việt Nam 2026.

## Vẫn còn 12 hồ sơ chưa có chứng cứ mới (ngoài index)
- Quần (11): **Dương Cổ, Kha Ngô, Chu Chỉ, Dương Nghi, Ngưu Kim, Đinh Nguyên, Lâu Ban, Quản Lộ, Triệu Phạm, Văn Khâm, Vô Khâu Kiệm**.
- Trung lập (1): **Nghiêm Dư**.
- Các tướng khác 195/207 mới được **đối chứng tên/skill/cấp phát triển/nguồn tuyển từng phiên bản cổ**; % skill, binh chủng, chỉ số Mobile mới nhất, tỷ lệ tuyển và chuỗi giác ngộ cá thể **vẫn UNKNOWN**.
- Không nhập giá trị/bảng cổ sang runtime mà không xác nhận edition; chi phí giác ngộ và xác suất tuyển luôn để null khi chưa có nguồn.

## Artifact và bàn giao
1. `a123_external_lequ_crosscheck_v6.json`: 207 IDs không thiếu/trùng, 186 nguồn cổ so khớp trong vòng đầu.
2. `a123_external_gap_followups_v6.json`: 21 gaps từ vòng đầu, bổ sung 9 (8 full-page, 1 snippet-only) và 12 vẫn thiếu.
3. `a123_lequ_2021_recruitment_delta_v6.json`: 69 chuyển trạng thái có source date, cơ chế và role **chỉ trong web Trung Quốc 2021**.
4. `qa/modules/heroes/a123_external_lequ_crosscheck_v6.test.cjs` và `qa/modules/heroes/a123_external_source_v6.test.cjs`: unit guards, có thể chạy bằng Node; chưa nên tuyên bố native Node/CI PASS trước khi có log.

Đối với Chat 05/08: các file V6 đều `REFERENCE_ONLY` / `runtimeImport:false`. Chỉ dùng làm nguồn so sánh/tra cứu, không tự sinh kỹ năng thực thi, quân số hoặc cơ chế chiêu mộ. Mọi trường Current Mobile 2026 đều UNKNOWN.
