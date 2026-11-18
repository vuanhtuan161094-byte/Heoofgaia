# Nhóm 07 — Bàn giao tích hợp luật hiệu ứng gốc V1
Ngày: 2026-11-18 · Owner đã phê duyệt **luật thiết kế gốc V1** làm cơ sở tích hợp. Không đồng nghĩa duyệt merge hoặc nghiệm thu gameplay.

## Git, nguồn và phạm vi
- Game: `vuanhtuan161094-byte/Heoofgaia`, chỉ nhánh nhiệm vụ `feature/nl-group07-effects-v1-20261118`, tách từ Wiki branch tại `9b806136c23e553b03cc10820d62d706f23edf4b`.
- Source nhóm 02: `tools/nl_combat_effects_v1.js`, `data/ngoalong/modules/combat/effects_v1.json`, `qa/nl_combat_effects_v1.py`.
- Generator phát hành duy nhất: `tools/build_ngoa_long_mode.py` nhúng engine + bridge + live wiring, **không** tạo bản HTML khác; `index.html` sinh tái lập trong CI.
- Reference Mobile Wiki (320 hiệu ứng) chỉ để đối chiếu; **không** tự kích hoạt, không đồng nhất với Classic.
- Giữ Save key `muu_dinh_tam_quoc_v1`, schema v5, receipt idempotent, combat mode `cltq` như cũ. Không đụng Hero hoặc main.

## Ma trận 6 trạng thái lịch sử
| Legacy status | Khác biệt với bộ luật V1 | Quyết định nhóm 07 |
| --- | --- | --- |
| break | Legacy giảm hệ số phòng thủ còn 0.69; V1 tăng sát thương nhận lên 1.22 | Legacy authoritative |
| guard | Legacy nhân phòng thủ 1.28; V1 nhân sát thương nhận 0.85 | Legacy authoritative |
| daze | Legacy xác suất bỏ hành động 0.35; V1 bỏ hành động xác định khi áp dụng | Legacy authoritative |
| burn | Legacy 4.5% HP + thêm 0.5%/tầng; V1 3.5%/tầng | Legacy authoritative |
| morale-seal | Cùng mục tiêu chặn tăng sĩ khí nhưng cơ chế dữ liệu khác | Legacy authoritative |
| ward | Cùng mục tiêu miễn hiệu ứng xấu, giữ luật và thời lượng legacy | Legacy authoritative |

Các tên trùng **không** cho phép thay implementation. Bộ luật V1 bổ sung đúng 7 ID mới: `sleep`, `fear`, `anchored`, `ironwall`, `focus`, `repel-blessing`, `surge`.

## Implemented
- `tools/nl_combat_effect_bridge_v1.js`: convert trạng thái additive trên **đơn vị trận thật** sang state của engine V1, xử lý cộng dồn/trần/tụ lực, giải trừ, kiểm tra miễn nhiễm từ ward cũ, hấp thụ đòn ironwall, kiểm tra skip-control thuần, tick thời lượng; không ghi Save.
- `tools/nl_combat_effect_wiring_v1.js`: hook riêng `p2Status`, `p2Cleanse`, `p2Hit`, `p2BuffRound` ở `campaign`; bỏ qua `cltq`. Cao Cao có thêm **focus** ở skill hiện có theo luật riêng SIMULATED (không phải nhập công thức Wiki).
- Node QA: `qa/nl_combat_effect_bridge_v1.test.cjs`. Chromium: `qa/nl_group07_effects_v1.py`, chụp `qa/nl-group07-effects-desktop.png`, kiểm tra real P2 hit, 3 stack, shield, 6 legacy, Save/replay.
- Workflow full/quick `.github/workflows/ngoalong-qa.yml` có cổng V1 và all legacy suites; exact-SHA được nhận diện theo `qa/commit-sha.txt`.

## Gate chưa thể tuyên bố PASS trước khi Actions hoàn tất
- Chromium, Save v5, replay events, R02/R03/P2/P3/CL và nguồn phát hành: phải kiểm tra workflow đúng HEAD.
- Trạng thái `sleep/fear`: engine xử lý `startAction` nhưng hiện **chưa nối skip owner-action vào trình tự lượt gameplay chính**; không được báo đủ 13 hiệu ứng live cho đến khi event skip và replay parity được chứng minh.
- Sát thương thức tỉnh sleep/fear, các tác dụng tương tác giữa 6 cũ/7 mới, test replay A/B full combat cần hoàn tất; 320 Wiki entries vẫn reference only.
- QA máy thật Windows/Android và owner acceptance: PENDING; không merge.

## Nghiệm thu
Chỉ chuyển sang TESTED/INTEGRATED sau khi đủ: canonical generator idempotent, engine/bridge tests, Chromium screenshot + gameplay A/B, replay save/load, 6 legacy unchanged, complete historical regression, GitHub Actions exact SHA, owner nghiệm thu.
