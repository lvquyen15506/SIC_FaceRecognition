import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.models import User, ClassRoom, AuditLog, FaceEmbedding, AttendanceSession, ClassStudent, SessionMediaFile, AttendanceDetail
from app.schemas import UserResponse, UserCreateRequest, UserUpdateRequest, ClassResponse
from app.security import require_role, get_password_hash

router = APIRouter(prefix="/api/v1/admin", tags=["Super Admin Controls"])

@router.get("/db-health")
def check_db_health(current_user: User = Depends(require_role(["ADMIN"])), db: Session = Depends(get_db)):
    """
    Kiểm tra sức khỏe CSDL PostgreSQL/SQLite, thống kê số lượng bản ghi
    """
    try:
        db.execute(text("SELECT 1"))
        db_type = "PostgreSQL" if "postgresql" in str(db.bind.url).lower() else "SQLite"

        total_users = db.query(User).count()
        total_classes = db.query(ClassRoom).count()
        total_embeddings = db.query(FaceEmbedding).count()
        total_sessions = db.query(AttendanceSession).count()

        return {
            "status": "HEALTHY",
            "db_type": db_type,
            "metrics": {
                "total_users": total_users,
                "total_classes": total_classes,
                "total_face_vectors_512d": total_embeddings,
                "total_attendance_sessions": total_sessions
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"DB Connection Failure: {str(e)}"
        )

@router.get("/users")
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    role: Optional[str] = None,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách người dùng kèm trạng thái dữ liệu khuôn mặt và hỗ trợ Phân Trang / Tìm Kiếm
    """
    query = db.query(User)
    if role and role != "ALL":
        query = query.filter(User.role == role)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (User.full_name.ilike(search_pattern)) |
            (User.code.ilike(search_pattern)) |
            (User.email.ilike(search_pattern))
        )

    total_count = query.count()
    users_list = query.order_by(User.id.asc()).offset(skip).limit(limit).all()

    # Query face embedding counts per user
    user_ids = [u.id for u in users_list]
    embeddings = db.query(FaceEmbedding.user_id).filter(FaceEmbedding.user_id.in_(user_ids)).all() if user_ids else []
    
    counts_map = {}
    for (u_id,) in embeddings:
        counts_map[u_id] = counts_map.get(u_id, 0) + 1

    result_items = []
    for u in users_list:
        c = counts_map.get(u.id, 0)
        result_items.append({
            "id": u.id,
            "email": u.email,
            "code": u.code,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "has_face_data": c > 0,
            "face_angles_count": c
        })

    return {
        "total": total_count,
        "items": result_items
    }

@router.post("/users", response_model=UserResponse)
def create_user(
    req: UserCreateRequest,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Tạo tài khoản người dùng mới (Super Admin)
    """
    existing_code = db.query(User).filter(User.code == req.code).first()
    if existing_code:
        raise HTTPException(status_code=400, detail="Mã số người dùng (MSSV/MGV) đã tồn tại trên hệ thống!")

    existing_email = db.query(User).filter(User.email == req.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email người dùng đã tồn tại trên hệ thống!")

    new_user = User(
        email=req.email,
        code=req.code,
        full_name=req.full_name,
        hashed_password=get_password_hash(req.password),
        role=req.role.upper(),
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    audit = AuditLog(
        user_id=current_user.id,
        action="CREATE_USER",
        details=f"Admin đã tạo tài khoản mới: {new_user.code} ({new_user.full_name}, {new_user.role})"
    )
    db.add(audit)
    db.commit()

    return UserResponse(
        id=new_user.id,
        email=new_user.email,
        code=new_user.code,
        full_name=new_user.full_name,
        role=new_user.role,
        is_active=new_user.is_active,
        has_face_data=False,
        face_angles_count=0
    )

@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    req: UserUpdateRequest,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Cập nhật thông tin người dùng (Super Admin)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if req.email and req.email != user.email:
        if db.query(User).filter(User.email == req.email, User.id != user_id).first():
            raise HTTPException(status_code=400, detail="Email đã được sử dụng bởi tài khoản khác!")
        user.email = req.email

    if req.code and req.code != user.code:
        if db.query(User).filter(User.code == req.code, User.id != user_id).first():
            raise HTTPException(status_code=400, detail="Mã số đã được sử dụng bởi tài khoản khác!")
        user.code = req.code

    if req.full_name:
        user.full_name = req.full_name
    if req.role:
        user.role = req.role.upper()
    if req.password:
        user.hashed_password = get_password_hash(req.password)

    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="UPDATE_USER",
        details=f"Admin đã cập nhật tài khoản ID {user_id} ({user.code})"
    )
    db.add(audit)
    db.commit()

    return {"status": "SUCCESS", "message": f"Đã cập nhật thành công tài khoản {user.code}"}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Xóa vĩnh viễn tài khoản người dùng và toàn bộ dữ liệu liên quan
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Không thể tự xóa tài khoản Admin đang đăng nhập!")

    # Cleanup face embeddings and class memberships
    db.query(FaceEmbedding).filter(FaceEmbedding.user_id == user_id).delete()
    db.query(ClassStudent).filter(ClassStudent.student_id == user_id).delete()
    db.delete(user)
    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="DELETE_USER",
        details=f"Admin đã xóa vĩnh viễn tài khoản ID {user_id} ({user.code})"
    )
    db.add(audit)
    db.commit()

    return {"status": "SUCCESS", "message": f"Đã xóa thành công tài khoản {user.code}"}

import random
import string
from app.schemas import UserResponse, UserCreateRequest, UserUpdateRequest, ClassResponse, ClassCreateRequest, ClassUpdateRequest, AddMemberRequest

def generate_class_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "SIC-" + "".join(random.choices(chars, k=6))

@router.get("/classes")
def get_all_classes(current_user: User = Depends(require_role(["ADMIN"])), db: Session = Depends(get_db)):
    """
    Lấy danh sách tất cả lớp học kèm danh sách giảng viên đồng quản lý và số lượng sinh viên
    """
    classes_list = db.query(ClassRoom).order_by(ClassRoom.id.desc()).all()
    result = []
    for cls in classes_list:
        primary_teacher = db.query(User).filter(User.id == cls.created_by_teacher_id).first()
        co_teachers = cls.teachers

        students_cnt = db.query(ClassStudent).filter(
            ClassStudent.class_id == cls.id,
            ClassStudent.status == "APPROVED"
        ).count()

        sessions_cnt = db.query(AttendanceSession).filter(AttendanceSession.class_id == cls.id).count()

        result.append({
            "id": cls.id,
            "class_code": cls.class_code,
            "class_name": cls.class_name,
            "subject_topic": cls.subject_topic,
            "created_by_teacher_id": cls.created_by_teacher_id,
            "primary_teacher": {
                "id": primary_teacher.id,
                "code": primary_teacher.code,
                "full_name": primary_teacher.full_name,
                "email": primary_teacher.email
            } if primary_teacher else None,
            "co_teachers": [
                {"id": t.id, "code": t.code, "full_name": t.full_name, "email": t.email}
                for t in co_teachers
            ],
            "students_count": students_cnt,
            "sessions_count": sessions_cnt
        })
    return result

@router.post("/classes")
def create_class_by_admin(
    req: ClassCreateRequest,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Admin tạo Lớp Học mới và gán Giảng viên chủ nhiệm
    """
    teacher_id = req.teacher_id
    if not teacher_id:
        admin_user = current_user
        teacher_id = admin_user.id
    else:
        teacher = db.query(User).filter(User.id == teacher_id, User.role.in_(["TEACHER", "ADMIN"])).first()
        if not teacher:
            raise HTTPException(status_code=400, detail="Giảng viên chủ nhiệm không hợp lệ!")

    class_code = generate_class_code()
    while db.query(ClassRoom).filter(ClassRoom.class_code == class_code).first():
        class_code = generate_class_code()

    new_class = ClassRoom(
        class_code=class_code,
        class_name=req.class_name,
        subject_topic=req.subject_topic,
        created_by_teacher_id=teacher_id
    )
    db.add(new_class)
    db.commit()
    db.refresh(new_class)

    # Assign teacher to association table
    assigned_teacher = db.query(User).filter(User.id == teacher_id).first()
    if assigned_teacher and assigned_teacher not in new_class.teachers:
        new_class.teachers.append(assigned_teacher)
        db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="CREATE_CLASS",
        details=f"Admin đã tạo lớp mới: {new_class.class_code} - {new_class.class_name} ({new_class.subject_topic})"
    )
    db.add(audit)
    db.commit()

    return {"status": "SUCCESS", "message": f"Tạo lớp học {new_class.class_code} thành công!", "class_id": new_class.id}

@router.put("/classes/{class_id}")
def update_class_by_admin(
    class_id: int,
    req: ClassUpdateRequest,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Cập nhật thông tin Lớp Học (Tên lớp, Chủ đề, Giảng viên chủ nhiệm)
    """
    cls = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học!")

    if req.class_name:
        cls.class_name = req.class_name
    if req.subject_topic:
        cls.subject_topic = req.subject_topic
    if req.teacher_id:
        teacher = db.query(User).filter(User.id == req.teacher_id).first()
        if not teacher:
            raise HTTPException(status_code=400, detail="Giảng viên không tồn tại!")
        cls.created_by_teacher_id = req.teacher_id
        if teacher not in cls.teachers:
            cls.teachers.append(teacher)

    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="UPDATE_CLASS",
        details=f"Admin đã cập nhật thông tin lớp ID {class_id} ({cls.class_code})"
    )
    db.add(audit)
    db.commit()

    return {"status": "SUCCESS", "message": f"Cập nhật thành công lớp học {cls.class_code}"}

@router.delete("/classes/{class_id}")
def delete_class_by_admin(
    class_id: int,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Xóa vĩnh viễn Lớp Học, dọn dẹp 100% tệp phương tiện đĩa (Video/Ảnh) và toàn bộ dữ liệu liên quan
    """
    cls = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học!")

    code_tmp = cls.class_code

    # 1. Cascade Physical Disk Files Cleanup & Attendance DB Records Removal
    sessions = db.query(AttendanceSession).filter(AttendanceSession.class_id == class_id).all()
    deleted_files_count = 0

    for sess in sessions:
        media_files = db.query(SessionMediaFile).filter(SessionMediaFile.session_id == sess.id).all()
        for mf in media_files:
            for fpath in [mf.raw_file_path, mf.processed_file_path]:
                if fpath and os.path.exists(fpath):
                    try:
                        os.remove(fpath)
                        deleted_files_count += 1
                    except Exception as e:
                        print(f"[File Delete Error] Failed to remove {fpath}: {e}")

            # Remove associated video thumbnail JPG if exists
            if mf.processed_file_path and mf.processed_file_path.endswith('.mp4'):
                thumb_path = mf.processed_file_path.replace('.mp4', '.jpg').replace('_h264_', '_')
                if os.path.exists(thumb_path):
                    try:
                        os.remove(thumb_path)
                        deleted_files_count += 1
                    except Exception as e:
                        print(f"[File Delete Error] Failed to remove thumbnail {thumb_path}: {e}")

        # Delete child DB records for this session
        db.query(SessionMediaFile).filter(SessionMediaFile.session_id == sess.id).delete(synchronize_session=False)
        db.query(AttendanceDetail).filter(AttendanceDetail.session_id == sess.id).delete(synchronize_session=False)

    db.query(AttendanceSession).filter(AttendanceSession.class_id == class_id).delete(synchronize_session=False)
    db.query(ClassStudent).filter(ClassStudent.class_id == class_id).delete(synchronize_session=False)

    db.delete(cls)
    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="DELETE_CLASS",
        details=f"Admin đã xóa vĩnh viễn lớp học {code_tmp} (Đã dọn {deleted_files_count} tệp đĩa phương tiện)"
    )
    db.add(audit)
    db.commit()

    return {"status": "SUCCESS", "message": f"Đã xóa vĩnh viễn lớp học {code_tmp} và dọn sạch {deleted_files_count} tệp đĩa!"}

@router.get("/classes/{class_id}/members")
def get_class_members(
    class_id: int,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách Giảng viên và Sinh viên trong lớp học
    """
    cls = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học!")

    co_teachers = [
        {"id": t.id, "code": t.code, "full_name": t.full_name, "email": t.email, "role": t.role}
        for t in cls.teachers
    ]

    class_students = db.query(ClassStudent).filter(ClassStudent.class_id == class_id).all()
    students_list = []
    for cs in class_students:
        s = cs.student
        if s:
            students_list.append({
                "id": s.id,
                "code": s.code,
                "full_name": s.full_name,
                "email": s.email,
                "status": cs.status,
                "joined_at": cs.joined_at.strftime("%Y-%m-%d %H:%M:%S") if cs.joined_at else None
            })

    return {
        "class_id": cls.id,
        "class_code": cls.class_code,
        "class_name": cls.class_name,
        "teachers": co_teachers,
        "students": students_list
    }

@router.post("/classes/{class_id}/add-teacher")
def add_teacher_to_class(
    class_id: int,
    req: AddMemberRequest,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Thêm Giảng viên đồng quản lý vào lớp học (theo Mã GV hoặc Email)
    """
    cls = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học!")

    query_str = req.user_code_or_email.strip()
    teacher = db.query(User).filter(
        (User.code == query_str) | (User.email == query_str),
        User.role.in_(["TEACHER", "ADMIN"])
    ).first()

    if not teacher:
        raise HTTPException(status_code=400, detail="Không tìm thấy Giảng viên với mã số hoặc email đã nhập!")

    if teacher in cls.teachers:
        raise HTTPException(status_code=400, detail=f"Giảng viên {teacher.full_name} đã thuộc lớp học này rồi!")

    cls.teachers.append(teacher)
    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="ADD_CLASS_TEACHER",
        details=f"Admin đã thêm GV {teacher.code} ({teacher.full_name}) vào lớp {cls.class_code}"
    )
    db.add(audit)
    db.commit()

    return {"status": "SUCCESS", "message": f"Đã thêm thành công Giảng viên {teacher.full_name} vào lớp {cls.class_code}"}

@router.delete("/classes/{class_id}/remove-teacher/{teacher_id}")
def remove_teacher_from_class(
    class_id: int,
    teacher_id: int,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Xóa Giảng viên đồng quản lý khỏi lớp học
    """
    cls = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học!")

    teacher = db.query(User).filter(User.id == teacher_id).first()
    if not teacher or teacher not in cls.teachers:
        raise HTTPException(status_code=400, detail="Giảng viên không nằm trong danh sách đồng quản lý lớp!")

    if len(cls.teachers) <= 1 and cls.created_by_teacher_id == teacher_id:
        raise HTTPException(status_code=400, detail="Không thể xóa Giảng viên duy nhất của lớp!")

    cls.teachers.remove(teacher)
    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="REMOVE_CLASS_TEACHER",
        details=f"Admin đã xóa GV {teacher.code} khỏi lớp {cls.class_code}"
    )
    db.add(audit)
    db.commit()

    return {"status": "SUCCESS", "message": f"Đã xóa Giảng viên {teacher.full_name} khỏi lớp {cls.class_code}"}

@router.post("/classes/{class_id}/add-student")
def add_student_to_class(
    class_id: int,
    req: AddMemberRequest,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Thêm Sinh viên vào lớp học (mặc định trạng thái APPROVED)
    """
    cls = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học!")

    query_str = req.user_code_or_email.strip()
    student = db.query(User).filter(
        (User.code == query_str) | (User.email == query_str)
    ).first()

    if not student:
        raise HTTPException(status_code=400, detail="Không tìm thấy người dùng/sinh viên với mã số hoặc email này!")

    existing = db.query(ClassStudent).filter(
        ClassStudent.class_id == class_id,
        ClassStudent.student_id == student.id
    ).first()

    if existing:
        if existing.status != "APPROVED":
            existing.status = "APPROVED"
            db.commit()
            return {"status": "SUCCESS", "message": f"Đã phê duyệt Sinh viên {student.full_name} vào lớp {cls.class_code}"}
        else:
            raise HTTPException(status_code=400, detail=f"Sinh viên {student.full_name} đã ở trong lớp này!")

    new_cs = ClassStudent(
        class_id=class_id,
        student_id=student.id,
        status="APPROVED"
    )
    db.add(new_cs)
    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="ADD_CLASS_STUDENT",
        details=f"Admin đã thêm SV {student.code} ({student.full_name}) vào lớp {cls.class_code}"
    )
    db.add(audit)
    db.commit()

    return {"status": "SUCCESS", "message": f"Đã thêm Sinh viên {student.full_name} vào lớp {cls.class_code}"}

@router.delete("/classes/{class_id}/remove-student/{student_id}")
def remove_student_from_class(
    class_id: int,
    student_id: int,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Xóa Sinh viên khỏi lớp học
    """
    cs = db.query(ClassStudent).filter(
        ClassStudent.class_id == class_id,
        ClassStudent.student_id == student_id
    ).first()

    if not cs:
        raise HTTPException(status_code=404, detail="Sinh viên không thuộc lớp học này!")

    student_code = cs.student.code if cs.student else str(student_id)
    db.delete(cs)
    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="REMOVE_CLASS_STUDENT",
        details=f"Admin đã xóa SV {student_code} khỏi lớp ID {class_id}"
    )
    db.add(audit)
    db.commit()

    return {"status": "SUCCESS", "message": f"Đã xóa Sinh viên khỏi lớp thành công"}

@router.post("/users/{user_id}/reset-face")
def reset_user_face_data(user_id: int, current_user: User = Depends(require_role(["ADMIN"])), db: Session = Depends(get_db)):
    count = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == user_id).delete()
    db.commit()
    
    audit = AuditLog(
        user_id=current_user.id,
        action="RESET_FACE_DATA",
        details=f"Admin đã xóa toàn bộ {count} vector khuôn mặt của User ID {user_id}"
    )
    db.add(audit)
    db.commit()

    return {"status": "SUCCESS", "message": f"Đã reset thành công dữ liệu khuôn mặt cho User ID {user_id}", "deleted_count": count}

@router.post("/users/{user_id}/toggle-active")
def toggle_user_active(user_id: int, current_user: User = Depends(require_role(["ADMIN"])), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    user.is_active = not user.is_active
    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        action="TOGGLE_USER_ACTIVE",
        details=f"Admin đã {'mở khóa' if user.is_active else 'khóa'} tài khoản ID {user_id} ({user.code})"
    )
    db.add(audit)
    db.commit()

    return {"status": "SUCCESS", "is_active": user.is_active}

@router.get("/audit-logs")
def get_audit_logs(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Truy vấn danh sách nhật ký hoạt động hệ thống (Audit Logs) dành cho Super Admin
    """
    total = db.query(AuditLog).count()
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()

    items = []
    for l in logs:
        user_info = None
        if l.user_id:
            u = db.query(User).filter(User.id == l.user_id).first()
            if u:
                user_info = {"id": u.id, "code": u.code, "full_name": u.full_name, "role": u.role}

        items.append({
            "id": l.id,
            "user_id": l.user_id,
            "user_info": user_info,
            "action": l.action,
            "details": l.details,
            "timestamp": l.timestamp.strftime("%Y-%m-%d %H:%M:%S") if l.timestamp else None
        })

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": items
    }

