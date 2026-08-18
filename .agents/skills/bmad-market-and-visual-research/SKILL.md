---
name: bmad-market-and-visual-research
description: "Kỹ năng Research chuyên sâu: Tìm kiếm benchmark eKYC ngân hàng hiện đại, thu thập dữ liệu thị trường, tìm kiếm/sinh ảnh banner/minh họa (Visual Assets & Image Generation) và nghiên cứu kiến trúc công nghệ tiên tiến"
---

# 🔍 DEEP RESEARCH & VISUAL ASSETS SKILL (CHO BA, ARCHITECT & UX)

> **Mục tiêu**: Giúp đội ngũ AI Agent (**Mary - BA**, **Winston - Architect**, **Sally - UX**) không bị bó hẹp tư duy ("không bị tù"), tự động tra cứu dữ liệu thực tế trên Web, thu thập Benchmark eKYC của các ngân hàng hàng đầu thế giới và tự tìm/sinh ảnh banner, asset đồ họa phù hợp với mục đích sản phẩm.

---

## 🌐 1. KỸ NĂNG NGUYÊN CỨU NGHIỆP VỤ & THỊ TRƯỜNG (BA & MARKET RESEARCH)

Khi **Mary (BA)** hoặc **John (PM)** thực hiện phân tích yêu cầu:
1. **Benchmark eKYC Ngân hàng Hiện đại**:
   - Tra cứu quy trình eKYC của các ứng dụng ngân hàng hàng đầu (Revolut, DBS, Techcombank, MBBank, Apple FaceID UX).
   - Cập nhật các tiêu chuẩn an toàn mới nhất (NIST Biometric Evaluation, ISO 30107-3 Anti-Spoofing Level 1 & Level 2).
2. **Tránh bị "tù" về mặt giải pháp**:
   - Luôn đưa ra 3 phương án quy trình: Đơn giản (Basic eKYC), Tiêu chuẩn (Standard Banking eKYC), và Nâng cao (AI Biometric + OCR Căn cước + Liveness 3D).

---

## 🎨 2. KỸ NĂNG THU THẬP & SINH ẢNH/GRAPHIC ASSETS (VISUAL ASSETS RESEARCH & GENERATION)

Khi **Sally (UX Designer)** hoặc **Amelia (Dev)** cần ảnh banner, minh họa sinh trắc học, icon hoặc hình ảnh minh họa cho Web App:

### 🖼️ Quy trình 3 bước xử lý Asset Đồ họa:

1. **Xác định yêu cầu đồ họa (Asset Spec)**:
   - Dựa vào [DESIGN.md](file:///run/media/lvquyen15506/D/SIC/face_recognition_project/DESIGN.md) để chốt Tone màu (Deep Navy `#0F172A`, Electric Blue `#2563EB`, Glassmorphism).
2. **Kích hoạt công cụ Sinh ảnh AI (`generate_image`)**:
   - Khi cần ảnh Banner Hero, ảnh quét sinh trắc học 3D, hoặc ảnh minh họa các bước eKYC: Sử dụng công cụ `generate_image` với prompt chuyên sâu.
   - *Ví dụ Prompt sinh ảnh Banner*:
     > *"Futuristic bank-grade eKYC biometric face recognition interface, glassmorphism UI overlay, holographic facial mesh scanner, deep navy and electric blue ambient neon lighting, modern banking aesthetic, ultra high detail 8k render --no laptop frame"*
3. **Tra cứu & Tích hợp Ảnh thực tế (Public Web Images)**:
   - Tra cứu các nguồn ảnh công cộng không bản quyền (Unsplash, Pexels) hoặc sử dụng Web Search để tìm các asset icon SVG (Lucide Icons, Heroicons).

---

## 🏗️ 3. KỸ NĂNG NGHIÊN CỨU KIẾN TRÚC CÔNG NGHỆ TIÊN TIẾN (ARCHITECTURAL RESEARCH)

Khi **Winston (Architect)** thiết kế kiến trúc hệ thống:
1. **Tránh điểm nghẽn kiến trúc (Non-Restrictive Architecture)**:
   - Nghiên cứu các giải pháp Stream video real-time độ trễ thấp (WebRTC vs WebSocket vs HLS).
   - Nghiên cứu mô hình tăng tốc AI inference: ONNX Runtime Execution Providers (CUDA, TensorRT, DirectML, OpenVINO).
   - Nghiên cứu mô hình lưu trữ Vector khuôn mặt quy mô lớn (Milvus, Qdrant, ChromaDB, PGVector).
2. **Khả năng mở rộng (Scalability)**:
   - Thiết kế hệ thống dạng Microservices/Decoupled: Phần Core AI `src/` tách biệt hoàn toàn với Web API Wrapper và Web Frontend.
