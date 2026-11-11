# HG73 — Trang bị cực phẩm và VFX tinh thể băng

**Phạm vi:** buff chỉ số trang bị hiện có, VFX kho, aura theo chủ tướng thật trong combat, tối ưu đồ và QA. Không đổi Save v07; không tạo vật phẩm, UID, tiền, mảnh, hoặc sửa nguồn rơi.

| Phẩm | Nguồn vật phẩm canonical | Hệ số chỉ số nền | Chỉ số chính tối thiểu |
|---|---|---:|---:|
| Thường | Vật phẩm thường | 1.00× | 0 |
| Tinh phẩm | Bộ Vệ Binh | 1.45× | 14 |
| Hiếm | Bộ Cổ vật HG47 | 1.85× | 30 |
| Sử thi | Bộ Tinh Vân HG18 | 2.15× | 46 |
| Huyền thoại | Bộ Long Hồn HG31 | 2.45× | 82 |
| Bạch kim | Tinh Không HG31 dưới +8 | 2.80× | 118 |
| Cầu vồng | Tinh Không HG31 cường hóa +8 tới +10 thật | 3.20× | 164 |
| Thần khí | HG47 Thần khí và di vật Tháp HG20 | 3.80× | 270 |

Chỉ số chính tùy ô trang bị (ATK/DEF/SPD/INT). Thêm mức tăng của cường hóa vào ngưỡng chỉ số chính; tốc độ (SPD) có hệ số ngưỡng riêng 0,13 để không phá lượt đánh. Tất cả công thức được tính từ vật phẩm thực và không sửa tướng gốc.

Dòng phụ: Hiếm/Sử thi có 2, Huyền thoại/Bạch kim có 3, Cầu vồng/Thần khí có 4. Thuộc tính gồm ATK/DEF/SPD/INT, sát thương tổng/cận chiến/tầm xa và giảm sát thương. Dòng HG47 gốc được giữ; chỉ bổ sung số lượng còn thiếu bằng hàm băm theo itemId + UID. Không đổi vật phẩm khi Save/Reload, không sinh nguồn thưởng giả.

Tổng tăng sát thương theo trang bị tối đa 32%; giảm sát thương tối đa 24%; tăng sát thương cận/tầm xa tối đa 30%. Hệ thống gợi ý 10 ô vẫn chấm theo stat và dòng phụ thực, không chuyển UID của tướng khác.

**Hình ảnh:** khung trong sắc nét như mặt tinh thể, lớp glow ngoài mềm bằng CSS blur; Bạch kim trắng-lam băng, Cầu vồng chuyển sắc chậm, Thần khí thêm lớp tinh thể trắng. Đội quân do tướng thật mặc đồ Huyền thoại+ chỉ huy có vòng aura bám ô trong combat; Bạch kim+ có mảnh sáng khi Attack/Hit thực. Không chạm sprite, vị trí chân, damage hay Save. Mobile giảm chi phí hiệu ứng; prefers-reduced-motion tắt animation trang trí.

**QA:** qa-hg73-gear.cjs kiểm thử 8 phẩm, 2–4 dòng phụ, buff thật, hero owner, cường hóa, Save v07. qa-hg73-visual-chrome.py chạy Chromium PC 1280×720 và mobile 844×390: lọc phẩm, viền băng sắc/mờ, combat Tower thật và ảnh bằng chứng. Chỉ công nhận PASS theo kết quả GitHub Actions exact SHA.
