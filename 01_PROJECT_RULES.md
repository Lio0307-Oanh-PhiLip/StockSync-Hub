# Quy tắc và yêu cầu kỹ thuật của dự án

## 1. Phạm vi
Hệ thống đối chiếu thu hồi xác linh kiện gồm ứng dụng PC hiện có, PC Hub làm cầu nối và ứng dụng Android APK. Các màn hình/nghiệp vụ hiện hữu có thể gồm quét QR/barcode, danh sách lịch sử đối chiếu, số RO, mã LK, tên linh kiện, model, loại linh kiện, BH/DV, remark, thống kê, import/export Excel và theo dõi tiến độ. Phải xác minh những gì thực sự tồn tại trong source code.

## 2. Yêu cầu P0 — dữ liệu và đồng bộ
### 2.1 Đồng bộ hai chiều
- PC quét → sự kiện được lưu/xử lý theo quy tắc nghiệp vụ → APK nhận và cập nhật.
- APK quét → sự kiện được gửi qua PC Hub → PC tự cập nhật.
- Các thiết bị khác chỉ nhận dữ liệu thuộc đúng kỳ kiểm kê và phạm vi quyền được phép.
- Không yêu cầu tải lại trang để nhận cập nhật bình thường.
- Phải phân biệt trạng thái local, đang gửi, đã được tiếp nhận, đã lưu bền vững, đã đồng bộ và lỗi. Không báo thành công giả.

### 2.2 Giao nhận sự kiện an toàn
Tùy kiến trúc thực tế, thiết kế cơ chế phù hợp cho:
- event_id/idempotency key duy nhất;
- record_id ổn định;
- inventory_id/kỳ kiểm kê;
- revision hoặc version;
- timestamp và nguồn thiết bị;
- xác nhận tiếp nhận/lưu bền vững;
- retry có giới hạn và backoff;
- chống xử lý trùng;
- phục hồi kết nối và đồng bộ bù bằng cursor/revision hoặc cơ chế tương đương;
- nhật ký lỗi đủ để truy vết nhưng không lộ bí mật.

Không tuyên bố exactly-once tuyệt đối nếu kiến trúc không bảo đảm được. Có thể dùng giao nhận at-least-once cùng idempotency và lưu bền vững để tránh lặp nghiệp vụ.

### 2.3 PC Hub
- Audit vai trò thực tế của PC Hub trước khi sửa.
- Kiểm tra xác thực, trạng thái kết nối, timeout, heartbeat, retry và khởi động lại.
- Nếu PC Hub là điểm trung gian duy nhất, đánh giá tác động khi Hub dừng.
- Khi có thể và phù hợp, đánh giá đồng bộ LAN khi Internet gián đoạn; không khẳng định khả năng này nếu chưa triển khai và test.
- Không mở cổng hoặc endpoint quản trị không cần thiết.

## 3. Yêu cầu P0 — kỳ kiểm kê động
- Danh sách được người dùng đưa vào/chọn theo tháng hoặc đợt công việc; nội dung và số lượng có thể khác nhau.
- Không hardcode danh sách cụ thể trong PC, APK, backend hoặc cloud.
- Không dùng một danh sách cố định làm nguồn bắt buộc cho mọi tháng.
- APK không cần build lại chỉ vì danh sách kiểm kê thay đổi.
- Mọi truy vấn, cập nhật, quét, thống kê và export phải gắn đúng kỳ kiểm kê.
- Ưu tiên dùng định danh kỳ ổn định như `inventory_id`; không chỉ dựa vào tên tháng nếu có thể nhầm kỳ.
- Lưu trữ trung tâm/cloud, nếu đang được sử dụng, vẫn có thể giữ nhiều kỳ độc lập; cấm việc tự động dùng chung/trộn danh sách giữa các kỳ.
- Không tự tạo dữ liệu mẫu khi chưa có danh sách nguồn.

### Import và chuyển kỳ
1. Xác nhận kỳ đích.
2. Kiểm tra dữ liệu và báo dòng lỗi, mã trùng, trường bắt buộc thiếu.
3. Cho xem trước và xác nhận.
4. Lưu theo transaction hoặc cơ chế thay thế an toàn.
5. Chỉ kích hoạt kỳ mới sau khi dữ liệu hợp lệ và sẵn sàng.
6. Phát thông báo thay đổi cho thiết bị liên quan.
7. Bảo toàn lịch sử kỳ cũ theo quy tắc nghiệp vụ.
8. Nếu import thất bại, kỳ đang hoạt động phải còn toàn vẹn.
9. Không tự trộn hai kỳ hoặc xóa dữ liệu cũ do import mới.

## 4. Mô hình dữ liệu tham khảo
Không ép đổi schema nếu dự án đã có mô hình tương đương. Xác minh khóa nghiệp vụ trước khi sửa.

Kỳ kiểm kê có thể gồm:
- `inventory_id`, `period_key`, `display_name`, `status`, `revision`, `created_at`, `created_by`.

Bản ghi có thể gồm:
- `record_id`, `inventory_id`, `scan_code`, `ro_number`, `lk_code`, `part_name`, `model`, `category`, `service_type`, `remark`, `reconciliation_status`, `revision`, `updated_at`.

Sự kiện có thể gồm:
- `event_id`, `inventory_id`, `record_id`, `event_type`, `payload`, `device_id`, `created_at`, `processed_at`, `status`.

Các tên trên là gợi ý, không phải giả định về schema hiện có.

## 5. Nghiệp vụ quét và đối chiếu
- Audit trước các quy tắc hiện tại về QR/barcode, RO, mã LK, tên/model, loại linh kiện và trạng thái.
- Không coi mã LK là duy nhất nếu dữ liệu thật cho phép cùng mã LK xuất hiện ở nhiều RO hoặc bản ghi.
- Xác định rõ sự khác nhau giữa xóa lịch sử quét và xóa bản ghi nguồn.
- Quét trùng không được làm tăng sai số lượng đã xử lý.
- Mã không có trong danh sách phải theo quy tắc đã xác minh; không tự tạo bản ghi hợp lệ.
- Thống kê phải nhất quán với danh sách chi tiết.
- Không tự đổi quy tắc IW/OOW, LCD/MAIN/OTHERS hoặc trạng thái “Khớp, Trả Xác” nếu chưa xác minh nghiệp vụ.

## 6. Android APK
- Quét camera ổn định, xử lý quyền camera và mã sai định dạng.
- Chống việc một lần quét tạo nhiều sự kiện ngoài quy tắc.
- Hiển thị trạng thái kết nối, đồng bộ và sự kiện đang chờ.
- Có thể lưu hàng đợi cục bộ bền vững nếu kiến trúc và nghiệp vụ yêu cầu.
- Khôi phục kết nối khi ứng dụng quay lại foreground.
- Không hiển thị sự kiện chưa lưu bền vững như hoàn tất.
- Hỗ trợ danh sách/kỳ mới mà không cần cài lại APK.
- Không nhúng mật khẩu hoặc khóa bí mật cố định vào APK.
- Không khẳng định quét nền/màn hình tắt nếu chưa triển khai và kiểm thử theo giới hạn Android.

## 7. Hiệu năng
Đo trước và sau trong cùng môi trường. Tập trung vào truy vấn, tìm kiếm, render danh sách, import/export, đồng bộ, camera, CPU và bộ nhớ. Có thể dùng cập nhật theo sự kiện, phân trang hoặc virtual scrolling nếu phù hợp.

Không đánh đổi độ chính xác hoặc tính bền vững dữ liệu để tăng tốc. Không loại bỏ module chỉ vì có vẻ dư thừa; kiểm tra dependency và regression test trước.

## 8. Bảo mật và vận hành
- Kiểm tra quyền truy cập và xác thực PC Hub.
- Xác thực dữ liệu nhập từ QR/barcode và Excel.
- Không ghi token/mật khẩu vào log.
- Có backup, migration và phương án rollback phù hợp.
- Không tự ý chuyển dữ liệu nội bộ sang cloud/dịch vụ khác.
- Ghi rõ cách cấu hình, vận hành, backup và phục hồi.

## 9. Quy tắc báo cáo
Mỗi test có một trạng thái:
- `PASS`: đã chạy và có bằng chứng đạt.
- `FAIL`: đã chạy và không đạt.
- `BLOCKED`: không thể chạy vì thiếu quyền, môi trường hoặc phụ thuộc.
- `NOT RUN`: chưa chạy.

Không dùng PASS cho code chỉ mới được viết hoặc cho test chưa chạy.
