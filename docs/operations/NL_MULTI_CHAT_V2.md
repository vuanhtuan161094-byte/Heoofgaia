# MƯU ĐỊNH TAM QUỐC — MULTI-CHAT V2 · BẢNG ĐIỀU PHỐI DUY NHẤT

**Quyền sở hữu:** Chat 00 (Tổng điều phối). **Hiệu lực:** 2026-11-18. **Thay thế:** mọi bảng phân công nhóm/chat cũ; **không thay thế** code, dữ liệu, lịch sử nguồn hay các quyết định sản phẩm đã hoàn thành.

**Repo:** vuanhtuan161094-byte/Heoofgaia  
**Nhánh tích hợp:** feature/nl-codex-cloud-v1-finish  
**Draft PR duy nhất để tích hợp:** https://github.com/vuanhtuan161094-byte/Heoofgaia/pull/10 (OPEN/DRAFT; base codex/nl-wiki-01-r02-20261117)  
**Issue scope V1.0:** https://github.com/vuanhtuan161094-byte/Heoofgaia/issues/9 (OPEN)  
**Baseline code SHA đã kiểm chứng:** a88b8449714ad48531f7c9e7e081ccac43edee92  
**CI baseline:** https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44294315102 — run #200, 3/3 jobs SUCCESS, **chỉ cho SHA a88b844…**. Commit docs về sau **không thừa kế** kết luận exact-SHA cho release mới; đối chiếu riêng.  
**Default branch của repo:** feature/hog1-research-to-playable-20261102 (Hero; **không sửa**).

## 1. Ranh giới sản phẩm và dữ liệu

- Gameplay Ngọa Long 2D gốc: trận 3×3/tối đa 5 tướng, sĩ khí, 3 luồng damage, 24 preset, tướng–quân–kỹ năng–hiệu ứng–NPC, thành trì, nghiên cứu, trang bị, campaign. Không xây thành một game khác, không dùng Codex Cloud.
- Wiki https://ngoalong.vnggames.com/ngoa-long-wiki là **Ngọa Long Mobile hiện hành**; không tự suy diễn tương đương Ngọa Long web cổ điển. Không sao chép code/asset/biểu đạt độc quyền.
- Mọi dữ kiện nguồn phân loại đúng **VERIFIED / DERIVED / SIMULATED / UNKNOWN**. Trạng thái giao hàng **COLLECTED → NORMALIZED → CODED → INTEGRATED → TESTED → OWNER_ACCEPTED** là thang KHÁC với nhãn nguồn; một bản ghi VERIFIED không phải code đã chạy.
- Reference-only tuyệt đối không tự kích hoạt runtime. UNKNOWN không được điền số/công thức/quan hệ tiến hóa giả rồi gắn VERIFIED. Luật cân bằng tự thiết kế phải ghi SIMULATED.
- **372 dòng xuất hiện trên Wiki không phải 372 quân độc lập.** 249/219 là những số đếm ở nguồn/phạm vi khác nhau, không phải số phó bản đã chơi được. Đúng nguồn cần khai báo edition, endpoint, ngày và phạm vi đếm.
- **Nguồn runtime duy nhất:** data/ngoalong/alpha_content.json + generator canonical. Chỉ nhóm 08 sửa nguồn runtime/các build script; không nhóm nào xuất index.html phiên bản riêng.

## 2. Phân quyền file KHÔNG CHỒNG CHÉO

| Chat | Domain chịu trách nhiệm | ĐƯỢC GHI (đường dẫn dành riêng) | CHỈ ĐỌC / Không được ghi | Nhánh công việc |
| --- | --- | --- | --- | --- |
| **00** | Điều phối, hợp đồng bàn giao, cổng nghiệm thu | docs/operations/NL_MULTI_CHAT_V2.md | Mọi module và generator | Nhánh tích hợp, **chỉ file này** |
| **01** | Võ tướng, tướng–skill descriptor, khả năng đào tạo | data/ngoalong/modules/heroes/**; qa/modules/heroes/** | group02_wiki/heroes.json, alpha_content.json, combat engine | feature/nl-mcv2-01-heroes (tạo khi bắt đầu) |
| **02** | Binh chủng, vai trò, tiến hóa, khắc chế | data/ngoalong/modules/troops/**; qa/modules/troops/** | references/*troop*, alpha_content.json, battle engine | feature/nl-mcv2-02-troops (tạo khi bắt đầu) |
| **03** | Công trình, thành trì, tài nguyên, kinh tế, nghiên cứu | data/ngoalong/modules/city/**; qa/modules/city/** | group02_wiki/systems_items.json, Save, generator | feature/nl-mcv2-03-city (tạo khi bắt đầu) |
| **04** | Trang bị, vật phẩm, hiệu lực và nguồn nhận đồ | data/ngoalong/modules/inventory/**; qa/modules/inventory/** | group02_wiki/equipment.json, group02_wiki/systems_items.json, alpha_content.json | feature/nl-mcv2-04-inventory (tạo khi bắt đầu) |
| **05** | Chiến đấu, skill resolver, trạng thái, hiệu ứng, trận pháp | data/ngoalong/modules/combat/**; qa/modules/combat/** | references/*effects*, engine wiring và build scripts | feature/nl-mcv2-05-combat (tạo khi bắt đầu) |
| **06** | Phó bản, NPC, Boss, thứ tự đội hình và chiến dịch | data/ngoalong/modules/campaign/**; qa/modules/campaign/** | group02_wiki/*, alpha_content.json, campaign generator | feature/nl-mcv2-06-campaign (tạo khi bắt đầu) |
| **07** | Sprite game-ready, VFX event-based, nguồn và atlas mỹ thuật | assets/ngoalong/mc07/**; qa/modules/art/** | legacy assets ngoài mc07, combat state, index.html | feature/nl-mcv2-07-art (tạo khi bắt đầu) |
| **08** | **Duy nhất tích hợp** module, UI, runtime, Save/replay/receipts, generator, bản phát hành và full CI | data/ngoalong/alpha_content.json; data/ngoalong/integration/**; tools/build_ngoa_long*; tools/nl_*; tools/ngoa_long_r03.js; tools/ngoa_long_r04.js; index.html; .github/workflows/ngoalong-qa.yml; qa/nl_* | Source chuyên môn nhóm 01–07, docs/operations/NL_MULTI_CHAT_V2.md | **feature/nl-codex-cloud-v1-finish (đang hoạt động)** |

**Lưu ý về wildcard:** các thư mục modules/heroes, troops, city, inventory, campaign, assets/ngoalong/mc07 và qa/modules có thể chưa tồn tại tại baseline; đây là **quy ước đường dẫn mới, không phải bằng chứng đã tạo module**. Nhánh được ghi '(tạo khi bắt đầu)' là **dự kiến, chưa được khẳng định đã tạo**.

**Đóng băng dữ liệu gốc đang dùng chung:** data/ngoalong/group02_wiki/**, data/ngoalong/references/**, data/ngoalong/wiki_troop_facts_v1.json, AGENTS.md, docs/REV_PROTOCOL.md, docs/NL_DATA_DRIVEN_V2.md, docs/NGOA_LONG_REBUILD_SPEC_V1.md. Các nhóm có thể đọc; sửa dữ liệu nguồn lịch sử phải qua **một thay đổi riêng** được 00 phân quyền rõ ràng trước khi ghi. Không sửa chéo file vì tên thư mục 'group02' theo tổ chức cũ.

**Ngoại lệ phải điều phối:** sửa Save, API chung, tests chung, CI hay file runtime ngoài allowlist → nhóm 08 nhận ticket rồi tự thực hiện; nhóm yêu cầu chỉ ghi contract/handoff của mình. Nhóm 05 giữ rules/data effect; nhóm 08 độc quyền tools/nl_combat_effects_v1.js, bridge và combat wiring. Nhóm 06 giữ bản đồ/NPC mô hình; nhóm 08 độc quyền tools/nl_campaign_route_v1.js.

## 3. Bảng tiến độ V2 tại baseline code a88b844

**Cách đọc số:** 'đã xử lý' ghi rõ mức **lập chỉ mục/trích xuất**, không mặc định VALIDATED hay PLAYABLE. UNKNOWN là số của **trường/loại thiếu đã nêu**, không cộng giữa các nhóm và không được coi là 0 khi chưa kiểm kê. Cột module phân biệt module V2 **mới được bàn giao** với hệ thống **đã tồn tại trước V2**.

| Chat | Tổng/phạm vi tại baseline | Đã xử lý có bằng chứng | Còn UNKNOWN / blocked, định nghĩa rõ | Module V2 mới / hệ thống có sẵn | Commit bằng chứng và tình trạng tích hợp |
| --- | --- | --- | --- | --- | --- |
| **00** | 9 vai trò | 9/9 được cấp owner path + dependency contract | 0 xung đột owner path trong sơ đồ mới; kiểm tra thực tế từng handoff còn PENDING | **1 bảng điều phối**; không phải gameplay module | Bảng này; commit xem Git history của file. Không ảnh hưởng runtime |
| **01** | **50** hồ sơ tướng Wiki; **14** tướng project | 50/50 có bản ghi reference; 14/14 có pack/skill dự án | **50/50** công thức skill Wiki chưa xác minh; không đồng nhất 50 Wiki và 14 runtime | **0 module V2 mới**; runtime roster/skill project có sẵn | fd18f9855c077ceceebcbe59663da932a59834cc (Wiki); 14 project INTEGRATED theo pack, Wiki REFERENCE_ONLY |
| **02** | **372** dòng Wiki có lặp/đặc biệt; **25** combat identity project = 7 base + 18 evolution | 372/372 đã lập danh mục; **235/372** dòng trích xuất thao tác chuyên biệt | **137/372** dòng chờ trích xuất cơ chế chi tiết; **0** quan hệ tiến hóa tên cha–con Mobile được xác minh | **0 V2 mới**; troop/evolution runtime project có sẵn | 9a15bfb961672be70832d3ced0a21055930e9f47 (Wiki); 25 identity project có trong pack, không phải 372 playable |
| **03** | **6** công trình Wiki và **14** CN-tech nguồn phiên bản Trung Quốc; **8** nghiên cứu project | 20/20 record reference có định danh; 8/8 nghiên cứu project trong pack | **6/6** công trình thiếu quy tắc sản xuất/chi phí nâng cấp; **14/14** CN-tech bị chặn vì parity | **0 V2 mới**; nghiên cứu/kinh tế project có sẵn | ef7c5957adc1e22f51c2f4535d6eff66c9274a25; Wiki NOT INTEGRATED; project 8 nghiên cứu có runtime data |
| **04** | **29** trang bị + **4** vật phẩm Wiki; **19** trang bị project | 33/33 record reference đã thu thập; 19/19 project item trong pack | **29/29** trang bị thiếu số stat/cường hóa Wiki; **4/4** vật phẩm thiếu tác dụng/nguồn rơi | **0 V2 mới**; inventory/project equip có sẵn | ef7c5957adc1e22f51c2f4535d6eff66c9274a25; Wiki REFERENCE_ONLY, 19 project item INTEGRATED |
| **05** | **320** hiệu ứng Wiki; **13** effect nguyên bản project (6 cũ + 7 mới) | 320/320 lập danh mục; **317/320** có operation source; 13 trong module effect project | **3/320** thiếu operation source; **39** event trạng thái của troop chưa map một–một sang effect Wiki | **0 V2 mới**; 1 catalog engine effect có sẵn | eface385c81fc452911adff207069cfa4a2729ca; 13 project effects INTEGRATED tại baseline, 320 Wiki REFERENCE_ONLY |
| **06** | **10** map đầu Wiki có chỉ mục (trong tài liệu có tổng quảng bá 207 NPC trên chỉ mục); **28** encounter project / **8** chương | 10/10 map index đã ghi; **7** NPC detail snapshot; 28/28 project encounter trong pack | Độ phủ **đội hình/skill đầy đủ của Wiki vẫn UNKNOWN**; 207 là số cộng chỉ mục, **không** phải 207 hồ sơ NPC hoàn chỉnh; không suy ra 249 playable | **0 V2 mới**; campaign runtime project 28 encounter có sẵn | 0465d10a2a252e5ca267cf80dc81355df82826e1; Wiki PARTIAL, project campaign INTEGRATED |
| **07** | Nhiều asset legacy và pilot R04; **chưa kiểm kê tổng usable frame** | Có pilot original + art/asset manifests đã lưu; chưa đủ bằng chứng owner approve | **UNKNOWN chưa lượng hóa**: số sprite đủ chuẩn, được dùng thật và đã duyệt mỹ thuật | **0 V2 mới**; pilot art đã có | e2e38bb6c0ca3d83cb2292d3fdbc7eba3c63f5f8; game asset approval PENDING |
| **08** | Baseline runtime: 14 tướng, 25 combat identity, 13 effects, 19 trang bị, 8 nghiên cứu, 28 encounter/8 chương | Có pack + generator canonical, offline index.html; CI 3/3 job SUCCESS trên a88b844 | **UNKNOWN/PENDING:** Owner playtest Windows/Android, art sign-off, dữ liệu Wiki sâu chưa xác minh | **0 V2 mới**; 1 pipeline runtime/build hiện hữu | **a88b8449714ad48531f7c9e7e081ccac43edee92**; project runtime TESTED (CI), **chưa OWNER_ACCEPTED** |

Nguồn chỉ số: data/ngoalong/alpha_content.json; data/ngoalong/references/combat_troops_mobile_v1.json, combat_troops_wiki_supplement_v1.json, troop_mechanics_wiki_v1.json, effects_wiki_mobile_v1.json, troop_effect_bridge_wiki_v1.json; data/ngoalong/group02_wiki/manifest.json, heroes.json, equipment.json, systems_items.json, early_campaign_10.json, npc_details.json; data/ngoalong/modules/combat/effects_v1.json. Từng dòng giữ commit chứng cứ của **file chuyên môn**, không đánh tráo bằng commit docs.

## 4. Ma trận phụ thuộc và contract giao hàng

| Upstream → downstream | Khóa liên kết tối thiểu | Điều kiện đủ để nhóm 08 xét tích hợp |
| --- | --- | --- |
| 01 Tướng → 05 Skill → 08 | heroId → skillId → effectId/target | skill có trigger, target, proc/chance, morale cost, event/replay behavior; UNKNOWN không execute |
| 02 Binh chủng → 05 Chiến đấu → 08 | troopId, tier, evolvesFrom, traits, attack lane | identity duy nhất; quan hệ cha–con có provenance; luật project SIMULATED tách Wiki; counter thật |
| 03 Công trình/Kinh tế → 02/04/01 → 08 | buildingId, researchId, currencies, unlock/cost | nâng cấp/đào tạo/mua không tạo tài nguyên, định danh Save và receipt giữ nguyên |
| 04 Trang bị/Vật phẩm → 01/05/06 → 08 | itemId, slot, stat effects, drop/consume | có source, cap, inventory mutation, chi phí/drop, receipt idempotent |
| 05 Effect/Trận pháp → 06 NPC/Boss → 08 | skillId, effectId, formationId, priority, duration | 6 legacy + 7 additive tương thích; thứ tự event deterministic; Save/replay invariant |
| 06 Phó bản → 01/02/05/04 → 08 | mapId → orderedNpcIds → formationSlots, heroId/troopId/skillId, rewardId | mọi tham chiếu resolve, boss/ending có runtime event; thắng/thua thưởng đúng một lần |
| 07 Asset/VFX → 01/02/05/06 → 08 | artId → canonical entityId/actionEvent | art gốc, alpha/source manifest, đọc event-only, không đẻ damage/reward; hình playable không phải poster |
| 08 Runtime → 00 nghiệm thu | pack/build SHA, QA/run link, owner decisions | focused tests + Chromium/Save/replay/CI exact SHA ở release candidate; Owner duyệt riêng |

**Thứ tự ưu tiên giao nhận:** (A) 05 chốt schema/contract skill–effect và 02 identity IDs → (B) 01/03/04/06 đưa module có provenance → (C) 07 art game-ready song song → (D) **08 nhận batch đủ điều kiện**, tích hợp một lần theo đợt → (E) 00 cập nhật bảng và Owner nghiệm thu. Không cần chờ Wiki đạt 100% mới có thể hoàn tất V1.0 project-original.

## 5. Nhánh, commit và quy trình giao nhận

1. **00** có quyền sửa *duy nhất bảng điều phối này* trên nhánh PR #10. **08** là người duy nhất tích hợp runtime trên nhánh đó. Nhóm 01–07 không push trực tiếp vào branch tích hợp; khi bắt đầu thực sự mới tạo branch dự kiến ở bảng từ **HEAD mới nhất** của PR #10. Không tạo 7 nhánh rỗng chỉ để báo cáo.
2. Mỗi nhóm chỉ commit **owned paths**, ghi SHA, danh sách file, số nguồn tổng/đã trích xuất/UNKNOWN, schema/provenance, phụ thuộc, focused QA và 1 handoff ở cuối module. Không đụng generated HTML hay sửa nhiều file ngoài domain; không sửa tests để che lỗi.
3. Nhóm 08 kiểm tra HEAD, đọc diff/hash và ràng buộc; **chủ động port thay đổi được phép** vào runtime hoặc đề xuất hợp nhất sau review; không cherry-pick mù, không ghi thay source chuyên môn. Không tự merge PR #10, không đổi default branch, không reset/force-push.
4. Khi 08 đã tích hợp, ghi trong đúng bảng: commit **source** của module, commit **integration**, trạng thái QA và điều kiện Owner. Nhóm 01–07 không tự nâng REFERENCE_ONLY → PLAYABLE. Nếu thiếu source: UNKNOWN hoặc thiết kế nguyên bản SIMULATED minh bạch.
5. Thang trạng thái mỗi domain: **NOT_STARTED**, **COLLECTED**, **NORMALIZED**, **CODED**, **INTEGRATED**, **TESTED**, **OWNER_ACCEPTED**, **BLOCKED**. Có thể ghi song song *reference coverage* và *runtime coverage*; không gom hai mẫu đếm thành một phần trăm giả.
6. Mỗi lần cập nhật bảng phải đọc HEAD PR #10, phát hiện file ownership conflict và cập nhật **snapshot SHA/time**. Nếu có thay đổi ngoài owner path, đánh dấu BLOCKED và yêu cầu phân quyền trước.
7. Không đổi save key **muu_dinh_tam_quoc_v1**, schema **v5**, migration v1–v4, receipts idempotent, deterministic replay, CL legacy; Hero save v07, code/assets Hero tuyệt đối không sửa.

## 6. QA và tiêu chí điều phối

- Nhóm 01–07: JSON-only → schema/ID/provenance/references; combat changes → focused deterministic test. Chỉ một QA nhỏ sau **batch lớn**. **Không poster/GIF/video hay full Chromium/full CI mỗi file JSON.**
- Nhóm 08: full Chromium desktop 1280×720 + mobile 390 khi tích hợp xong batch release; Save import/export/migration/replay/reward; exact-SHA Actions full chỉ cho release candidate hoặc bản sửa release failure. CI success cũ **không chuyển** cho code commit mới.
- Gate cuối: có 25 identity project gameplay khác nhau, 14 tướng, 19 item, 8 research, 13 effects tương thích, 28 encounter/8 chương + ending; UI idle/offline index.html/Saves ổn, quy trình build tái tạo, exact-SHA CI. **Owner art approval và chơi máy thật** luôn riêng.
- Không mở thêm scope vô hạn, không biến 372 quân Wiki hay 249 map Wiki thành mục tiêu phải nhập đủ cho V1.0. Bộ nào thiếu dữ liệu source được phép dùng rule project SIMULATED rõ ràng trong phạm vi Issue #9, với giao nhận được 08 kiểm tra.

## 7. Những việc ưu tiên giao ngay

- **01:** lập bảng nối 14 project hero skill descriptors ↔ 05 effect contract; 50 wiki hero giữ REFERENCE_ONLY; không copy formula UNKNOWN.
- **02:** nhóm 25 combat identity vào 5 hệ, kiểm tra 18 evolution records, công bố mapping/điểm khác biệt nhận diện; không tự bật 372 reference.
- **03:** chứng minh công trình/kinh tế/nâng nghiên cứu có tác dụng thật và receipt đúng; 14 công nghệ CN không tự nhập.
- **04:** đánh giá 19 project items thực sự vào chỉ số và chi phí; 29+4 Wiki chỉ chuyển khi đủ bằng chứng.
- **05:** rà lại 6+7 trạng thái thật, buff/debuff, target/cộng dồn/giải trừ, 24 trận pháp; cung cấp resolver contract cho 01/02/06.
- **06:** phân biệt NPC chỉ mục/đội hình thật, 28 stage project và đội hình NPC mới từ Wiki; không nhận 207 NPC là full team.
- **07:** làm sprite/VFX **trong trận idle**, silhouette khác nhau, frame/event thật, không poster; chỉ mới mở asset sau contract từ 02/05.
- **08:** giữ runtime authority; đối chiếu 25/14/19/8/13/28 với game thật, tích hợp module nhận đủ contract, QA một lượt mỗi batch.
- **00:** duy nhất sửa bảng này sau nhận commit thật; không coi số báo cáo, PASS-count hoặc ảnh preview là tiến độ sản phẩm.

**Nguyên tắc chốt:** Chỉ tuyên bố OWNER_ACCEPTED khi chính Owner duyệt. PR #10 giữ Draft, Issue #9 giữ OPEN, game chưa tự phát hành.
