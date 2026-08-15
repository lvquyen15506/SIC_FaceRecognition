from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request, get_jwt
from app.models import User, Classroom, ClassroomTeacher


def admin_required():
    """Middleware decorator: Bắt buộc tài khoản có vai trò ADMIN Tối cao"""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(user_id)

            if not user or user.system_role != "ADMIN":
                return jsonify({"error": "Truy cập bị từ chối. Yêu cầu quyền Quản trị viên (ADMIN)"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def teacher_required():
    """Middleware decorator: Bắt buộc tài khoản có vai trò TEACHER hoặc ADMIN"""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(user_id)

            if not user or user.system_role not in ["TEACHER", "ADMIN"]:
                return jsonify({"error": "Truy cập bị từ chối. Yêu cầu quyền Giảng viên (TEACHER)"}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def check_teacher_class_access(user_id, classroom_id):
    """Kiểm tra Giảng viên có phải Chủ nhiệm hoặc Giảng viên phụ được gán cho Lớp không"""
    user = User.query.get(user_id)
    if not user:
        return False, "Người dùng không tồn tại"

    if user.system_role == "ADMIN":
        return True, "ADMIN"

    classroom = Classroom.query.get(classroom_id)
    if not classroom:
        return False, "Lớp học không tồn tại"

    # Primary Teacher who created the classroom
    if classroom.primary_teacher_id == user_id:
        return True, "PRIMARY_TEACHER"

    # Co-Teacher assigned to the classroom
    co_teacher_link = ClassroomTeacher.query.filter_by(
        classroom_id=classroom_id, teacher_id=user_id
    ).first()

    if co_teacher_link:
        return True, "CO_TEACHER"

    return False, "Bạn không có quyền quản lý Lớp học này"
