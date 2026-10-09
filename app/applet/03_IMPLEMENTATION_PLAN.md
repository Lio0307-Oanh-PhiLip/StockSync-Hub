# Kế hoạch triển khai theo giai đoạn

## Giai đoạn 1 — Audit, không phá hủy dữ liệu
**Mục tiêu:** hiểu kiến trúc thật trước khi sửa.

Công việc:
- Lập sơ đồ PC, PC Hub, backend, database, APK và đường đi sự kiện.
- Xác định cách lưu dữ liệu, danh tính kỳ kiểm kê và giao thức hiện tại.
- Kiểm tra import/export, quét, đối chiếu, thống kê và quyền truy cập.
- Tìm lỗi mất dữ liệu, trùng sự kiện, stale state, lỗi reconnect và các điểm gây chậm.
- Lập danh sách lỗi P0/P1/P2/P3, file/hàm liên quan và kế hoạch sửa.

Đầu ra: báo cáo audit, danh sách rủi ro, kế hoạch triển khai. Chưa thay đổi phá hủy.

## Giai đoạn 2 — Đồng bộ hai chiều
**Mục tiêu:** PC quét → APK nhận; APK quét → PC nhận.

Công việc:
- Sửa luồng sự kiện trên kiến trúc hiện có.
- Thêm hoặc hoàn thiện event ID, idempotency, revision, ACK và lưu bền vững nếu cần.
- Xử lý retry, reconnect, catch-up/reconciliation và trạng thái đồng bộ.
- Xử lý xung đột theo nghiệp vụ; không áp dụng last-write-wins mù quáng.
- Viết test hai chiều và test mất kết nối.

Điều kiện chuyển giai đoạn: các test cốt lõi đạt hoặc có blocker bên ngoài được ghi rõ; không còn lỗi nghiêm trọng mất/sai dữ liệu chưa xử lý.

## Giai đoạn 3 — Kỳ kiểm kê động
**Mục tiêu:** danh sách thay đổi theo tháng/đợt, không hardcode.

Công việc:
- Xác minh hoặc bổ sung định danh kỳ kiểm kê.
- Đảm bảo mọi truy vấn, event, thống kê và export gắn đúng kỳ.
- Hoàn thiện import có kiểm tra, preview, xác nhận và rollback.
- Bảo toàn kỳ cũ và chuyển kỳ an toàn.
- Test đổi tháng, cùng mã ở nhiều kỳ, thiết bị offline và import lỗi.

Điều kiện chuyển giai đoạn: không trộn dữ liệu giữa các kỳ; APK nhận danh sách mới mà không cần build lại.

## Giai đoạn 4 — Nghiệp vụ và dữ liệu
**Mục tiêu:** đúng quy tắc quét, đối chiếu, thống kê, export.

Công việc:
- Xác minh quy tắc mã QR/barcode, RO, LK, model, loại linh kiện và trạng thái.
- Sửa chống quét trùng, mã lạ, xóa lịch sử và xóa bản ghi nguồn.
- Đối soát tổng số với danh sách chi tiết.
- Kiểm tra xuất Excel và dữ liệu Unicode.

Điều kiện chuyển giai đoạn: test nghiệp vụ cốt lõi đạt, không có sai lệch thống kê chưa giải quyết.

## Giai đoạn 5 — Tối ưu và tinh gọn
**Mục tiêu:** nhanh, mượt, ổn định mà không hy sinh dữ liệu.

Công việc:
- Đo baseline và xác định nút thắt.
- Tối ưu truy vấn, render danh sách, tìm kiếm, event update, import/export và camera.
- Loại bỏ module dư thừa chỉ sau khi kiểm tra phụ thuộc và chạy regression test.
- Đo lại trong cùng môi trường.

Điều kiện chuyển giai đoạn: kết quả đo có ghi nhận; test dữ liệu và đồng bộ vẫn đạt.

## Giai đoạn 6 — Build và nghiệm thu
**Mục tiêu:** chuẩn bị bản phát hành có thể triển khai.

Công việc:
- Chạy bộ test trong `02_ACCEPTANCE_TESTS.md`.
- Chạy lint/type check/build và regression test.
- Build PC/APK nếu môi trường hỗ trợ.
- Kiểm thử cài đặt và kết nối trên Android thật hoặc emulator.
- Hoàn thiện hướng dẫn vận hành, backup, rollback và báo cáo tồn đọng.

Đầu ra: source code, migration/config mẫu, APK nếu build được, hướng dẫn và báo cáo test.

## Quy tắc điều phối
- Mỗi lần chỉ tập trung vào một giai đoạn.
- Không bắt đầu tối ưu diện rộng khi đồng bộ/dữ liệu còn lỗi nghiêm trọng.
- Nếu cần thay đổi schema/giao thức, giải thích lý do và kế hoạch tương thích trước khi áp dụng.
- Nếu bị chặn, nêu rõ điều kiện cần để tiếp tục; không bịa kết quả.
