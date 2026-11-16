# Mưu Định Tam Quốc — Chiến Loạn-style SLG (development pivot)

> **Hướng phát triển cập nhật ngày 16/11/2026:** Game lấy **Chiến Loạn Tam Quốc (2025)** làm tham khảo gameplay chính: mỗi tướng điều khiển đội lính chiến đấu thật, bản đồ điều quân, công thành/chiếm cứ điểm, xây thành, nuôi quân và phát triển lãnh địa. Ngọa Long chỉ còn là tham khảo lịch sử. Đây là dự án nguyên bản, không liên quan chính thức CMN Online. **Mục tiêu mới CHƯA hoàn thành**; V0.6 P4.1 hiện hữu chỉ là baseline kỹ thuật. Kế hoạch thực thi: [docs/CHIEN_LOAN_MASTER_SPEC.md](docs/CHIEN_LOAN_MASTER_SPEC.md) và [Issue #4](https://github.com/vuanhtuan161094-byte/Heoofgaia/issues/4). Nhánh `main-ngoalong` chỉ giữ tên lịch sử, không được merge sang Hero.

## Baseline hiện có — lưu để tránh mất thành quả

**Phiên bản cũ:** Một game HTML chiến thuật Tam Quốc độc lập, từng lấy cảm hứng Ngọa Long cổ điển. Đây không phải mã nguồn chính thức của VNG hoặc CMN Online. Mọi hệ số AI, quân cấp, đội hình, thiệt hại là SIMULATED.

## Repository và bản chơi duy nhất

- Repo: `vuanhtuan161094-byte/Heoofgaia`; **nhánh chính riêng** `main-ngoalong`.
- **Chỉ dùng `index.html`** trên `main-ngoalong` làm game Ngọa Long. Không tạo HTML phát hành song song.
- Nhánh game Hero: `feature/hog1-research-to-playable-20261102`; không sửa, merge hay thay default branch.
- Chơi trên Chrome/Edge offline bằng `index.html`. Lưu localStorage riêng `muu_dinh_tam_quoc_v1`, `version=3`; nên xuất JSON trước khi nâng cấp. Không sử dụng Save v07 Hero.

## P3: các chức năng thực tế

- AI chọn mục tiêu ưu tiên tuyến trước, khắc chế binh chủng, tình trạng máu, vị trí theo làn và vai trò nguy hiểm. 4 phong cách ưu tiên, có khác biệt giữa phe địch và đội hình người chơi.
- Binh chủng nâng cấp từng tướng **bốn cấp**; nâng tại Doanh Trại bằng bạc/lương/sắt thật; không tự tăng quân số.
- Khắc chế Bộ > Kỵ > Cung > Bộ; Mưu gây áp lực lên Bộ; tướng trống, hỗ trợ có vai trò chiến thuật riêng.
- **24 mẫu chiến thuật** = 6 trận pháp × 4 phương án bố trí 3×3. Chọn mẫu là sắp quân thực và cập nhật chiến pháp/AI; chỉ dùng tướng đã sở hữu.
- Cân bằng kiểm toán **360 trận deterministic** (3 nhóm lực lượng × 5 mốc ải × 24 mẫu), làm mượt độ khó ở ải 13–20; ghi đầy đủ bằng chứng.
- Giữ P2: 24 kỹ năng riêng, sĩ khí, tướng trống, replay snapshot, ba tuyến sát thương và quyết toán một lần.

## P4.1: Animation sprite-first và VFX theo chiến báo
- **288 frame PNG**: 4 quân (Bộ/Kỵ/Cung/Mưu) × 4 hướng (Front/Right/Back/Left) × 3 hành động (Idle/Attack/Hit) × 6 frame, atlas `assets/p41/troops_p41.webp` và manifest `assets/p41/troops_manifest.json`.
- Frame được **tổng hợp bằng xử lý ảnh 2D từ các pose gốc P4**, có vẽ các nét hiệu ứng mới ở từng khung, không rig; chưa phải animation vẽ tay độc lập hay mỹ thuật được chủ game duyệt.
- Hiệu ứng chiến đấu theo event thật: charge → release → contact → fade, chỉ đọc chiến báo; replay không nhân đôi thưởng hay ảnh hưởng Save.
- Mã tái tạo: `tools/build_p41_atlas.py`; QA: `qa/p41_animation.py` (18 kiểm tra), `qa/p41_video.py` (52 khung Chromium 1280×720 → MP4 12 fps, lấy mẫu đồng hồ hình ảnh).
- GitHub Actions xuất PNG frame archive, video Chromium và một HTML offline đã kiểm thử ở artifact `ngoalong-p41-playable`. Chi tiết `docs/P41_ANIMATION_VFX.md`; còn PENDING owner art approval/thiết bị thật.
- **Không Codex, không rig, không thay gameplay/Save/P3 balance, không sửa nhánh Hero.**

## P4: mỹ thuật gốc tích hợp thực tế
- Background thành trì mới từ artwork AI nguyên bản; **7 nút công trình** hiện diện và thao tác thật.
- Chân dung 8 danh tướng Tam Quốc đã dùng sprite atlas gốc, tướng khác giữ icon mặc định để không nhận là hoàn tất 24/24.
- Sprite binh chủng Bộ/Kỵ/Cung/Mưu sĩ 4 góc nhìn × Idle/Attack; kết hợp trên canvas battle thật, phía người chơi và NPC.
- VFX aura/chiến pháp từ sheet gốc được nạp ở trạng thái chiến pháp/trống; chỉ biểu diễn theo event chiến đấu thực, không sửa sát thương, morale hay Save.
- **TẤT CẢ asset ảnh đã nén thành WebP và base64 nội bộ index.html** (chơi offline với duy nhất một tệp); ảnh PNG master và thông số provenance được lưu trong gói nguồn P4 riêng; 4 WebP pack được commit ở `assets/p4/` và kiểm tra đối chiếu exact-SHA. Ảnh PNG gốc chưa được commit riêng lên repo.
- P4 Chromium visual gate **14/14 local PASS**, ảnh city/heroes/formation/battle/skill/mobile 1280×720 & 390 px; chất lượng animation/VFX chuyên nghiệp vẫn cần duyệt chủ dự án.

## Kiểm thử trực tiếp tại máy phát triển

- P2 full **31/31**, P2 advanced **12/12**, P3 **74/74** và P3 balance **360/360 scenario executions**; báo cáo này là kết quả chạy local trước commit.
- GitHub CI chỉ được coi là PASS sau khi workflow `NgoaLong P4.1 complete QA` hoàn thành trên **exact SHA mới nhất**.
- CI: `python qa/smoke.py`, `python qa/p2_full.py`, `python qa/p2_advanced.py`, `python qa/p3.py`, `python qa/p3_balance.py`, `python qa/p4_assets.py`, `python qa/p4_art.py`.
- Screenshots Chromium 1280×720 và mobile 390px xuất qua Actions artifacts; chưa chứng nhận Windows/Android thiết bị thật.

**Bản chơi đã kiểm thử:** vào GitHub Actions trên nhánh `main-ngoalong`, chọn run **SUCCESS** mới nhất, tải artifact `ngoalong-p41-playable` (chứa `index.html` + SHA). Không dùng artifact từ run FAIL/PENDING.

## Tài liệu

- `AGENTS.md` — quy tắc làm việc với nhánh Ngọa Long.
- `docs/REV_PROTOCOL.md` — pipeline Research → Engineering → Verification.
- `docs/P3_DESIGN.md` — công thức và hành vi AI/cấp quân/đội hình.
- `docs/P3_BALANCE.md` — mẫu cân bằng, kết quả và giới hạn.
- `docs/CURRENT_CHECKPOINT.md` — trạng thái và SHA.

## Tiếp theo

**ĐÃ ĐỔI CHỈ ĐẠO:** Chuyên trách Codex được phép triển khai riêng trên nhánh `main-ngoalong`. Ưu tiên **CL-P0 audit → CL-P1 tướng+quân đánh thật → CL-P2 hành quân/công thành/chiếm đất**, rồi city economy, campaign và art. Xem [master spec](docs/CHIEN_LOAN_MASTER_SPEC.md). Không sửa Hero/merge.
