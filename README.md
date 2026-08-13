# 🚀 SIC FaceViT - HỆ THỐNG ĐIỂM DANH LỚP HỌC & eKYC ĐA TƯ THẾ

Hệ thống AI Nhận diện Khuôn mặt Thương mại dựa trên kiến trúc **Vision Transformer (`FaceVisionTransformer`)** tích hợp Đăng ký eKYC Sinh trắc học Đa tư thế và Điểm danh Sinh viên Lớp học Tự động.

---

## 🛠️ 1. Tính năng Nổi bật

- 📸 **eKYC Đăng ký Đa tư thế (120 mẫu):** Thu thập 30 Thẳng, 30 Trái, 30 Phải, 30 Ngước với kiểm tra Liveness timer 1.0s và ranh giới khoảng cách.
- ☀️ **Tự động Bù sáng Ngược Sáng (Shadow Lifting):** Adaptive Gamma Correction ($\gamma \approx 0.5 - 0.7$) kết hợp Local CLAHE ($\text{clipLimit}=3.0$).
- ⚡ **Tốc độ Suy luận Siêu tốc:** Tích hợp ONNX Runtime Engine suy luận $< 2\text{ms} / \text{frame}$ ($\approx 60\text{ FPS}$).
- 🏫 **Điểm danh Lớp học Đa Chế độ (`src/app_modules/attendance.py`):**
  - Quét Thư mục Ngày Hàng loạt (`--folder`)
  - Quét 1 File Ảnh Tập thể (`--image`)
  - Quét 1 File Video Stream (`--video`)
  - Quét Webcam Realtime (`--webcam`)
- 📊 **Thư mục Session Tích hợp (`outputs/attendance_session_...`):**
  - Tự động gom file **Báo cáo CSV Tổng hợp** + **Thư mục Ảnh & Video MP4 Minh chứng** đã khoanh tên viền xanh/đỏ.
- 🛡️ **Hàm Mất Mát SOTA ArcFace Loss (`src/core/arcface.py` & `src/train_arcface.py`):**
  - Additive Angular Margin ($m = 0.50$ rad, $s = 30.0$) ép khoảng cách cùng 1 người $d < 0.10$ và đẩy người lạ $d > 0.85$.

---

## 💻 2. Các Lệnh Chạy Chính

### 🔹 Đăng ký eKYC Mới qua Webcam (120 Mẫu):
```bash
python src/app_modules/test_ekyc_enroll.py --enroll_name "Ten_Sinh_Vien" --use_onnx
```

### 🔹 Điểm danh Tự động theo Thư mục Ngày Hàng loạt:
```bash
python src/app_modules/attendance.py --folder path/to/thu_muc_ngay --use_onnx
```

### 🔹 Điểm danh qua 1 File Ảnh Tập thể Lớp học:
```bash
python src/app_modules/attendance.py --image path/to/classroom.jpg --use_onnx
```

### 🔹 Điểm danh qua 1 File Video Stream Camera:
```bash
python src/app_modules/attendance.py --video path/to/class_video.mp4 --use_onnx
```

### 🔹 Điểm danh Webcam Realtime:
```bash
python src/app_modules/attendance.py --webcam --use_onnx
```

### 🔹 Huấn luyện Mô hình bằng ArcFace Loss:
```bash
python src/train_arcface.py --experiment_name sic_facevit_arcface_v1
```

### 🔹 Xuất Checkpoint sang ONNX Runtime Engine:
```bash
python src/app_modules/export_onnx.py --experiment_name sic_facevit_arcface_v1
```
