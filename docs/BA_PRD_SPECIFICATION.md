# BẢN ĐẶC TẢ MASTER THIẾT KẾ, KIẾN TRÚC & GIAO DIỆN HỆ THỐNG: QUẢN LÝ LỚP HỌC & ĐIỂM DANH SINH VIÊN TỰ ĐỘNG BẰNG AI (SIC_FaceRecognition)

> **Dự án**: `SIC_FaceRecognition`  
> **Cấp độ**: Master Enterprise & UI/UX Specification  
> **Phiên bản**: v4.4 Master  
> **Trạng thái**: 🟡 Hoàn thiện 100% (Bổ sung Xử lý Lật Gương Camera Preview & Tự động Chuyển hướng Dashboard theo Role khi Đăng nhập) ➔ Chờ Human-in-the-loop (Bạn) Phê duyệt  

---

## 🎨 1. CHUẨN NHẬN DẠNG GIAO DIỆN & TỔNG QUAN UI/UX (DESIGN SYSTEM & TOKENS)

Toàn bộ giao diện Web của hệ thống tuân thủ 100% bản thiết kế [DESIGN.md](file:///run/media/lvquyen15506/D/SIC/face_recognition_project/DESIGN.md) theo chuẩn **Google Labs DESIGN.md**:

- **Phong cách chủ đạo (Mood & Aesthetic)**: Dark Glassmorphic Banking UI (Thiết kế kính mờ sang trọng chuẩn ngân hàng hiện đại như Revolut/Techcombank).
- **Hệ màu (Color Palette)**:
  - `Background`: `#090D16` (Midnight Deep Dark)
  - `Surface Glass`: `#1E293B` với `backdrop-filter: blur(16px)` và viền `rgba(255, 255, 255, 0.1)`
  - `Primary Navy`: `#0F172A`
  - `Electric Blue Accent`: `#2563EB` (Dùng cho nút bấm chính, viền camera active)
  - `Success Emerald`: `#059669` (Khung Bounding Box Sinh viên có mặt / PASS Liveness)
  - `Teacher Cyan`: `#0EA5E9` (Khung Bounding Box Giảng viên)
  - `Warning Amber`: `#D97706` (Cảnh báo góc mặt lệch / Thiếu sáng / Quá xa / Quá gần)
  - `Error Crimson`: `#DC2626` (Khung Bounding Box Người lạ / Spoof Alert / Vắng mặt)
- **Kiểu chữ (Typography)**:
  - Font tiêu đề & nội dung: **`Inter`** (Sắc nét, hiện đại).
  - Font mã số & thông số AI: **`Space Grotesk`** (Monospaced dạng đồng hồ bấm giờ, hiển thị MSSV, Mã GV, Tỷ lệ % khớp `98.5%`, thời gian).

---

## 🖥️ 2. CHI TIẾT THIẾT KẾ CÁC MÀN HÌNH GIAO DIỆN (SCREEN-BY-SCREEN LAYOUT)

```text
                                 [ HỆ THỐNG GIAO DIỆN WEB ]
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      ▼                                      ▼                                      ▼
[ MÀN HÌNH ĐẮNG NHẬP THÔNG MINH ]    [ ĐĂNG KÝ MẶT CÓ LẬT GƯƠNG ]         [ TỰ ĐỘNG CHUYỂN HƯỚNG DASHBOARD ]
(Không cần chọn Tab Role)             (Mirror View CSS scaleX(-1))           (Role: STUDENT / TEACHER / ADMIN)
```

---

### 🖥️ MÀN HÌNH 1: ĐĂNG NHẬP THÔNG MINH & TỰ ĐỘNG CHUYỂN HƯỚNG theo ROLE
- **Đơn giản hóa Đăng nhập**: Không cần chọn Tab vai trò thủ công.
- **Layout**: Card Glassmorphic căn giữa trên nền Midnight có hiệu ứng mờ nhòe ánh sáng xanh (Ambient Blue Glow).
- **Thành phần**:
  - Ô nhập Tên đăng nhập / Email / Mã số (MSSV/MGV/Admin ID).
  - Ô nhập Mật khẩu.
  - Nút bấm "Đăng Nhập" (Màu Electric Blue `#2563EB`).
- **Cơ chế Auto-Role Redirection**:
  - Khi đăng nhập thành công, Hệ thống tự đọc trường `role` trong JWT Token và tự động chuyển hướng:
    - `role == "STUDENT"` ➔ Tự động vào **Portal Sinh viên (Màn hình 3)**.
    - `role == "TEACHER"` ➔ Tự động vào **Workspace Giảng viên (Màn hình 4)**.
    - `role == "ADMIN"` ➔ Tự động vào **Admin Control Center (Màn hình 6)**.

---

### 🖥️ MÀN HÌNH 2: GIAO DIỆN ĐĂNG KÝ KHUÔN MẶT ĐA GÓC ĐỘ (XỬ LÝ LẬT GƯƠNG CAMERA)

Quy trình Đăng ký Khuôn mặt Đa góc độ (Multi-Angle Face Registration) được tích hợp **Xử lý Lật Gương (Camera Mirroring)** và **Đánh giá chất lượng môi trường**:

- **Layout**: Màn hình toàn cảnh camera tập trung với khung hướng dẫn Oval HUD.
- **Xử lý Lật Gương Camera Preview (Natural Mirror View)**:
  - Áp dụng CSS `transform: scaleX(-1)` cho khung hiển thị `<video>` preview để người dùng di chuyển sang trái/phải một cách tự nhiên như soi gương (không bị ngược chiều).
  - Khung ảnh gửi sang AI `src/` để trích xuất vector vẫn giữ nguyên chiều thực tế để đảm bảo độ chính xác.

#### 🎯 BỘ TIÊU CHUẨN ĐÁNH GIÁ CHẤT LƯỢNG ẢNH TỰ ĐỘNG:

1. **Kiểm tra Điều kiện Ánh sáng (Illumination Check)**:
   - 🌑 **Ánh sáng quá tối**: Cường độ sáng $< 70/255$ ➔ Đèn Vàng + Cảnh báo: *"Ánh sáng quá tối, vui lòng bật thêm đèn hoặc di chuyển ra vùng sáng"*.
   - ☀️ **Ánh sáng quá chói / Ngược sáng**: Cường độ sáng $> 210/255$ ➔ Đèn Vàng + Cảnh báo: *"Ánh sáng quá chói hoặc ngược sáng, vui lòng tránh nguồn sáng mạnh chiếu trực tiếp vào camera"*.
   - ✅ **Ánh sáng đạt chuẩn**: $70 \le \text{Brightness} \le 210$.

2. **Kiểm tra Khoảng cách tới Camera (Distance Check)**:
   - 🔍 **Mặt ở quá xa Camera**: Diện tích mặt $< 20\%$ khung Oval ➔ Đèn Vàng + Cảnh báo: *"Vui lòng di chuyển mặt LẠI GẦN camera hơn"*.
   - 🔬 **Mặt ở quá gần Camera**: Diện tích mặt $> 65\%$ khung Oval ➔ Đèn Vàng + Cảnh báo: *"Vui lòng lùi mặt RA XA camera một chút"*.
   - ✅ **Khoảng cách đạt chuẩn**: Diện tích mặt chiếm $25\% \text{ đến } 55\%$ khung Oval.

3. **Kiểm tra Độ nét & Mờ (Blur Check)**:
   - 💨 **Mặt bị mờ**: Laplacian Variance $< 100$ ➔ Cảnh báo: *"Ảnh bị mờ, xin hãy giữ yên đầu trong giây lát"*.
   - ✅ **Độ nét đạt chuẩn**: Laplacian Variance $\ge 100$.

4. **Thu thập 4 Góc mặt**:
   - Đạt chuẩn ➔ Vòng Oval hiện **MÀU XANH LÁ** và tự động lưu 4 góc mặt (Trực diện ➔ Nghiêng trái $30^\circ$ ➔ Nghiêng phải $30^\circ$ ➔ Cúi/Ngẩng) vào CSDL `data_gallery/` (`src/app_modules/gallery.py`).

---

### 🖥️ MÀN HÌNH 3: PORTAL SINH VIÊN (STUDENT DASHBOARD)
- **Layout**: Sidebar điều hướng + Dashboard tổng quan.
- **Thành phần**:
  - **Thẻ Trạng thái Sinh trắc**: Hộp hiển thị "Dữ liệu khuôn mặt: ĐÃ HOÀN THIỆN (4/4 góc mặt)" kèm nút "Chụp lại".
  - **Hộp Join Lớp học Mới**: Ô nhập **Mã Lớp (Class Code)** + Nút "Gửi Yêu Cầu Tham Gia".
  - **Danh sách Lớp học Đã Tham gia**: Các thẻ Card hiển thị Tên môn, Giảng viên phụ trách, Tỷ lệ đi học.
  - **Bảng Lịch sử Điểm danh Cá nhân**: Danh sách chi tiết các buổi học (Ngày, Trạng thái Có mặt/Vắng mặt).

---

### 🖥️ MÀN HÌNH 4: WORKSPACE GIẢNG VIÊN (TEACHER DASHBOARD & MULTI-MEDIA STUDIO)

- **Modal Tạo Lớp**: Nhập Tên Lớp & Chủ đề học ➔ Tự động sinh **Mã Lớp (Class Code)**.
- **Đồng Quản Lý**: Thêm các GV khác cùng quản lý lớp.
- **Studio Upload Hàng Loạt & Phân Luồng Xử Lý (Batch Multi-Media Studio)**:
  - Giảng viên kéo-thả **tùy ý bao nhiêu tệp Ảnh và Video cùng lúc** vào 1 lượt điểm danh.
  - Phân luồng: Ảnh xử lý song song siêu tốc / Video đưa vào Celery background.
  - Interactive Canvas Viewer: Hiển thị ảnh/video đã bóc tách khoanh Bounding Box (Xanh lá: SV có mặt + MSSV, Xanh dương: GV, Đỏ: Người lạ).
  - Bảng Kết quả Tổng hợp + Nút xuất file Excel (`.xlsx`).

---

### 🖥️ MÀN HÌNH 5: MỤC BÁO CÁO & LƯU TRỮ LỊCH SỬ (REPORT & ARCHIVE CENTER)
- Xem lại danh sách ảnh/video bằng chứng đã khoanh Bounding Box theo ngày và xuất file Excel đối soát.

---

### 🖥️ MÀN HÌNH 6: QUẢN TRỊ SUPER ADMIN (ADMIN CONTROL CENTER)
- Quản lý User toàn trường, Quản lý Lớp toàn trường, Reset CSDL Sinh trắc, Cấu hình Ngưỡng AI và Bảng Audit Logs.

---

## 🗄️ 3. MÔ HÌNH CƠ SỞ DỮ LIỆU TỔNG THỂ (DATABASE SCHEMA)

1. **`users`**: `id`, `email`, `password_hash`, `full_name`, `role` (ADMIN/TEACHER/STUDENT), `code` (MSSV/MGV), `created_at`.
2. **`face_embeddings`**: `id`, `user_id`, `vector_512d` (Array/Vector), `angle_label` (FRONT/LEFT/RIGHT/DOWN), `created_at`.
3. **`classes`**: `id`, `class_code`, `class_name`, `subject_topic`, `created_by_teacher_id`, `created_at`.
4. **`class_teachers`**: `class_id`, `teacher_id`, `assigned_at` (Đồng quản lý).
5. **`class_students`**: `class_id`, `student_id`, `status` (PENDING/APPROVED), `joined_at`.
6. **`attendance_sessions`**: `id`, `class_id`, `session_date`, `created_by`.
7. **`session_media_files`**: `id`, `session_id`, `media_type` (IMAGE/VIDEO), `raw_file_path`, `processed_file_path`, `status` (PROCESSING/COMPLETED).
8. **`attendance_records`**: `id`, `session_id`, `user_id`, `status` (PRESENT/ABSENT), `confidence`, `detected_in_media_id`.
9. **`audit_logs`**: `id`, `user_id`, `action`, `ip_address`, `details_json`, `timestamp`.

---

## 🛑 CHỜ BẠN (HUMAN-IN-THE-LOOP) PHÊ DUYỆT BẢN MASTER v4.4

Bản **Master Specification v4.4** đã được bổ sung 2 cải tiến UX quan trọng:
- ✅ **Lật gương Camera Preview**: Thêm CSS scaleX(-1) giúp người dùng soi gương tự nhiên khi quay các góc mặt.
- ✅ **Tự động Chuyển hướng theo Role**: Đăng nhập 1 form duy nhất, tự chuyển đến đúng Portal (Sinh viên / Giảng viên / Admin).

Bạn xem qua và nhắn **"Duyệt"** để **Amelia (Dev)** và **Quinn (QA Lead)** bắt đầu tiến trình Lập trình & Kiểm thử tự động liên tục nhé!
