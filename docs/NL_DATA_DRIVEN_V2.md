# Mưu Định Tam Quốc — Wiki-driven data pipeline V2

**Ngày cập nhật:** 2026-11-17
**Nguồn gameplay:** GitHub Issue #4, Wiki-driven V2 owner prompt, `docs/NGOA_LONG_REBUILD_SPEC_V1.md`, `docs/REV_PROTOCOL.md`.
**Phạm vi:** repo `vuanhtuan161094-byte/Heoofgaia`, task branch `codex/nl-wiki-01-r02-20261117`; không merge hoặc sửa Hero.

## Nguồn và version boundary

Wiki chính thức tự ghi rõ đây là **Ngọa Long Mobile VNGGames Wiki**. Các trang đang mở cho thấy năm nhóm Bộ/Thương/Kỵ/Cung/Quan Văn, quan hệ Bộ > Thương > Kỵ > Bộ, cấu trúc phó bản có bản đồ → NPC theo thứ tự → đội 3×3, và bảy ô trang bị. Đây là dữ liệu nghiên cứu cho bản Mobile hiện hành; parity với webgame cổ điển là **UNKNOWN**. Chi tiết catalogue còn **PARTIAL** theo [NL_REFERENCE_MATRIX.md](NL_REFERENCE_MATRIX.md); chưa đọc hết Wiki.

Mỗi bản ghi nguồn có `sourceId`, URL, ngày/version và scope. Mỗi record dùng `VERIFIED`, `DERIVED`, `SIMULATED` hoặc `UNKNOWN`. Giá trị chưa có nguồn công khai để trống/null; hệ số cân bằng và nội dung do dự án tự đặt mang nhãn `SIMULATED`. Không nhập catalogue nhân vật, mô tả kỹ năng, item, asset, công thức kín, hoặc NPC nguyên bản từ VNG.

## Mốc triển khai

| Mốc | Trạng thái hiện tại | Code/runtime và bằng chứng |
| --- | --- | --- |
| P0 — khắc phục CI, chốt R02, giữ R03 | **DONE / TESTED** trên baseline `ee2db9cf1dd0d46579b7f8f1684d8b5d43762621`; exact Actions [44045933570](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44045933570) succeeded, gồm P4.1 frame/atlas/Chromium/video và artifacts. | PR R03 #5 và NL-R02 #6 vẫn riêng; không merge PR. CL/P4.1 gates giữ làm regression. |
| P1 — schema, provenance, validator | **DONE / TESTED** trên exact SHA; data validator **18/18**. | 7 troop profiles; 11 nhánh evolution; 5 status; 6 formation families × 4 plans; 28 maps/NPCs/stages; 140 unit records; equipment slots và legacy technology IDs. Save v5 được kiểm tra. |
| P1.1 — chuyển hệ tiến triển dự án hiện có sang catalog dữ liệu | **CODED / LOCAL TESTED; exact-SHA Actions PENDING.** | 19 project items, 8 research records, quy tắc cường hóa và huấn luyện tướng đọc từ JSON; giữ nguyên IDs và cân bằng đã có. Tất cả gắn `SIMULATED`, không phải catalogue Wiki. |
| P2 — migrate troops/evolution/status | **DONE / TESTED** trên exact SHA; Chromium NL-R02 **23/23**, R03 **31/31**, NL-R01 **18/18**. | Counter relation, modifiers, campaign templates, skill overrides, common status multipliers, duration, burn/daze and six-by-four formation catalog read from the pack. A/B equal power stage 5, seed `8675309`: `shield-van` thua, `spear-van` thắng. |
| P3 — 10–20 map/NPC có cấu trúc | **DONE / TESTED** trên exact SHA. | 28 stage records; 20 đầu có 5 unit mỗi NPC, slot 3×3 và liên kết troop/skill/status; field không rõ nguồn để null. Validator kiểm tra ID/slot/unlock/reward/skill/status/NPC/troop refs. |
| P4 — tích hợp và phát hành Alpha HTML | **DONE / TESTED** trên baseline `ee2db9cf1dd0d46579b7f8f1684d8b5d43762621`; full workflow [44045933570](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44045933570) succeeded and uploaded HTML/evidence. | Playable artifact `muu-dinh-tam-quoc-ngoa-long-alpha-playable` ID `14311327667`, digest `sha256:69978fb26a037413da5fff987e3078fd1fd5ea9457dccb6839bef231b4d7f2a9`. Evidence artifact ID `14310614720`, digest `sha256:251f0794dd0dc36dc61b823e9471a63f7ee8871222649f875d80afbb4ed56e3c`. Save key `muu_dinh_tam_quoc_v1`, schema v5/migration/receipt/replay and CL state remain. Owner/device acceptance is not certified. |
| P5 — mỹ thuật/mở rộng | **PENDING theo gate.** Chưa mở production art mới. | Chỉ bắt đầu sau khi Alpha đạt các gate code/QA và người dùng có thể kiểm tra build. |

## Ranh giới dữ liệu đã chuyển và còn lại

| Module | Dùng trong Alpha hiện tại | Provenance / giới hạn |
| --- | --- | --- |
| `troops`, `evolution` | Bảy loại runtime, vòng khắc chế hiện hành, 11 lựa chọn tiến hóa. | Nhóm và hướng counter cơ bản được xác nhận tại Wiki; nhánh cụ thể, giá, multiplier và stat profile là **SIMULATED**. Stats Wiki chưa có trong pack nên là null/UNKNOWN. |
| `skills`, `statusEffects` | Năm archetype địch, override chiến thuật, break/guard/daze/burn/morale-seal. | Phần lớn là rule dự án **SIMULATED**. Không khẳng định duration, stacking hay formula là của Mobile/classic. |
| `formations` | Sáu trận pháp và bốn tactical plans nạp vào runtime; giữ 24 IDs/save. | Dữ liệu cũ của dự án, **SIMULATED**; Ấn Trận Wiki không xác nhận 24 preset là canonical formations. |
| `campaign.maps`, `campaign.npcs` | 28 stage records; 140 unit records; first 20 NPC records đầy đủ về cấu trúc 3×3. | Khung dữ liệu phó bản được Wiki xác nhận; catalogue NPC, hero, troop counts, stats, power, rewards và rule của Alpha là project-authored/simulated. `heroId`, `level`, `soldiers`, `stats` để null/UNKNOWN khi chưa có nguồn được phép nhập. |
| `heroes` | Roster/profiles vẫn dùng registry cũ; chi phí, EXP và luật huấn luyện được đọc từ pack. | Không chuyển roster hoặc nhập chỉ số/skill Wiki. Huấn luyện và hệ số EXP là **SIMULATED**. |
| `equipment` | Bảy generic slot, compatibility aliases và 19 món đồ dự án giữ nguyên ID; giá/thống kê/cường hóa đọc từ pack. | Slot được xác nhận; mọi item, stats, giá và cường hóa là **SIMULATED**. Catalogue Wiki không nhập. |
| `research` | Tám Save IDs cũ; tên, mô tả, trần cấp, chi phí và mục tiêu hiệu ứng đọc từ pack, áp dụng trong chiến đấu/khoa kỹ/thành trì. | Mọi hệ số và dữ liệu tiến triển là **SIMULATED**. Wiki Khoa Kỹ chưa nhập; không áp rule Cao Cấp/China server. |

## QA và release gates

- Data gate: validator schema/provenance/reference graph; 18/18 Chromium-independent data assertions.
- Browser: `qa/ngoa_long_mode.py` 18/18, `qa/nl_r02.py` 23/23, `qa/nl_r03.py` 31/31, `qa/cl_p6.py` 30/30 locally on generated HTML; existing P2/P3/CL/P4.1 regression steps stay enabled in Actions.
- Progression slice: `qa/nl_progression.py` 21/21 locally, covering research effects on combat and economy, equipment buy/equip/reinforce, hero training, reload and Save v5 preservation; exact-SHA Actions remains pending for this slice.
- Reproducible build: `tools/build_ngoa_long_mode.py`, then `tools/build_ngoa_long_r03.py`; both `--check` gates passed after build. One offline HTML output.
- Save contract: key/schema v5 unchanged; migration v1–v4, receipts and immutable replay remain covered by browser tests.
- Baseline release artifact is published from exact SHA `ee2db9cf1dd0d46579b7f8f1684d8b5d43762621`; the current progression slice is not yet released. Human Windows/Android play and owner gameplay/art approval remain separate gates.

## Nguồn đã mở (2026-11-17)

- [Wiki home](https://ngoalong.vnggames.com/ngoa-long-wiki) — labels itself Ngọa Long Mobile; homepage lists its catalog sections and counts.
- [Binh Chủng](https://ngoalong.vnggames.com/ngoa-long-wiki/binh-chung) — troop categories, tier examples and the Mobile counter direction.
- [Võ Tướng](https://ngoalong.vnggames.com/ngoa-long-wiki/vo-tuong) — category/index coverage only; no record-level import.
- [Hiệu Ứng](https://ngoalong.vnggames.com/ngoa-long-wiki/hieu-ung) — category/index coverage only; full interaction behavior remains unread.
- [Ấn Trận](https://ngoalong.vnggames.com/ngoa-long-wiki/an-tran) — seal/formation topic coverage; not this project's preset source.
- [Phó Bản](https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban) — ordered NPC/map/3×3 schema; no catalogue copied.
- [Trang Bị](https://ngoalong.vnggames.com/ngoa-long-wiki/vat-pham/trang-bi) and [Vật Phẩm](https://ngoalong.vnggames.com/ngoa-long-wiki/vat-pham) — generic categories/coverage only.
- Khoa Kỹ and Dinh Phủ coverage is recorded as PARTIAL in the matrix; some advanced topics are NOT_READ. No count is treated as a content requirement.

**Current handoff:** P0–P4 baseline is implemented, Chromium-tested and published from the exact SHA above. The new project-catalog progression slice has 21/21 local Chromium checks and awaits exact-SHA Actions. P5, full Wiki coverage, hero roster import, classic parity, human device play, and owner acceptance are pending.
