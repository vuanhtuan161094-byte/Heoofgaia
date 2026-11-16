# Mưu Định Tam Quốc — V0.3 P2 (Offline playable)

**Bản chơi được**, mã nguồn độc lập, lấy cảm hứng từ mô hình chiến thuật của Ngọa Long Mobile; **không phải bản gốc của VNG**. Không sử dụng artwork, code, server, logo hay nhạc proprietary của game tham chiếu.

## Cách chơi nhanh

1. Mở `index.html` trên Chrome, Edge hoặc Firefox (Windows/Mac/Linux). Trên điện thoại dùng trình duyệt có thể mở tệp HTML cục bộ; nếu không hỗ trợ, dùng một static web host để phát hành `index.html`.
2. Trong **Bày Trận**, bạn có 3 võ tướng khởi đầu. Ô **bên phải** của trận hình là tuyến trước. Chọn tướng rồi bấm ô nếu muốn đổi chỗ.
3. Ở cuối màn Bày Trận, chọn **🥁 Trống** cho tướng hỗ trợ hoặc mưu sĩ nếu muốn chơi đội hình tập trung sĩ khí. Tướng trống không tấn công thường.
4. Vào **Chinh Phạt**, xuất chiến. Khi sĩ khí ≥100, võ tướng tung chiến pháp riêng. Có thể dùng x1 / x2 / x3 hoặc xem nhanh kết quả.
5. Kết thúc trận nhấn **▶ Xem replay**; có nút phát/dừng, xem từng bước, từ đầu và thanh tua. Từ màn **Chiến Báo** có thể xem lại 5 trận gần nhất.
6. Dùng **Nhật Ký → Xuất dữ liệu** để sao lưu JSON và **Nhập dữ liệu** để khôi phục. V0.3 đọc được save v1/v2.

### Chơi offline và lưu dữ liệu

Game dùng `localStorage` nếu trình duyệt cho phép. Bản lưu được giữ bằng key `muu_dinh_tam_quoc_v1`, schema dữ liệu là **3** để tương thích bản cũ. **Trước khi nâng cấp hoặc thay đổi trình duyệt, hãy xuất save JSON.**

Không cần đăng ký tài khoản, Internet hoặc phần mềm engine. Không có mạng nhiều người, lưu đám mây hay thanh toán.

## Khác biệt lớn nhất của P2

- 24 tướng có profile chiến pháp riêng, gồm đòn đơn/hàng/đường thẳng/toàn thể/2 đòn/hậu tuyến và hồi phục.
- 3 hệ độc lập: Vật Công / Vật Phòng, Chiến Công / Chiến Phòng, Mưu Công / Mưu Phòng.
- Trận hình 3×3 ảnh hưởng trực tiếp lựa chọn mục tiêu; bộ binh thắng kỵ, kỵ thắng cung, cung thắng bộ (quy tắc mô phỏng P2).
- Tướng trống (Cổ Hiệu Quân) tăng sĩ khí đồng minh theo lượt; đánh đổi khả năng sát thương/hồi máu. Khởi đầu sĩ khí, tích lũy khi tấn công và bị tấn công; ngưỡng kích hoạt 100.
- Hiệu ứng bảo vệ, phá phòng, loạn trận, thiêu đốt; thiêu đốt có bước ghi log và khung replay riêng.
- Replay lưu **snapshot thật tại từng hành động**, không chạy lại mô phỏng, không trả thưởng / XP lần hai. Tối đa 5 chiến báo lưu lại.
- Quy trình thưởng, chiêu binh, nâng cấp, trang bị, 24 ải, tháp 20 tầng, lôi đài NPC, 3 quốc gia và khoa kỹ của bản V0.2 được giữ lại.

## Trạng thái kiểm thử

- 31/31 bài kiểm thử giao diện, save, replay và mobile PASS.
- 12/12 bài kiểm thử chuyên sâu cho chọn mục tiêu, khắc chế, 3 hướng sát thương, kỹ năng Chu Du, DOT và tua replay PASS.
- Tổng cộng **43/43 PASS** trong môi trường Chromium `set_content` với localStorage giả lập.
- Tác vụ mở file `file://` trên Chromium trong môi trường kiểm thử **bị chặn bởi chính sách quản trị** (`ERR_BLOCKED_BY_ADMINISTRATOR`). Vì vậy không tuyên bố đã nghiệm thu cách mở bằng nhấp đúp trên máy thật.
- Chưa có thử nghiệm thiết bị iPhone/Android thật, benchmark game dài hạn hoặc balance hết 24 ải / 20 tầng.

Chi tiết tại `docs/P2_COMBAT_SPEC.md`, `docs/QA_REPORT_P2.md`, ảnh screenshot tại `screenshots/`.

## Ghi chú cho người phát triển

- Logic ứng dụng và chiến đấu được nhúng trong HTML để dùng offline.
- Phần lõi tách riêng để tham khảo tại `engineering/p2_combat.js`.
- Baseline lưu tại `baseline/V0.2.html`; không ảnh hưởng file game `index.html`.
- Test Playwright có trong `engineering/tests/` nhưng test hiện chỉ chạy tự động trong môi trường xây dựng, có đường dẫn công cụ `/mnt/data` cần cập nhật khi chạy tại nơi khác.

**Trạng thái:** P2 offline prototype. Không phải bản thương mại hoàn chỉnh. Artwork vẫn ở mức nền tảng, chưa phải sprite chiến đấu riêng từng quân. Chưa có GitHub CI/repo dành riêng cho dự án này.
