# NL-REF-REV-A — Kiểm toán sai lệch Ngọa Long / Mưu Định Tam Quốc

**17/11/2026 — NL-WIKI-01 ACTIONS PASS; NL-R02 LOCAL IMPLEMENTATION PASS, COVERAGE PARTIAL**. Repository vuanhtuan161094-byte/Heoofgaia, task branch `codex/nl-wiki-01-r02-20261117`, based on `main-ngoalong` SHA 05cb413b08e917e1aa4026fb54a5ff621373153e. The implementation delta is measured against this frozen baseline; see the task-branch evidence addendum in `docs/NL_REFERENCE_MATRIX.md`. No changes were made to Hero or Save schema v5.

## Evidence và giới hạn

- Đã fetch exact latest branch HEAD 05cb413b08e917e1aa4026fb54a5ff621373153e; đọc AGENTS.md, REV, product spec, checkpoint, Issue #4, NL_REFERENCE_MATRIX.md và tài liệu audit.
- Đã inspect trực tiếp code ở index.html tại P2_COUNTERS, p2Hit, p2Morale, p2Target, P3_PRESETS, p3Upgrade và p3CounterFactor; code counter/tier/save IDs được đối chiếu với source, không chỉ suy từ screenshot.
- Đã mở Wiki chính thức cho Binh Chủng, Võ Tướng, Hiệu Ứng, Ấn Trận, Phó Bản, Trang Bị, Vật Phẩm, Cao Cấp, Quý Tử và Tri Kỷ; đã đọc các guide webgame 2012 có ngày xuất bản. Mức đọc theo từng nhóm là READ/PARTIAL/NOT_READ trong NL_REFERENCE_MATRIX.md. **Không đọc hết hàng nghìn mục.**
- NL-R01 reproducible build check and inline syntax passed; `qa/ngoa_long_mode.py` passed 18/18 in Chromium at 1280×720 and 390×844. Research commit `7006bc8691e50fe01dc538a078566206ededf683` passed exact-SHA Actions run [44019319455](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44019319455).
- NL-R02 passes focused Chromium **21/21**. Current-source regression gates pass: P2 **31/31 + 12/12**, P3 **74/74**, balance **360 fixed-seed trials**, CL-P1/P2 **43/43**, and CL-P6 **30/30**. The legacy P2/P3 counter assertions now test the source-backed cycle. Exact-SHA Actions for R02 remain pending.

## Tóm tắt đánh giá

**NL-WIKI-01: CORE RESEARCH DOCUMENTED / COVERAGE PARTIAL. NL-R02: IMPLEMENTED LOCALLY / EXACT-SHA CI PENDING.** The project now includes the three-class current-Wiki counter, playable Thương assignment, morale/drum and morale-seal tests, visible deterministic AI reasons, five distinct encounter compositions, and a same-seed formation puzzle. The 24 IDs are retained and described as 6 formations × 4 plans. Per-system proof and the remaining scope are recorded below and in the matrix.

| ID | Ưu tiên | Sai lệch / thiếu bằng chứng | Bằng chứng và tác động | Hành động cụ thể + cổng nghiệm thu |
| --- | --- | --- | --- | --- |
| NL-GAP-01 | P0 | **DONE locally** — baseline triangle lacked Thương | Current Wiki NL-W02 states Bộ > Thương > Kỵ > Bộ. `qa/nl_r02.py` confirms all three same-seed edges, neutral Cung/Quan Văn, actual Thương unit selection, and legacy CL counter preservation. | Project multipliers 1.22/0.82 and the 120 silver/60 grain switch cost remain **SIMULATED**. Exact-SHA Actions pending. |
| NL-GAP-02 | P0 | **DONE locally** — equal-power formation A/B dungeon puzzle | `qa/nl_r02.py`: same seed `8675309`, same hero/stats/gear; `turtle-dieu` loses and `spear-van` wins. | Keep the visible event evidence; expand beyond the five authored encounters in later milestones. Exact-SHA Actions pending. |
| NL-GAP-03 | P0 | **DONE locally** — drum/morale/counterloop evidence | Same-seed 1/2/3 drum timing, morale cap, Tư Mã Ý's seal blocking gains but allowing drains, skill event and no duplicate settlement pass in `qa/nl_r02.py`. | All thresholds, enemy strength and effect details remain project **SIMULATED** or unread; no formula parity claimed. |
| NL-GAP-04 | P1 | **DONE locally** — 24 IDs preserved, label clarified | UI now says “6 trận pháp / 24 phương án”; QA checks six families/four variants and saved IDs. | These are project presets, not 24 Wiki-canonical formations. Exact-SHA Actions and owner UI acceptance pending. |
| NL-GAP-05 | P1 | Hiện nâng binh chủng P3 chủ yếu cộng stats; không có tiến hóa vai trò theo nhánh ở P3 baseline | p3Upgrade chỉ tăng tier 1–4, p2Unit được nhân Công/Thủ/HP, bất biến quân số. Wiki có cây tiến hóa với hiệu ứng chức năng | Kiểm tra feature P03 người dùng chụp có SHA/code chưa; thiết kế mỗi nhánh 2+ lựa chọn có trade-off, riêng build test chức năng hơn là % stats |
| NL-GAP-06 | P1 | **DONE locally** — AI decision reason visible and deterministic | `qa/nl_r02.py` checks scored candidate record in the event and visible combat log. | Broader enemy behavior coverage and owner UX review pending. |
| NL-GAP-07 | P1 | **DONE locally for the vertical slice** — Ngọa Long hub → formation → campaign → combat → settlement/replay | R02 campaign uses the new encounter path and preserves legacy CL battles. Chromium checks win/unlock, replay and no duplicate reward. | Full progression and long-run balance are pending; historical CL regression gates remain enabled. |
| NL-GAP-08 | P1 | Giao diện chiến đấu còn khó đọc | Screenshot từ người dùng: tướng, cờ, tên tướng, thanh HP và số quân xếp chồng ở khoảng 1280x720; UI P03 dropdown cắt mô tả dài | Có fixture 5v5 ảnh desktop và 390px; visual QA bounding boxes không overlap text/HUD, số lính rõ, hit effects đúng đơn vị; owner visual PENDING |
| NL-GAP-09 | P1 | **DONE locally for five authored encounters** — distinct enemy troops and one formation puzzle | Five map data sets contain different counter/range/morale troop compositions; same-seed map 5 A/B passes. | Full NPC/dungeon Wiki catalogue remains unread; later expansion and exact-SHA Actions pending. |
| NL-GAP-10 | P1 | Source traceability vừa được hoàn thiện cho nhóm core, nhưng chưa exhaustive | `docs/NL_REFERENCE_MATRIX.md` now records URLs, access date, version scope, READ/PARTIAL/NOT_READ, current code state and QA assertions. Wiki coverage remains partial. | **NL-WIKI-01 core slice DONE locally**; keep unresolved categories marked PARTIAL/NOT_READ and extend the matrix when R02/R03 add systems. Full Wiki reading is not claimed. |
| NL-GAP-11 | P2 | Tài liệu Codex cũ từng ưu tiên Chiến Loạn/hybrid | `docs/NGOALONG_CODEX_AGENT.md` now opens with Issue #4 and marks prior roadmap/game-loop material archival; `docs/CURRENT_CHECKPOINT.md` now marks CL direction archival. `AGENTS.md` contains conflicting historical sections, resolved by the more recent owner Issue #4 precedence. | **Effective task docs normalized in NL-WIKI-01.** Keep `AGENTS.md` intact as repository policy/history; apply the latest Issue #4 for the active product direction. Retain compatible save/IP/REV constraints. |
| NL-GAP-12 | P2 | 'Balance 360' vẫn chưa tương đương độ khó người chơi và tránh deadlock kinh tế | Sau khi đổi counter, `qa/p3_balance.py` vẫn PASS 360 fixed-seed trials; normal profile thắng 17/24 ở ải 16 và 4/24 ở ải 24. Fixture có sẵn quân/cấp/tiền, không đo thời gian kiếm tài nguyên. | Test onboarding 30 phút thực, 3 profiles with cost-bound inventory, tình huống thua hồi quân/mua binh, 0 softlock |
| NL-GAP-13 | P2 | Fidelity visual so với Ngọa Long và direction art mới chưa được duyệt | Art Bible đã chốt chibi hắc ám mắt sáng, nhưng user battle screenshot cho thấy sprite giống nhau và khó đọc | Pilot 2 tướng / 2 loại lính, 4 hướng, Idle/Walk/Attack/Hit/Fall, VFX alpha thật, ảnh/video Chromium source-identical; owner phê duyệt sau pilot |
| NL-GAP-14 | P2 | CI artifact từng mang tên CL-P6 dù sản phẩm đã đổi | `.github/workflows/ngoalong-qa.yml` now scopes push validation to `main-ngoalong` and `codex/**`, and publishes `muu-dinh-tam-quoc-ngoa-long-playable` plus `muu-dinh-tam-quoc-qa-evidence`. Historical CL tests/video remain labeled as legacy test steps. | **Naming/branch trigger corrected in NL-WIKI-01.** Verify successful artifact publication in Actions on this exact commit; keep legacy test labels truthful. |

## NL-WIKI-01 and NL-R02 milestone status

- **DONE (core scope):** current official Wiki research was opened for troop types, heroes, effects, formations/seals, dungeons, gear/items, advanced technology, and linked residence systems; dated classic guides were used only as historical evidence. Per-group coverage is in `docs/NL_REFERENCE_MATRIX.md`. The stale Codex direction and checkpoint headers now defer to Issue #4 while preserving compatible safeguards.
- **RESEARCH LIMIT:** individual hero/troop/effect/map entries and several late systems remain PARTIAL/NOT_READ. Wiki totals conflict across the home and subpages. Current Mobile rules are not asserted as classic webgame rules.
- **LOCAL TESTED:** reproducible NL-R01 build check, inline syntax, and actual Chromium hub/navigation/battle entry at desktop/mobile passed. Generated screenshots are from the current source after the documented build step.
- **DONE / TESTED:** NL-WIKI-01 exact-SHA Actions passed at `7006bc8691e50fe01dc538a078566206ededf683`, run [44019319455](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44019319455).
- **DONE locally / TESTED:** build `--check` and inline JS syntax; NL-R01 Chromium **18/18**; NL-R02 Chromium **21/21**; P2 **31/31 + 12/12**; P3 **74/74**; P3 balance **360 fixed-seed trials**; CL-P1/P2 **43/43** and CL-P6 **30/30**. Desktop and 390px evidence are `qa/nl-r02-desktop-battle.png` and `qa/nl-r02-mobile-hub.png`.
- **PENDING:** final R02 regression suite, exact-SHA Actions on the implementation commit, and its playable/evidence artifacts. Owner/device acceptance remains pending.

## Ba kiểm thử đối chứng mới đề xuất

1. **Counter matrix A/B**: 5 tướng cùng chỉ số, cùng seed; đổi duy nhất type Bộ/Thương/Kỵ; đo sát thương/target hiệu lực, không thay costume hay tạo quân. Nhánh Cung/Quan Văn phải có specialty thay vì nhét vào vòng 3 lớp.
2. **Morale tempo A/B**: cùng ải/seed, đội x1 vs x2 trống; đo lượt đầu tiên tướng chính dùng chiến pháp, số lượt mất sĩ khí, sát thương chịu và khả năng khắc chế bằng quân giảm sĩ khí.
3. **Map puzzle A/B**: quân cùng cấp và gear, AI boss cố định, so sánh hai trận pháp; một phương án thắng nhờ đổi tuyến/ngắt buff, phương án còn lại thua. Combat log và Chromium video phải khớp seed, no reward twice.

## Lộ trình xử lý sau kiểm toán

- **Gate N0 / NL-WIKI-01:** core source/version traceability completed; Actions passed exact research SHA; Wiki coverage remains PARTIAL.
- **Gate N1 / NL-R02:** mechanics, same-seed A/B, save/replay, desktop/mobile and all focused legacy regressions pass locally; exact-SHA Actions and playable artifact pending.
- **Gate N2:** kiểm tra gameplay R03 branch evolution và skill riêng; đối chiếu mỗi lựa chọn thực sự khác lối chơi.
- **Gate N3:** kiểm thử Ngọa Long full loop, cân bằng/kinh tế và Chromium visual; owner QA PENDING.
- **Gate N4:** chốt pilot art và tiến độ R04; không sửa toàn bộ nhân vật trước khi owner duyệt.

## Quy tắc nghiệm thu

- V0: syntax/build reproducibility, static checks.
- V1: focused tests trên combat authority, bất biến save/receipt, P2/P3/CL regression không được loại bỏ.
- V2: Chromium desktop 1280x720, mobile 390; click thực, scene thật, report replay và ảnh/video đúng build.
- V3: GitHub Actions SUCCESS đúng commit SHA + evidence + playable artifact.
- V4: chơi Windows/Android vật lý vẫn PENDING.
- V5: owner art/fidelity approval vẫn PENDING.

**Kết luận giới hạn phạm vi:** *NL-WIKI-01 core research is documented and passed exact-SHA Actions; NL-R02 gameplay is implemented and passed focused local Chromium plus P2 full, while the final R02 regression/Actions gate is pending.* Wiki coverage remains partial; classic-to-Mobile parity, long-run balance, physical-device play and owner art/gameplay approval are not certified. No merge or CL data removal is authorized.
