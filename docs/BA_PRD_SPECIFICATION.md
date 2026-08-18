# BẢN ĐẶC TẢ MASTER THIẾT KẾ, KIẾN TRÚC & GIAO DIỆN HỆ THỐNG: QUẢN LÝ LỚP HỌC & ĐIỂM DANH SINH VIÊN TỰ ĐỘNG BẰNG AI (SIC_FaceRecognition)

> **Dự án**: `SIC_FaceRecognition`  
> **Cấp độ**: Master Enterprise & UI/UX Specification (Đặc tả Tổng thể Kiến trúc & Giao diện)  
> **Phiên bản**: v4.0 Master  
> **Trạng thái**: 🟡 Hoàn thiện 100% đầy đủ từ Tech Stack, Phân quyền Admin, Bảo mật đến CHI TIẾT GIAO DIỆN TỪNG MÀN HÌNH (UI/UX Layout) ➔ Chờ Human-in-the-loop (Bạn) Phê duyệt  

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
  - `Warning Amber`: `#D97706` (Cảnh báo góc mặt lệch / Thiếu sáng)
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
├── Đăng ký Mặt Đa góc (HUD)        ├── Dashboard Lớp giảng dạy         ├── Quản lý User (SV/GV/Admin)
└── Portal Cá nhân & Join Lớp       ├── Quản lý Lớp & Mã Lớp            ├── Quản lý Lớp toàn trường
                                    ├── Đồng Quản lý (Co-Teaching)       ├── Giám sát CSDL Sinh trắc
                                    ├── Studio Upload Điểm danh          └── Audit Logs & Config AI
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

### 🖥️ MÀN HÌNH 2: GIAO DIỆN ĐĂNG KÝ KHUÔN MẶT ĐA GÓC ĐỘ (MULTI-ANGLE FACE REGISTRATION HUD)
- **Layout**: Màn hình toàn cảnh camera tập trung với khung hướng dẫn sinh trắc học.
- **Thành phần**:
  - **Khung Camera Viewport**: Tỷ lệ 4:3 với **Oval Biometric Guide Ring** (Vòng elip quét mặt ở chính giữa).
  - **Hiệu ứng Vòng Ring Real-time**:
    - *Xanh Lá*: Mặt nằm đúng vị trí, góc nét.
    - *Vàng*: Hướng dẫn quay mặt: "Xin vui lòng quay mặt sang trái $30^\circ$", "Quay sang phải", "Cúi/Ngẩng".
    - *Đỏ*: Cảnh báo quá tối hoặc nghi vấn giả mạo.
  - **Thanh Tiến Trình Đa Góc (Progress Tracker)**: 4 ô trạng thái đại diện 4 góc mặt (Trực diện ➔ Nghiêng Trái ➔ Nghiêng Phải ➔ Cúi/Ngẩng). Khi thu thập đủ 4/4 vector 512-d, hệ thống hiển thị nút **"Hoàn tất Đăng ký"**.

---

### 🖥️ MÀN HÌNH 3: PORTAL SINH VIÊN (STUDENT DASHBOARD)
- **Layout**: Sidebar điều hướng + Dashboard tổng quan.
- **Thành phần**:
  - **Thẻ Trạng thái Sinh trắc**: Hộp hiển thị "Dữ liệu khuôn mặt: ĐÃ HOÀN THIỆN (4/4 góc mặt)" kèm nút "Chụp lại" nếu muốn cập nhật.
  - **Hộp Join Lớp học Mới**: Ô nhập **Mã Lớp (Class Code)** + Nút "Gửi Yêu Cầu Tham Gia".
  - **Danh sách Lớp học Đã Tham gia**: Các thẻ Card hiển thị Tên môn, Giảng viên phụ trách, Tỷ lệ đi học (ví dụ: `100% - 8/8 buổi`).
  - **Bảng Lịch sử Điểm danh Cá nhân**: Danh sách chi tiết các buổi học (Ngày, Trạng thái Có mặt/Vắng mặt).

---

### 🖥️ MÀN HÌNH 4: WORKSPACE GIẢNG VIÊN (TEACHER DASHBOARD & CLASSROOM STUDIO)

Đây là **màn hình trung tâm** dành cho Giảng viên:

#### 📊 4.1. Dashboard Danh sách Lớp giảng dạy:
- Nút nổi bật **"+ Tạo Lớp Học Mới"**: Mở Modal nhập Tên môn, Học kỳ ➔ Hệ thống tự động hiển thị **Mã Lớp (Class Code)** dạng badge nổi bật (ví dụ: `SIC2026-A1`) để copy gửi cho sinh viên.
- Danh sách thẻ Lớp học: Hiển thị Sĩ số sinh viên, danh sách Giảng viên cùng quản lý.

#### 👥 4.2. Quản lý Thành viên Lớp học (Class Roster & Co-Teaching):
- **Tab "Duyệt Sinh Viên"**: Danh sách sinh viên nhập Mã Lớp xin vào ➔ Giảng viên bấm Duyệt/Từ chối.
- **Tab "Thêm Thủ Công"**: Ô nhập MSSV để kéo sinh viên vào lớp.
- **Nút "Thêm Giảng Viên Đồng Quản Lý"**: Cho phép tìm email/Mã GV khác để cấp quyền cùng quản lý lớp học này.

#### 📸 4.3. Studio Upload & Điểm Danh Tự Động (Attendance Studio):
- **Vùng Kéo-thả Upload (Drag & Drop Zone)**: Hỗ trợ kéo-thả Ảnh toàn cảnh (Panoramic Photo) hoặc Video lớp học (`.mp4`, `.png`, `.jpg`).
- **Khung Trình Chiếu Ảnh/Video Đã Xử Lý (Interactive Canvas Viewer)**:
  - Hiển thị ảnh/video lớp học với các **Khung Bounding Box nổi bật**:
    - **Khung Xanh Lá**: Sinh viên có mặt trong lớp (Hiển thị Tag: `[MSSV] Nguyễn Văn A - 98.5%`).
    - **Khung Xanh Dương**: Giảng viên có mặt (Hiển thị Tag: `[GV] ThS. Trần Văn B`).
    - **Khung Đỏ**: Người lạ / Không có trong danh sách lớp.
- **Bảng Kết quả Điểm danh Tức thì (Real-time Summary Table)**:
  - Thống kê: **Tổng sĩ số** | **Có mặt (Xanh)** | **Vắng mặt (Đỏ)**.
  - Nút **"Tải File Báo Cáo Excel (.xlsx)"**.

---

### 🖥️ MÀN HÌNH 5: MỤC BÁO CÁO & LƯU TRỮ LỊCH SỬ (REPORT & ARCHIVE CENTER)
- **Layout**: Bảng bộ lọc theo Ngày / Học kỳ / Lớp học.
- **Thành phần**:
  - **Danh sách Buổi học theo Ngày**: Mỗi ngày điểm danh là một hàng dữ liệu.
  - **Cột Bằng chứng Ảnh/Video (Processed Media Viewer)**: Bấm vào để xem lại ảnh/video đã được khoanh Bounding Box + Tên/MSSV của buổi học đó để đối soát minh bạch.
  - **Nút Xuất Báo cáo**: Tải xuống file Excel báo cáo tổng hợp chi tiết theo tháng/học kỳ.

---

### 🖥️ MÀN HÌNH 6: QUẢN TRỊ SUPER ADMIN (ADMIN CONTROL CENTER)
- **Layout**: Dashboard quản trị hệ thống dành riêng cho Super Admin.
- **Thành phần**:
  - **Quản lý Người dùng toàn trường**: Bảng tìm kiếm, tạo mới, phân quyền (SV ➔ GV ➔ Admin), khóa hoặc xóa tài khoản.
  - **Quản lý Lớp toàn trường**: Xem tất cả các lớp, gán lại giảng viên phụ trách.
  - **Giám sát CSDL Sinh trắc**: Reset bộ Vector 512-d của sinh viên khi có yêu cầu chụp lại.
  - **Cấu hình Tham số AI**: Ô nhập phần trăm ngưỡng điểm danh (Cosine Threshold), cài đặt thời hạn Token bảo mật.
  - **Nhật ký Audit Logs**: Bảng xem vết IP, thời gian, hành vi của tất cả người dùng trong hệ thống.

---

## 🏗️ 3. KIẾN TRÚC KỸ THUẬT VÀ TECH STACK TỔNG THỂ

```text
[ FRONTEND LAYER ] ──(REST API / WS)──> [ BACKEND API LAYER ] ──> [ CORE AI LAYER (src/) ]
(React/Next.js/Tailwind)                 (FastAPI/Async/Celery)         (FaceViT + ArcFace)
                                                  │
                                                  ▼
                                         [ DATABASE LAYER ]
                                     (PostgreSQL + PGVector/Qdrant)
```

- **Core AI Layer (`src/`)**: PyTorch, Custom Vision Transformer (**FaceViT**), ArcFace Loss, OpenCV, ONNX Runtime, NumPy (`src/core/model.py`, `src/app_modules/test_pose_liveness.py`, `src/app_modules/gallery.py`, `src/app_modules/attendance.py`).
- **Backend API Layer**: Python **FastAPI** (Async/Await), SQLAlchemy 2.0 ORM, Pydantic v2, Celery + Redis (xử lý Video nặng background), openpyxl (xuất Excel).
- **Database Layer**: **PostgreSQL 16** (Lưu RDBMS) + **PGVector / Qdrant** (So khớp Vector 512-d $<10ms$).
- **Frontend Web Layer**: **React 18 / Next.js**, Tailwind CSS tuân thủ 100% [DESIGN.md](file:///run/media/lvquyen15506/D/SIC/face_recognition_project/DESIGN.md), Lucide Icons, Canvas API (vẽ Bounding Box real-time).

---

## 🔒 4. AN NINH VÀ BẢO MẬT HỆ THỐNG (SECURITY & COMPLIANCE)

1. **Mã hóa Sinh trắc học**: Vector 512-d và ảnh gốc được mã hóa bằng **AES-256**, kiểm tra tính toàn vẹn bằng SHA-256.
2. **Xác thực JWT & RBAC**: JWT Token (`httpOnly Cookie`) phân quyền chặt chẽ Middleware (`Admin`, `Teacher`, `Student`).
3. **Bảo mật API**: Rate Limiting (60 requests/phút/IP), Input Sanitization (chống Shell/RCE), CORS & HTTPS/TLS 1.3.
4. **Nhật ký Audit Logging**: Ghi vết IP, Timestamp và hành vi vào bảng `audit_logs`.

---

## 🗄️ 5. MÔ HÌNH CƠ SỞ DỮ LIỆU TỔNG THỂ (DATABASE SCHEMA)

1. **`users`**: `id`, `email`, `password_hash`, `full_name`, `role` (ADMIN/TEACHER/STUDENT), `code` (MSSV/MGV), `created_at`.
2. **`face_embeddings`**: `id`, `user_id`, `vector_512d` (Array/Vector), `angle_label` (FRONT/LEFT/RIGHT/DOWN), `created_at`.
3. **`classes`**: `id`, `class_code`, `class_name`, `created_by_teacher_id`, `created_at`.
4. **`class_teachers`**: `class_id`, `teacher_id`, `assigned_at` (Đồng quản lý).
5. **`class_students`**: `class_id`, `student_id`, `status` (PENDING/APPROVED), `joined_at`.
6. **`attendance_sessions`**: `id`, `class_id`, `session_date`, `raw_media_path`, `processed_media_path`, `created_by`.
7. **`attendance_records`**: `id`, `session_id`, `user_id`, `status` (PRESENT/ABSENT), `confidence`, `bounding_box_json`.
8. **`audit_logs`**: `id`, `user_id`, `action`, `ip_address`, `details_json`, `timestamp`.

---

## 🛑 CHỜ BẠN (HUMAN-IN-THE-LOOP) PHÊ DUYỆT BẢN MASTER v4.0

Bản **Master Specification v4.0** hiện đã hoàn thiện **100% ĐẦY ĐỦ NHẤT**:
- ✅ Tech Stack 4 tầng & Bảo vệ `src/`.
- ✅ Phân quyền Super Admin, Giảng viên, Sinh viên.
- ✅ Bảo mật AES-256, JWT, Rate Limiting & Audit Logs.
- ✅ **ĐẦY ĐỦ CHI TIẾT GIAO DIỆN TỪNG MÀN HÌNH (Màn hình 1 ➔ Màn hình 6)**.

Bạn xem qua và nhắn **"Duyệt"** để **Amelia (Dev)** và **Quinn (QA Lead)** bắt đầu tiến trình Lập trình - Kiểm thử tự động liên tục nhé!
