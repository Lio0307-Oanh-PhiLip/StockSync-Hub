# Hồ sơ yêu cầu kỹ thuật — PC Hub ↔ PC ↔ Android APK

Bộ tài liệu này dùng để đưa vào source code dự án và làm chuẩn làm việc cho AI Studio hoặc kỹ sư phát triển.

## Cách sử dụng
1. Sao lưu source code hiện tại và tạo Git commit/branch trước khi thay đổi.
2. Giải nén thư mục này vào thư mục gốc dự án.
3. Gửi `00_MASTER_INSTRUCTIONS.md` cho AI Studio trước tiên.
4. Yêu cầu AI đọc các tài liệu còn lại, audit source code thật rồi mới sửa.
5. Thực hiện lần lượt theo `03_IMPLEMENTATION_PLAN.md`.
6. Không nghiệm thu chỉ dựa trên lời khẳng định; dùng `02_ACCEPTANCE_TESTS.md` và `04_RELEASE_CHECKLIST.md`.

## Nguyên tắc quan trọng
- Các tài liệu này quy định mục tiêu và tiêu chí nghiệm thu, không khẳng định kiến trúc hiện tại đã có những thành phần được nêu.
- AI/kỹ sư phải kiểm tra source code, cấu hình, database và giao thức PC Hub trước khi đề xuất thay đổi.
- Nếu một tiêu chí chưa thể kiểm tra trong môi trường hiện tại, ghi `BLOCKED` hoặc `NOT RUN`; không giả lập kết quả.
- Không có prompt nào bảo đảm tuyệt đối AI không sai. Bằng chứng tốt nhất là kiểm thử tự động, review diff, backup và nghiệm thu trên môi trường thật.

## Danh mục
- `00_MASTER_INSTRUCTIONS.md` — chỉ thị tổng.
- `01_PROJECT_RULES.md` — yêu cầu và giới hạn bất biến.
- `02_ACCEPTANCE_TESTS.md` — bộ kiểm thử nghiệm thu.
- `03_IMPLEMENTATION_PLAN.md` — kế hoạch theo giai đoạn.
- `04_RELEASE_CHECKLIST.md` — checklist phát hành.
