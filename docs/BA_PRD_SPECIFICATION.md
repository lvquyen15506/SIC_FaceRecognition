# BẢN ĐẶC TẢ MASTER THIẾT KẾ VÀ KIẾN TRÚC HỆ THỐNG: QUẢN LÝ LỚP HỌC & ĐIỂM DANH SINH VIÊN TỰ ĐỘNG BẰNG AI (SIC_FaceRecognition)

> **Dự án**: `SIC_FaceRecognition`  
> **Cấp độ**: Enterprise Specification (Đặc tả Tổng thể Doanh nghiệp)  
> **Phiên bản**: v3.0 Master  
> **Trạng thái**: 🟡 Hoàn thiện 100% đầy đủ từ Tech Stack, Phân quyền Admin, Bảo mật đến Luồng Hoạt động ➔ Chờ Human-in-the-loop (Bạn) Phê duyệt  

---

## 🏗️ 1. TỔNG QUAN KIẾN TRÚC & TECH STACK HỆ THỐNG (FULL TECH STACK)

Hệ thống được thiết kế theo mô hình **Decoupled Architecture (Kiến trúc Phân tách)** với 4 tầng rõ ràng:

```text
[ FRONTEND LAYER ] ──(REST API / WS)──> [ BACKEND API LAYER ] ──> [ CORE AI LAYER (src/) ]
(React/Next.js/Tailwind)                 (FastAPI/Async/Celery)         (FaceViT + ArcFace)
                                                  │
                                                  ▼
                                         [ DATABASE LAYER ]
                                     (PostgreSQL + PGVector/Qdrant)
```

### 🔹 1.1. Core AI Layer (`src/`) — [GIỮ NGUYÊN & BẢO VỆ 100%]
- **Mô hình chính**: Custom Vision Transformer (**FaceViT**) kết hợp **ArcFace Margin Loss** (`src/core/model.py`, `src/core/arcface.py`).
- **Trích xuất Đặc trưng**: Xuất Vector 512 chiều (512-d Normalized Embedding).
- **Anti-Spoofing & Pose Liveness**: `src/app_modules/test_pose_liveness.py` (Đo góc Pitch, Yaw, Roll).
- **Face Detector & Alignment**: `src/app_modules/detector.py` (Cắt và chuẩn hóa ảnh 112x112).
- **Gallery & Matching**: `src/app_modules/gallery.py` (Lưu trữ và so khớp Cosine Distance).
- **Thư viện AI**: Python 3.10, PyTorch, OpenCV, ONNX Runtime, NumPy, SciPy.

### 🔹 1.2. Backend API Layer (Xây dựng mới)
- **Framework**: Python **FastAPI** (Hỗ trợ Async/Await hiệu năng cao).
- **ORM & Validation**: SQLAlchemy 2.0 ORM + Pydantic v2 data validation.
- **Background Tasks**: Celery + Redis (Chuyên xử lý các file Video lớp học dung lượng lớn ở background).
- **Tạo File Báo cáo**: `pandas`, `openpyxl` (Xuất file Excel `.xlsx`).

### 🔹 1.3. Database Layer (Xây dựng mới)
- **RDBMS**: **PostgreSQL 16** (Lưu trữ người dùng, lớp học, lịch sử điểm danh).
- **Vector Search Engine**: Extension `PGVector` hoặc `Qdrant` (Tìm kiếm và so khớp Vector 512-d tốc độ cao $< 10ms$).

### 🔹 1.4. Frontend Web Layer (Xây dựng mới)
- **Framework**: **React 18 / Next.js** (TypeScript).
- **Styling & UI Tokens**: Tailwind CSS tuân thủ 100% bản thiết kế [DESIGN.md](file:///run/media/lvquyen15506/D/SIC/face_recognition_project/DESIGN.md) của Google Labs (Dark Glassmorphism, Deep Navy `#0F172A`, Electric Blue `#2563EB`).
- **Icons & Components**: Lucide-React Icons, Headless UI / Radix UI.
- **Canvas API**: Xử lý vẽ Bounding Box + Name Tag real-time trên ảnh/video.

---

## 👥 2. PHÂN QUYỀN VÀ VAI TRÒ HỆ THỐNG (ROLE-BASED ACCESS CONTROL - RBAC)

Hệ thống được chia làm **3 nhóm vai trò người dùng**:

```text
               ┌────────────────────────────────────────┐
               │          SUPER ADMIN (Quản trị)         │
               │   (Quyền tối cao: Toàn bộ hệ thống)    │
               └───────────────────┬────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌─────────────────────────────────┐         ┌─────────────────────────────────┐
│     GIẢNG VIÊN (TEACHER)        │         │      SINH VIÊN (STUDENT)        │
│  - Đăng ký mặt đa góc           │         │  - Đăng ký mặt đa góc           │
│  - Tạo Lớp & Mã Lớp             │         │  - Nhập Mã Lớp để Join          │
│  - Đồng quản lý Lớp             │         │  - Xem kết quả điểm danh cá nhân│
│  - Upload Ảnh/Video Điểm danh   │         └─────────────────────────────────┘
│  - Xem Báo cáo & Xuất Excel     │
└─────────────────────────────────┘
```

### 🛡️ 2.1. Quyền Super Admin (Admin Tối Cao)
Admin có **TOÀN BỘ QUYỀN (Full Permissions)** trên toàn hệ thống:
1. **Quản lý Tài khoản (User Management)**: Xem, tạo mới, chỉnh sửa, đổi vai trò, khóa hoặc xóa bất kỳ tài khoản Sinh viên, Giảng viên hay Admin khác.
2. **Quản lý Lớp học Toàn trường (Global Class Management)**: Xem tất cả các lớp học, can thiệp thêm/bớt Giảng viên hoặc Sinh viên vào bất kỳ lớp nào.
3. **Quản lý CSDL Sinh trắc học (Biometric Data Governance)**: Reset hoặc yêu cầu chụp lại dữ liệu khuôn mặt của người dùng bị lỗi/biến dạng.
4. **Cấu hình Hệ thống (System Settings)**:
   - Cài đặt Ngưỡng điểm danh (Cosine Similarity Threshold, mặc định $75\%$).
   - Cài đặt độ nhạy Liveness Anti-spoofing.
5. **Nhật ký Giám sát (Audit Logs)**: Xem toàn bộ lịch sử đăng nhập, lịch sử điểm danh, lịch sử chỉnh sửa của Giảng viên và Sinh viên.

### 👨‍🏫 2.2. Quyền Giảng viên (Teacher)
1. Đăng ký dữ liệu khuôn mặt đa góc độ của bản thân.
2. Tạo Lớp học mới ➔ Hệ thống sinh **Mã Lớp (Class Code)** duy nhất.
3. Phân quyền **Đồng Quản Lý**: Thêm các Giảng viên khác vào cùng quản lý lớp.
4. Quản lý Sinh viên trong lớp: Duyệt sinh viên join bằng Mã Lớp hoặc thêm thủ công theo MSSV.
5. Upload Ảnh/Video toàn cảnh lớp học để tiến hành Điểm danh tự động.
6. Xem Mục Báo cáo: Xem Ảnh/Video đã bóc tách khuôn mặt (có Bounding Box), xem danh sách Có mặt/Vắng mặt theo Ngày và xuất file Excel.

### 👨‍🎓 2.3. Quyền Sinh viên (Student)
1. Đăng ký dữ liệu khuôn mặt đa góc độ (Trực diện, Nghiêng trái, Nghiêng phải, Cúi/Ngẩng) qua camera Web.
2. Nhập Mã Lớp để xin gia nhập Lớp học.
3. Xem lịch sử và tỷ lệ điểm danh cá nhân theo từng môn học.

---

## 🔒 3. AN NINH VÀ BẢO MẬT HỆ THỐNG (SECURITY & COMPLIANCE)

1. **Mã hóa Sinh trắc học (Biometric Data Encryption)**:
   - Tất cả Vector đặc trưng 512-d và ảnh gốc khuôn mặt được mã hóa bằng thuật toán **AES-256** khi lưu trên ổ đĩa.
   - Vector khuôn mặt được hash và kiểm tra tính toàn vẹn bằng SHA-256.
2. **Xác thực & Phân quyền (Auth & RBAC)**:
   - Sử dụng **JWT (JSON Web Token)** với cơ chế Access Token (hạn 30 phút) và Refresh Token (hạn 7 ngày) lưu trong `httpOnly Cookie` để chống XSS.
   - Phân quyền theo Middleware (`RequireRole(["ADMIN"])`, `RequireRole(["TEACHER"])`).
3. **Bảo mật API & Chống Tấn công**:
   - **Rate Limiting**: Giới hạn tối đa 60 requests/phút/IP để chống tấn công DDoS API.
   - **Input Sanitization**: Kiểm tra định dạng file upload (chỉ chấp nhận JPG/PNG/MP4/AVI), chống Malicious Shell / RCE.
   - **CORS & HTTPS**: Bắt buộc HTTPS / TLS 1.3 và cấu hình CORS nghiêm ngặt.
4. **Nhật ký Kiểm toán (Audit Logging)**:
   - Mọi thao tác xóa dữ liệu, sửa điểm danh hoặc thay đổi quyền Admin đều được ghi vết vào bảng `audit_logs` (lưu IP, User Agent, Timestamp, Hành vi).

---

## 🔄 4. CHI TIẾT CÁC QUY TRÌNH HOẠT ĐỘNG (SYSTEM WORKFLOWS)

### 🔄 Luồng 1: Đăng ký Dữ liệu Mặt Đa góc độ (Multi-Angle Enrollment Workflow)
```text
[ SV/GV Đăng nhập ] ──> [ Mở Trang Hồ sơ Sinh trắc ] ──> [ Bật Camera Web ]
                                                                │
                                                                ▼
[ Trích xuất Vector 512-d ] <── [ Kiểm tra Liveness 4 Hướng ] <──┘
           │                  (Thẳng -> Trái -> Phải -> Cúi)
           ▼
[ Mã hóa & Lưu CSDL Gallery (`data_gallery/`) ]
```

### 🔄 Luồng 2: Tạo Lớp & Gia nhập Lớp (Classroom Setup Workflow)
```text
[ Giảng viên Tạo Lớp ] ──> [ Sinh Mã Lớp (Class Code) ] ──> [ Gửi Mã Lớp cho SV ]
                                                                  │
[ Giảng viên Duyệt / Thêm SV ] <── [ SV Đăng nhập & Nhập Mã Lớp ] <──┘
```

### 🔄 Luồng 3: Upload & Điểm danh Tự động (Attendance Processing Workflow)
```text
[ Giảng viên chọn Lớp & Buổi học ] ──> [ Upload Ảnh / Video Toàn cảnh Lớp ]
                                                        │
                                                        ▼
[ Xuất Bảng Điểm Danh + File Excel ] <── [ AI Bóc tách Mặt & Khoanh Bounding Box ]
```

### 🔄 Luồng 4: Báo cáo Lịch sử & Kiểm soát Minh bạch (Report & Audit Workflow)
```text
[ Vào Mục Báo Cáo Buổi Học ] ──> [ Xem Ảnh/Video Đã Xử Lý (Gắn Bounding Box + Tên) ]
                                                │
                                                ▼
                        [ Tải File Báo cáo Excel (.xlsx) Đối soát ]
```

---

## 🗄️ 5. MÔ HÌNH CƠ SỞ DỮ LIỆU TỔNG THỂ (MASTER DATABASE SCHEMA)

1. **`users`**: `id`, `email`, `password_hash`, `full_name`, `role` (ADMIN/TEACHER/STUDENT), `code` (MSSV/MGV), `created_at`.
2. **`face_embeddings`**: `id`, `user_id`, `vector_512d` (Array/Vector), `angle_label` (FRONT/LEFT/RIGHT/DOWN), `created_at`.
3. **`classes`**: `id`, `class_code`, `class_name`, `created_by_teacher_id`, `created_at`.
4. **`class_teachers`**: `class_id`, `teacher_id`, `assigned_at` (Hỗ trợ đồng quản lý).
5. **`class_students`**: `class_id`, `student_id`, `status` (PENDING/APPROVED), `joined_at`.
6. **`attendance_sessions`**: `id`, `class_id`, `session_date`, `raw_media_path`, `processed_media_path`, `created_by`.
7. **`attendance_records`**: `id`, `session_id`, `user_id`, `status` (PRESENT/ABSENT), `confidence`, `bounding_box_json`.
8. **`audit_logs`**: `id`, `user_id`, `action`, `ip_address`, `details_json`, `timestamp`.

---

## 🛑 CHỜ BẠN (HUMAN-IN-THE-LOOP) DUYỆT BẢN MASTER

Bản **Master Specification v3.0** đã hoàn thiện **100% đầy đủ từ Tech Stack, Phân quyền Super Admin, Bảo mật AES-256/JWT, CSDL PostgreSQL đến 4 Luồng Hoạt động**.

Bạn xem qua và nhắn **"Duyệt"** để **Amelia (Dev)** và **Quinn (QA Lead)** bắt đầu tiến trình Lập trình & Kiểm thử tự động nhé!
