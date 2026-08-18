"""
SIC_FaceRecognition FastAPI Server Main Entrypoint
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.models import User, ClassRoom, ClassStudent
from app.security import get_password_hash
from app.routes import auth, enrollment, classes, attendance, admin

# Initialize Database Tables
Base.metadata.create_all(bind=engine)

def seed_default_users():
    db = SessionLocal()
    try:
        default_users = [
            {"email": "student01@sic.edu.vn", "code": "SV001", "full_name": "Nguyễn Văn Sinh Viên", "password": "student123", "role": "STUDENT"},
            {"email": "teacher01@sic.edu.vn", "code": "GV001", "full_name": "TS. Trịnh Văn Giảng Viên", "password": "teacher123", "role": "TEACHER"},
            {"email": "admin01@sic.edu.vn", "code": "ADMIN01", "full_name": "Quản Trị Viên Hệ Thống", "password": "admin123", "role": "ADMIN"},
        ]
        for u in default_users:
            exists = db.query(User).filter((User.code == u["code"]) | (User.email == u["email"])).first()
            if not exists:
                user_obj = User(
                    email=u["email"],
                    code=u["code"],
                    full_name=u["full_name"],
                    password_hash=get_password_hash(u["password"]),
                    role=u["role"],
                    is_active=True
                )
                db.add(user_obj)
        db.commit()

        # Seed Default Class for Demo
        teacher = db.query(User).filter(User.code == "GV001").first()
        student = db.query(User).filter(User.code == "SV001").first()
        if teacher:
            cls = db.query(ClassRoom).filter(ClassRoom.class_code == "SIC-6940IZ").first()
            if not cls:
                cls = ClassRoom(
                    class_code="SIC-6940IZ",
                    class_name="Lớp Nhận Diện Khuôn Mặt SIC AI N01",
                    subject_topic="AI Core & Computer Vision",
                    created_by_teacher_id=teacher.id
                )
                db.add(cls)
                db.commit()
                db.refresh(cls)

                if cls and teacher:
                    cls.teachers.append(teacher)
                    db.commit()

            if cls and student:
                cs = db.query(ClassStudent).filter(ClassStudent.class_id == cls.id, ClassStudent.student_id == student.id).first()
                if not cs:
                    cs = ClassStudent(class_id=cls.id, student_id=student.id, status="APPROVED")
                    db.add(cs)
                    db.commit()

    except Exception as e:
        db.rollback()
    finally:
        db.close()

seed_default_users()

app = FastAPI(
    title="SIC FaceRecognition API",
    description="Hệ thống Điểm danh Lớp học Tự động bằng AI & Thu thập Dữ liệu Khuôn mặt Đa góc độ",
    version="4.4.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(enrollment.router)
app.include_router(classes.router)
app.include_router(attendance.router)
app.include_router(admin.router)

@app.get("/")
def read_root():
    return {
        "status": "ONLINE",
        "system": "SIC_FaceRecognition API Server",
        "version": "4.4.0",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
