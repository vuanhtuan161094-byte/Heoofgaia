# ART BIBLE V1 — DARK FANTASY SHARP-EYED CHIBI 2D
**Owner-selected direction 17/11/2026:** phong cách chính thức của Mưu Định Tam Quốc là **tranh vẽ tay 2D chibi hắc ám, mắt sắc phát sáng năng lượng**. Thay lựa chọn bán hiện thực/thủy mặc khám phá trước đó; toàn bộ ảnh tạo trong chat mới là concept, chưa phải atlas sản xuất.

## Style lock
- **Tướng tỷ lệ ~3–3,5 đầu**, chân/tay đủ dài cho chiến đấu, không hình búp bê. Mắt hẹp, mày xếch, ánh nhìn quyết đoán. Ánh sáng con ngươi có năng lượng xanh/đỏ/tím/vàng khi tụ lực, nhưng nhìn rõ mắt và nét mặt ngay cả khi không bật hiệu ứng.
- **Sắc độ:** nền tối, ánh sáng sạch, màu giáp không bết đen. Chất liệu vẽ tay có đường viền ngoài rõ, tô màu bán hiện thực nhẹ, cọ mềm, họa tiết áo giáp, tóc/cờ/áo choàng theo chuyển động. Không pixel art, không giả 3D, không rig/skeletal.
- **Triệu Vân:** lam băng + bạc/trắng, long thương, mắt sáng lam; **Lữ Bố:** đen than + đỏ thẫm + đồng kim, phương thiên họa kích, mắt sáng đỏ. Không dùng một khuôn mặt cho cả hai, chi tiết nhân vật và silhouette phải khác nhau.
- **Quân Bộ/Kỵ/Cung/Mưu:** chibi đồng bộ khoảng 2,7–3 đầu, đặc trưng vũ khí/giáp riêng, không quá nhiều chi tiết gây mất nét khi render 390px. Vũ khí phải khác tông giáp, nền trong alpha thật.
- **Bản đồ/thành:** tranh vẽ tay 2D Tam Quốc huyền ảo tối, núi/sông/tường thành nhiều lớp, bố cục 2.5D; các công trình/nodes vẫn là vùng tương tác thật và phân biệt chiếm/hỏng/xây dựng. Không dùng tranh phẳng giả node.
- **Chiến trường:** background tối vừa phải, nhiều lớp chiều sâu, tướng lớn hơn lính nhưng không che squad; thanh HP/morale có tương phản. Hạn chế UI vàng bóng nặng và kiểu bảng hiệu demo.
- **VFX:** alpha trong, tia sáng có màu thuần, tụ lực–phóng–bay–va chạm–tan, sprite VFX tách nguồn độc lập và bám mục tiêu di chuyển, không có biên vuông, không bloom che cả đội quân.

## Asset production procedure (mandatory)
1. Original concept từng tướng (front 3/4 portrait) + turnaround đúng Front/Right/Back/Left + palette/vũ khí/điểm neo.
2. PNG/PSD master alpha, tạo key poses và frames 2D **frame-by-frame**: Idle, Walk, Attack, Hit, Fall. Không lật gương giả hướng, không rig. Các số frame là mục tiêu sản xuất và có thể điều chỉnh để mượt mà nhưng không tăng vô nghĩa.
3. Làm GIF animation preview phù hợp thời lượng trước; sprite atlas lossless với ground pivot nhất quán, test clipping/bleed/hit contact; asset master, hash, prompt/provenance, rejected sources và license trong repo.
4. VFX sprite riêng, preview hướng/va chạm theo battle event thực; duy trì ánh sáng trong suốt, không khiến gameplay mất readability.
5. Gắn vào **game HTML thật** trước khi duyệt, lấy screenshot 1280×720 và 390px, quay Chromium gameplay liên tục, kiểm tra FPS và chi phí RAM. Visual art PASS chỉ khi chủ dự án duyệt, không được suy từ CI.

## Pilot cần chốt trước sản xuất 49 tướng
**2 tướng:** Triệu Vân/Lữ Bố đúng bốn hướng và 5 animation; **2 quân:** Bộ/Kỵ có squad đi và đánh; **1 bản đồ vùng + 1 thành click được + 1 chiến trường + 2 skill VFX**. Chỉ mở rộng sau chủ game duyệt game-play preview. H0 chữa WebP atlas CI hiện có trước khi tuyên bố release mới.

## Status
**Direction OWNER LOCKED**; **asset production under new style PENDING**, **owner visual acceptance PENDING**. Các poster chibi hắc ám đã thử trong chat chỉ làm chuẩn concept, không được nhận là sprite đã xuất đủ 4 hướng/đúng alpha.
