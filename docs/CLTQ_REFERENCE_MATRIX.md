# CHIẾN LOẠN TAM QUỐC — nguồn tham khảo cơ chế (2026-11-16)
Goal: Build an original game with the high-level experience requested by owner. Sources are **research references**, not licensed game assets or permission to extract material.

| Topic | Evidence | Reference | Design and test |
|---|---|---|---|
| Release context | OBSERVED: CMN site announced Vietnam release 20 August 2025 | https://chienloantamquoc.vn/tin-tuc/chinh-thuc-ra-mat-ngay-20-08-2025 | Don't assume this is the official sequel to Loạn Tam Quốc 2018 |
| Five hero tactical team | OBSERVED: five-vs-five hero lineups, infantry, cavalry, archer | https://chienloantamquoc.vn/tin-tuc/chinh-thuc-ra-mat-ngay-20-08-2025 | Original 5-slot battlefield with each general leading own troop detachment, migrate legacy 3×3 |
| Formation roles | OBSERVED: recommended tank/damage/support and skills/auto | https://chienloantamquoc.vn/tin-tuc/huong-dan-tan-thu-chien-loan-tam-quoc | 1 tank, 2 DPS, 1 support and flex tactics; executable battle controls |
| Hero-led troop formation visuals | OBSERVED: guide includes generals next to rows of unit sprites | https://chienloantamquoc.vn/tin-tuc/gioi-thieu-doi-hinh-dac-sac | Render original soldiers and actual per-squad casualties in combat, not wallpaper |
| World map and visual city | OBSERVED: editorial images show large map, settlements, city management | https://2game.vn/chien-loan-tam-quoc-mon-an-tinh-than-moi-cho-game-thu-chan-game-the-tuong-3q-chibi-post449110.html | Original isometric art and interactive nodes, actual map selection |
| City building and resources | OBSERVED: official advert lists land/settlements, gathering, trading and supplies | https://chienloantamquoc.vn/tin-tuc/chinh-thuc-ra-mat-ngay-20-08-2025 | Economy receipts/upgrade/recruit costs, test sinks/sources and offline caps |
| Stage/boss progression | OBSERVED: official newcomer guide recommends story stages, skill timing and boss counterplay | https://chienloantamquoc.vn/tin-tuc/huong-dan-tan-thu-chien-loan-tam-quoc | Three genuine starting battles including boss and failed battle/save |
| Guild/city war | OBSERVED: official rules detail timed city ownership by guild | https://chienloantamquoc.vn/dac-sac/hoat-dong-quan-doan | First ship honest NPC city capture and garrison; real guild/online only if real server later |
| Seven faction groupings | OBSERVED: official lists Ngụy/Thục/Ngô/Quần/Thần/Ma/Ẩn Sĩ | https://chienloantamquoc.vn/tin-tuc/chinh-thuc-ra-mat-ngay-20-08-2025 | Historical alliances + original fantasy attributes; no extraction of original art/names unique to publisher |
| Soldier-level active combat | SECONDARY OBSERVED for Loạn Tam Quốc **2018**, not proved identical in 2025 | https://kenhgamevn.com/game-online/trai-nghiem-webgame-loan-tam-quoc-game-chien-thuat-the-tuong-co-ban-hinh-anh-kha-on-voi-nen-game-web/ | Each visible soldier really attacks, receives damage and retreats; consistency with squad troop-count |
| Army selection then city click to march | USER-RECOLLECTION / DESIRED INTERACTION; the specific 2025 gesture is not independently proven | Owner request in project conversation (2026-11-16) | Select army → target → path/ETA/food → order → battle → capture → save: QA end-to-end |
| Exact damage formulas, recruitment odds, mobile performance | UNKNOWN | No verified primary formula from sources above | Define ORIGINAL/SIMULATED values; deterministic multi-seed balance and device testing |
| Relation between 2018 Loạn Tam Quốc and 2025 Chiến Loạn Tam Quốc | UNKNOWN official sequel status; both are reported as CMN Online publications in VN | https://2game.vn/webgame-loan-tam-quoc-cap-ben-viet-nam-cmn-online-phat-hanh-post202667.html ; https://chienloantamquoc.vn/tin-tuc/chinh-thuc-ra-mat-ngay-20-08-2025 | Never label 2025 title as confirmed direct sequel without new documented proof |

## Originality and implementation contract
- No importing or tracing screenshots, official sprites, animated skill sheets, sound, fonts, source code or copied text from reference products.
- Screenshots from official/editorial sources are for visual analysis only and must not appear as distributable game assets.
- All original project images and derivatives require master source, authoring/provenance documentation, and license record; no skeletal rigs.
- Separate what is verified in Chiến Loạn Tam Quốc 2025 from what is observed in Loạn Tam Quốc 2018 and owner-recalled control design.
- Detailed systems/acceptance priorities: `docs/CHIEN_LOAN_MASTER_SPEC.md`.
