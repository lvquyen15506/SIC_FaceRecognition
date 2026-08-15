import json
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models import db, User, Classroom, ClassroomTeacher, ClassroomStudent
from app.middleware.auth_middleware import teacher_required, check_teacher_class_access

classes_bp = Blueprint("classes", __name__, url_prefix="/api/classes")


@classes_bp.route("", methods=["GET"])
@jwt_required()
def list_classrooms():
    """Lấy danh sách Lớp học theo phân quyền Scope của Giảng viên / Admin / Sinh viên"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Tài khoản không tồn tại"}), 404

    if user.system_role == "ADMIN":
        classrooms = Classroom.query.order_by(Classroom.created_at.desc()).all()
    elif user.system_role == "TEACHER":
        # Created classes OR assigned Co-Teacher classes
        created_ids = [c.id for c in Classroom.query.filter_by(primary_teacher_id=user_id).all()]
        coteacher_ids = [ct.classroom_id for ct in ClassroomTeacher.query.filter_by(teacher_id=user_id).all()]
        all_accessible_ids = list(set(created_ids + coteacher_ids))
        classrooms = Classroom.query.filter(Classroom.id.in_(all_accessible_ids)).order_by(Classroom.created_at.desc()).all()
    else:  # STUDENT
        enrolled_ids = [cs.classroom_id for cs in ClassroomStudent.query.filter_by(student_id=user_id).all()]
        classrooms = Classroom.query.filter(Classroom.id.in_(enrolled_ids)).order_by(Classroom.created_at.desc()).all()

    return jsonify({"classrooms": [c.to_dict() for c in classrooms]}), 200


@classes_bp.route("", methods=["POST"])
@teacher_required()
def create_classroom():
    """Giảng viên tạo Lớp học mới (Primary Teacher)"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    class_code = data.get("class_code", "").strip()
    class_name = data.get("class_name", "").strip()

    if not class_code or not class_name:
        return jsonify({"error": "Vui lòng nhập Mã lớp và Tên môn học"}), 400

    if Classroom.query.filter_by(class_code=class_code).first():
        return jsonify({"error": "Mã lớp học đã tồn tại"}), 409

    classroom = Classroom(
        class_code=class_code,
        class_name=class_name,
        primary_teacher_id=user_id
    )
    db.session.add(classroom)
    db.session.flush()

    # Automatically add Primary Teacher link
    ct_link = ClassroomTeacher(
        classroom_id=classroom.id,
        teacher_id=user_id,
        teacher_role="PRIMARY_TEACHER"
    )
    db.session.add(ct_link)
    db.session.commit()

    return jsonify({"message": "Tạo lớp học thành công!", "classroom": classroom.to_dict()}), 201


@classes_bp.route("/<class_id>/co-teachers", methods=["POST"])
@teacher_required()
def add_co_teacher(class_id):
    """Giảng viên chủ nhiệm thêm Giảng viên phụ (Co-Teacher) vào Lớp để đồng quản lý"""
    user_id = get_jwt_identity()
    has_access, role_desc = check_teacher_class_access(user_id, class_id)
    if not has_access or role_desc not in ["PRIMARY_TEACHER", "ADMIN"]:
        return jsonify({"error": "Chỉ Giảng viên Chủ nhiệm mới có quyền thêm Giảng viên phụ"}), 403

    data = request.get_json() or {}
    co_teacher_id = data.get("teacher_id", "").strip()

    co_teacher = User.query.get(co_teacher_id)
    if not co_teacher or co_teacher.system_role not in ["TEACHER", "ADMIN"]:
        return jsonify({"error": "Tài khoản được thêm phải có vai trò Giảng viên (TEACHER)"}), 400

    existing = ClassroomTeacher.query.filter_by(classroom_id=class_id, teacher_id=co_teacher_id).first()
    if existing:
        return jsonify({"message": "Giảng viên này đã thuộc danh sách quản lý lớp"}), 200

    ct_link = ClassroomTeacher(
        classroom_id=class_id,
        teacher_id=co_teacher_id,
        teacher_role="CO_TEACHER"
    )
    db.session.add(ct_link)
    db.session.commit()

    return jsonify({"message": f"Đã thêm Giảng viên '{co_teacher.full_name}' làm Co-Teacher lớp thành công!"}), 201


@classes_bp.route("/<class_id>/students", methods=["POST"])
@teacher_required()
def add_student_to_class(class_id):
    """Giảng viên thêm Sinh viên vào Lớp & Gán Vai trò trong Lớp (Lớp trưởng/Sinh viên)"""
    user_id = get_jwt_identity()
    has_access, _ = check_teacher_class_access(user_id, class_id)
    if not has_access:
        return jsonify({"error": "Bạn không có quyền quản lý Lớp học này"}), 403

    data = request.get_json() or {}
    student_id = data.get("student_id", "").strip()
    student_class_role = data.get("student_class_role", "STUDENT").upper()  # 'MONITOR' or 'STUDENT'
    permissions = data.get("permissions", ["CAN_VIEW_SELF"])

    student = User.query.get(student_id)
    if not student:
        return jsonify({"error": "Không tìm thấy sinh viên"}), 404

    existing = ClassroomStudent.query.filter_by(classroom_id=class_id, student_id=student_id).first()
    if existing:
        existing.student_class_role = student_class_role
        existing.permissions_json = json.dumps(permissions)
        db.session.commit()
        return jsonify({"message": f"Đã cập nhật vai trò Sinh viên '{student.full_name}' thành '{student_class_role}'"}), 200

    cs_link = ClassroomStudent(
        classroom_id=class_id,
        student_id=student_id,
        student_class_role=student_class_role,
        permissions_json=json.dumps(permissions)
    )
    db.session.add(cs_link)
    db.session.commit()

    return jsonify({"message": f"Đã thêm Sinh viên '{student.full_name}' vào lớp thành công!"}), 201


@classes_bp.route("/<class_id>/students", methods=["GET"])
@jwt_required()
def list_class_students(class_id):
    """Xem danh sách Sinh viên thuộc Lớp học"""
    user_id = get_jwt_identity()
    has_access, _ = check_teacher_class_access(user_id, class_id)
    if not has_access:
        # Check if logged-in user is a student in this class
        in_class = ClassroomStudent.query.filter_by(classroom_id=class_id, student_id=user_id).first()
        if not in_class:
            return jsonify({"error": "Bạn không có quyền xem lớp học này"}), 403

    students_links = ClassroomStudent.query.filter_by(classroom_id=class_id).all()
    result = []
    for cs in students_links:
        s_dict = cs.student.to_dict()
        s_dict["student_class_role"] = cs.student_class_role
        s_dict["permissions"] = json.loads(cs.permissions_json or "[]")
        result.append(s_dict)

    return jsonify({"students": result}), 200
