# Hướng dẫn build

## Yêu cầu

- Node.js 20+ (không có dependency npm trong bản offline source hiện tại).
- Android Studio/Android SDK và JDK 17 khi build ứng dụng native Android.

## Web/PWA

    cd DackyMobile
    npm run data:export
    npm run build
    npm run serve

Mở http://127.0.0.1:4173/. Bản build gồm JSON chuẩn hóa tại `dist/data/dacky-game-data.simulated.v1.json`; runtime gameplay dùng cùng catalog nguồn trong `src/catalog.js`. Dữ liệu này được đánh dấu SIMULATED. PWA cần HTTPS hoặc localhost để đăng ký service worker. File dist/offline.html là bản HTML độc lập có CSS, JS và SVG nội tuyến để thử offline bằng trình duyệt hỗ trợ file://.

## Android (chưa build trong checkpoint hiện tại)

1. Cài Android Studio, Android SDK Platform 35+, platform-tools và JDK 17.
2. Cài Capacitor CLI/Core/Android phiên bản tương thích trong thư mục này, sau đó chạy npm run build.
3. Chạy npx cap add android, npx cap sync android, rồi build qua Android Studio/Gradle.
4. APK debug thường nằm tại android/app/build/outputs/apk/debug/app-debug.apk; AAB release cần ký bằng khóa chủ sở hữu.
5. Không commit local.properties, khóa ký hoặc secrets.

capacitor.config.json đã lưu cấu hình ứng dụng dự kiến; Capacitor và Android SDK chưa hiện diện trong môi trường kiểm tra, vì vậy chưa có APK/AAB và không được xem các lệnh trên là build đã PASS.
