# Checklist phát hành và nghiệm thu

## A. Trước khi release
- [ ] Đã tạo backup và điểm quay lui/commit.
- [ ] Đã xem xét diff của toàn bộ thay đổi.
- [ ] Đã xác minh migration và khả năng tương thích dữ liệu.
- [ ] Đã xác nhận không có danh sách kiểm kê hardcode.
- [ ] Đã xác nhận PC và APK tham chiếu đúng kỳ kiểm kê.
- [ ] Đã kiểm tra quyền truy cập và cấu hình bí mật.
- [ ] Đã kiểm tra cấu hình mẫu không chứa token/mật khẩu thật.

## B. Đồng bộ
- [ ] PC → APK đã kiểm thử.
- [ ] APK → PC đã kiểm thử.
- [ ] Sự kiện trùng/retry đã kiểm thử.
- [ ] Mất kết nối và reconnect đã kiểm thử.
- [ ] PC Hub restart đã kiểm thử nếu môi trường cho phép.
- [ ] Trạng thái chờ/lỗi/đã lưu được hiển thị đúng.
- [ ] Không cần refresh trong luồng realtime bình thường.

## C. Kỳ kiểm kê
- [ ] Import danh sách mới đã kiểm thử.
- [ ] Chuyển kỳ không trộn dữ liệu.
- [ ] Lịch sử kỳ cũ được bảo toàn theo nghiệp vụ.
- [ ] Thiết bị offline có thể đồng bộ lại đúng kỳ.
- [ ] Import lỗi không làm hỏng kỳ đang hoạt động.
- [ ] APK dùng danh sách mới mà không cần build lại.

## D. Nghiệp vụ và dữ liệu
- [ ] Mã hợp lệ/mã lạ/mã trùng đã kiểm thử.
- [ ] Khóa nghiệp vụ và trường định danh đã được xác minh.
- [ ] Thống kê khớp danh sách chi tiết.
- [ ] Xóa lịch sử và xóa bản ghi nguồn được phân biệt.
- [ ] Export chứa đúng kỳ và dữ liệu đúng.
- [ ] Unicode/tiếng Việt hiển thị và lưu đúng.

## E. Build và kiểm thử
- [ ] Unit test.
- [ ] Integration test.
- [ ] Regression test.
- [ ] Lint/type check.
- [ ] Build PC.
- [ ] Build APK release nếu có môi trường.
- [ ] Cài đặt và chạy APK trên thiết bị/emulator nếu có môi trường.
- [ ] Hiệu năng có số liệu đo hoặc được ghi NOT RUN.
- [ ] Mọi test được đánh dấu PASS/FAIL/BLOCKED/NOT RUN trung thực.

## F. Điều kiện chặn phát hành
Không phát hành như một bản hoàn tất nếu:
- Còn lỗi P0/P1 chưa xử lý liên quan mất/sai dữ liệu hoặc đồng bộ.
- Test cốt lõi bị FAIL.
- Không có backup/rollback cho thay đổi dữ liệu có rủi ro.
- Báo cáo ghi PASS cho test chưa chạy.
- Chưa làm rõ một giả định nghiệp vụ có thể khiến đối chiếu sai.

Nếu test bị BLOCKED do môi trường ngoài quyền kiểm soát, phải nêu chính xác giới hạn và không tuyên bố đã nghiệm thu toàn bộ.

## G. Báo cáo release
- Commit/version:
- Ngày giờ:
- Môi trường:
- PC build:
- APK build:
- Test PASS:
- Test FAIL:
- Test BLOCKED:
- Test NOT RUN:
- Lỗi còn tồn đọng:
- Phương án rollback:
- Người xác nhận:
