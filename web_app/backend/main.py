"""
SIC_FaceRecognition FastAPI Server Main Entrypoint
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import auth, enrollment, classes, attendance, admin

# Initialize Database Tables
Base.metadata.create_all(bind=engine)

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
