# BẢN ĐẶC TẢ BA & PRD TỔNG HỢP: HỆ THỐNG eKYC KHUÔN MẶT CHUẨN NGÂN HÀNG

> **Dự án**: `SIC_FaceRecognition`  
> **Trạng thái**: 🟡 Đang chờ Human-in-the-loop (Bạn) Đánh giá & Phê duyệt  
> **Các Agent tham gia thảo luận**:  
> - 🕵️‍♀️ **Mary (Analyst)**: Đặt ra bài toán nghiệp vụ & benchmark ngân hàng.  
> - 📋 **John (Product Manager)**: Soạn thảo PRD, User Stories & Tiêu chí nghiệm thu.  
> - 🏗️ **Winston (Architect)**: Đảm bảo tính khả thi kỹ thuật kết nối với `src/`.  
> - 🎨 **Sally (UX Designer)**: Áp dụng chuẩn nhận diện giao diện [DESIGN.md](file:///run/media/lvquyen15506/D/SIC/face_recognition_project/DESIGN.md).

---

## 💬 1. BIÊN BẢN THẢO LUẬN GIỮA CÁC AGENT (AGENT DISCUSSION LOG)

* **Mary (BA)**: *"Tôi đã nghiên cứu quy trình eKYC của Revolut và Techcombank. Hệ thống mới của chúng ta cần 2 tính năng chính: (1) Đăng ký khuôn mặt mới (Enrollment) và (2) Xác thực giao dịch / Điểm danh 1:1 & 1:N (Verification/Identification). Bắt buộc có kiểm tra khuôn mặt sống (Liveness) để chống dùng ảnh/video giả mạo."*
* **Winston (Architect)**: *"Đồng ý với Mary. Trong `src/`, chúng ta đã có sẵn `src/core/model.py` (Vision Transformer FaceViT), `src/core/arcface.py` (trích xuất vector 512-d), và `src/app_modules/test_pose_liveness.py` (kiểm tra góc nghiêng Pose Liveness). Tôi đề xuất dựng Web Backend bằng **FastAPI**, bọc các module này thành 3 API RESTful chính mà không cần sửa bất kỳ dòng code nào trong `src/`."*
* **Sally (UX Designer)**: *"Về mặt giao diện, tôi sẽ tuân thủ 100% tệp `DESIGN.md` của Google Labs. Màn hình quét camera sẽ có **Oval Guide Frame** giữa màn hình, viền đổi màu real-time (Xanh lá khi PASS, Vàng khi thiếu sáng/lệch mặt, Đỏ khi phát hiện giả mạo). Khung giao diện dùng hiệu ứng kính mờ Glassmorphism (`#1E293B`) trên nền Midnight (`#090D16`)."*
* **John (PM)**: *"Rất tốt! Tôi sẽ tổng hợp toàn bộ các ý kiến này thành bản PRD hoàn chỉnh bên dưới để trình cho **Human-in-the-loop (Product Owner)** duyệt trước khi chuyển sang cho Amelia (Dev) và Quinn (QA) làm việc."*

---

## 📋 2. PHẠM VI SẢN PHẨM & USER STORIES (PRD)

### 🔹 Feature 1: Luồng Kiểm tra Khuôn mặt sống (Pose Liveness Verification)
- **Mô tả**: Người dùng đưa mặt vào camera, hệ thống chỉ định 3 cử động (Nhìn thẳng ➔ Quay trái ➔ Quay phải).
- **User Story 1.1**:
  - **As a**: Khách hàng thực hiện eKYC.
  - **I want to**: Được chỉ dẫn rõ ràng cử động khuôn mặt trên màn hình.
  - **So that**: Tôi xác minh tôi là người thật chứ không phải ảnh in/video giả mạo.
- **Acceptance Criteria (Gherkin)**:
  - *Given*: Camera trình duyệt đã được cấp quyền và đủ ánh sáng.
  - *When*: Người dùng quay mặt sang trái góc $\ge 15^\circ$ theo yêu cầu của `src/app_modules/test_pose_liveness.py`.
  - *Then*: Vòng Oval trên màn hình hiển thị màu Xanh Lá và chuyển sang bước tiếp theo trong $< 200ms$.

---

### 🔹 Feature 2: Đăng ký & Trích xuất Vector 512-D (Face Enrollment)
- **Mô tả**: Khi Liveness PASS, hệ thống cắt khuôn mặt 112x112, đưa qua `FaceViT + ArcFace` trong `src/` để tạo Vector 512-d và lưu vào CSDL (`data_gallery/`).
- **User Story 2.1**:
  - **As a**: Khách hàng mở tài khoản mới.
  - **I want to**: Lưu khuôn mặt của mình vào hệ thống một cách an toàn.
  - **So that**: Lần sau tôi có thể đăng nhập/xác thực không cần mật khẩu.

---

### 🔹 Feature 3: Xác thực Khớp khuôn mặt 1:1 và 1:N (Face Verification)
- **Mô tả**: So sánh Cosine Distance giữa vector khuôn mặt quét real-time với CSDL.
- **Tiêu chuẩn**:
  - Tỷ lệ khớp (Similarity Score) $\ge 75\%$ ➔ **PASS**.
  - Hiển thị điểm số dạng monospaced font `Space Grotesk` (ví dụ: `MATCH: 98.4%`).

---

## 📐 3. KIẾN TRÚC KỸ THUẬT VÀ UI TOKENS (DESIGN & ARCHITECTURE)

1. **Backend Tech Stack**: Python FastAPI, OpenCV, PyTorch, ONNX Runtime.
2. **Frontend Tech Stack**: React / HTML5 Canvas / Tailwind CSS (Dark Glassmorphism).
3. **UI Tokens (`DESIGN.md`)**:
   - `primary`: `#0F172A` (Navy)
   - `surface`: `#1E293B` (Glass Surface)
   - `tertiary`: `#2563EB` (Electric Blue Accent)
   - `success`: `#059669` (Emerald Green)
   - `error`: `#DC2626` (Crimson Red)

---

## 🛑 BƯỚC HUMAN-IN-THE-LOOP: CHỜ BẠN DUYỆT

Vui lòng xem qua bản đặc tả **BA & PRD** trên. Bạn có đồng ý phê duyệt phương án này để cho **Amelia (Dev)** và **Quinn (QA)** bắt đầu vòng lặp lập trình - kiểm thử liên tục không?
