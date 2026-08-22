"""
Classroom Management API Endpoints
"""
import os
import random
import string
from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, ClassRoom, ClassStudent, FaceEmbedding, AttendanceSession, SessionMediaFile, AttendanceRecord
from app.schemas import ClassCreate, ClassResponse, AddTeacherRequest, UserResponse
from app.security import get_current_user, require_role, get_password_hash
from app.services.audit import log_action

router = APIRouter(prefix="/api/v1/classes", tags=["Classes Management"])

class AddStudentRequest(BaseModel):
    student_code_or_email: str

def generate_class_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "SIC-" + "".join(random.choices(chars, k=6))

@router.get("/search-students")
def search_students(
    class_id: int = None,
    query: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(User).filter(User.role == "STUDENT")
    if query.strip():
        term = f"%{query.strip()}%"
        q = q.filter(
            (User.full_name.ilike(term)) |
            (User.code.ilike(term)) |
            (User.email.ilike(term))
        )
    students = q.limit(20).all()

    enrolled_ids = set()
    if class_id:
        cs_list = db.query(ClassStudent.student_id).filter(
            ClassStudent.class_id == class_id,
            ClassStudent.status == "APPROVED"
        ).all()
        enrolled_ids = {cs[0] for cs in cs_list}

    return [{
        "id": s.id,
        "code": s.code,
        "full_name": s.full_name,
        "email": s.email,
        "already_in_class": s.id in enrolled_ids
    } for s in students]

@router.get("/search-teachers")
def search_teachers(
    class_id: int = None,
    query: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    q = db.query(User).filter(User.role.in_(["TEACHER", "ADMIN"]))
    if query.strip():
        term = f"%{query.strip()}%"
        q = q.filter(
            (User.full_name.ilike(term)) |
            (User.code.ilike(term)) |
            (User.email.ilike(term))
        )
    teachers = q.limit(20).all()

    managing_ids = set()
    if class_id:
        classroom = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
        if classroom:
            managing_ids = {t.id for t in classroom.teachers}

    return [{
        "id": t.id,
        "code": t.code,
        "full_name": t.full_name,
        "email": t.email,
        "already_in_class": t.id in managing_ids
    } for t in teachers]

@router.post("/create", response_model=ClassResponse)
def create_class(
    class_data: ClassCreate,
    current_user: User = Depends(require_role(["TEACHER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    class_code = generate_class_code()
    new_class = ClassRoom(
        class_code=class_code,
        class_name=class_data.class_name,
        subject_topic=class_data.subject_topic,
        created_by_teacher_id=current_user.id
    )
    new_class.teachers.append(current_user)
    db.add(new_class)
    db.commit()
    db.refresh(new_class)
    return new_class

@router.get("/my-classes", response_model=List[ClassResponse])
def get_my_classes(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "STUDENT":
        joined = db.query(ClassStudent).filter(
            ClassStudent.student_id == current_user.id,
            ClassStudent.status == "APPROVED"
        ).all()
        return [j.classroom for j in joined]
    else:
        return current_user.teaching_classes

@router.get("/{class_id}/teachers")
def get_class_teachers(class_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    classroom = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Lớp học không tồn tại")

    result = []
    for t in classroom.teachers:
        result.append({
            "id": t.id,
            "code": t.code,
            "full_name": t.full_name,
            "email": t.email,
            "role": t.role,
            "is_owner": t.id == classroom.created_by_teacher_id
        })
    return result

@router.post("/{class_id}/add-teacher")
def add_co_teacher(
    class_id: int,
    req: AddTeacherRequest,
    current_user: User = Depends(require_role(["TEACHER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    classroom = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Lớp học không tồn tại")
    
    query_str = req.teacher_email_or_code.strip()
    teacher = db.query(User).filter(
        (User.email == query_str) | (User.code == query_str.upper()),
        User.role.in_(["TEACHER", "ADMIN"])
    ).first()

    if not teacher:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy Giảng viên với Mã GV/Email '{query_str}'. Tài khoản phải tồn tại trên hệ thống mới có thể thêm!"
        )

    if teacher not in classroom.teachers:
        classroom.teachers.append(teacher)
        db.commit()
        return {"status": "SUCCESS", "message": f"Đã thêm Giảng viên {teacher.full_name} ({teacher.code}) vào đồng quản lý lớp học"}

    return {"status": "EXISTS", "message": f"Giảng viên {teacher.full_name} ({teacher.code}) đã là giảng viên quản lý lớp rồi"}

@router.post("/join/{class_code}")
def join_class_by_code(class_code: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    classroom = db.query(ClassRoom).filter(ClassRoom.class_code == class_code.upper()).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Mã lớp không chính xác")

    existing = db.query(ClassStudent).filter(
        ClassStudent.class_id == classroom.id,
        ClassStudent.student_id == current_user.id
    ).first()

    if existing:
        if existing.status == "PENDING":
            return {"status": "PENDING", "message": f"Yêu cầu tham gia lớp {classroom.class_name} của bạn đang chờ Giảng viên duyệt"}
        return {"status": "EXISTS", "message": f"Bạn đã là thành viên của lớp {classroom.class_name} rồi"}

    new_join = ClassStudent(
        class_id=classroom.id,
        student_id=current_user.id,
        status="PENDING"
    )
    db.add(new_join)
    db.commit()
    log_action(db, current_user.id, "STUDENT_JOIN_REQUEST", {"class_id": classroom.id, "class_code": classroom.class_code})
    return {"status": "SUCCESS", "message": f"Đã gửi yêu cầu tham gia lớp {classroom.class_name}. Vui lòng chờ Giảng viên duyệt!"}

@router.get("/{class_id}/pending-students")
def get_pending_students(
    class_id: int,
    current_user: User = Depends(require_role(["TEACHER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    classroom = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Lớp học không tồn tại")

    pending_list = db.query(ClassStudent).filter(
        ClassStudent.class_id == class_id,
        ClassStudent.status == "PENDING"
    ).all()

    result = []
    for cs in pending_list:
        s = cs.student
        face_cnt = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == s.id).count()
        result.append({
            "id": s.id,
            "code": s.code,
            "full_name": s.full_name,
            "email": s.email,
            "joined_at": cs.joined_at.strftime("%Y-%m-%d %H:%M:%S") if cs.joined_at else "",
            "face_count": face_cnt
        })
    return result

@router.post("/{class_id}/students/{student_id}/approve")
def approve_student_request(
    class_id: int,
    student_id: int,
    current_user: User = Depends(require_role(["TEACHER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    cs = db.query(ClassStudent).filter(
        ClassStudent.class_id == class_id,
        ClassStudent.student_id == student_id
    ).first()

    if not cs:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu gia nhập của sinh viên này")

    cs.status = "APPROVED"
    db.commit()
    log_action(db, current_user.id, "APPROVE_STUDENT_JOIN", {"class_id": class_id, "student_id": student_id})
    return {"status": "SUCCESS", "message": f"Đã duyệt Sinh viên {cs.student.full_name} vào lớp học thành công"}

@router.post("/{class_id}/students/{student_id}/reject")
def reject_student_request(
    class_id: int,
    student_id: int,
    current_user: User = Depends(require_role(["TEACHER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    cs = db.query(ClassStudent).filter(
        ClassStudent.class_id == class_id,
        ClassStudent.student_id == student_id
    ).first()

    if not cs:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu gia nhập")

    db.delete(cs)
    db.commit()
    log_action(db, current_user.id, "REJECT_STUDENT_JOIN", {"class_id": class_id, "student_id": student_id})
    return {"status": "SUCCESS", "message": "Đã từ chối yêu cầu tham gia lớp học"}

@router.delete("/{class_id}/teachers/{teacher_id}")
def remove_co_teacher(
    class_id: int,
    teacher_id: int,
    current_user: User = Depends(require_role(["TEACHER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    classroom = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Lớp học không tồn tại")

    if teacher_id == classroom.created_by_teacher_id:
        raise HTTPException(status_code=400, detail="Không thể xóa Giảng viên chủ nhiệm / người tạo lớp")

    target_teacher = db.query(User).filter(User.id == teacher_id).first()
    if not target_teacher or target_teacher not in classroom.teachers:
        raise HTTPException(status_code=404, detail="Giảng viên không nằm trong danh sách đồng quản lý lớp này")

    classroom.teachers.remove(target_teacher)
    db.commit()
    log_action(db, current_user.id, "REMOVE_CO_TEACHER", {"class_id": class_id, "teacher_id": teacher_id})
    return {"status": "SUCCESS", "message": f"Đã xóa Giảng viên {target_teacher.full_name} khỏi lớp học"}

@router.get("/{class_id}/students")
def get_class_students(class_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    class_students = db.query(ClassStudent).filter(
        ClassStudent.class_id == class_id,
        ClassStudent.status == "APPROVED"
    ).all()

    result = []
    for cs in class_students:
        s = cs.student
        face_cnt = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == s.id).count()
        result.append({
            "id": s.id,
            "code": s.code,
            "full_name": s.full_name,
            "email": s.email,
            "role": s.role,
            "face_count": face_cnt
        })
    return result

@router.post("/{class_id}/add-student")
def add_student_to_class(
    class_id: int,
    req: AddStudentRequest,
    current_user: User = Depends(require_role(["TEACHER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    classroom = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Lớp học không tồn tại")

    query_str = req.student_code_or_email.strip()
    student = db.query(User).filter(
        (User.email == query_str) | (User.code == query_str.upper()),
        User.role == "STUDENT"
    ).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy Sinh viên với MSSV/Email '{query_str}'. Tài khoản phải tồn tại trên hệ thống mới có thể thêm!"
        )

    existing = db.query(ClassStudent).filter(
        ClassStudent.class_id == class_id,
        ClassStudent.student_id == student.id
    ).first()

    if existing:
        if existing.status != "APPROVED":
            existing.status = "APPROVED"
            db.commit()
            return {"status": "SUCCESS", "message": f"Đã duyệt Sinh viên {student.full_name} ({student.code}) vào lớp"}
        return {"status": "EXISTS", "message": f"Sinh viên {student.full_name} ({student.code}) đã có trong lớp rồi"}

    new_cs = ClassStudent(
        class_id=class_id,
        student_id=student.id,
        status="APPROVED"
    )
    db.add(new_cs)
    db.commit()
    log_action(db, current_user.id, "ADD_STUDENT_DIRECTLY", {"class_id": class_id, "student_id": student.id})

    return {"status": "SUCCESS", "message": f"Đã thêm Sinh viên {student.full_name} ({student.code}) vào lớp thành công"}

@router.delete("/{class_id}/students/{student_id}")
def remove_student_from_class(
    class_id: int,
    student_id: int,
    current_user: User = Depends(require_role(["TEACHER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    cs = db.query(ClassStudent).filter(
        ClassStudent.class_id == class_id,
        ClassStudent.student_id == student_id
    ).first()

    if not cs:
        raise HTTPException(status_code=404, detail="Sinh viên không nằm trong lớp học này")

    db.delete(cs)
    db.commit()
    log_action(db, current_user.id, "REMOVE_STUDENT", {"class_id": class_id, "student_id": student_id})
    return {"status": "SUCCESS", "message": "Đã xóa sinh viên khỏi lớp học thành công"}

@router.delete("/{class_id}")
def delete_class(
    class_id: int,
    current_user: User = Depends(require_role(["TEACHER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Xóa vĩnh viễn Lớp Học và dọn sạch 100% tệp đĩa phương tiện (Video/Ảnh/Thumbnail)
    """
    classroom = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Lớp học không tồn tại")

    if current_user.role != "ADMIN" and classroom.created_by_teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Chỉ Giảng viên chủ nhiệm hoặc Admin mới có quyền xóa lớp học này")

    code_tmp = classroom.class_code

    # Cascade Physical Disk File Cleanup
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
                    except OSError as e:
                        print(f"[File Delete Error] Failed to remove {fpath}: {e}")

            if mf.processed_file_path and mf.processed_file_path.endswith('.mp4'):
                thumb_path = mf.processed_file_path.replace('.mp4', '.jpg').replace('_h264_', '_')
                if os.path.exists(thumb_path):
                    try:
                        os.remove(thumb_path)
                        deleted_files_count += 1
                    except OSError as e:
                        print(f"[File Delete Error] Failed to remove thumbnail {thumb_path}: {e}")

        db.query(SessionMediaFile).filter(SessionMediaFile.session_id == sess.id).delete(synchronize_session=False)
        db.query(AttendanceRecord).filter(AttendanceRecord.session_id == sess.id).delete(synchronize_session=False)

    db.query(AttendanceSession).filter(AttendanceSession.class_id == class_id).delete(synchronize_session=False)
    db.query(ClassStudent).filter(ClassStudent.class_id == class_id).delete(synchronize_session=False)

    db.delete(classroom)
    db.commit()

    log_action(db, current_user.id, "DELETE_CLASS", {"class_id": class_id, "class_code": code_tmp, "deleted_files": deleted_files_count})
    return {"status": "SUCCESS", "message": f"Đã xóa vĩnh viễn lớp học {code_tmp} và dọn sạch {deleted_files_count} tệp đĩa!"}

