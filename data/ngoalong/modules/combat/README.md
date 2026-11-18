# Nhóm 02 — Combat effects V1 (standalone, chưa tích hợp)

**Quyền sở hữu:** nhóm 02 COMBAT. **Trạng thái:** CODE READY; focused test in-session 41/41 PASS; GitHub quick/full phải được đối chiếu SHA riêng. **Không có runtime import / Save write / merge.**

## Giao phẩm

- `effects_v1.json`: **13 hiệu ứng gốc của Mưu Định Tam Quốc**, số liệu cân bằng và thời lượng được đánh dấu `SIMULATED`. Sáu ID `break, guard, daze, burn, morale-seal, ward` khớp nhãn hiện có nhưng **không mặc định tương đương hành vi** hoặc thay thế runtime hiện hành.
- `tools/nl_combat_effects_v1.js`: bộ phân giải độc lập, thuần dữ liệu, không gọi `Math.random`, không thay Save hay gameplay. Cung cấp `validateCatalog`, `newBattle`, `applyStatus`, `dispel`, `damage`, `morale`, `startAction`, `endRound`, `modifiers`, `auditWikiSources`. Kết quả là state mới và combat events.
- `qa/nl_combat_effects_v1.py`: **41 tình huống** QA; chạy `python qa/nl_combat_effects_v1.py` với Node.js đã cài.
- Nguồn chỉ đọc: `data/ngoalong/references/effects_wiki_mobile_v1.json` (320 hiệu ứng) và `data/ngoalong/references/troop_effect_bridge_wiki_v1.json` (501 sự kiện binh chủng, 115 nối đơn trị / 2 mơ hồ / 39 chưa nối).

## Contract và cảnh báo

1. **Không nạp 320 Wiki effects vào engine.** Wiki VNG là phiên bản **Mobile**, không xác minh parity với webgame cổ điển. ID, phần trăm, hạn lượt trong `effects_v1.json` đều do dự án thiết kế (SIMULATED).
2. Khi skill tính xác suất, tầng quyết định lượt chiến đấu truyền `chance` và `roll` đã ghi trong replay. Module không tự rút số ngẫu nhiên. Sự kiện được trả ra riêng, không trực tiếp phát thưởng/EXP/tài nguyên.
3. `dispel` chỉ xóa trạng thái `removable` theo scope, theo thứ tự được áp dụng. `ward` và `anchored` không giải được. `focus` có trần 3 tầng; `surge` thay thế, không cộng dồn. Hủy khống chế `sleep/fear` khi nhận sát thương dương, trừ khi có `anchored` — đây là **luật mô phỏng gốc**, không phải khẳng định công thức Wiki.
4. Wiki ghi **Tịnh Hóa** là cơ chế tăng sát thương liên quan buff, **không đồng nghĩa thanh tẩy**. Các thao tác thanh tẩy có nhãn khác như **Giải Trừ** và **Tỏ Chí**. Không ánh xạ nhầm tên.
5. Phạm vi `ward` không tương đương mọi loại `Miễn Dịch` ở Wiki. Tên trùng có thể là nhiều biến thể khác ID. Các trạng thái chưa có nối Wiki phải giữ UNKNOWN.

## Đầu việc của nhóm 07 trước khi tích hợp

- Đối chiếu hợp đồng `statusEffects.effects` trong `alpha_content.json` với 13 trạng thái mới; **không thay 6 trạng thái cũ bằng code mới nếu chưa có quyết định của owner**.
- Giữ 3×3/tối đa 5 tướng, combat authoritative state, replay immutable, receipts idempotent và Save key/schema v5; nạp module qua generator chính `index.html`, không tạo HTML riêng.
- Chạy `python qa/nl_combat_effects_v1.py`, QA gameplay A/B, regression R02/R03/CL, và CI exact SHA; xác minh bằng Chromium rồi QA thiết bị thật. Chỉ ghi `INTEGRATED` và `TESTED` khi có bằng chứng.

## Không thực hiện

Không sửa `index.html`, `alpha_content.json`, `tools/build_ngoa_long_mode.py`, `.github/workflows/ngoalong-qa.yml`, Save, Hero, nghệ thuật, hoặc branch đích. Không merge.
