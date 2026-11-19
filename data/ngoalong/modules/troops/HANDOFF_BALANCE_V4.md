# MDT V4 — 137 cơ chế binh chủng có hệ số rõ ràng

Ngày 19/11/2026, owner cho phép tự thiết kế xác suất/công thức khi Wiki không ghi. Bộ dữ liệu `troop_balance_candidates_v4.json` triển khai 137 ứng viên: 78 theo theme Wiki (DERIVED) và 59 kỹ năng hoàn toàn PROJECT_ORIGINAL. 36 template có số chi tiết, nguồn Wiki chỉ ghi VERIFIED ở các trường có bằng chứng; mọi tỷ lệ tự tạo dùng SIMULATED.

Luật mẫu: bạo kích 18%, thêm 50% sát thương; phản kích 28%, gây 35% công; thiêu đốt 30% và mất 4% max HP/lượt trong 2 lượt, tối đa 2 tầng; giảm phòng 30%, -12% trong 2 lượt; khắc chế +22%; Kiên Thủ 8% phòng thủ mỗi tầng, tối đa 3 tầng trong 2 lượt. Băng Nỏ vẫn +50 sĩ khí theo Wiki. VNG có ví dụ Kiên Thủ 6%, 8%, 12% trong các bộ tướng khác nhau; lựa chọn 8% là quyết định balance, không phải công thức Wiki toàn cục.

Source vẫn UNKNOWN cho 59 hồ sơ không có kỹ năng công khai, dù dự án đã thiết kế cơ chế gốc. NPC/tier0 và naval không được tự biến thành quân tuyển: `projectScope` khóa. Chỉ Chat08 được nối vào generator và chiến trường chính. Dữ liệu này CODED/CANDIDATE, không tự nhận INTEGRATED, TESTED CI hay OWNER_ACCEPTED. Không sửa core source Wiki, Save, index.html, không Codex Cloud.

V4 hardening: repaired stun skip-on-own-action, made speed a real +12% initiative trait for original Mãnh Chiến, exposed read-only getDesignData().balanceV4, originalBalanceStatus, originalBalanceAudit. QA expanded to 10 cases.
