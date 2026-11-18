# CẬP NHẬT ƯU TIÊN — TRANG BỊ CÓ CHỨC NĂNG (19/11/2026)

Tình trạng mới nhất thay thế bảng kiểm kê/code-ready cũ bên dưới:

- **48 bản ghi trang bị PLAYABLE trong module**: 19 trang bị gốc giữ nguyên + **29 mô hình mới** chuyển từ 29 trang bị Wiki đã có chứng cứ thành game gear riêng, với ID `mdt-equip02-*`. Vẫn giữ 29 bản ghi Wiki gốc **REFERENCE_ONLY** riêng và không tự nhận sao chép chỉ số Wiki.
- 29 gear mới có đủ `requiredLevel` (thiết kế gốc, quy đổi dải cấp tướng 1–40), `slot`, `stats` 6 trường, `rarity`, `effectRule`, và `acquisitionRule`. Mỗi slot tác động đến đúng tuyến chỉ số: Vũ khí (atk/weaponAtk), Giáp (def+hp), Ngựa (atk+hp/horseAtk), Binh thư (int), Áo choàng (tdef), Thuẫn (mdef), Bảo vật (hp).
- `tools/nl_item_build_equipment.js` đồng bộ 29 item gốc dự án từ các bản ghi đã duyệt; chạy `node tools/nl_item_build_equipment.js --check` để phát hiện catalogue stale; `--write` để dựng lại. Không bịa thêm 363 tên chưa kiểm chứng.
- `tools/nl_item_inventory.js` bổ sung giao dịch `buy(state, id, receiptId)` có thanh toán **nguyên tử**, tương thích cả 19 mẫu shop cũ; `sets(state,heroId)` và cộng bộ Cùng Kỳ 2/4/7 theo `rules.setBonuses`. Công thức + chỉ số bộ là **SIMULATED / PROJECT_ORIGINAL**.
- `tools/nl_item_equipment_ui.js` cung cấp `makeView(...)` và `mount(host,options)` cho tab trang bị 7 ô, lọc, kho, tiệm, chỉ số, set, nút mua/mặc/tháo/cường hóa/tinh luyện. Hợp đồng `mount` bắt buộc host phát `receiptId` **bền vững**, `getState`, `setState` trước khi phát giao dịch. Chat 08 phải nối host này vào index.html qua **generator chính** và Save v5; bản này **chưa gắn vào runtime game**.
- Pipeline **392 món**: `tools/nl_item_wiki_index.js --write` dùng Playwright đi qua bảy nút lọc slot Wiki (fail-closed nếu không xác nhận đủ 392); sau đó `node tools/nl_item_full_equipment.js --write` mới mở rộng thành 392 bản ghi tham chiếu + 392 mô hình riêng dự án (ngoài 19 cũ). Bộ nhập đủ **chưa chạy** vì chưa có snapshot hoàn chỉnh; chỉ có kiểm thử tổng hợp với 392 fixture nhân tạo, **không được tính là 392 trang bị đã nhập**.
- QA mục tiêu `node --test qa/nl_item_*.test.cjs` gồm **21 ca kiểm thử độc lập** (12 inventory, 3 UI, 3 Wiki index, 3 full-builder). Chúng đã chạy trên exact source lấy từ GitHub bằng môi trường V8 mô phỏng phần Node: **21/21 PASS** sau khi sửa kỳ vọng bộ đếm; **chưa chạy Node CLI thật, Chromium hay CI exact SHA**.
- Số liệu nguồn/phiên bản: `https://ngoalong.vnggames.com/ngoa-long-wiki/vat-pham/trang-bi` (bản Mobile hiện hành); hướng dẫn chức năng: `https://ngoalong.vnggames.com/tin-tuc-2022/huong-dan/chi-tiet-ve-trang-bi-ngoa-long.html`. Số 392 là **số hàng chỉ mục**, không phải toàn bộ công thức VNG có thể xác minh.
- Liên lạc nhóm 01/03/05/06/08 như giao diện bên dưới. **Không merge, không sửa runtime chung, không xóa các trạng thái Save lịch sử.**

---

# Nhóm 04 — Vật phẩm & Trang bị — Handoff 18/11/2026

## Baseline / scope
- Branch feature/nl-v2-items from feature/nl-codex-cloud-v1-finish@a88b8449714ad48531f7c9e7e081ccac43edee92.
- Files changed only: data/ngoalong/modules/items/, tools/nl_item_*.js, qa/nl_item_* and this handoff. No edits to game runtime, generators, Save, existing Wiki files, Hero game or CI workflows.
- STATUS: MODULE CODE READY; NOT INTEGRATED / NOT PLAYTESTED. No Codex Cloud.
- Source: current VNG Mobile Wiki, NOT established classic webgame parity. Original figures are SIMULATED.

## Research & explicit coverage
| Area | Wiki index advertised | Wiki record snapshots stored | Project playable |
|---|---:|---:|---:|
| Equipment | 392 | 29 | 19 existing project originals |
| Items | 674 | 4 | 2 new originals |

Index pages:
- https://ngoalong.vnggames.com/ngoa-long-wiki/vat-pham/trang-bi
- https://ngoalong.vnggames.com/ngoa-long-wiki/vat-pham
- Equipment guide: https://ngoalong.vnggames.com/tin-tuc-2022/huong-dan/chi-tiet-ve-trang-bi-ngoa-long.html

Seven slots: Vũ Khí, Giáp, Ngựa, Binh Thư, Áo Choàng, Thuẫn, Bảo Vật; legacy project banner maps semantically to artifact but old Save key is preserved. Item group counts: Rương 323, Vật Liệu 145, Tài Nguyên 82, Túi Phúc 64, Ấn Thạch 27, Danh Phẩm 17, Bí Tịch 9, Truyền Thừa Lệnh 1, Lệnh 1, Chìa Khóa 1, Khác 4.

No Wiki name/level automatically becomes runtime usable. An index displayedLevel is not proven a hero-level requirement. Rarity, exact stats, drop rules, upgrade formulas, rates, refinement probabilities, caps and prices not individually sourced are null/UNKNOWN. Mobile/classic parity UNKNOWN. Do not copy protected assets, descriptions or hidden formulas.

## Deliverables
- data/ngoalong/modules/items/catalogue.json: original 19 live-equipment IDs, stats and shop cost preserved; 29 separate Wiki references; 2 active original items; 4 separate Wiki references. VERIFIED source data remains REFERENCE_ONLY.
- data/ngoalong/modules/items/rules.json: old project R03 reinforcement stays max 12, bonus 0.22 per level, silver 350*level^2, iron 105*level. New refinement is PROJECT ORIGINAL SIMULATED: max rank 3, bonus 0.08/rank, silver 600*next rank, 2 refinement materials/rank. The caps (200 equipment, 100 stack kinds, 999 quantity and 10000 receipts) are all SIMULATED.
- tools/nl_item_inventory.js: isolated browser/Node UMD module. Supply catalogue and rules to NLItemInventory.createModule(catalogue, rules). Methods: grant(state,entries,receiptId), equip(state,heroId,uid,receiptId), unequip(state,heroId,slot,receiptId), reinforce(state,uid,receiptId), refine(state,uid,receiptId), use(state,id,receiptId), bonuses(state,heroId), validateState(state).
- All mutations are atomic and produce a fresh state only on success. Same receipt/payload repeats without settlement; conflicting receipt payload fails. Impossible to equip same UID on two heroes, reuse it as two separate items, or create negative resources.
- Legacy state preserved: state.items = [{uid,base,lv}], state.gear[heroId][slot] = uid, state.hero[heroId].level, silver/iron/prestige. Addition: state.nlItemsV1 = {stacks:{},receipts:{},serial:0}, which must be migrated/persisted by chat 08; do not change Save v5/key in this branch.
- New original consumable 'mdt-tem-tiep-te' grants 200 iron when consumed; new material 'mdt-tinh-khoang' is consumed by refinement. Neither is automatically dropped. Acquisition is only through authorized victory/reward rules after inter-team review.
- tools/nl_item_wiki_index.js: opt-in Playwright research scraper. With internet and Chromium: node tools/nl_item_wiki_index.js --write. It requires all 392 and 674 index entries to be parsed before writing the snapshot and leaves every record REFERENCE_ONLY. NOT EXECUTED in this handoff; full Wiki index extraction PENDING.

## Chat interfaces (other owners integrate)
- Chat 01: confirm hero level and slots. Use bonuses(state,heroId) exactly once, avoiding double application alongside existing R03 equipmentStats.
- Chat 05: map atk/def/int/hp/tdef/mdef and weaponAtk/horseAtk into actual three-lane combat. Never alter battle sequence/replay from an inventory call.
- Chat 03: approve resource voucher, refinement cost/material, stack/inventory caps and acquisition economy. All new amounts SIMULATED.
- Chat 06: call grant only from canonical ONE-TIME VICTORY receipt; no rewards on replay, losses, previews or animation.
- Chat 08: select authoritative inventory state, use the existing Save key muu_dinh_tam_quoc_v1 and schema v5, wire generator and UI, save migration, economy receipts and combat bonuses. Run actual Node, Chromium, Save/replay and exact-SHA CI. No merge before acceptance.

## QA and pending
- qa/nl_item_inventory.test.cjs: 8 focused batches for source isolation, grant idempotency, equipment ownership/stat lanes, strengthen/refine costs, item use, capacity, corrupt saves and legacy keys.
- qa/nl_item_wiki_index.test.cjs: 2 focused offline count/parser gates (392 equipment, 674 items; reject incomplete or changed indexes).
- EXECUTED: GitHub-fetched exact code/data/tests in isolated JavaScript V8, 10/10 PASS (8 inventory + 2 index parser); Node runtime and live-browser crawler are NOT validated.
- NOT EXECUTED / PENDING: Node CLI test, complete online Wiki index extraction, Playwright/Chromium UI, full game runtime, Save persistence & migration, Actions same SHA, physical QA, owner approval.
- No auto-created icons or fake Wiki gameplay values. Never call REFERENCE_ONLY playable.
