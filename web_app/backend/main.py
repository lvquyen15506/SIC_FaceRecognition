"""
SIC_FaceRecognition FastAPI Server Main Entrypoint
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.models import User, ClassRoom, ClassStudent
from app.security import get_password_hash
from app.routes import auth, enrollment, classes, attendance, admin

import time

# Initialize Database Tables with Retry Loop
def init_database_with_retry():
    max_retries = 10
    for attempt in range(1, max_retries + 1):
        try:
            print(f"[Database Init] Connecting to database (Attempt {attempt}/{max_retries})...")
            Base.metadata.create_all(bind=engine)
            print("[Database Init] Successfully created database tables!")
            return True
        except Exception as e:
            print(f"[Database Init Warning] Connection failed: {e}")
            if attempt < max_retries:
                time.sleep(2)
            else:
                print("[Database Init Error] Could not connect to DB after max retries!")
                raise e

init_database_with_retry()

def auto_migrate_db():
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            if engine.dialect.name == "sqlite":
                res = conn.execute(text("PRAGMA table_info(attendance_sessions);")).fetchall()
                cols = [r[1] for r in res]
                if "total_faces_detected" not in cols:
                    conn.execute(text("ALTER TABLE attendance_sessions ADD COLUMN total_faces_detected INTEGER DEFAULT 0;"))
                if "unknown_count" not in cols:
                    conn.execute(text("ALTER TABLE attendance_sessions ADD COLUMN unknown_count INTEGER DEFAULT 0;"))
            else:
                conn.execute(text("ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS total_faces_detected INTEGER DEFAULT 0;"))
                conn.execute(text("ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS unknown_count INTEGER DEFAULT 0;"))
            conn.commit()
    except Exception as e:
        print(f"[Migration Warning] Auto-migration error: {e}")

auto_migrate_db()

def seed_default_users():
    db = SessionLocal()
    try:
        default_users = [
            {"email": "admin01@sic.edu.vn", "code": "ADMIN01", "full_name": "Quản Trị Viên Hệ Thống", "password": "AdminTriTech@123", "role": "ADMIN"},
            {"email": "admin@tritech.vn", "code": "ADMIN", "full_name": "Admin TriTech Systems", "password": "AdminTriTech@123", "role": "ADMIN"},
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
            else:
                if u["role"] == "ADMIN":
                    exists.password_hash = get_password_hash(u["password"])
        db.commit()
    except Exception as e:
        print(f"[Seeding Error] {e}")
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
