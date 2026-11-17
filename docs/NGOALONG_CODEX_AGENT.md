# Codex Project Contract — Ngọa Long Rebuild V1

**Trạng thái: ACTIVE.** Ngày 17/11/2026 owner chốt gameplay Ngọa Long cổ điển. Các dòng hybrid/Chiến Loạn trong bản tài liệu lịch sử cũ đã được bỏ khỏi chỉ thị này. Product source of truth là [`NGOA_LONG_REBUILD_SPEC_V1.md`](NGOA_LONG_REBUILD_SPEC_V1.md), cùng GitHub [Issue #4](https://github.com/vuanhtuan161094-byte/Heoofgaia/issues/4).

## Làm việc an toàn

- Repo: `vuanhtuan161094-byte/Heoofgaia`; nhánh đích: `main-ngoalong`.
- Đầu mỗi phiên fetch/đọc HEAD `main-ngoalong`, `AGENTS.md`, REV, checkpoint và mã/test liên quan. Ghi SHA thực tế, không dựa trên checkpoint cũ.
- Task branch chỉ được tạo từ HEAD mới nhất của `main-ngoalong`; nếu mở PR, base là `main-ngoalong`. Không tự merge, không reset, không force-push, không đổi default branch.
- Không đọc/ghi hoặc sửa Hero, Tông Môn Bá Đạo, CMP, save Hero hay repo khác.
- Giữ nguồn phát hành duy nhất là offline `index.html`; build dashboard bằng `tools/build_ngoa_long_mode.py`. Build phải xác định, kiểm tra được và không thay combat/save authority.
- Giữ save key `muu_dinh_tam_quoc_v1`, schema v5, migration v1–v4, JSON import/export, receipt/replay, các field `p3PresetId`, `p3TroopTier` và dữ liệu CL. Không thực hiện migration phá hủy.

## Nghiên cứu và phân loại chứng cứ

Maintainer [`NL_REFERENCE_MATRIX.md`](NL_REFERENCE_MATRIX.md) trước khi thêm luật gameplay. Nguồn tham khảo chính là listing Ngọa Long VNG và wiki chính thức của VNGGames; dùng để xác nhận phạm vi tính năng được công bố, không lấy hình/code/UI/audio.

Phân loại từng claim: **VERIFIED** (được trang chính thức công bố), **DERIVED** (quyết định chuyển thể của dự án), **SIMULATED** (công thức/số liệu tự thiết kế), **UNKNOWN** (nguồn không xác nhận). Không suy diễn các hệ số chiến đấu chính xác từ listing. Không sao chép tài sản hoặc công thức proprietary.

## Phạm vi theo cổng

1. **NL-R02:** Hoàn thiện chiến đấu 3×3 tối đa năm tướng, 24 preset có tác động, tuyến trước/giữa/sau, vật công/chiến pháp/mưu công, morale, skill, hiệu ứng, hỗ trợ, khắc chế, target/skill AI deterministic; liên kết thành → tướng/quân → trang bị/khoa kỹ → phó bản → settlement → nâng cấp → ải kế → save/replay.
2. **NL-R03:** Chỉ mở sau khi R02 đạt cổng kỹ thuật. Phát triển nhánh tiến hóa binh chủng, chiến pháp/tướng, trang bị, chương/ải/boss và lựa chọn chiến thuật; số liệu mới là SIMULATED.
3. **NL-R04:** Chỉ mở sau R03. Làm pilot art 2D Dark Fantasy Sharp-Eyed Chibi nguyên bản, frame-by-frame, không rig; thử tích hợp thật desktop/mobile. Owner duyệt art riêng; CI không thay nghiệm thu.

Combat state duy nhất quyết toán HP, morale, tổn thất, EXP, thưởng, vật phẩm và receipt. Win mới mở ải sau; loss không cấp chiến lợi phẩm thắng; replay chỉ đọc event/snapshot; double-click hoặc reload không được nhân cost/reward.

## REV — điều kiện báo cáo

Theo [`REV_PROTOCOL.md`](REV_PROTOCOL.md): R → E → V. Mỗi mốc cần code hoạt động, QA rõ, desktop Chromium 1280×720 và mobile 390px, hồi quy, exact-SHA GitHub Actions và artifact chơi được sau PASS. Lưu screenshot/video do runtime thật tạo và SHA gắn với bằng chứng. Người chơi thiết bị thật và visual acceptance ghi PENDING cho tới khi được thực hiện.

Báo cáo dùng trạng thái DONE / TESTED / PENDING / BLOCKED; ghi SHA, Action URL, bằng chứng, rủi ro còn lại và các bước kế tiếp. Không báo DONE từ tài liệu hoặc CI baseline cũ.
