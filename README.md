# Mưu Định Tam Quốc — Ngọa Long Rebuild V1

Game chiến thuật Tam Quốc nguyên bản, tham khảo các tính năng công khai của Ngọa Long cổ điển. Game không phải sản phẩm của VNG và không dùng tài sản độc quyền của VNG, CMN hay bên thứ ba.

## Gameplay hiện tại và mục tiêu

Trọng tâm là xây thành, chiêu mộ/huấn luyện tướng, bố trận 3×3 tối đa năm tướng, phát triển binh chủng/trang bị/khoa kỹ, đánh phó bản theo lượt, mở ải tiếp bằng chiến thắng và xem chiến báo. Các hệ số tự thiết kế được phân loại SIMULATED trong [`docs/NL_REFERENCE_MATRIX.md`](docs/NL_REFERENCE_MATRIX.md).

Owner đã hủy ưu tiên Chiến Loạn-only và hybrid vào ngày 17/11/2026. CL-P1–P6 code, save và asset được giữ để tương thích; chúng là hệ thống phụ/lịch sử. Xem [`docs/NGOA_LONG_REBUILD_SPEC_V1.md`](docs/NGOA_LONG_REBUILD_SPEC_V1.md) và [GitHub Issue #4](https://github.com/vuanhtuan161094-byte/Heoofgaia/issues/4).

## Chạy game

R02 exact-SHA đã qua full regression ở SHA `01fe993084e4feda690b87d33863da1fe0995844`, Actions [44011034634](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44011034634); artifact `muu-dinh-tam-quoc-nl-r02-playable` có thể tải từ run. R03 đã có code và local Chromium 31/31; nhánh Bộ/Kỵ/Thương/Cung/Quan Văn, support, bốn encounter mới và stage 25 win đều chạy. Actions exact-SHA cùng artifact R03 đang chờ commit kế tiếp. Bản baseline [Actions run 44001013453](https://github.com/vuanhtuan161094-byte/Heoofgaia/actions/runs/44001013453) là CL-P6 trước khi owner đổi hướng, không đại diện gameplay hiện tại. Bản trong nhánh dev cần build trước:

```powershell
python tools/build_ngoa_long_mode.py
python tools/build_ngoa_long_r03.py
python tools/build_ngoa_long_mode.py --check
python tools/build_ngoa_long_r03.py --check
```

Chỉ có một HTML phát hành. Save dùng localStorage key `muu_dinh_tam_quoc_v1`, schema v5, và hỗ trợ migration v1–v4.

## Kiểm thử và cổng

- `qa/ngoa_long_mode.py` — Quân Cơ Phủ/điều hướng desktop-mobile.
- `qa/nl_r02.py` — hành trình chiến thuật và negative cases R02.
- `qa/nl_r03.py` — tiến hóa binh chủng, tác dụng combat, save và bốn ải cơ chế riêng.
- `qa/p2_full.py`, `qa/p2_advanced.py`, `qa/p3.py`, `qa/p3_balance.py` — chiến đấu, replay, preset, khắc chế và balance legacy.
- `.github/workflows/ngoalong-qa.yml` — hồi quy cùng exact-SHA artifact.

Theo dõi SHA và trạng thái cổng ở [`docs/CURRENT_CHECKPOINT.md`](docs/CURRENT_CHECKPOINT.md). REV process: [`docs/REV_PROTOCOL.md`](docs/REV_PROTOCOL.md). Art direction: [`docs/ART_DIRECTION_DARK_CHIBI_V1.md`](docs/ART_DIRECTION_DARK_CHIBI_V1.md); art review của owner và kiểm thử thiết bị thật là các cổng riêng.

Tài liệu Chiến Loạn/hybrid và checkpoint CL-P6 được lưu làm lịch sử, không phải đặc tả sản phẩm hiện tại.
