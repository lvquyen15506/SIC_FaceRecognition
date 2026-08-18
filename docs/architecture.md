# CẤU TRÚC KIẾN TRÚC DỰ ÁN (SIC_facerecognition)

```text
face_recognition_project/
├── src/                                   <-- CORE AI MODEL (BẢO VỆ 100%)
│   ├── core/                              <-- KIẾN TRÚC CORE AI
│   │   ├── model.py                       <-- Vision Transformer (FaceViT)
│   │   ├── arcface.py                     <-- ArcFace Margin Loss
│   │   ├── infonce.py                     <-- InfoNCE Loss
│   │   └── metrics.py                     <-- Đo đạc độ chính xác
│   │
│   ├── app_modules/                       <-- MODULE ỨNG DỤNG CORE
│   │   ├── detector.py                    <-- Face Detector & Alignment
│   │   ├── test_pose_liveness.py          <-- Anti-spoofing Pose Liveness Check
│   │   ├── test_ekyc_enroll.py            <-- Quá trình Đăng ký eKYC
│   │   ├── gallery.py                     <-- CSDL & Quản lý Vector khuôn mặt
│   │   ├── attendance.py                  <-- Điểm danh / Khớp ảnh
│   │   └── export_onnx.py                 <-- Xuất model sang ONNX Runtime
│   │
│   ├── train_arcface.py                   <-- Script Huấn luyện ArcFace
│   ├── test.py                            <-- Script Đánh giá Model
│   └── app_demo.py                        <-- Demo OpenCV/PyQt local
│
├── weights/ & outputs/                    <-- TRỌNG SỐ VÀ KẾT QUẢ TRAIN
├── tools/ & data_gallery/                 <-- BỘ CÔNG CỤ VÀ CSDL DỮ LIỆU
│
├── docs/                                  <-- TÀI LIỆU ĐẶC TẢ SẢN PHẨM
│   ├── kyc_web_redesign.md                <-- Đặc tả eKYC chuẩn ngân hàng & Kế hoạch loại bỏ web cũ
│   └── architecture.md                    <-- Sơ đồ cấu trúc dự án
│
├── .agents/                               <-- QUY TẮC BẮT BUỘC CHO AI AGENT
│   └── AGENTS.md                          <-- Quy tắc ưu tiên src/ làm nguồn duy nhất
│
├── docker-compose.yml                     <-- Cấu hình Docker
├── requirements.txt                       <-- Thư viện phụ thuộc Python
└── README.md                              <-- Hướng dẫn chung dự án
```
