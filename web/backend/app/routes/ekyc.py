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
