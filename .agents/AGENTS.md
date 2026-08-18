# QUY TẮC VẬN HÀNH DỰ ÁN SIC_FaceRecognition (AGENT RULES & OPERATIONAL GUIDELINES)

## 🎯 1. BẢO VỆ TUYỆT ĐỐI NGUYÊN BẢN CORE AI (`src/`)
- Mọi mã nguồn nằm trong thư mục `src/` (`src/core/model.py`, `src/core/arcface.py`, `src/app_modules/detector.py`, `src/app_modules/gallery.py`, `src/app_modules/test_pose_liveness.py`) **KHÔNG ĐƯỢC PHÉP SỬA ĐỔI HOẶC XÓA**.
- Mọi chức năng Web API & UI phải bọc xung quanh `src/` thông qua `web_app/backend/app/services/ai_engine.py`.

---

## 🎨 2. TÂN THỦ CHUẨN DESIGN SYSTEM (`DESIGN.MD`)
- Tất cả giao diện Web tuân thủ chuẩn **Google Labs DESIGN.md** ([DESIGN.md](file:///run/media/lvquyen15506/D/SIC/face_recognition_project/DESIGN.md)).
- Sử dụng màu Midnight Dark (`#090D16`), Glassmorphic Banking UI (`#1E293B`), Electric Blue Accent (`#2563EB`), Font Google `Inter` & `Space Grotesk`.
- Đèn báo Liveness / Cảm biến môi trường: Xanh lá (`#059669`), Vàng (`#D97706`), Đỏ (`#DC2626`).
- **Lật gương Camera Preview**: Áp dụng CSS `transform: scaleX(-1)` cho thẻ preview webcam để người dùng soi gương tự nhiên.

---

## 🤖 3. ĐIỀU HÀNH BMAD AGENT SUITE & QUYỀN TỰ ĐỘNG HÓA CAO NHẤT (FULL AUTONOMY)
- **Cấp quyền Tự Động Hóa Tối Đa (Full Auto-Approval Authority)**: Theo chỉ thị trực tiếp từ User, các Agent (Amelia Dev, Quinn QA, Winston Architect, Sally UX, Mary BA, John PM) được cấp quyền **tự động khởi tạo, chỉnh sửa, xóa file và chạy lệnh shell/build/test một cách hoàn toàn tự động** mà không cần hỏi duyệt thủ công từng thao tác đơn lẻ.
- **Vòng lặp Dev-QA (Amelia <-> Quinn)**: Amelia lập trình ➔ Quinn tự động chạy test Backend (`tests/test_api.py`) và Frontend UI (`tests/test_ui.py`) cho tới khi $100\%$ PASS.

---

## 🔒 4. QUẢN LÝ TÀI KHOẢN, PHÂN QUYỀN & QUẢN LÝ LỚP
- **Auto-Role Login Redirection**: Đăng nhập 1 form duy nhất, tự động chuyển hướng theo `role` trong JWT Token:
  - `role == 'STUDENT'` ➔ Student Portal (Thu thập dữ liệu đa góc mặt, nhập Mã Lớp để Join).
  - `role == 'TEACHER'` ➔ Teacher Workspace (Tạo lớp với **Tên Lớp** + **Chủ đề học** ➔ Mã Lớp tự sinh badge, Đồng quản lý, Studio Upload Hàng loạt Đa tệp Ảnh/Video điểm danh, Xuất Excel).
  - `role == 'ADMIN'` ➔ Admin Control Center (Toàn quyền quản lý User, reset mặt, quản lý lớp).
