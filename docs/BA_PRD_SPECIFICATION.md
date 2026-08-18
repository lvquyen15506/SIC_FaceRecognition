# BẢN ĐẶC TẢ BA & PRD CHÍNH THỨC: HỆ THỐNG ĐIỂM DANH LỚP HỌC TỰ ĐỘNG THÔNG QUA THU THẬP KHUÔN MẶT ĐA GÓC ĐỘ (MULTI-ANGLE STUDENT ENROLLMENT & CLASSROOM ATTENDANCE)

> **Dự án**: `SIC_FaceRecognition`  
> **Trạng thái**: 🟡 Đã cập nhật theo phản hồi chính xác của User ➔ Chờ Human-in-the-loop (Bạn) Duyệt lại  
> **Định hướng cốt lõi**:  
> 1. **Phần Sinh Viên (Student Side)**: Sử dụng luồng "eKYC Đa góc độ" để sinh viên tự quay/chụp các góc mặt (thẳng, nghiêng trái, nghiêng phải, cúi/ngẩng). Mục đích là thu thập dữ liệu khuôn mặt chi tiết và phong phú nhất, tránh bị lỗi điểm danh khi bị che khuất trong lớp.  
> 2. **Phần Giảng Viên / Lớp Học (Teacher/Class Side)**: Tải ảnh toàn cảnh lớp học (Panoramic Photo) hoặc Video lớp học lên Web. AI sẽ tự bóc tách tất cả khuôn mặt trong lớp, so khớp với CSDL đa góc độ của sinh viên và xuất ra Bảng điểm danh tự động.

---

## 💬 1. BIÊN BẢN THẢO LUẬN LẠI GIỮA CÁC AGENT (REVISED AGENT LOG)

* **Mary (BA)**: *"Cảm ơn phản hồi của anh! Chúng tôi đã hiểu chính xác bài toán. Mục đích chính của hệ thống là **Điểm danh Lớp học tự động từ 1 ảnh/video toàn cảnh**. Việc cho sinh viên quay mặt kiểu 'eKYC' là để thu thập **Bộ vector đặc trưng đa góc độ (Multi-angle Embedding Gallery)** cho từng sinh viên, giúp AI không bị nhận diện trượt khi sinh viên ngồi nghiêng, cúi đầu hay bị che khuất một phần trong lớp."*
* **Winston (Architect)**: *"Trong `src/`, chúng ta đã có sẵn toàn bộ thuật toán core này! 
  - `src/app_modules/test_pose_liveness.py`: Hướng dẫn sinh viên quay các góc mặt (Pitch, Yaw, Roll) để lấy đủ ảnh đa góc.
  - `src/app_modules/gallery.py`: Lưu trữ tập hợp Vector 512-d đa góc của từng sinh viên theo Mã Số Sinh Viên (MSSV).
  - `src/app_modules/attendance.py`: Bóc tách tất cả khuôn mặt trong ảnh/video toàn cảnh lớp học và so khớp Cosine Similarity với CSDL đa góc."*
* **Sally (UX Designer)**: *"Tôi sẽ chia giao diện Web thành 2 phân hệ rõ ràng:
  - **Phân hệ Sinh viên (Student Enrollment UI)**: Giao diện chụp/quay đa góc mặt với khung elip hướng dẫn (quay trái, quay phải, cúi/ngẩng) chuẩn `DESIGN.md`.
  - **Phân hệ Giảng viên (Teacher Attendance Dashboard)**: Nơi giảng viên upload ảnh/video toàn cảnh lớp học, xem danh sách điểm danh real-time, danh sách Có mặt / Vắng mặt và xuất file Excel."*
* **John (PM)**: *"Tôi đã tổng hợp lại bản PRD chuẩn xác 100% bên dưới để anh duyệt!"*

---

## 📋 2. PHẠM VI SẢN PHẨM & USER STORIES CHÍNH THỨC (PRD)

### 🔹 PHÂN HỆ 1: THU THẬP DỮ LIỆU KHUÔN MẶT ĐA GÓC ĐỘ (STUDENT MULTI-ANGLE ENROLLMENT)

- **Mục tiêu**: Giúp sinh viên tự đăng ký thông tin (Họ tên, MSSV, Lớp) và tự quay/chụp dữ liệu khuôn mặt ở nhiều góc độ khác nhau.
- **User Story 1.1**:
  - **As a**: Sinh viên trong trường.
  - **I want to**: Vào ứng dụng Web, nhập MSSV và quay khuôn mặt ở các góc nghiêng (Trực diện, Nghiêng trái $30^\circ$, Nghiêng phải $30^\circ$, Cúi/Ngẩng).
  - **So that**: Hệ thống thu thập đủ dữ liệu góc mặt của tôi, đảm bảo khi ngồi trong lớp dù nghiêng mặt hay cúi đầu vẫn được điểm danh chính xác.
- **Acceptance Criteria**:
  - *Given*: Sinh viên mở Web bằng điện thoại hoặc laptop.
  - *When*: Sinh viên quay đủ các góc mặt theo chỉ định của `test_pose_liveness.py`.
  - *Then*: `src/core/model.py` trích xuất tập hợp vector 512-d tương ứng với từng góc mặt và lưu vào `src/app_modules/gallery.py` dưới ID là MSSV.

---

### 🔹 PHÂN HỆ 2: ĐIỂM DANH LỚP HỌC TỰ ĐỘNG (CLASSROOM AUTOMATIC ATTENDANCE)

- **Mục tiêu**: Cho phép Giảng viên tải ảnh toàn cảnh hoặc video góc rộng của lớp học để điểm danh tự động cả lớp chỉ trong vài giây.
- **User Story 2.1**:
  - **As a**: Giảng viên quản lý lớp học.
  - **I want to**: Chụp 1 bức ảnh toàn cảnh cả lớp bằng điện thoại/máy ảnh và tải lên Web.
  - **So that**: AI tự động nhận diện tất cả sinh viên đang có mặt trong lớp mà tôi không cần đọc tên từng người.
- **Acceptance Criteria**:
  - *Given*: Giảng viên tải ảnh toàn cảnh lớp học (có thể chứa 30-80 sinh viên).
  - *When*: Nhấn nút "Tiến hành Điểm danh".
  - *Then*:
    1. `src/app_modules/detector.py` bóc tách tất cả $N$ khuôn mặt trong ảnh toàn cảnh.
    2. `src/app_modules/attendance.py` so khớp từng khuôn mặt với CSDL đa góc của trường.
    3. Trả về Bảng danh sách: **Tổng số sinh viên**, **Danh sách CÓ MẶT (kèm ảnh crop & tỉ lệ khớp %)**, **Danh sách VẮNG MẶT**.
    4. Hỗ trợ xuất Bảng điểm danh ra file Excel (`.xlsx`).

---

## 📐 3. THIẾT KẾ KỸ THUẬT & UI TOKENS (`DESIGN.MD`)

1. **Backend Layer**: FastAPI kết nối trực tiếp tới `src/app_modules/attendance.py` và `src/app_modules/gallery.py`.
2. **Frontend Layer**:
   - Giao diện Sinh viên: Dark Glassmorphic Camera HUD với chỉ dẫn quay mặt 4 hướng.
   - Giao diện Giảng viên: Dashboard quản lý lớp, vùng kéo-thả Upload ảnh toàn cảnh, Bảng danh sách sinh viên có mảng màu phân biệt (Xanh lá: Có mặt, Đỏ: Vắng mặt).

---

## 🛑 CHỜ BẠN (HUMAN-IN-THE-LOOP) DUYỆT LẠI

Bản đặc tả đã được điều chỉnh **chính xác 100% theo đúng bài toán Điểm danh Lớp học từ dữ liệu đa góc mặt** của bạn. Bạn xem qua và duyệt phương án này để **Amelia (Dev)** & **Quinn (QA)** bắt đầu triển khai nhé!
