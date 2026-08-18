# BẢN ĐẶC TẢ MASTER THIẾT KẾ, KIẾN TRÚC & GIAO DIỆN HỆ THỐNG: QUẢN LÝ LỚP HỌC & ĐIỂM DANH SINH VIÊN TỰ ĐỘNG BẰNG AI (SIC_FaceRecognition)

> **Dự án**: `SIC_FaceRecognition`  
> **Cấp độ**: Master Enterprise & UI/UX Specification  
> **Phiên bản**: v4.3 Master  
> **Trạng thái**: 🟡 Hoàn thiện 100% (Bổ sung Bộ tiêu chuẩn Kiểm tra Chất lượng Ảnh chi tiết: Chói/Tối, Quá Xa/Quá Gần, Mờ/Nét khi đăng ký mặt) ➔ Chờ Human-in-the-loop (Bạn) Phê duyệt  

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
[ PHÂN HỆ SINH VIÊN ]               [ PHÂN HỆ GIẢNG VIÊN ]               [ PHÂN HỆ SUPER ADMIN ]
├── Auth & Login                    ├── Auth & Login                    ├── Admin Control Center
├── Đăng ký Mặt Đa góc (Chất lượng)├── Dashboard Lớp giảng dạy         ├── Quản lý User (SV/GV/Admin)
└── Portal Cá nhân & Join Lớp       ├── Quản lý Lớp (Tên Lớp + Chủ đề)   ├── Quản lý Lớp toàn trường
                                    ├── Đồng Quản lý (Co-Teaching)       ├── Giám sát CSDL Sinh trắc
                                    ├── Studio Upload Hàng Loạt Đa Tệp   └── Audit Logs & Config AI
                                    └── Mục Báo cáo & Xuất Excel
```

---

### 🖥️ MÀN HÌNH 1: GIAO DIỆN ĐĂNG NHẬP & XÁC THỰC (AUTH & LOGIN)
- **Layout**: Card Glassmorphic căn giữa trên nền Midnight có hiệu ứng mờ nhòe ánh sáng xanh (Ambient Blue Glow).
- **Thành phần**:
  - Tab chuyển đổi vai trò nhanh: **Sinh viên** | **Giảng viên** | **Quản trị viên (Admin)**.
  - Ô nhập Email / Mã số (MSSV/MGV) + Mật khẩu.
  - Nút bấm chính "Đăng Nhập" (Màu Electric Blue `#2563EB`).

---

### 🖥️ MÀN HÌNH 2: GIAO DIỆN ĐĂNG KÝ KHUÔN MẶT ĐA GÓC ĐỘ & ĐÁNH GIÁ CHẤT LƯỢNG MÔI TRƯỜNG

Quy trình Đăng ký Khuôn mặt Đa góc độ (Multi-Angle Face Registration) được thiết kế chi tiết với **Bộ tiêu chuẩn đánh giá chất lượng ảnh tự động**:

- **Layout**: Màn hình toàn cảnh camera tập trung với khung hướng dẫn Oval HUD.
- **Thành phần**:
  - **Khung Camera Viewport**: Tỷ lệ 4:3 với **Oval Guide Ring** (Vòng elip quét mặt ở chính giữa).

#### 🎯 BỘ TIÊU CHUẨN ĐÁNH GIÁ CHẤT LƯỢNG ẢNH TỰ ĐỘNG (IMAGE QUALITY CHECKS):

1. **Kiểm tra Điều kiện Ánh sáng (Illumination Check)**:
   - 🌑 **Ánh sáng quá tối (Too Dark)**: Cường độ sáng $\text{Brightness} < 70/255$ ➔ Vòng Ring hiện **Màu Vàng** + Dòng chữ chỉ dẫn: *"Ánh sáng quá tối, vui lòng bật thêm đèn hoặc di chuyển ra vùng sáng"*.
   - ☀️ **Ánh sáng quá chói / Ngược sáng (Overexposed / Backlit)**: Cường độ sáng $\text{Brightness} > 210/255$ ➔ Vòng Ring hiện **Màu Vàng** + Dòng chữ chỉ dẫn: *"Ánh sáng quá chói hoặc ngược sáng, vui lòng tránh nguồn sáng mạnh chiếu trực tiếp vào camera"*.
   - ✅ **Ánh sáng đạt chuẩn (Optimal Illumination)**: $70 \le \text{Brightness} \le 210$.

2. **Kiểm tra Khoảng cách tới Camera (Distance Check)**:
   - 🔍 **Mặt ở quá xa Camera (Too Far)**: Diện tích khuôn mặt chiếm $< 20\%$ diện tích khung Oval ➔ Vòng Ring hiện **Màu Vàng** + Dòng chữ chỉ dẫn: *"Vui lòng di chuyển mặt LẠI GẦN camera hơn"*.
   - 🔬 **Mặt ở quá gần Camera (Too Close)**: Diện tích khuôn mặt chiếm $> 65\%$ diện tích khung Oval ➔ Vòng Ring hiện **Màu Vàng** + Dòng chữ chỉ dẫn: *"Vui lòng lùi mặt RA XA camera một chút"*.
   - ✅ **Khoảng cách đạt chuẩn (Optimal Distance)**: Diện tích khuôn mặt chiếm $25\% \text{ đến } 55\%$ khung Oval.

3. **Kiểm tra Độ nét & Mờ (Blur & Sharpness Check)**:
   - 💨 **Mặt bị mờ (Blurry)**: Giá trị Laplacian Variance $< 100$ ➔ Vòng Ring hiện **Màu Vàng** + Dòng chữ chỉ dẫn: *"Ảnh bị mờ, xin hãy giữ yên đầu trong giây lát"*.
   - ✅ **Độ nét đạt chuẩn (Sharp & Clear)**: Giá trị Laplacian Variance $\ge 100$.

4. **Kiểm tra Góc quay Đa góc (Multi-Angle Pose Collection)**:
   - Khi Ánh sáng, Khoảng cách và Độ nét **TẤT CẢ ĐỀU ĐẠT (PASS)** ➔ Vòng Ring chuyển sang **MÀU XANH LÁ** và tự động chụp/trích xuất Vector 512-d cho 4 góc mặt:
     - **Góc 1**: Trực diện (Looking Straight).
     - **Góc 2**: Nghiêng trái $30^\circ$ (Turn Left).
     - **Góc 3**: Nghiêng phải $30^\circ$ (Turn Right).
     - **Góc 4**: Cúi/Ngẩng mặt nhẹ (Tilt Up/Down).
   - Sau khi hoàn thành 4/4 góc, Vector 512-d được lưu đồng bộ trực tiếp vào `src/app_modules/gallery.py` (`data_gallery/`).

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

Đây là **màn hình trung tâm** dành cho Giảng viên:

#### 📊 4.1. Dashboard Danh sách Lớp giảng dạy & Modal Tạo Lớp:
- Nút nổi bật **"+ Tạo Lớp Học Mới"**: Mở Modal nhập đúng 2 thông tin: **Tên Lớp** & **Chủ đề học**.
- Hệ thống tự động sinh **Mã Lớp (Class Code)** ngẫu nhiên dạng badge (ví dụ: `SIC2026-A1`).

#### 👥 4.2. Quản lý Thành viên Lớp học (Class Roster & Co-Teaching):
- **Tab "Duyệt Sinh Viên"**: Danh sách sinh viên xin vào ➔ Giảng viên bấm Duyệt/Từ chối.
- **Tab "Thêm Thủ Công"**: Ô nhập MSSV để kéo sinh viên vào lớp.
- **Nút "Thêm Giảng Viên Đồng Quản Lý"**: Cấp quyền cho GV khác cùng quản lý lớp.

#### 📸 4.3. Studio Upload Hàng Loạt & Phân Luồng Xử Lý (Batch Multi-Media Attendance Studio):
- **Khu vực Drag & Drop Hàng Loạt (Multi-file Drag & Drop Zone)**: Giảng viên có thể kéo-thả **tùy ý bao nhiêu tệp Ảnh và Video cùng lúc** vào một lượt điểm danh (Ví dụ: 5 ảnh `.jpg` + 2 video `.mp4`).
- **Cơ chế Phân luồng Xử lý Tự động (Automated Pipeline Splitting)**:
  - **Xử lý Ảnh**: Chạy qua luồng xử lý ảnh song song siêu tốc.
  - **Xử lý Video**: Đưa vào Celery/Redis background để tách khung hình & xử lý.
- **Khung Trình Chiếu Ảnh/Video Đã Xử Lý (Interactive Canvas Viewer)**:
  - Hiển thị ảnh/video đã bóc tách khuôn mặt (Khoanh Bounding Box Xanh lá: SV có mặt + MSSV, Xanh dương: GV, Đỏ: Người lạ).
- **Bảng Kết quả Điểm danh Tổng hợp (Consolidated Summary Table)**:
  - Gộp chung toàn bộ kết quả nhận diện từ tất cả ảnh & video trong lượt đó.
  - Thống kê: **Tổng sĩ số** | **Có mặt (Xanh)** | **Vắng mặt (Đỏ)**.
  - Nút **"Tải File Báo Cáo Excel (.xlsx)"**.

---

### 🖥️ MÀN HÌNH 5: MỤC BÁO CÁO & LƯU TRỮ LỊCH SỬ (REPORT & ARCHIVE CENTER)
- **Danh sách Buổi học theo Ngày**: Xem lại danh sách tất cả các tệp ảnh và video đã xử lý trong ngày đó.
- **Xuất Báo cáo Excel**: Tải về file `.xlsx` điểm danh tổng hợp.

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

## 🛑 CHỜ BẠN (HUMAN-IN-THE-LOOP) PHÊ DUYỆT BẢN MASTER v4.3

Bản **Master Specification v4.3** đã được cập nhật **chi tiết bộ tiêu chuẩn đánh giá chất lượng môi trường khi đăng ký mặt**:
- ✅ Kiểm tra Ánh sáng: Cảnh báo Ánh sáng quá tối / Ánh sáng quá chói hoặc ngược sáng.
- ✅ Kiểm tra Khoảng cách: Cảnh báo Mặt quá xa camera / Mặt quá gần camera.
- ✅ Kiểm tra Độ nét & Mờ: Cảnh báo Ảnh bị mờ, yêu cầu giữ yên đầu.
- ✅ Đủ tiêu chuẩn ➔ Tự động lưu 4/4 góc mặt vào CSDL `data_gallery/`.

Bạn xem qua và nhắn **"Duyệt"** để **Amelia (Dev)** và **Quinn (QA Lead)** bắt đầu tiến trình Lập trình & Kiểm thử tự động liên tục nhé!
