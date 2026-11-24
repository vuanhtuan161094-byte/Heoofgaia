# Blockers

| Mức độ | Blocker | Bằng chứng | Tiếp tục được |
| --- | --- | --- | --- |
| P0 | Trang tham chiếu Mobile công khai không tải được qua proxy | 2026-11-24 GET `https://dackytruvuong.com/` và `/phong-than-cac/` trả tunnel HTTP 403 | Runtime độc lập đã triển khai với nhãn SIMULATED; thử xác minh khi mạng cho phép |
| P0 | Không có snapshot dữ liệu A1 trong checkout | Nhánh mục tiêu chỉ có `CODEX_MASTER_TASK.md` lúc đầu; không có input-private/ | Giữ catalog mô phỏng, không đưa dữ liệu độc quyền lên repo |
| P0 | Chưa xác minh dữ liệu Mobile/legacy | 0 record nguồn xác minh trong `DATA_COVERAGE.json`; pin legacy chưa tải | Nhập và chuẩn hóa khi có nguồn được phép |
| P6 | Thiếu Android SDK/Gradle và native project | `ANDROID_HOME`/`ANDROID_SDK_ROOT` rỗng; `gradle` không có trong PATH | Web/PWA/offline HTML đã build; APK/AAB chờ môi trường Android |
| P6 | Công cụ Vite/PixiJS/Capacitor/TypeScript không có trong cache | `tsc`/`vite` không có trong PATH, npm cache trống | Dùng ES modules/DOM/CSS/SVG thuần và Node build script; lý do nằm trong `DECISIONS.md` |
| P7 | Chromium không mở được bản một file qua `file://` tại môi trường này | `offline-smoke.mjs`: `chrome-error://chromewebdata/`; bundle inline qua syntax check | Bản PWA chạy qua HTTP và được mở lại khi network bị disable |
| P7 | Chưa có APK/AAB QA | Chưa thể build APK/AAB do blocker Android SDK/Gradle | Không báo Android PASS trước khi cài/chạy trên thiết bị |
| P7 | Không truy vấn được trạng thái run GitHub Actions từ môi trường | gh run list tới api.github.com trả HTTP 403; commit push thành công và trigger workflow theo nhánh | Mở link Actions ở repository để xem kết quả; local build/tests đã chạy |

Không sử dụng token, dữ liệu người chơi, endpoint riêng, binary legacy hoặc máy chủ legacy.
