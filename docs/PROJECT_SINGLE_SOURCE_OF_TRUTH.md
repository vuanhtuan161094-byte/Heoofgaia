# Hẻoofgaia — Một dự án, một bản chơi, một nguồn sự thật

**Thống nhất 04/11/2026** · Tên hiển thị: **Anh Hùng Thời Loạn** · Repo: `vuanhtuan161094-byte/Heoofgaia` · Nhánh phát triển và nhánh mặc định duy nhất đang dùng: `feature/hog1-research-to-playable-20261102`.

## Mốc kiểm tra ban đầu
- Gameplay và mỹ thuật đã có chung lịch sử Git. Không có hai nhánh hoặc hai bản nguồn riêng cần merge; không merge sang `main` hay tạo repo thứ hai. Khi ghi tài liệu này, HEAD được xác minh ở **`9b8ad56981cbbd6cd73e5fe06ef4e0de5f2477ef`**. Đây là mốc bằng chứng, **không phải con trỏ HEAD cố định**: luôn đọc HEAD mới nhất trước khi sửa.
- [Focused HG26/HG26.1 CI #41861223048](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/41861223048): **SUCCESS**. HG26 **14/14**, HG26.1 **9/9**, HG24 **13/13**, HG21 **8/8**. HG26.1 có bài thử 4 chủng tộc, hai stack mỗi tướng, sát thương theo chủ, thương vong, 1 chiến báo/loot cho 1 Boss và Save v07.
- [Integrated CI #41861223001](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/41861223001) tại cùng gameplay SHA: **FAIL ở Chromium HG18.1**, khi bấm bật HG26 từ màn Quân đội, chiến dịch bắt đầu (`phase=outbound`) nhưng `E.strictSave(s)===false`; toast “Không thể lưu game: Game state không hợp lệ”. Không được tuyên bố HG26.1 phát hành hoàn chỉnh cho đến khi xử lý. Chỉ chứng nhận các tập QA đã thực sự xanh.
- [Full CI xanh gần nhất trước HG26.1 #41859706960](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/41859706960): SUCCESS cho bản đã gắn Skeleton HG22.1 và HG26 solo trước khi HG26.1 được nạp vào runtime.
- Các phiên art và gameplay cùng dùng **một nhánh**, không sửa chồng cùng một file khi HEAD thay đổi. Push commit phải căn đúng HEAD hiện thời, không force-push.

## Bản chơi canonical — KHÔNG nhân thêm game
- **Chỉ một HTML offline được phân phối:** `Play-Heoofgaia-HG11.html`; hậu tố `HG11` là tên builder/artefact lịch sử, **không phải cấp gameplay mới nhất**. File được tạo từ `index.html` + JS module + PNG bằng `python build_offline.py`.
- GitHub Actions `Heoofgaia offline combat QA` xuất artifact `Play-Heoofgaia-HG11`; chọn **run SUCCESS gần nhất** trên nhánh canonical để chơi. Không tải artefact của run FAIL làm bản nghiệm thu.
- Các file `Play-Heoofgaia-HG07.html`, `HG08.html`, `HG10.html` trong git là snapshot lịch sử để tham chiếu/kiểm thử, **không được truyền thông như các game đang phát triển song song**. Không xóa cho tới khi kiểm tra phụ thuộc/migration.
- Mục tiêu desktop Chrome/Edge Windows; 1280×720 và landscape 960×540 có CI Chromium. Chưa chứng nhận chơi thủ công dài hạn trên Windows hoặc Android thực.
- Save key duy nhất `heoofgaia_hg_only_v07`; `state.version=7`, tất cả subsystem HG20/HG21/HG24/HG26/HG26.1 lưu chung trong một state. Không tạo Save v08 hoặc thưởng/mint quân khi nâng cấp Save.

## Bản hợp nhất hiện có (thật / chưa hoàn thiện)
| Hạng mục | Runtime | Mức |
|---|---|---|
| 4 chủng tộc, 40 binh chủng, thành/mỏ/kinh tế/cấp tướng/đồ/nhiệm vụ | `data.js`, `engine.js`, HG08/HG10/HG18/HG182 | Coded; mô phỏng một phần, chưa 1:1 |
| Quân và kinh tế private, Boss, vật phẩm, phần thưởng thực tế | `hg20-private.js`, `hg20-world-bosses.js` | Coded + focused QA |
| **Tháp chiến thuật** | `hg21-tower-tactical.js` | Tối đa **3 tướng × 2 stack riêng**, buff/phép theo chủ, Tower riêng, 5 lượt thắng có thưởng/ngày |
| Đội hình mẫu, bổ sung quân hợp lệ, tuyển thật, huấn luyện EXP, mỏ | `hg24-private-automation.js` | Opt-in, v07, không lấy quân người khác |
| Săn Boss tự động theo AP, đánh thật, hồi quân, hồi phục, dừng nguy hiểm | `hg26-boss-autohunt.js` | Coded; HG26 solo regression PASS |
| **Boss chung ba tướng, không luân phiên** | `hg261-joint-boss.js` + `app.js` | **3 tướng cùng một trận**, mỗi người nhiều nhất 2 stack; tập trung 9/9 PASS, Chromium/Save integration FAIL cần sửa |
| 40 danh tính quân có hình khác nhau | `art-free-*.js`, `art-hg19*.js`, painter | Có sprite cho 40/40; chất lượng động không đồng đều |
| Undead Skeleton `undead_1` | `art-hg22-skeleton.js`, `assets/licensed/hg22-skeleton` | **5 hành động Idle/Walk/Attack/Hit/Death × 10 frame = 50 frame**, sheet PNG 256 px mỗi frame; bộ này được manifest ghi nhận MIT. Không phải asset từ Meowa; mới **1 binh chủng** đạt mức này. |
| Đồ họa T9–T10, Bone Dragon/Lich King/rồng khác | chưa đồng bộ chất lượng Skeleton | Chưa đạt |
| 40 quân có animation 5 hành động chất lượng đồng nhất | chưa có | Chưa đạt |
| Chơi tay end-to-end, tương thích Android thực | chưa có bằng chứng tổng thể | BLOCKED/NOT TESTED |

## Luật không được thay đổi khi tích hợp
1. **Tháp (Tower):** 3 người × tối đa 2 stack/người = **tối đa 6 stack**, phép/buff/ATK/DEF thuộc tướng sở hữu stack. Đây là một bản chiến đấu Tower không tiêu hao AP/quân thế giới.
2. **Săn Boss chung HG26.1:** cũng 3 tướng × tối đa 2 stack **trong CÙNG MỘT trận chiến thế giới**; **không luân phiên đội**. Dùng AP thật của đoàn, quân thật, hao hụt thật, chiến báo và thưởng Boss đúng một lần. Chỉ chủ tướng từng stack cấp buff/phép cho stack đó.
3. **Hành quân thế giới bình thường** trước HG26.1 có giới hạn đội hình 7 stack/tướng; không được dùng giới hạn 7 đó để mở rộng Boss chung thành 21 stack.
4. Mọi thành quả cần engine authority (hành quân, lượt, kill, XP, mảnh, trang bị, Save exactly-once); UI, art và animation không được mint thưởng, tự ghi chiến thắng hoặc nhân bản quân.
5. Chế độ private có thể tăng tài nguyên và tốc độ tiến triển, nhưng Hero of Gaia/Fandom chỉ là tham chiếu. Thống nhất gameplay vui/chơi lâu dài hơn là ép giống toàn bộ HoG 2009.
6. Không dùng Codex trừ khi chủ dự án đổi ý. Phiên gameplay chỉnh gameplay/test, phiên art chỉnh sprite/painter và asset; trao đổi bằng branch HEAD và QA, không tự ghi đè phần nhau.
7. Bản build chỉ được coi **RELEASE PASS** khi both **focused** và **offline integrated workflow** cùng xanh trên **cùng SHA**, Chromium Save/Load hợp lệ, và artifact thực sự được tạo.

## Việc phải làm trước khi mở milestone khác
**P0 tích hợp:** sửa HG26.1 đường thao tác GUI 1 tướng mặc định/đoàn Boss khiến `strictSave` trả false khi pha `outbound` (CI #41861223001); thêm browser QA thật cho ba tướng chọn hai slot, Save→Reload trong giao tranh, 1 Boss thắng thật → 1 receipt. Kiểm tra quyền giữ quân/lock hero phụ và stop/recovery; không sửa animation để chữa gameplay.

**P1 art:** sau khi P0 xanh, nâng độ đồng đều animation của T9–T10 và các đơn vị nổi bật (Bone Dragon, Lich King, Dragon) theo đúng quy cách asset provenance, không chỉnh engine/lượt chiến đấu.

**P2 gameplay:** tiếp tục hậu cần nhiều thành, kho và cân bằng private. Chỉ một kế hoạch milestone chung và một artefact phát hành. Đọc `AGENTS.md`, file này và [Actions](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions) trước mọi tác vụ tiếp theo.

## Lệnh kiểm thử
```sh
node qa-hg26-boss.cjs
node qa-hg261-joint.cjs
node qa-hg24-private.cjs
node qa-hg21-tactical.cjs
node qa-hg22-skeleton.cjs
python build_offline.py
```
Chạy thêm GitHub Actions full Chromium; PASS từ Node không thay thế nghiệm thu GUI. Chi tiết cũ vẫn ở `docs/CURRENT_HG_CHECKPOINT.md` (lịch sử lớn), `docs/qa/HG26_BOSS_AUTOHUNT_20261104.md` và `docs/art/HG221_MEOWA_REVIEW_AND_SKELETON.md`.
