# Mưu Định Tam Quốc — Ngoạ Long-inspired strategy game

Đây là mã nguồn game chiến thuật Tam Quốc độc lập, lấy cảm hứng từ cách chơi Ngọa Long. Không phải game gốc của VNG; không tái sử dụng source, logo, server hoặc tài sản độc quyền.

## Một nhánh chính riêng trong repo Hero

- Repo lưu trữ: vuanhtuan161094-byte/Heoofgaia
- Nhánh chính của game này: **main-ngoalong**
- Bản chơi chính thức duy nhất trên nhánh: **index.html** (V0.3 P2)
- KHÔNG merge main-ngoalong vào nhánh Heroes of Gaia; KHÔNG đổi default branch Hero hoặc sửa Save Hero.
- Nhánh Hero đang làm việc: feature/hog1-research-to-playable-20261102 (độc lập).

## Chơi

Mở index.html bằng Chrome / Edge; có thể sử dụng static web server nếu chính sách trình duyệt chặn file://. Thực hiện Xuất dữ liệu JSON để sao lưu trước khi đổi trình duyệt hoặc nâng cấp. Game dùng localStorage key **muu_dinh_tam_quoc_v1**, schema 3; không đụng save Hero.

## P2 thực hiện

24 chiến pháp riêng, 3×3 trận hình, kỹ năng sĩ khí, Cổ Hiệu Quân (tướng trống), khắc chế binh chủng, 3 loại công/phòng, status, combat replay theo snapshot và phần thưởng exactly-once. Giữ lại hệ thống thành, ải, tháp, trang bị, khoa kỹ từ V0.2.

## Kiểm thử

- Chạy QA cục bộ đã thực hiện ngày 16/11/2026: P2 31/31 và advanced 12/12 PASS trong Chromium/Playwright với localStorage shim.
- Bổ sung GitHub Actions riêng của nhánh main-ngoalong: chạy smoke Playwright và xuất screenshot 1280×720 trên từng push; phải kiểm tra kết quả tại SHA hiện hành trước khi đánh dấu CI PASS.
- Lệnh cục bộ: pip install playwright; python -m playwright install chromium; python qa/smoke.py.
- Chưa nghiệm thu Android/iOS thật, offline file:// trên máy người dùng, cân bằng dài hạn.

Hồ sơ xem ở AGENTS.md, docs/REV_PROTOCOL.md, docs/CURRENT_CHECKPOINT.md và docs/P2_HANDOFF.md.

## Hướng phát triển

P3: test ma trận binh chủng và AI mục tiêu; tách dữ liệu chiến pháp; balance nhiều đội hình. P4: đồ họa sprite/FX gốc với asset provenance và Chromium visual review. P5: nội dung chiến dịch, save migration và phát hành kiểm thử. Mọi dữ liệu thiếu từ game tham chiếu phải ghi rõ SIMULATED, không nhận là thông số gốc.
