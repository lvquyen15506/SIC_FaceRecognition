# WORKSPACE AGENT RULES FOR face_recognition_project

## 🎯 Quy tắc làm việc đối với dự án:
1. **Core AI Protection**: Thư mục `src/` chứa toàn bộ Mô hình Core AI (FaceViT + ArcFace + Pose Liveness + Gallery Manager) đã hoàn thiện. Tất cả các tính năng nâng cấp Web hoặc API sau này **BẮT BUỘC** phải gọi đến các module trong `src/`, tuyệt đối KHÔNG tự viết lại thuật toán cốt lõi.
2. **Loại bỏ Web cũ**: Thư mục `web/` cũ đã bị loại bỏ hoàn toàn do không đạt chuẩn.
3. **Chuẩn eKYC Ngân Hàng**: Khi triển khai lại Web App mới, phải tuân thủ nghiêm ngặt quy trình eKYC chuẩn Ngân hàng được đặc tả trong [kyc_web_redesign.md](file:///run/media/lvquyen15506/D/SIC/face_recognition_project/docs/kyc_web_redesign.md).
