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
| P0 — khắc phục CI, chốt R02, giữ R03 | **DONE / TESTED** trên SHA `f0fcfc0a4612a5902e7391933c4f6106139c5b79`; exact Actions [44044962286](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44044962286) succeeded, gồm P4.1 frame/atlas/Chromium/video và upload artifact. | PR R03 #5 vẫn riêng; chỉ chuyển source/runtime R03 đã kiểm thử, không merge PR. CL/P4.1 gates giữ làm regression. |
| P1 — schema, provenance, validator | **DONE / TESTED** trên exact SHA; data validator **18/18**. | 7 troop profiles; 11 nhánh evolution; 5 status; 6 formation families × 4 plans; 28 maps/NPCs/stages; 140 unit records; equipment slots và legacy technology IDs. Save v5 được kiểm tra. |
| P2 — migrate troops/evolution/status | **DONE / TESTED** trên exact SHA; Chromium NL-R02 **23/23**, R03 **31/31**, NL-R01 **18/18**. | Counter relation, modifiers, campaign templates, skill overrides, common status multipliers, duration, burn/daze and six-by-four formation catalog read from the pack. A/B equal power stage 5, seed `8675309`: `shield-van` thua, `spear-van` thắng. |
| P3 — 10–20 map/NPC có cấu trúc | **DONE / TESTED** trên exact SHA. | 28 stage records; 20 đầu có 5 unit mỗi NPC, slot 3×3 và liên kết troop/skill/status; field không rõ nguồn để null. Validator kiểm tra ID/slot/unlock/reward/skill/status/NPC/troop refs. |
| P4 — tích hợp và phát hành Alpha HTML | **DONE / TESTED**; workflow build/`--check`/full regression/exact SHA succeeded; HTML và evidence artifact đã upload. | Playable artifact `muu-dinh-tam-quoc-ngoa-long-alpha-playable` ID `14311915424`, digest `sha256:5a7b9add28e89bd05c90b08867196975c10019422a94f1bf29e1b80c9059a914`. Evidence artifact ID `14311717009`, digest `sha256:c8166c9bc09424d9a94e9f6180ba3325b5316bfa56743e11437b74ace9693993`. Save key `muu_dinh_tam_quoc_v1`, schema v5/migration/receipt/replay and CL state remain. Owner/device acceptance is not certified. |
| P5 — mỹ thuật/mở rộng | **PENDING theo gate.** Chưa mở production art mới. | Chỉ bắt đầu sau khi Alpha đạt các gate code/QA và người dùng có thể kiểm tra build. |

## Ranh giới dữ liệu đã chuyển và còn lại

| Module | Dùng trong Alpha hiện tại | Provenance / giới hạn |
| --- | --- | --- |
| `troops`, `evolution` | Bảy loại runtime, vòng khắc chế hiện hành, 11 lựa chọn tiến hóa. | Nhóm và hướng counter cơ bản được xác nhận tại Wiki; nhánh cụ thể, giá, multiplier và stat profile là **SIMULATED**. Stats Wiki chưa có trong pack nên là null/UNKNOWN. |
| `skills`, `statusEffects` | Năm archetype địch, override chiến thuật, break/guard/daze/burn/morale-seal. | Phần lớn là rule dự án **SIMULATED**. Không khẳng định duration, stacking hay formula là của Mobile/classic. |
| `formations` | Sáu trận pháp và bốn tactical plans nạp vào runtime; giữ 24 IDs/save. | Dữ liệu cũ của dự án, **SIMULATED**; Ấn Trận Wiki không xác nhận 24 preset là canonical formations. |
| `campaign.maps`, `campaign.npcs` | 28 stage records; 140 unit records; first 20 NPC records đầy đủ về cấu trúc 3×3. | Khung dữ liệu phó bản được Wiki xác nhận; catalogue NPC, hero, troop counts, stats, power, rewards và rule của Alpha là project-authored/simulated. `heroId`, `level`, `soldiers`, `stats` để null/UNKNOWN khi chưa có nguồn được phép nhập. |
| `heroes` | Có schema tương lai; profile array rỗng và runtime giữ registry hiện có. | **NOT_IMPORTED_IN_ALPHA**; không tuyên bố chuyển roster hoặc nhập chỉ số/skill của Wiki. |
| `equipment` | Bảy generic slot và alias cho compatibility; không có project item mới. | Slot được xác nhận; `projectItems=[]`; tên, stats, set effect, giá và drop rate chưa nhập. |
| `research` | Tám system IDs hiện có; runtime giữ registry công nghệ dự án. | Cấu trúc/ID được giữ; Wiki Khoa Kỹ đầy đủ chưa nhập. Cao Cấp hoặc rule theo server khác không áp tự động. |

## QA và release gates

- Data gate: validator schema/provenance/reference graph; 18/18 Chromium-independent data assertions.
- Browser: `qa/ngoa_long_mode.py` 18/18, `qa/nl_r02.py` 23/23, `qa/nl_r03.py` 31/31, `qa/cl_p6.py` 30/30 locally on generated HTML; existing P2/P3/CL/P4.1 regression steps stay enabled in Actions.
- Reproducible build: `tools/build_ngoa_long_mode.py`, then `tools/build_ngoa_long_r03.py`; both `--check` gates passed after build. One offline HTML output.
- Save contract: key/schema v5 unchanged; migration v1–v4, receipts and immutable replay remain covered by browser tests.
- Release artifact is published from exact SHA `f0fcfc0a4612a5902e7391933c4f6106139c5b79`. Human Windows/Android play and owner gameplay/art approval remain separate gates.

## Nguồn đã mở (2026-11-17)

- [Wiki home](https://ngoalong.vnggames.com/ngoa-long-wiki) — labels itself Ngọa Long Mobile; homepage lists its catalog sections and counts.
- [Binh Chủng](https://ngoalong.vnggames.com/ngoa-long-wiki/binh-chung) — troop categories, tier examples and the Mobile counter direction.
- [Võ Tướng](https://ngoalong.vnggames.com/ngoa-long-wiki/vo-tuong) — category/index coverage only; no record-level import.
- [Hiệu Ứng](https://ngoalong.vnggames.com/ngoa-long-wiki/hieu-ung) — category/index coverage only; full interaction behavior remains unread.
- [Ấn Trận](https://ngoalong.vnggames.com/ngoa-long-wiki/an-tran) — seal/formation topic coverage; not this project's preset source.
- [Phó Bản](https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban) — ordered NPC/map/3×3 schema; no catalogue copied.
- [Trang Bị](https://ngoalong.vnggames.com/ngoa-long-wiki/vat-pham/trang-bi) and [Vật Phẩm](https://ngoalong.vnggames.com/ngoa-long-wiki/vat-pham) — generic categories/coverage only.
- Khoa Kỹ and Dinh Phủ coverage is recorded as PARTIAL in the matrix; some advanced topics are NOT_READ. No count is treated as a content requirement.

**Current handoff:** P0–P4 are implemented, Chromium-tested and published from the exact SHA above. P5, full Wiki coverage, hero/equipment/research migration, classic parity, human device play, and owner acceptance are pending.
