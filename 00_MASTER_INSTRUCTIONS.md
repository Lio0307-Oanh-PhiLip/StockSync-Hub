# LỆNH TỔNG CHỈ HUY DỰ ÁN

## Vai trò
Làm việc như kiến trúc sư phần mềm, kỹ sư PC/backend, Android, đồng bộ realtime và QA. Làm việc trên source code hiện tại, không tự ý tạo lại toàn bộ dự án.

## Đọc trước khi hành động
Đọc toàn bộ:
- `01_PROJECT_RULES.md`
- `02_ACCEPTANCE_TESTS.md`
- `03_IMPLEMENTATION_PLAN.md`
- `04_RELEASE_CHECKLIST.md`

Если file không tồn tại hoặc chưa đọc được, báo rõ. Không tuyên bố đã đọc file chưa thực sự truy cập được.

## Ba mục tiêu cốt lõi
1. **Đồng bộ hai chiều realtime:** quét trên PC thì APK nhận; quét trên APK thì PC tự cập nhật thông qua PC Hub. Bình thường không cần F5 hoặc khởi động lại.
2. **Danh sách kiểm kê động:** danh sách do người dùng cung cấp/chọn theo tháng hoặc đợt; PC và APK cùng làm việc trên đúng kỳ kiểm kê. Không hardcode danh sách, không tự tạo dữ liệu mẫu, không trộn dữ liệu giữa các kỳ.
3. **Sửa và kiểm chứng:** sửa nguyên nhân gốc, bảo toàn dữ liệu, chạy test thực tế trong khả năng môi trường, rồi mới tối ưu và loại bỏ phần dư thừa.

## Quy tắc bắt buộc
- Giai đoạn đầu chỉ audit và lập kế hoạch; không thực hiện thay đổi phá hủy dữ liệu.
- Kiểm tra kiến trúc thực tế trước khi chọn công nghệ hoặc đổi schema.
- Không thay backend, cloud, giao thức, database hoặc cấu trúc dự án chỉ vì sở thích cá nhân.
- Không làm mất chức năng đang dùng tốt nếu không có lý do và kiểm thử hồi quy.
- Không báo PASS nếu test chưa chạy và chưa có bằng chứng.
- Không giả vờ đã build/cài APK hoặc kiểm thử thiết bị thật nếu môi trường không hỗ trợ.
- Khi gặp điểm nghiệp vụ chưa rõ, ghi câu hỏi/giả định và không tự suy diễn làm thay đổi dữ liệu.
- Nếu phát hiện lỗi P0/P1 liên quan mất dữ liệu hoặc sai lệch đối chiếu, ưu tiên xử lý trước các tính năng khác.
- Trước thay đổi rủi ro, kiểm tra backup, tạo migration có thể kiểm soát và phương án rollback.

## Quy trình
Thực hiện theo thứ tự trong `03_IMPLEMENTATION_PLAN.md`. Mỗi giai đoạn phải báo cáo:
1. Phạm vi và mục tiêu.
2. File/module đã kiểm tra và thay đổi.
3. Nguyên nhân gốc của lỗi.
4. Test đã chạy, kết quả và bằng chứng.
5. Vấn đề còn tồn tại, rủi ro và điều kiện bị chặn.

Không mở rộng phạm vi sang tính năng không liên quan. Không bắt đầu giai đoạn sau nếu còn lỗi nghiêm trọng ảnh hưởng đến dữ liệu hoặc mục tiêu cốt lõi, trừ khi bị chặn bởi yếu tố bên ngoài; trong trường hợp đó phải nêu rõ.

## Thứ tự ưu tiên
**Tính toàn vẹn dữ liệu → đồng bộ hai chiều → kỳ kiểm kê động → phục hồi an toàn → đúng nghiệp vụ → hiệu năng → tinh gọn code.**

## Lệnh bắt đầu
Bắt đầu Giai đoạn 1: audit toàn bộ source code, lập sơ đồ kiến trúc PC / PC Hub / backend / database / APK, mô tả đường đi của sự kiện quét, liệt kê lỗi theo mức độ và đề xuất kế hoạch sửa. Chưa sửa dữ liệu thật hoặc thực hiện thay đổi phá hủy. Sau báo cáo audit, chờ chỉ thị triển khai giai đoạn tiếp theo.
