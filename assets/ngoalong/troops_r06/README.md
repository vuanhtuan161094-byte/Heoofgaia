# R06 · Toàn bộ binh chủng runtime hiện có

> **REJECTED — KHÔNG TÍCH HỢP (Owner 18/11/2026):** Bộ R06 chỉ là các hình vector tạo bằng code, chất lượng không đạt yêu cầu nhân vật chibi 2D của game. Đặc biệt các cel không phải tranh nhân vật vẽ độc lập; việc xuất đủ 18 file/360 cel **không đồng nghĩa có asset game đạt chuẩn**. Các file giữ lại làm lịch sử kỹ thuật, **Chat 07 không được chọn làm sprite runtime**. Các ảnh tổng hợp minh họa từng tạo trong chat cũng không phải sprite sheet alpha có thể sử dụng.


Đã tạo **18 SVG atlas**: 7 nhóm đang có trong dữ liệu chiến đấu + 11 nhánh nâng cấp dự án. Mỗi atlas **640×840**, chứa **20 frame** (5 trạng thái đứng tại chỗ × 4 frame), tổng **360 cel**. VFX riêng `vfx_troops.svg` có 7 nhóm × 4 phase. Không có Walk/Run, không rig/xương, không lấy hình Ngọa Long.

Art là **original code-drawn vector**: ưu tiên nhận diện nhỏ và màu/vũ khí riêng, chưa phải tranh vẽ tay chất lượng cuối; mỗi frame là hình vector được serialize riêng với thay đổi hình học theo trạng thái, **không phải 360 dáng vẽ độc lập**. Những nhánh nâng cấp chỉ thay đổi tạo hình, không thay đổi combat.

Dùng `preview.html` để xem và chọn 18 mẫu. Đây là preview asset, chưa gắn vào trận đánh. Chat 07 có thể dùng `Image` SVG + `ctx.drawImage(img, frame*160, actionIndex*168,160,168, x,y, width,height)` trên authoritative battle events, không tác động Save/HP/AI.

**Kiểm tra tối thiểu**: manifest 7+11, 18 atlas, 20 cel mỗi atlas, VFX 28 cel; không chạy QA gameplay từng unit. Thuyền trên Wiki chưa thuộc 7 troop profiles runtime nên chưa tạo.
