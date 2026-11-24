# Đắc Kỷ · Mưu Định Phong Thần

Game chiến thuật 2D tiếng Việt, đơn người chơi và offline-first. Build chạy không cần tải dependency; nội dung gameplay chưa xác minh được đánh dấu SIMULATED.

## Chạy

    cd DackyMobile
    npm run data:export
    npm run build
    npm run serve

Mở http://127.0.0.1:4173/. dist/offline.html là bản HTML độc lập. Save nằm trên thiết bị trong IndexedDB/localStorage; cài đặt có import/export JSON.

## Phạm vi hiện tại

Runtime gồm xây dựng/kinh tế, thần tiên, túi đồ, binh chủng, hành quân/combat NPC, khoa kỹ, nhiệm vụ, thị trường, chiến báo và thử thách PvE. Game chưa được xác minh tương đồng với Mobile/legacy. Chưa có APK/AAB; cần Android SDK và Capacitor theo docs/BUILD_GUIDE.md.

## Tài liệu

- Tiến độ: PROGRESS.md · Quyết định: DECISIONS.md · Blockers: BLOCKERS.md
- Thiết kế: GAME_DESIGN.md · Độ phủ dữ liệu: DATA_COVERAGE.json
- Wiki gameplay: docs/GAMEPLAY_WIKI.md · Hướng dẫn chơi: docs/PLAY_GUIDE.md · Build: docs/BUILD_GUIDE.md
