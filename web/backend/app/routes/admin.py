from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from app.models import db, User, Classroom, AttendanceSession
from app.middleware.auth_middleware import admin_required

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.route("/stats", methods=["GET"])
@admin_required()
def get_system_stats():
    """Admin Dashboard Metrics: Tổng tài khoản, Giảng viên, Sinh viên, eKYC, Lớp học"""
    total_users = User.query.count()
    total_teachers = User.query.filter_by(system_role="TEACHER").count()
    total_students = User.query.filter_by(system_role="STUDENT").count()
    ekyc_completed_count = User.query.filter_by(system_role="STUDENT", ekyc_completed=True).count()
    total_classrooms = Classroom.query.count()
    total_sessions = AttendanceSession.query.count()

    return jsonify({
        "total_users": total_users,
        "total_teachers": total_teachers,
        "total_students": total_students,
        "ekyc_completed_count": ekyc_completed_count,
        "total_classrooms": total_classrooms,
        "total_sessions": total_sessions,
    }), 200


@admin_bp.route("/users", methods=["GET"])
@admin_required()
def list_users():
    """Admin xem danh sách toàn bộ tài khoản có lọc theo vai trò"""
    role_filter = request.args.get("role", "").upper()
    query = User.query
    if role_filter in ["ADMIN", "TEACHER", "STUDENT"]:
        query = query.filter_by(system_role=role_filter)

    users = query.order_by(User.created_at.desc()).all()
    return jsonify({"users": [u.to_dict() for u in users]}), 200


@admin_bp.route("/users", methods=["POST"])
@admin_required()
def create_user():
    """Admin tạo tài khoản mới & gán vai trò hệ thống"""
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()
    full_name = data.get("full_name", "").strip()
    system_role = data.get("system_role", "STUDENT").upper()
    student_id_code = data.get("student_id_code", "").strip() or None

    if not username or not email or not password or not full_name:
        return jsonify({"error": "Điền đầy đủ thông tin: username, email, password, full_name"}), 400

    if User.query.filter((User.username == username) | (User.email == email)).first():
        return jsonify({"error": "Tên đăng nhập hoặc Email đã tồn tại"}), 409

    if system_role not in ["ADMIN", "TEACHER", "STUDENT"]:
        return jsonify({"error": "Vai trò hệ thống không hợp lệ (phải là ADMIN, TEACHER, STUDENT)"}), 400

    user = User(
        username=username,
        email=email,
        full_name=full_name,
        system_role=system_role,
        student_id_code=student_id_code,
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": f"Tạo tài khoản {system_role} thành công!", "user": user.to_dict()}), 201


@admin_bp.route("/users/<user_id>/role", methods=["PUT"])
@admin_required()
def update_user_role(user_id):
    """Admin cập nhật vai trò hệ thống của tài khoản bất kỳ"""
    data = request.get_json() or {}
    new_role = data.get("system_role", "").upper()

    if new_role not in ["ADMIN", "TEACHER", "STUDENT"]:
        return jsonify({"error": "Vai trò hệ thống không hợp lệ"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Không tìm thấy tài khoản"}), 404

    user.system_role = new_role
    db.session.commit()

    return jsonify({"message": f"Cập nhật vai trò tài khoản '{user.username}' thành '{new_role}' thành công!", "user": user.to_dict()}), 200


@admin_bp.route("/users/<user_id>/reset-ekyc", methods=["PUT"])
@admin_required()
def reset_user_ekyc(user_id):
    """Admin hoặc Giảng viên xóa/reset dữ liệu eKYC sinh trắc học của cá nhân bất kỳ"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Không tìm thấy tài khoản"}), 404

        user.ekyc_completed = False
        user.face_embeddings_json = None
        db.session.commit()

        return jsonify({"message": f"🎉 Đã xóa sạch dữ liệu sinh trắc học eKYC của '{user.full_name}' thành công! Trạng thái đưa về Chưa eKYC."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Lỗi reset eKYC: {str(e)}"}), 500


@admin_bp.route("/users/<user_id>", methods=["DELETE"])
@admin_required()
def delete_user(user_id):
    """Admin xóa tài khoản khỏi hệ thống và dọn dẹp toàn bộ dữ liệu liên quan"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Không tìm thấy tài khoản"}), 404

        if user.username == "admin":
            return jsonify({"error": "Không thể xóa tài khoản Super Admin mặc định hệ thống"}), 400

        # 1. Clean up student attendance records & classroom memberships
        AttendanceRecord.query.filter_by(student_id=user.id).delete()
        ClassroomStudent.query.filter_by(student_id=user.id).delete()
        ClassroomTeacher.query.filter_by(teacher_id=user.id).delete()

        # 2. Clean up sessions created by this user
        user_sessions = AttendanceSession.query.filter_by(created_by_user_id=user.id).all()
        for s in user_sessions:
            AttendanceRecord.query.filter_by(session_id=s.id).delete()
            db.session.delete(s)

        # 3. Clean up classrooms created by this user as primary teacher
        user_classrooms = Classroom.query.filter_by(primary_teacher_id=user.id).all()
        for c in user_classrooms:
            ClassroomStudent.query.filter_by(classroom_id=c.id).delete()
            ClassroomTeacher.query.filter_by(teacher_id=c.id).delete()
            c_sessions = AttendanceSession.query.filter_by(classroom_id=c.id).all()
            for s in c_sessions:
                AttendanceRecord.query.filter_by(session_id=s.id).delete()
                db.session.delete(s)
            db.session.delete(c)

        # 4. Delete the user
        db.session.delete(user)
        db.session.commit()
        return jsonify({"message": f"🎉 Đã xóa thành công tài khoản '{user.username}' ({user.full_name}) và toàn bộ dữ liệu liên quan!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Lỗi khi xóa tài khoản: {str(e)}"}), 500
