from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
)

from app.models import db, User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    """Tạo tài khoản mới (Public Register cho Sinh viên / Giảng viên thử nghiệm)"""
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()
    full_name = data.get("full_name", "").strip()
    system_role = data.get("system_role", "STUDENT").upper()
    student_id_code = data.get("student_id_code", "").strip() or None

    if not username or not email or not password or not full_name:
        return jsonify({"error": "Vui lòng điền đầy đủ username, email, password và full_name"}), 400

    if User.query.filter((User.username == username) | (User.email == email)).first():
        return jsonify({"error": "Tên đăng nhập hoặc Email đã tồn tại trên hệ thống"}), 409

    if student_id_code and User.query.filter_by(student_id_code=student_id_code).first():
        return jsonify({"error": "Mã sinh viên đã tồn tại"}), 409

    user = User(
        username=username,
        email=email,
        full_name=full_name,
        system_role=system_role if system_role in ["ADMIN", "TEACHER", "STUDENT"] else "STUDENT",
        student_id_code=student_id_code,
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    return jsonify({
        "message": "Đăng ký tài khoản thành công!",
        "user": user.to_dict()
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """Đăng nhập & Cấp JWT Access Token (1h) + Refresh Token (7d)"""
    data = request.get_json() or {}
    username_or_email = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username_or_email or not password:
        return jsonify({"error": "Vui lòng nhập tên đăng nhập/email và mật khẩu"}), 400

    user = User.query.filter(
        (User.username == username_or_email) | (User.email == username_or_email)
    ).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Tên đăng nhập hoặc mật khẩu không chính xác"}), 401

    # Generate JWT Tokens
    identity = user.id
    access_token = create_access_token(identity=identity, additional_claims={"role": user.system_role})
    refresh_token = create_refresh_token(identity=identity)

    return jsonify({
        "message": "Đăng nhập thành công!",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict()
    }), 200


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Làm mới Access Token từ Refresh Token"""
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify({"error": "Tài khoản không tồn tại"}), 404

    access_token = create_access_token(identity=identity, additional_claims={"role": user.system_role})
    return jsonify({"access_token": access_token}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_profile():
    """Lấy thông tin tài khoản hiện tại"""
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify({"error": "Không tìm thấy người dùng"}), 404

    return jsonify({"user": user.to_dict()}), 200
