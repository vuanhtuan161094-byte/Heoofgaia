# Quyết định kỹ thuật

## 2026-11-24 · Codebase offline không phụ thuộc CDN

- Mặc định trong yêu cầu là TypeScript + Vite + PixiJS + IndexedDB + Capacitor. Môi trường có Node 24 và Chromium nhưng không có tsc, Vite, PixiJS, Capacitor, Android SDK, Gradle hoặc package cache tương ứng; các truy cập HTTPS ra tài liệu công khai bị proxy trả 403.
- Để có thể build và chạy không tải thư viện ngoài, bản đầu dùng ES modules JavaScript thuần, DOM/CSS/SVG do dự án tự tạo, IndexedDB/localStorage và script Node tích hợp static/PWA/offline HTML. Đây là thay đổi kiến trúc có lý do môi trường; không tuyên bố đã đáp ứng PixiJS/Capacitor hoặc Android APK. Chuyển đổi sang TypeScript/PixiJS/Capacitor vẫn mở sau khi dependency/build chain khả dụng.
- Source không tải tài sản ngoài, không dùng client/server/binary legacy, không ghi dữ liệu raw độc quyền vào repo và không có payment.

## Gameplay và dữ liệu

- Tất cả danh mục được tạo độc lập trong src/catalog.js; record gameplay mang nhãn SIMULATED. Số lượng legacy trong master prompt chỉ là reference count, không được coi là data đã export hoặc tương đương Mobile.
- Kinh tế theo giờ, cap kho và offline 8h; hàng đợi lưu thời điểm hoàn thành UTC epoch ms, settlement chỉ diễn ra một lần khi đọc save/advance.
- Khi tắt autosave, game giữ thay đổi trong bộ nhớ tới khi người chơi bấm Lưu ngay; trước khi rời trang không ghi ngầm.
- Combat NPC chạy local, deterministic theo seed, tách quân chết và bị thương, ghi chiến lợi phẩm vào báo cáo. Đây không phải multiplayer hay xác nhận công thức game gốc.
- Hành quân lưu detach theo từng stack binh chủng; vai trò phối hợp dùng để tính tương khắc và hoàn trả thương vong riêng từng stack.
- Dữ liệu runtime/save dùng version 1. IndexedDB là kho chính, localStorage là dự phòng; import được parse/version-check và migration trước khi ghi.
- Art thành, huy hiệu và chân dung là SVG gốc trong assets/; không sao chép sprite, logo hoặc database nguồn.
