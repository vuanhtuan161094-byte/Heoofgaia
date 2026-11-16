# AGENTS.md — Ngoạ Long / Mưu Định Tam Quốc

ĐIỀU KHOẢN QUAN TRỌNG: Đây là NHÁNH game khác trong cùng repo vật lý Heoofgaia; chỉ áp dụng khi đang ở nhánh main-ngoalong. Không áp dụng bộ quy tắc Hero khi phát triển Ngoạ Long và tuyệt đối không sửa nhánh feature/hog1-research-to-playable-20261102.

- Canonical branch: main-ngoalong. Canonical game: index.html. No duplicate production HTML.
- Không gọi Codex trừ khi chủ game thay đổi chỉ đạo. Chủ game yêu cầu ChatGPT tự làm.
- Bắt buộc đọc README.md, docs/REV_PROTOCOL.md, docs/CURRENT_CHECKPOINT.md trước khi sửa.
- Mỗi thay đổi: verify remote HEAD; xác định phạm vi; 1 vertical slice; chạy focused + regression; browser screenshot thật; commit SHA; chờ owner duyệt mỹ thuật riêng.
- Một nguồn sự thật cho game state, combat rewards và Save; replay chỉ đọc snapshot, không quyết toán thưởng lần nữa.
- Save key muu_dinh_tam_quoc_v1, schema 3; phải có migration, backup/restore; không bao giờ sửa Save v07 của Hero.
- Không tuyên bố PASS CI/Windows/Android nếu thiếu bằng chứng runtime ở exact SHA.
- Nghệ thuật/source proprietary không được sao chép vào bản phát hành; source-verified, derived và simulated phải tách nhãn rõ ràng.
- Không merge nhánh này vào branch Hero; không force-push, reset/clean hoặc xóa lịch sử.
- Cuối mỗi báo cáo: DONE / TESTED / PENDING, link commit + QA/evidence, và 2–3 phương án phát triển tiếp theo có khuyến nghị.
