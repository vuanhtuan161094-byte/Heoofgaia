# Mưu Định Tam Quốc — V0.5 P4

**Một game HTML chiến thuật Tam Quốc độc lập**, lấy cảm hứng từ Ngọa Long cổ điển. Đây không phải mã nguồn chính thức của VNG. Mọi hệ số AI, quân cấp, đội hình, thiệt hại là SIMULATED.

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

## P4: mỹ thuật gốc tích hợp thực tế
- Background thành trì mới từ artwork AI nguyên bản; **7 nút công trình** hiện diện và thao tác thật.
- Chân dung 8 danh tướng Tam Quốc đã dùng sprite atlas gốc, tướng khác giữ icon mặc định để không nhận là hoàn tất 24/24.
- Sprite binh chủng Bộ/Kỵ/Cung/Mưu sĩ 4 góc nhìn × Idle/Attack; kết hợp trên canvas battle thật, phía người chơi và NPC.
- VFX aura/chiến pháp từ sheet gốc được nạp ở trạng thái chiến pháp/trống; chỉ biểu diễn theo event chiến đấu thực, không sửa sát thương, morale hay Save.
- **TẤT CẢ asset ảnh đã nén thành WebP và base64 nội bộ index.html** (chơi offline với duy nhất một tệp); ảnh PNG master và thông số provenance được lưu trong gói nguồn P4 riêng; 4 WebP pack được commit ở `assets/p4/` và kiểm tra đối chiếu exact-SHA. Ảnh PNG gốc chưa được commit riêng lên repo.
- P4 Chromium visual gate **14/14 local PASS**, ảnh city/heroes/formation/battle/skill/mobile 1280×720 & 390 px; chất lượng animation/VFX chuyên nghiệp vẫn cần duyệt chủ dự án.

## Kiểm thử trực tiếp tại máy phát triển

- P2 full **31/31**, P2 advanced **12/12**, P3 **74/74** và P3 balance **360/360 scenario executions**; báo cáo này là kết quả chạy local trước commit.
- GitHub CI chỉ được coi là PASS sau khi workflow `NgoaLong P4 complete QA` hoàn thành trên **exact SHA mới nhất**.
- CI: `python qa/smoke.py`, `python qa/p2_full.py`, `python qa/p2_advanced.py`, `python qa/p3.py`, `python qa/p3_balance.py`, `python qa/p4_assets.py`, `python qa/p4_art.py`.
- Screenshots Chromium 1280×720 và mobile 390px xuất qua Actions artifacts; chưa chứng nhận Windows/Android thiết bị thật.

**Bản chơi đã kiểm thử:** vào GitHub Actions trên nhánh `main-ngoalong`, chọn run **SUCCESS** mới nhất, tải artifact `ngoalong-p4-playable` (chứa `index.html` + SHA). Không dùng artifact từ run FAIL/PENDING.

## Tài liệu

- `AGENTS.md` — quy tắc làm việc với nhánh Ngọa Long.
- `docs/REV_PROTOCOL.md` — pipeline Research → Engineering → Verification.
- `docs/P3_DESIGN.md` — công thức và hành vi AI/cấp quân/đội hình.
- `docs/P3_BALANCE.md` — mẫu cân bằng, kết quả và giới hạn.
- `docs/CURRENT_CHECKPOINT.md` — trạng thái và SHA.

## Tiếp theo

P4.1: review animation/atlas nhiều frame, VFX impact/contact, tối ưu mô phỏng nhiều quân; P5: chiến dịch/tướng/quân mở rộng; hardening save, thử nghiệm trên thiết bị thật. Không sử dụng Codex trừ khi người dùng đổi chỉ đạo.
