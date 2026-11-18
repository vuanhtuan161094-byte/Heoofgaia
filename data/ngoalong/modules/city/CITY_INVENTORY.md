# MƯU ĐỊNH TAM QUỐC — INVENTORY CÔNG TRÌNH & KINH TẾ V2

## Phạm vi và nguồn

Tổng: **31 công trình module mới** (gồm 4 V1 nâng cấp + 27 bổ sung), **7 công trình legacy đang có**.
Vùng bản đồ, quốc gia, thế giới, UI phó bản và mục nhiệm vụ ngày không được giả mạo thành công trình sản xuất. Quý Tử 26 công trình theo mùa và 14 Khoa Kỹ CN không thuộc hệ Thành Trì chính.
Tất cả giá, cấp tối đa, thời gian xây dựng, sản lượng, hệ số combat và tỉ lệ trao đổi **do Mưu Định Tam Quốc tự thiết kế (`SIMULATED`)**; tên và ý tưởng công trình lấy từ các nguồn tham khảo có ghi provenance ở catalog.
Không có khẳng định game đã tích hợp browser: chat 08 còn phải nối module với `index.html` thông qua generator chính. Các hiệu ứng liên quan tướng/quân/trang bị cần chat 01/02/04/05 tiêu thụ vào phép tính thực.

### Nguồn tham khảo
- VNG-2026-CITY: https://ngoalong.vnggames.com/tin-tuc/huong-dan/cam-nang-nguy-quoc-toi-uu-hoa-giai-doan-truoc-lv300.html — VNG_MOBILE_2026, VERIFIED_FOR_NAMED_FACILITIES_ONLY
- MOBILE-2017-ARCH: https://2game.vn/ngoa-long-mobile-kien-truc-post129919.html — MOBILE_2017, REFERENCE_SECONDARY
- MOBILE-2017-NAVAL: https://2game.vn/ngoa-long-mobile-dai-hai-chien-post129924.html — MOBILE_2017, REFERENCE_SECONDARY
- FANDOM-LEGACY-CITY: https://ngoalong-vng.fandom.com/wiki/Th%C3%A0nh_Ch%C3%ADnh — LEGACY_COMMUNITY_WIKI, REFERENCE_SECONDARY
- GROUP02-WIKI: https://github.com/vuanhtuan161094-byte/Heoofgaia/blob/feature/nl-codex-cloud-v1-finish/data/ngoalong/group02_wiki/systems_items.json — PROJECT_REFERENCE, REFERENCE_ONLY

## Công trình do module quản lý

| Công trình (ID) | Khu | Cấp tối đa | Điều kiện | Tác dụng trực tiếp | Nguồn tên |
|---|---|---:|---|---|---|
| Lò Luyện Thiết (`nl_city_ironworks`) | production | 5 | Mặc định | Tích trữ iron: 3 đơn vị/phút/cấp; thu hoạch thủ công | PROJECT_EXISTING |
| Cối Xay Lương (`nl_city_mill`) | production | 5 | Mặc định | Tích trữ grain: 15 đơn vị/phút/cấp; thu hoạch thủ công | PROJECT_EXISTING |
| Quân Nhu Doanh (`nl_city_depot`) | support | 5 | barracks cấp 1 | Hiệu ứng: reserveCapacityFlat | PROJECT_EXISTING |
| Xưởng — Công Tượng Phường (`nl_city_workshop`) | support | 5 | academy cấp 1 | Lệnh: Rèn sản phẩm (150s); Gia công dụng cụ (120s); Hiệu ứng: equipmentUpgradeDiscount | VNG-2026-CITY |
| Thành Chính (`nl_city_hall`) | government | 12 | Thành Chính 1 | Lệnh: Ban chiếu chỉ (120s); Hiệu ứng: cityTier | MOBILE-2017-ARCH |
| Dân Cư (`nl_city_residence`) | economy | 6 | Thành Chính 1 | Tích trữ silver: 5 đơn vị/phút/cấp; thu hoạch thủ công; Lệnh: Tuần tra dân cư (0s); Hiệu ứng: taxCollectionBonus | VNG-2026-CITY |
| Ngân Khố (`nl_city_treasury`) | economy | 6 | Thành Chính 1 | Lệnh: Kiểm kê ngân khố (30s); Hiệu ứng: silverStorageFlat | FANDOM-LEGACY-CITY |
| Tài Vụ (`nl_city_tax_office`) | economy | 6 | Thành Chính 1 | Lệnh: Thu thuế theo kỳ (0s); Hiệu ứng: taxCollectionBonus | VNG-2026-CITY |
| Kho Lương (`nl_city_granary`) | economy | 6 | Thành Chính 2 | Lệnh: Chuyển lương thành quân nhu (35s); Hiệu ứng: grainStorageFlat | FANDOM-LEGACY-CITY |
| Cửa Hiệu (`nl_city_shop`) | commerce | 6 | Thành Chính 2 | Lệnh: Mua linh kiện (0s); Bán linh kiện (0s); Hiệu ứng: equipmentOfferTier | MOBILE-2017-ARCH |
| Thao Trường (`nl_city_drillground`) | military | 6 | Thành Chính 2 | Lệnh: Luyện binh chuyên sâu (65s); Hiệu ứng: heroTrainingXpMultiplierBonus | MOBILE-2017-ARCH |
| Tiền Trang (`nl_city_bank`) | commerce | 6 | Thành Chính 2 | Lệnh: Đổi bạc thành tín phiếu (0s); Tất toán tín phiếu (0s); Hiệu ứng: tradeRevenueMultiplierBonus | VNG-2026-CITY |
| Thương Xã (`nl_city_trade_society`) | commerce | 6 | Thành Chính 3 | Lệnh: Nhận đơn sản xuất (120s); Giao hàng thương hội (180s); Hiệu ứng: tradeRevenueMultiplierBonus | MOBILE-2017-ARCH |
| Rừng Săn Bắn (`nl_city_hunting`) | quest | 6 | Thành Chính 3 | Lệnh: Đi săn có hậu cần (120s); Hiệu ứng: huntRewardBonus | MOBILE-2017-ARCH |
| Xưởng Đúc Tiền (`nl_city_mint`) | economy | 6 | Thành Chính 3 | Lệnh: Đúc tiền bằng quặng (170s); Hiệu ứng: silverProductionMultiplierBonus | FANDOM-LEGACY-CITY |
| Quân Sự Phủ (`nl_city_military_office`) | military | 6 | Thành Chính 3 | Lệnh: Ban quân lệnh (100s); Hiệu ứng: troopTierAccessFlat | FANDOM-LEGACY-CITY |
| Tướng Đài (`nl_city_general_altar`) | hero | 6 | Thành Chính 3 | Lệnh: Đặt lễ sắc phong (90s); Hiệu ứng: heroInheritanceFlat | FANDOM-LEGACY-CITY |
| Quốc Chính (`nl_city_state_office`) | government | 6 | Thành Chính 4 | Lệnh: Cấp phát cứu tế (180s); Hiệu ứng: cityTaxCapacityFlat | FANDOM-LEGACY-CITY |
| Dinh Phủ (`nl_city_manor`) | hero | 6 | Thành Chính 4 | Lệnh: Thiết yến hiền sĩ (240s); Hiệu ứng: heroTrainingXpMultiplierBonus | FANDOM-LEGACY-CITY |
| Tháp Thí Luyện (`nl_city_trial_tower`) | military | 6 | Thành Chính 4 | Lệnh: Luyện quân trước khi vượt tháp (240s); Hiệu ứng: trialTowerAccessFlat | MOBILE-2017-ARCH |
| Khắc Văn (`nl_city_engraving`) | equipment | 6 | Thành Chính 4 | Lệnh: Khắc văn dự trữ (150s); Hiệu ứng: equipmentUpgradeDiscount | MOBILE-2017-ARCH |
| Mã Trường (`nl_city_stable`) | hero | 6 | Thành Chính 4 | Lệnh: Luyện chiến mã (220s); Hiệu ứng: cavalryHpMultiplierBonus | VNG-2026-CITY |
| Võ Hồn (`nl_city_soul_hall`) | hero | 6 | Thành Chính 5 | Lệnh: Bồi dưỡng võ hồn (180s); Hiệu ứng: heroSkillPowerMultiplierBonus | GROUP02-WIKI |
| Kho (`nl_city_warehouse`) | equipment | 6 | Thành Chính 2 | Lệnh: Sắp xếp vật tư (90s); Hiệu ứng: inventorySlotFlat | MOBILE-2017-ARCH |
| Hải Cảng (`nl_city_naval_port`) | naval | 6 | Thành Chính 6 | Lệnh: Cấp phép xuất hải (120s); Hiệu ứng: navalTradeCapacityFlat | MOBILE-2017-NAVAL |
| Thao Trường Thủy Quân (`nl_city_naval_drill`) | naval | 6 | Thành Chính 6 | Lệnh: Huấn luyện thủy binh (170s); Hiệu ứng: navalTrainingXpMultiplierBonus | MOBILE-2017-NAVAL |
| Cảng Hàng Hóa (`nl_city_cargo_port`) | naval | 6 | Thành Chính 6 | Lệnh: Mậu dịch đường biển (1800s); Hiệu ứng: tradeRevenueMultiplierBonus | MOBILE-2017-NAVAL |
| Bến Thuyền (`nl_city_dock`) | naval | 6 | Thành Chính 6 | Lệnh: Đóng tàu hậu cần (360s); Hiệu ứng: navalShipCapacityFlat | MOBILE-2017-NAVAL |
| Thủy Sư Đường (`nl_city_navy_hall`) | naval | 6 | Thành Chính 7 | Lệnh: Bảo dưỡng chiến thuyền (180s); Hiệu ứng: navalDurabilityMultiplierBonus | MOBILE-2017-NAVAL |
| Kho Hải Quân (`nl_city_navy_warehouse`) | naval | 6 | Thành Chính 7 | Lệnh: Đóng gói quân nhu biển (120s); Hiệu ứng: navalStorageFlat | MOBILE-2017-NAVAL |
| Hải Đăng (`nl_city_lighthouse`) | naval | 6 | Thành Chính 7 | Lệnh: Phát tín hiệu hải đăng (180s); Hiệu ứng: navalTradeTimeReduction | MOBILE-2017-NAVAL |

## Công trình cũ — BẢO TOÀN runtime, KHÔNG TẠO THÊM bản sao

| Công trình hiện có | Khóa Save | Vai trò | Hành động module bổ sung |
|---|---|---|---|
| Chợ | `game.buildings.market` | Bạc | Mua lương ở Chợ; Bán lương ở Chợ |
| Nông Trại | `game.buildings.farm` | Lương | Dùng nguyên chức năng runtime hiện có |
| Mỏ | `game.buildings.mine` | Sắt (nếu runtime hỗ trợ) | Dùng nguyên chức năng runtime hiện có |
| Quân Sư Phủ | `game.buildings.academy` | Khoa kỹ và huấn luyện | Dùng nguyên chức năng runtime hiện có |
| Doanh Trại | `game.buildings.barracks` | Tiến hóa và quân dự bị | Dùng nguyên chức năng runtime hiện có |
| Tường Thành | `game.buildings.walls` | Phòng thủ | Dùng nguyên chức năng runtime hiện có |
| Lâm Trại | `game.buildings.lumberyard` | Gỗ (không phải tài nguyên NL chính) | Dùng nguyên chức năng runtime hiện có |

## Quy tắc kinh tế bắt buộc

1. `game.silver`, `game.grain`, `game.iron`, `game.prestige` là nguồn thực; `game.nlCity.warehouse` chứa token/linh kiện phụ, không tự đồng bộ sang kho chat 04 khi chưa có adapter.
2. `build` chỉ trừ một lần và có thời gian hoàn thành; tối đa một job xây. `operate` phải trả đầu vào, có cooldown, có thể chờ rồi `collect`; mọi thao tác thành công có `receiptIndex[actionId]` bất biến.
3. Sản xuất tự động không ghi thẳng vào bạc/lương/sắt: vào escrow có trần, `harvest` mới chuyển một lần; nguồn Market/Farm legacy không tính thêm trong module này.
4. Tăng cấp Thành Chính mở khóa theo cấp dự án 1–12; bảng này không phải mốc xây dựng chính thức theo Wiki.
5. Chợ legacy dùng đúng cấp hiện tại để mua/bán lương bằng bạc; Xưởng có lệnh rèn vật tư và linh kiện; không dùng vàng nạp, sự kiện online, giao dịch nhiều người chơi hay vật phẩm độc quyền chưa xác minh.
6. Tòa Tháp, Mã Trường, Võ Hồn, Thương Xã, Hải Cảng có hành động cục bộ và hooks; phó bản thật/chiến thuyền/vật phẩm/tướng thật chỉ được ghi INTEGRATED sau khi module chủ quản nối và test.

## Trạng thái

**CODE READY (31 new + 7 preserved)**, focused JS execution passes. **PENDING**: chat08 generator/runtime UI integration, combat/item hookup, Chromium, exact-SHA Actions, physical QA. Không merge.
