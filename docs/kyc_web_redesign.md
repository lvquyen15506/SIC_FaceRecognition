# ĐẶC TẢ TÁI CẤU TRÚC eKYC KHUÔN MẶT CHUẨN NGÂN HÀNG

> **Dự án**: `SIC / face_recognition_project`  
> **Đường dẫn Core AI**: `/run/media/lvquyen15506/D/SIC/face_recognition_project/src`  
> **Mô hình cốt lõi**: Custom Vision Transformer (FaceViT) + ArcFace Loss + Pose Liveness Detection  
> **Trạng thái**: Đã loại bỏ hoàn toàn phần Web cũ (`web/`), bảo vệ 100% Core AI trong `src/`.

---

## 🔬 1. PHÂN TÍCH CORE AI MODEL TRONG `src/`

Phần Core AI đã được xây dựng hoàn thiện và tổ chức tại thư mục `src/` với các module cốt lõi:

1. **`src/core/model.py` & `src/core/arcface.py`**:
   - **Mô hình**: Custom Vision Transformer (**FaceViT**) kết hợp **ArcFace Margin Loss**.
   - **Chức năng**: Nhận ảnh đầu vào 112x112 pixel và trích xuất vector đặc trưng 512 chiều (512-d Face Embedding).
   - **Ưu điểm**: Độ chính xác cao, khả năng phân biệt khuôn mặt vượt trội nhờ ArcFace Loss.

2. **`src/app_modules/test_pose_liveness.py`**:
   - **Module Liveness**: Kiểm tra khuôn mặt sống chống giả mạo (Anti-spoofing).
   - **Cơ chế**: Đo góc xoay khuôn mặt (Head Pose Estimation - Pitch, Yaw, Roll) để yêu cầu người dùng quay trái, quay phải, nhìn thẳng.

3. **`src/app_modules/test_ekyc_enroll.py` & `gallery.py`**:
   - **Module Đăng ký eKYC**: Chụp ảnh chất lượng cao, trích xuất vector 512-d và lưu trữ vào CSDL Gallery (`data_gallery/`).
   - **Module Khớp ảnh (Matching)**: So sánh Cosine Distance giữa vector khuôn mặt quét real-time và vector trong CSDL.

---

## 🏦 2. LUỒNG eKYC KHUÔN MẶT CHUẨN NGÂN HÀNG (BANK-GRADE eKYC WORKFLOW)

Khi xây dựng lại phần Web mới (ở bước tiếp theo), hệ thống sẽ gọi trực tiếp đến các module trong `src/` theo quy trình 4 bước chuẩn ngân hàng:

```text
[ Giao diện Web Client (Camera) ]
                │
                ▼
1. POSE LIVENESS CHECK (`src/app_modules/test_pose_liveness.py`)
   ├── Yêu cầu người dùng quay mặt theo chỉ định (Nhìn thẳng -> Quay trái -> Quay phải)
   └── Xác minh khuôn mặt thật & sống (Anti-spoofing)
                │
                ▼
2. FACE QUALITY CHECK & ALIGNMENT (`src/app_modules/detector.py`)
   ├── Cắt và căn chỉnh khuôn mặt về kích thước chuẩn 112x112
   └── Kiểm tra độ rõ nét, góc nghiêng
                │
                ▼
3. FEATURE EXTRACTION (`src/core/model.py` - FaceViT + ArcFace)
   └── Trích xuất Vector 512 chiều (Embedding Vector)
                │
                ▼
4. MATCHING / ENROLLMENT (`src/app_modules/gallery.py` & `attendance.py`)
   ├── Kịch bản Đăng ký (Enrollment): Lưu Vector 512-d + Thông tin cá nhân vào CSDL
   └── Kịch bản Xác thực (Verification): So sánh Cosine Similarity (Threshold >= 0.75)
```

---

## 📁 3. BẢNG PHÂN LOẠI TỆP TIN & QUY TẮC BẢO VỆ

### 🟢 GIỮ NGUYÊN (Non-Web Files)
- `src/` — Toàn bộ mã nguồn mô hình AI (FaceViT, ArcFace, Liveness, Gallery, Detector).
- `weights/` & `outputs/` — Trọng số model và kết quả thử nghiệm.
- `tools/`, `data_gallery/` — Bộ công cụ và CSDL mẫu.
- `Bao_cao_Do_an_Nhan_dien_Khuon_mat_FaceViT_SIC.docx` — Báo cáo đồ án.
- `Tong_hop_Custom_Vision_Transformer_SIC.docx` — Tài liệu tổng hợp kiến trúc FaceViT.
- `docker-compose.yml`, `requirements.txt`, `.gitignore` — Cấu hình môi trường.

### 🔴 ĐÃ XÓA BỎ (Legacy Web)
- `web/` (`web/backend`, `web/frontend`) — Đã xóa hoàn toàn phần web cũ không đạt yêu cầu.

---

## 🚀 4. ĐỀ XUẤT CÁC BƯỚC TIẾP THEO

1. **Giữ `src/` làm Core duy nhất**.
2. Khi tiến hành dựng Web eKYC mới: Dùng **FastAPI** bọc các hàm trong `src/app_modules/` để phục vụ Web Frontend (React/Next.js).
