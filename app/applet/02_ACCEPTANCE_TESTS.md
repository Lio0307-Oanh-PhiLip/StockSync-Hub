# Bộ kiểm thử nghiệm thu

## Hướng dẫn
- Ghi môi trường, phiên bản, commit, dữ liệu kiểm thử và thời điểm chạy.
- Dùng dữ liệu test riêng; không chạy thử phá hủy trên dữ liệu production.
- Ghi kết quả thật: `PASS`, `FAIL`, `BLOCKED`, `NOT RUN`.
- Đính kèm log, ảnh, test report hoặc ID sự kiện khi phù hợp.
- Các bài test cần có cả kiểm thử tự động và kiểm thử tích hợp/thiết bị khi môi trường cho phép.

## A. Đồng bộ realtime PC ↔ APK

| ID | Bài kiểm tra | Kết quả mong đợi | Trạng thái |
|---|---|---|---|
| SYNC-01 | Quét mã hợp lệ trên PC | APK nhận đúng kỳ, bản ghi và trạng thái; không cần refresh | NOT RUN |
| SYNC-02 | Quét mã hợp lệ trên APK | PC tự cập nhật đúng bản ghi | NOT RUN |
| SYNC-03 | Quét nhiều mã liên tục từ cả hai thiết bị | Không mất sự kiện đã xác nhận; không lặp nghiệp vụ | NOT RUN |
| SYNC-04 | Sửa trạng thái hợp lệ trên PC | APK nhận bản cập nhật mới | NOT RUN |
| SYNC-05 | Sửa trạng thái hợp lệ trên APK (nếu được phép) | PC nhận bản cập nhật mới | NOT RUN |
| SYNC-06 | Xóa theo quyền được phép | Thiết bị liên quan phản ánh cùng kết quả; lịch sử tuân thủ nghiệp vụ | NOT RUN |
| SYNC-07 | Ngắt rồi nối lại PC Hub | Phục hồi kết nối và đồng bộ bù đúng | NOT RUN |
| SYNC-08 | Gửi lại event sau timeout | Không ghi trùng nghiệp vụ nhờ idempotency | NOT RUN |
| SYNC-09 | Mất mạng khi đang quét | Trạng thái chờ/lỗi rõ ràng; không báo hoàn tất giả | NOT RUN |
| SYNC-10 | Hai thiết bị cùng sửa một bản ghi | Xung đột được phát hiện và xử lý theo quy tắc đã định | NOT RUN |
| SYNC-11 | Thiết bị ngoài kỳ đang chọn gửi event | Không ghi nhầm sang kỳ khác | NOT RUN |
| SYNC-12 | Khởi động lại PC Hub | Phục hồi theo thiết kế, không mất dữ liệu đã lưu bền vững | NOT RUN |

## B. Danh sách động theo tháng/đợt

| ID | Bài kiểm tra | Kết quả mong đợi | Trạng thái |
|---|---|---|---|
| INV-01 | Import danh sách kỳ A | Dữ liệu hợp lệ được nạp vào kỳ A | NOT RUN |
| INV-02 | PC và APK làm việc kỳ A | Cả hai cùng tham chiếu kỳ A | NOT RUN |
| INV-03 | Tạo/import kỳ B với dữ liệu khác | Kỳ B hoạt động sau khi hợp lệ và được xác nhận | NOT RUN |
| INV-04 | Chuyển sang kỳ B | PC và APK dùng đúng kỳ B | NOT RUN |
| INV-05 | Kiểm tra kỳ A sau khi chuyển | Lịch sử kỳ A được bảo toàn theo quy tắc | NOT RUN |
| INV-06 | Kiểm tra dữ liệu kỳ B | Không có bản ghi/trạng thái/thống kê kỳ A bị trộn | NOT RUN |
| INV-07 | Import kỳ mới khi APK ngoại tuyến | Khi nối lại, APK đồng bộ đúng kỳ và revision | NOT RUN |
| INV-08 | Import file lỗi giữa chừng | Kỳ đang hoạt động vẫn toàn vẹn; không ở trạng thái nửa cũ nửa mới | NOT RUN |
| INV-09 | Cùng mã LK ở hai RO/kỳ khác nhau | Không cập nhật nhầm bản ghi | NOT RUN |
| INV-10 | Không có danh sách nguồn | Hiển thị trạng thái trống rõ ràng; không tạo dữ liệu mẫu | NOT RUN |
| INV-11 | Đổi danh sách mà không build APK | APK nhận danh sách mới theo giao thức hiện có | NOT RUN |

## C. Độ chính xác nghiệp vụ

| ID | Bài kiểm tra | Kết quả mong đợi | Trạng thái |
|---|---|---|---|
| DATA-01 | Mã hợp lệ | Đối chiếu đúng bản ghi | NOT RUN |
| DATA-02 | Mã không tồn tại | Xử lý theo nghiệp vụ; không tự tạo bản ghi hợp lệ | NOT RUN |
| DATA-03 | Quét cùng mã nhiều lần | Không tăng sai số lượng đã xử lý | NOT RUN |
| DATA-04 | Cùng mã LK nhưng khác RO | Phân biệt đúng bản ghi theo khóa nghiệp vụ | NOT RUN |
| DATA-05 | QR sai định dạng/dữ liệu thiếu | Báo lỗi rõ, không làm hỏng dữ liệu | NOT RUN |
| DATA-06 | Excel có dòng lỗi | Báo chính xác dòng lỗi; import an toàn | NOT RUN |
| DATA-07 | Xóa lịch sử quét | Không xóa nhầm bản ghi nguồn | NOT RUN |
| DATA-08 | Đối chiếu thống kê với danh sách chi tiết | Các tổng số khớp theo quy tắc nghiệp vụ | NOT RUN |
| DATA-09 | Export sau khi đồng bộ | File xuất chứa đúng kỳ và dữ liệu đã được xác nhận | NOT RUN |
| DATA-10 | Tiếng Việt, khoảng trắng, ký tự Unicode | Hiển thị và lưu đúng; không biến đổi mã định danh hợp lệ | NOT RUN |

## D. Hiệu năng và ổn định

| ID | Bài kiểm tra | Cách đo | Trạng thái |
|---|---|---|---|
| PERF-01 | Danh sách cỡ 363 dòng | Ghi thời gian tải, tìm kiếm và render | NOT RUN |
| PERF-02 | Tập dữ liệu lớn hơn theo tải dự kiến | Ghi số dòng và thời gian phản hồi | NOT RUN |
| PERF-03 | Quét liên tục | Ghi số sự kiện gửi/nhận, mất/trùng và độ trễ | NOT RUN |
| PERF-04 | Import Excel | Ghi kích thước file, số dòng, thời gian và lỗi | NOT RUN |
| PERF-05 | Khôi phục sau mất kết nối | Ghi thời gian và số sự kiện được đối soát | NOT RUN |
| PERF-06 | Android trong phiên quét kéo dài | Theo dõi crash, CPU, bộ nhớ và pin nếu có công cụ | NOT RUN |

Không tự đặt kết quả hiệu năng trước khi đo. Thiết lập ngưỡng sau khi đo baseline và thống nhất mức tải mục tiêu.

## E. Build, bảo mật và hồi quy

| ID | Bài kiểm tra | Kết quả mong đợi | Trạng thái |
|---|---|---|---|
| REL-01 | Unit/integration test | Không có lỗi chưa giải quyết trong phạm vi nghiệm thu | NOT RUN |
| REL-02 | Lint/type check/build PC | Thành công hoặc lỗi được ghi rõ | NOT RUN |
| REL-03 | Build APK release | Có APK thật nếu môi trường hỗ trợ | NOT RUN |
| REL-04 | Cài và chạy APK | Mở app, cấp quyền, quét và kết nối thành công | NOT RUN |
| REL-05 | Kiểm tra bí mật trong source/build | Không nhúng bí mật quản trị cố định | NOT RUN |
| REL-06 | Backup/rollback/migration | Có quy trình được kiểm chứng phù hợp với thay đổi | NOT RUN |
| REL-07 | Chức năng hiện có | Không có hồi quy chưa giải quyết | NOT RUN |
| REL-08 | Báo cáo cuối | Mỗi test có trạng thái và bằng chứng trung thực | NOT RUN |

## Mẫu ghi bằng chứng
Với mỗi test, ghi:
- ID:
- Trạng thái:
- Commit/build:
- Môi trường và thiết bị:
- Các bước chạy:
- Kết quả thực tế:
- Bằng chứng/log:
- Lỗi hoặc ticket:
- Người xác nhận:
