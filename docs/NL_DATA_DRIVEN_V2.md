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
| P1.1 — chuyển hệ tiến triển dự án hiện có sang catalog dữ liệu | **DONE / TESTED** trên exact SHA `e3b48743408927ee2f9f14d4f00899d1ee91c2db`; Actions [44054103331](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44054103331) succeeded. | 19 project items, 8 research records, quy tắc cường hóa và huấn luyện tướng đọc từ JSON; giữ nguyên IDs và cân bằng đã có. Chromium 21/21. Tất cả gắn `SIMULATED`, không phải catalogue Wiki. |
| P1.2 — chuyển roster tướng dự án hiện có sang catalog | **DONE / TESTED** trên exact SHA `29c1a5eedac401a84b245405280e84fe7aba63c5`; full exact-SHA Actions [44058846614](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44058846614) succeeded, gồm CL regressions và P4.1 video. | 14 hồ sơ runtime được nạp từ JSON, giữ nguyên IDs, tên, chỉ số, vai trò và skill; mỗi trường SIMULATED. Chromium progression **23/23**, data validator **20/20**, CL-P4 **23/23**. Wiki profiles vẫn rỗng và UNKNOWN. Playable artifact [14317207395](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44058846614/artifacts/14317207395), digest `sha256:e78a51e200ab8b6afec8dbbd075d339e4ab12e7c7a85c760fae81a8fa32146fc`; evidence/video [14316608539](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44058846614/artifacts/14316608539), digest `sha256:7d6b4da49d9948864eca5a81a2e7307e492f8902b2cbd3742512e05c988365e4`. |
| P1.3 — chuyển chiến pháp 14 tướng gốc sang catalog dùng chung | **DONE / TESTED** trên exact SHA `60b339f7bdd384d230dc478684e9ff05bbb2f2ac`; full Actions [44061361085](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44061361085) succeeded. | `skills.heroById` nạp đủ descriptor chiến đấu; validator 22/22, progression Chromium 24/24, NL-R02 23/23, NL-R03 31/31, CL-P4 23/23. Save v5 giữ nguyên. Playable [14319120500](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44061361085/artifacts/14319120500), digest `sha256:f52437ee815a80522c182ee7c219035a3d16da12ed65e2686cbbcc975fc61a8b`; evidence/video [14319205337](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44061361085/artifacts/14319205337), digest `sha256:68dc503997ecd5067cf68c3c8527d101daff30c659866d6eda8f2a6616ca5e9b`. |
| P2 — migrate troops/evolution/status | **DONE / TESTED**; lifecycle extension awaits exact-SHA Actions on its release commit. | Counter relation, modifiers, campaign templates, skill overrides, status duration/timing/stack/tick/control and six-by-four formation catalog read from the pack. Local Chromium NL-R02 **24/24**, R03 **31/31**, progression **24/24**, CL-P4 regression **23/23**. A/B equal power stage 5, seed `8675309`: `shield-van` thua, `spear-van` thắng. |
| P3 — 10–20 map/NPC có cấu trúc | **DONE / TESTED** trên exact SHA. | 28 stage records; 20 đầu có 5 unit mỗi NPC, slot 3×3 và liên kết troop/skill/status; field không rõ nguồn để null. Validator kiểm tra ID/slot/unlock/reward/skill/status/NPC/troop refs. |
| P4 — tích hợp và phát hành Alpha HTML | **DONE / TESTED** trên exact SHA `e3b48743408927ee2f9f14d4f00899d1ee91c2db`; full workflow [44054103331](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44054103331) succeeded. | Playable artifact ID `14315576035`, digest `sha256:92a4358882b7242f7ce7283553a0cd7a39099272ef19a9020c5eb5e0d828d404`; evidence/video artifact ID `14314608743`, digest `sha256:bfc6f2a4dc74ec6e40b433fd661a12df2a5a8c7087a426c34a0247c52cf782fb`. Save key `muu_dinh_tam_quoc_v1`, schema v5/migration/receipt/replay and CL state remain. Owner/device acceptance is not certified. |
| P5 — mỹ thuật/mở rộng | **PENDING theo gate.** Chưa mở production art mới. | Chỉ bắt đầu sau khi Alpha đạt các gate code/QA và người dùng có thể kiểm tra build. |

## Ranh giới dữ liệu đã chuyển và còn lại

| Module | Dùng trong Alpha hiện tại | Provenance / giới hạn |
| --- | --- | --- |
| `troops`, `evolution` | Bảy loại runtime, vòng khắc chế hiện hành, 11 lựa chọn tiến hóa. | Nhóm và hướng counter cơ bản được xác nhận tại Wiki; nhánh cụ thể, giá, multiplier và stat profile là **SIMULATED**. Stats Wiki chưa có trong pack nên là null/UNKNOWN. |
| `skills`, `statusEffects` | Năm archetype địch, override chiến thuật, break/guard/daze/burn/morale-seal. | Phần lớn là rule dự án **SIMULATED**. Không khẳng định duration, stacking hay formula là của Mobile/classic. |
| `formations` | Sáu trận pháp và bốn tactical plans nạp vào runtime; giữ 24 IDs/save. | Dữ liệu cũ của dự án, **SIMULATED**; Ấn Trận Wiki không xác nhận 24 preset là canonical formations. |
| `campaign.maps`, `campaign.npcs` | 28 stage records; 140 unit records; first 20 NPC records đầy đủ về cấu trúc 3×3. | Khung dữ liệu phó bản được Wiki xác nhận; catalogue NPC, hero, troop counts, stats, power, rewards và rule của Alpha là project-authored/simulated. `heroId`, `level`, `soldiers`, `stats` để null/UNKNOWN khi chưa có nguồn được phép nhập. |
| `heroes` | 14 hồ sơ thuộc dự án được nạp vào registry runtime từ `heroes.projectRoster`; chi phí, EXP và luật huấn luyện cũng đọc từ pack. `heroes.profiles` giữ trống cho catalogue Wiki chưa nhập. | Hồ sơ runtime là **SIMULATED** theo từng trường, giữ nguyên IDs để tương thích Save; level/stats/skillIds thuộc catalogue Wiki vẫn **UNKNOWN**. Không nhập dữ liệu tướng từ Wiki. |
| `equipment` | Bảy generic slot, compatibility aliases và 19 món đồ dự án giữ nguyên ID; giá/thống kê/cường hóa đọc từ pack. | Slot được xác nhận; mọi item, stats, giá và cường hóa là **SIMULATED**. Catalogue Wiki không nhập. |
| `research` | Tám Save IDs cũ; tên, mô tả, trần cấp, chi phí và mục tiêu hiệu ứng đọc từ pack, áp dụng trong chiến đấu/khoa kỹ/thành trì. | Mọi hệ số và dữ liệu tiến triển là **SIMULATED**. Wiki Khoa Kỹ chưa nhập; không áp rule Cao Cấp/China server. |

## QA và release gates

- Data gate: validator schema/provenance/reference graph; 20/20 Chromium-independent data assertions, gồm provenance hồ sơ tướng.
- Browser: `qa/ngoa_long_mode.py` 18/18, `qa/nl_r02.py` 23/23, `qa/nl_r03.py` 31/31, `qa/cl_p6.py` 30/30 locally on generated HTML; existing P2/P3/CL/P4.1 regression steps stay enabled in Actions.
- Progression slice: `qa/nl_progression.py` 24/24 locally and in exact-SHA Actions [44061361085](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44061361085), including roster and combat-skill runtime-to-JSON equality, progression, reload and Save v5 preservation. CL-P4 passed 23/23 after preserving extended commander metadata.
- Reproducible build: `tools/build_ngoa_long_mode.py`, then `tools/build_ngoa_long_r03.py`; both `--check` gates passed after build. One offline HTML output.
- Save contract: key/schema v5 unchanged; migration v1–v4, receipts and immutable replay remain covered by browser tests.
- Playable artifact is published from exact SHA `e3b48743408927ee2f9f14d4f00899d1ee91c2db`; Human Windows/Android play and owner gameplay/art approval remain separate gates.

## P2 status lifecycle extension (2026-11-17)

- Runtime status lifecycle is now driven by `statusEffects.effects`: `stackingPolicy`, `expirePhase`, `removeAfterOwnAction`, `skipActionChance`, damage/defense/morale factors, and optional `roundEndDamageFraction`. Validation rejects unknown or contradictory lifecycle metadata. All new values and existing formulas remain `SIMULATED`; they describe this project's combat engine, not claimed Mobile or classic rules.
- Synthetic Chromium probe registers new vulnerability/control effects at runtime and verifies refresh stacking, defense and morale factors, round-end damage/expiry, owner-action stun/cleanup. Save schema/key unchanged; CL combat retains its existing counter table and neutral status multipliers.
- Local results: data **24/24**, NL-R02 **24/24**, NL-R03 **31/31**, progression **24/24**, CL-P4 **23/23**; reproducible build and both `--check` gates passed. Exact-SHA Actions/artifact for the release commit is pending publication and must be recorded after it completes.
- Wiki effects page currently organizes entries into broad categories and advertises a large catalog; this was used only as a research boundary. No Wiki effect names, descriptions, hidden formulas, or proprietary assets were copied. Effects coverage remains partial.

## Nguồn đã mở (2026-11-17)

- [Wiki home](https://ngoalong.vnggames.com/ngoa-long-wiki) — labels itself Ngọa Long Mobile; homepage lists its catalog sections and counts.
- [Binh Chủng](https://ngoalong.vnggames.com/ngoa-long-wiki/binh-chung) — troop categories, tier examples and the Mobile counter direction.
- [Võ Tướng](https://ngoalong.vnggames.com/ngoa-long-wiki/vo-tuong) — category/index coverage only; no record-level import.
- [Hiệu Ứng](https://ngoalong.vnggames.com/ngoa-long-wiki/hieu-ung) — category/index coverage only; full interaction behavior remains unread.
- [Ấn Trận](https://ngoalong.vnggames.com/ngoa-long-wiki/an-tran) — seal/formation topic coverage; not this project's preset source.
- [Phó Bản](https://ngoalong.vnggames.com/ngoa-long-wiki/pho-ban) — ordered NPC/map/3×3 schema; no catalogue copied.
- [Trang Bị](https://ngoalong.vnggames.com/ngoa-long-wiki/vat-pham/trang-bi) and [Vật Phẩm](https://ngoalong.vnggames.com/ngoa-long-wiki/vat-pham) — generic categories/coverage only.
- Khoa Kỹ and Dinh Phủ coverage is recorded as PARTIAL in the matrix; some advanced topics are NOT_READ. No count is treated as a content requirement.

**Current handoff:** P0–P4 and the project-catalog progression slice are implemented, Chromium-tested and published from the exact SHA above. P5, full Wiki coverage, hero roster import, classic parity, human device play, and owner acceptance are pending.
