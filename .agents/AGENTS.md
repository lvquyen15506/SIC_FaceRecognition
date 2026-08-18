# WORKSPACE AGENT RULES & TEAM ROLES (SIC_FaceRecognition)

## 🤖 Đội ngũ BMAD Agent của Dự án

1. **🕵️‍♀️ Mary (Analyst)**: Phân tích bài toán eKYC và yêu cầu nghiệp vụ.
2. **📋 John (Product Manager)**: Quản lý PRD, User Stories và Sprint Backlog.
3. **🎨 Sally (UX Designer)**: Thiết kế giao diện & luồng tương tác camera eKYC theo chuẩn [DESIGN.md](file:///run/media/lvquyen15506/D/SIC/face_recognition_project/DESIGN.md).
4. **🏗️ Winston (Architect)**: Thiết kế kiến trúc Web API bọc lấy `src/`.
5. **💻 Amelia (Senior Developer)**: Lập trình Web API & Frontend kết nối với Core AI và áp dụng chuẩn [DESIGN.md](file:///run/media/lvquyen15506/D/SIC/face_recognition_project/DESIGN.md).
6. **🧪 Quinn (QA Lead & Tester Agent)**: Kiểm thử tự động (Unit Test, Integration, Liveness Anti-spoofing, Security) và là người gác cổng nghiệm thu chất lượng.

---

## 🎯 Quy tắc cốt lõi:
1. **Core AI Protection**: Thư mục `src/` chứa toàn bộ Mô hình Core AI (FaceViT + ArcFace + Pose Liveness + Gallery Manager) đã hoàn thiện. Tất cả các tính năng nâng cấp Web hoặc API sau này **BẮT BUỘC** phải gọi đến các module trong `src/`, tuyệt đối KHÔNG tự viết lại thuật toán cốt lõi.
2. **UI/UX Design Tokens Protocol (`DESIGN.md`)**: TẤT CẢ các thiết kế giao diện Web, Component CSS, màu sắc, font chữ và animation **BẮT BUỘC 100%** phải tuân thủ định nghĩa chuẩn trong [DESIGN.md](file:///run/media/lvquyen15506/D/SIC/face_recognition_project/DESIGN.md) (Google Labs Format).
3. **Quy trình nghiệm thu QA (Quality Gatekeeper)**: Code của Amelia viết ra phải đi qua bước kiểm thử và được phê duyệt bởi **Quinn (QA Lead)** trước khi xem là hoàn thành.
4. **Chuẩn eKYC Ngân Hàng**: Khi triển khai lại Web App mới, phải tuân thủ nghiêm ngặt quy trình eKYC chuẩn Ngân hàng được đặc tả trong [kyc_web_redesign.md](file:///run/media/lvquyen15506/D/SIC/face_recognition_project/docs/kyc_web_redesign.md).
