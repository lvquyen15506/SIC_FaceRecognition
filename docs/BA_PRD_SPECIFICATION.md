# BẢN ĐẶC TẢ BA & PRD CHÍNH THỨC: HỆ THỐNG QUẢN LÝ LỚP HỌC & ĐIỂM DANH SINH VIÊN TỰ ĐỘNG BẰNG AI (SIC_FaceRecognition)

> **Dự án**: `SIC_FaceRecognition`  
> **Phiên bản**: v2.0 (Cập nhật đầy đủ nghiệp vụ quản lý lớp, tài khoản & báo cáo)  
> **Trạng thái**: 🟡 Đã cập nhật 100% chi tiết nghiệp vụ ➔ Chờ Human-in-the-loop (Bạn) Phê duyệt  

---

## 💬 1. BIÊN BẢN THẢO LUẬN CỦA CÁC AGENT (REVISED AGENT LOG V2)

* **Mary (BA)**: *"Tôi đã bổ sung toàn bộ luồng nghiệp vụ thực tế vào PRD:
  1. **Quản lý Tài khoản & Phân quyền**: Cả Sinh viên và Giảng viên đều có tài khoản riêng và đều cần đăng ký dữ liệu khuôn mặt đa góc (vì ảnh toàn cảnh lớp dính cả mặt Giảng viên).
  2. **Quản lý Lớp học**: Giảng viên tạo lớp (sinh Mã Lớp), hỗ trợ nhiều Giảng viên cùng quản lý 1 lớp. Sinh viên có thể join lớp bằng Mã Lớp hoặc Giảng viên add trực tiếp.
  3. **Điểm danh & Báo cáo**: Lưu vết theo ngày, lưu Ảnh/Video đã xử lý (có vẽ Bounding Box + Tên/MSSV) làm bằng chứng kiểm soát kèm file Excel điểm danh."*
* **Winston (Architect)**: *"Về mặt kỹ thuật:
  - CSDL Cần thêm các bảng: `users` (Student/Teacher), `classes` (Mã lớp, tên lớp), `class_members` (Quan hệ GV-Lớp, SV-Lớp), `attendance_sessions` (Ngày điểm danh, đường dẫn ảnh/video gốc & ảnh đã xử lý), `attendance_records` (Trạng thái có mặt/vắng).
  - Core AI `src/` sẽ được gọi để bóc tách khuôn mặt trên ảnh/video upload, vẽ Bounding Box + Name Label xuất ra ảnh đã xử lý lưu vào thư mục `reports/`."*
* **Sally (UX Designer)**: *"Giao diện thiết kế theo chuẩn `DESIGN.md`:
  - **Trang Sinh viên**: Đăng ký đa góc mặt, nhập Mã Lớp để Join, xem lịch sử điểm danh cá nhân.
  - **Trang Giảng viên**: Dashboard Lớp học, tạo lớp, chia sẻ quyền quản lý, danh sách sinh viên, tab Upload Điểm danh (ảnh/video) và Báo cáo Lịch sử theo ngày."*
* **John (PM)**: *"Đã chốt bản PRD hoàn chỉnh 100% bên dưới!"*

---

## 📋 2. PHẠM VI SẢN PHẨM & USER STORIES CHI TIẾT (PRD)

### 👥 PHÂN HỆ 1: QUẢN LÝ TÀI KHOẢN & ĐĂNG KÝ MẶT ĐA GÓC ĐỘ

#### Story 1.1: Đăng ký & Đăng nhập Tài khoản
- **Sinh viên & Giảng viên**: Được cấp tài khoản đăng nhập vào hệ thống (Email/MSSV/Mã GV + Mật khẩu).

#### Story 1.2: Đăng ký Dữ liệu Khuôn mặt Đa góc độ (Face Registration)
- **Áp dụng cho**: Cả Sinh viên và Giảng viên (do ảnh/video lớp dính cả mặt Giảng viên).
- **Quy trình**: Người dùng vào mục "Hồ sơ Sinh trắc", bật camera quay/chụp các góc mặt (Trực diện, Nghiêng trái, Nghiêng phải, Cúi/Ngẩng).
- **Xử lý AI**: `src/core/model.py` trích xuất tập hợp Vector 512-d và lưu vào CSDL (`src/app_modules/gallery.py`).

---

### 🏫 PHÂN HỆ 2: QUẢN LÝ LỚP HỌC & THÀNH VIÊN (CLASS MANAGEMENT)

#### Story 2.1: Tạo Lớp & Mã Lớp (Class Creation & Code)
- **Giảng viên**: Tạo Lớp học mới (Tên môn, Học kỳ). Hệ thống tự sinh **Mã Lớp (Class Code)** duy nhất (ví dụ: `SIC2026-A1`).

#### Story 2.2: Đồng Quản lý Lớp (Multi-Teacher Co-Teaching)
- Giảng viên tạo lớp có thể mời/thêm các Giảng viên khác cùng tham gia quản lý lớp học đó.

#### Story 2.3: Tham gia Lớp học (Join Class & Student Roster)
- **Sinh viên**: Nhập Mã Lớp để gửi yêu cầu/gia nhập lớp.
- **Giảng viên**: Có thể thêm Sinh viên thủ công theo MSSV hoặc duyệt danh sách sinh viên join bằng Mã Lớp. Quản lý danh sách sinh viên thực tế (xem hồ sơ, trạng thái dữ liệu mặt).

---

### 📸 PHÂN HỆ 3: ĐIỂM DANH ẢNH / VIDEO TOÀN CẢNH (ATTENDANCE PROCESSING)

#### Story 3.1: Upload Ảnh / Video Điểm danh
- Giảng viên vào Lớp học ➔ Chọn ngày điểm danh ➔ Upload Ảnh toàn cảnh (Panoramic Photo) hoặc Video quay lớp học.

#### Story 3.2: AI Bóc tách & Xử lý (AI Processing)
- `src/app_modules/detector.py` cắt tất cả khuôn mặt trong ảnh/video.
- `src/app_modules/attendance.py` so khớp với CSDL đa góc độ của Sinh viên & Giảng viên trong lớp.
- **Vẽ Bounding Box & Label**: Vẽ khung chữ nhật quanh từng khuôn mặt (Xanh lá: Sinh viên có mặt, Xanh dương: Giảng viên, Đỏ: Người lạ/Không xác định) kèm Tên + MSSV + Tỷ lệ % khớp.

---

### 📊 PHÂN HỆ 4: MỤC BÁO CÁO & KIỂM SOÁT (REPORT & ARCHIVE CENTER)

#### Story 4.1: Báo cáo Lịch sử theo Ngày (Date-based Reports)
- Hệ thống tự động lưu trữ các Buổi điểm danh theo Ngày/Giờ.

#### Story 4.2: Lưu trữ Bằng chứng Ảnh/Video Đã Xử Lý (Processed Media Archive)
- Giảng viên và Nhà trường có thể xem lại **Ảnh/Video đã xử lý (Processed Media)** có gắn Bounding Box + Tên/MSSV làm nền tảng đối soát minh bạch.

#### Story 4.3: Xuất Tệp Điểm danh (Export Attendance File)
- Xuất file báo cáo dạng **Excel (`.xlsx`) / CSV** chứa:
  - Danh sách Sinh viên **CÓ MẶT** (Thời gian nhận diện, Tỷ lệ % khớp).
  - Danh sách Sinh viên **VẮNG MẶT**.
  - Danh sách Giảng viên có mặt trong buổi học.

---

## 🗄️ 3. MÔ HÌNH CƠ SỞ DỮ LIỆU SƠ BỘ (DATABASE SCHEMA)

1. **`users`**: `id`, `email`, `password_hash`, `full_name`, `role` (STUDENT/TEACHER), `code` (MSSV/MGV).
2. **`face_embeddings`**: `user_id`, `vector_512d`, `angle_label` (FRONT, LEFT, RIGHT, DOWN).
3. **`classes`**: `id`, `class_code`, `class_name`, `created_by`.
4. **`class_teachers`**: `class_id`, `teacher_id`.
5. **`class_students`**: `class_id`, `student_id`, `joined_at`.
6. **`attendance_sessions`**: `id`, `class_id`, `date`, `raw_media_path`, `processed_media_path`.
7. **`attendance_records`**: `session_id`, `user_id`, `status` (PRESENT/ABSENT), `confidence`.

---

## 🛑 CHỜ BẠN (HUMAN-IN-THE-LOOP) DUYỆT

Bản đặc tả đã được cập nhật **đầy đủ 100% tất cả các tính năng quản lý lớp, tài khoản GV/SV, upload ảnh/video và mục báo cáo đối soát** của bạn.

Bạn hãy xem qua và nhắn **"Duyệt"** để **Amelia (Dev)** và **Quinn (QA Lead)** tiến hành vòng lặp lập trình - kiểm thử tự động nhé!
