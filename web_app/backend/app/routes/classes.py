"""
Classroom Management API Endpoints
"""
import random
import string
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, ClassRoom, ClassStudent, class_teachers
from app.schemas import ClassCreate, ClassResponse, AddTeacherRequest, UserResponse
from app.security import get_current_user, require_role

router = APIRouter(prefix="/api/v1/classes", tags=["Classes Management"])

def generate_class_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "SIC-" + "".join(random.choices(chars, k=6))

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
        # Teachers or Admins
        return current_user.teaching_classes

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
    
    teacher = db.query(User).filter(
        (User.email == req.teacher_email_or_code) | (User.code == req.teacher_email_or_code.upper()),
        User.role.in_(["TEACHER", "ADMIN"])
    ).first()

    if not teacher:
        raise HTTPException(status_code=404, detail="Không tìm thấy Giảng viên")

    if teacher not in classroom.teachers:
        classroom.teachers.append(teacher)
        db.commit()

    return {"status": "SUCCESS", "message": f"Đã thêm Giảng viên {teacher.full_name} vào quản lý lớp"}

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
        return {"status": "EXISTS", "message": "Bạn đã đăng ký tham gia lớp học này rồi"}

    new_join = ClassStudent(
        class_id=classroom.id,
        student_id=current_user.id,
        status="APPROVED"
    )
    db.add(new_join)
    db.commit()
    return {"status": "SUCCESS", "message": f"Đã gia nhập lớp {classroom.class_name} thành công"}

@router.get("/{class_id}/students", response_model=List[UserResponse])
def get_class_students(class_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    class_students = db.query(ClassStudent).filter(
        ClassStudent.class_id == class_id,
        ClassStudent.status == "APPROVED"
    ).all()
    return [cs.student for cs in class_students]
