import json
import numpy as np
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models import db, User
from app.services.ai_engine import FaceViTAIEngineService

ekyc_bp = Blueprint("ekyc", __name__, url_prefix="/api/ekyc")


@ekyc_bp.route("/status", methods=["GET"])
@jwt_required()
def check_ekyc_status():
    """Kiểm tra trạng thái eKYC sinh trắc học của sinh viên"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Tài khoản không tồn tại"}), 404

    return jsonify({
        "student_id": user.id,
        "full_name": user.full_name,
        "ekyc_completed": user.ekyc_completed,
        "student_id_code": user.student_id_code,
    }), 200


@ekyc_bp.route("/save-embedding", methods=["POST"])
@jwt_required()
def save_ekyc_embedding():
    """
    Sinh viên sau khi hoàn thành 120 mẫu eKYC trên React Web Camera Component
    gửi mảng vector trung bình 128-d thu được lên Server để lưu vĩnh viễn vào DB.
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Tài khoản không tồn tại"}), 404

    data = request.get_json() or {}
    vector_list = data.get("vector", [])

    if not vector_list or len(vector_list) != 128:
        return jsonify({"error": "Vector sinh trắc học phải đúng 128 chiều (128-d)"}), 400

    # L2 normalize vector list
    vec_np = np.array(vector_list, dtype=np.float32)
    norm = np.linalg.norm(vec_np)
    if norm > 0:
        vec_np = vec_np / norm

    user.face_embeddings_json = json.dumps(vec_np.tolist())
    user.ekyc_completed = True
    db.session.commit()

    return jsonify({
        "message": f"🎉 Đã lưu vĩnh viễn hồ sơ eKYC sinh trắc học cho Sinh viên '{user.full_name}' vào CSDL!",
        "user": user.to_dict()
    }), 200


def estimate_head_pose_from_landmarks(landmarks):
    """Trích xuất tư thế đầu (NHIN THANG, QUAY TRAI, QUAY PHAI, NGUOC LEN) từ 5 điểm mốc YuNet"""
    if landmarks is None or len(landmarks) < 5:
        return "NHIN THANG", 1.0, 1.0

    right_eye, left_eye, nose, right_mouth, left_mouth = landmarks[:5]

    dist_re_nose = float(np.linalg.norm(np.array(right_eye) - np.array(nose)))
    dist_le_nose = float(np.linalg.norm(np.array(left_eye) - np.array(nose)))
    yaw_ratio = dist_re_nose / (dist_le_nose + 1e-6)

    eye_center = (np.array(right_eye) + np.array(left_eye)) / 2.0
    mouth_center = (np.array(right_mouth) + np.array(left_mouth)) / 2.0
    dist_eye_nose = float(np.linalg.norm(eye_center - np.array(nose)))
    dist_nose_mouth = float(np.linalg.norm(np.array(nose) - mouth_center))
    pitch_ratio = dist_eye_nose / (dist_nose_mouth + 1e-6)

    if yaw_ratio > 1.25:
        pose = "QUAY TRAI"
    elif yaw_ratio < 0.75:
        pose = "QUAY PHAI"
    elif pitch_ratio < 0.95:
        pose = "NGUOC LEN"
    elif pitch_ratio > 1.45:
        pose = "CUI XUONG"
    else:
        pose = "NHIN THANG"

    return pose, yaw_ratio, pitch_ratio


@ekyc_bp.route("/process-frame", methods=["POST"])
@jwt_required()
def process_ekyc_frame():
    """
    Xử lý real-time khung hình Base64 từ Web Camera:
    1. Giải mã Base64 -> BGR Image.
    2. Chạy YuNet Face Detector trích xuất khuôn mặt & 5 điểm mốc landmarks.
    3. Ước tính tư thế đầu (NHIN THANG, QUAY TRAI, QUAY PHAI, NGUOC LEN).
    4. Trích xuất 128-d ArcFace v2 ONNX embedding nếu tư thế khớp chỉ dẫn.
    """
    import base64
    import cv2

    data = request.get_json() or {}
    image_base64 = data.get("image_base64", "")
    target_action = data.get("target_action", "NHIN THANG").upper()

    if not image_base64:
        return jsonify({"error": "Thiếu dữ liệu ảnh base64"}), 400

    try:
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]

        img_bytes = base64.b64decode(image_base64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame_bgr is None:
            return jsonify({"error": "Ảnh base64 không hợp lệ"}), 400

        ai_engine = FaceViTAIEngineService()
        
        # Detect with landmarks using YuNet
        if hasattr(ai_engine.detector, "detect_faces_with_landmarks"):
            results = ai_engine.detector.detect_faces_with_landmarks(frame_bgr)
        else:
            faces = ai_engine.detector.detect(frame_bgr)
            results = [{"box": list(f[:4]), "landmarks": []} for f in (faces if faces is not None else [])]

        if not results:
            return jsonify({"detected": False, "message": "Không tìm thấy khuôn mặt"}), 200

        largest_face = max(results, key=lambda f: f["box"][2] * f["box"][3])
        x, y, w, h = map(int, largest_face["box"])
        landmarks = largest_face.get("landmarks", [])

        # Estimate pose
        detected_pose, yaw_r, pitch_r = estimate_head_pose_from_landmarks(landmarks)

        h_img, w_img, _ = frame_bgr.shape
        x1, y1 = max(0, x), max(0, y)
        x2, y2 = min(w_img, x + w), min(h_img, y + h)

        face_crop = frame_bgr[y1:y2, x1:x2]
        if face_crop.size == 0:
            return jsonify({"detected": False, "message": "Crop khuôn mặt thất bại"}), 200

        # Check face distance ratio
        face_ratio = w / float(w_img)
        if face_ratio < 0.18:
            return jsonify({"detected": True, "pose_matched": False, "message": "⚠️ CANH BAO: KHUON MAT XA QUAI Vui long tien lai gan camera."}), 200
        elif face_ratio > 0.70:
            return jsonify({"detected": True, "pose_matched": False, "message": "⚠️ CANH BAO: KHUON MAT GAN QUAI Vui long lui ra xa."}), 200

        # Check lighting brightness
        gray_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        mean_brightness = float(np.mean(gray_crop))
        if mean_brightness < 35:
            return jsonify({"detected": True, "pose_matched": False, "message": "⚠️ CANH BAO: THIEU SANG! Vui long bat den hoac di chuyen ra noi sang hon."}), 200
        elif mean_brightness > 225:
            return jsonify({"detected": True, "pose_matched": False, "message": "⚠️ CANH BAO: NGUOC SANG! Vui long tranh anh sang choi truc tiep."}), 200

        # Check pose match
        pose_matched = (detected_pose == target_action) or (target_action == "NHIN THANG" and detected_pose == "NHIN THANG")

        emb_np = None
        if pose_matched:
            emb_np = ai_engine.extract_embedding(face_crop)

        return jsonify({
            "detected": True,
            "bbox": [x1, y1, x2 - x1, y2 - y1],
            "frame_size": [w_img, h_img],
            "detected_pose": detected_pose,
            "pose_matched": pose_matched,
            "embedding": emb_np.tolist() if emb_np is not None else None
        }), 200
    except Exception as e:
        return jsonify({"error": f"Lỗi xử lý frame: {str(e)}"}), 500
