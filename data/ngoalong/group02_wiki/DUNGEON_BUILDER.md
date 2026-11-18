# Dungeon Builder — nhóm 02

Chạy một lệnh để chuyển kết quả thu thập từ [Wiki phó bản VNG](https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban) sang JSON blueprint có provenance.

```bash
python data/ngoalong/group02_wiki/build_dungeons.py --self-test
python data/ngoalong/group02_wiki/build_dungeons.py --source data/ngoalong/group02_wiki/wiki_dungeons_extracted.json --output data/ngoalong/group02_wiki/wiki_dungeon_blueprints.json --report data/ngoalong/group02_wiki/wiki_dungeon_builder_report.json
```

Workflow `ngoalong-group02-crawl.yml` tự chạy toàn bộ: đọc bản đồ/NPC (8 shard), ghép dữ liệu, biên dịch blueprint, ghi báo cáo thiếu dữ liệu và cập nhật **chỉ các tệp group02** khi kết quả hợp lệ. Nếu dữ liệu chỉ có một phần vẫn ghi `PARTIAL`; không coi số bản đồ hiển thị hoặc QA xanh là đã import đủ NPC.

- Blueprint mô hình hóa map → NPC → units trong 3×3, thứ tự trận nếu Wiki cung cấp, quân số và kỹ năng tên, cùng trạng thái từng trường.
- Không tự gán `heroId`, `troopId`, `skillId`, chỉ số, hệ số hoặc luật của Mobile vào game.
- `wikiSlot` giữ số gốc 1..9; `formationSlot` là bản chuyển 0..8 **DERIVED**, cần được kiểm tra với tọa độ của engine trước khi tích hợp.
- Nếu tổng quân NPC và tổng quân các đơn vị quan sát không khớp, báo rõ; nếu đủ số NPC nhưng thiếu đội hình vẫn không đạt gameplay-ready.
- Không sửa engine, UI, Save, Hero hoặc tạo bản sao game. Mục tiêu là nguồn dữ liệu sạch để chat tích hợp chuyển thành nội dung game thật.

Lưu ý: nguồn hiện là **Ngọa Long Mobile Wiki**, độ tương thích webgame cổ điển `UNKNOWN`. Chỉ dùng dữ kiện công khai để nghiên cứu thiết kế độc lập, không sao chép mã, ảnh hay mô tả độc quyền.
