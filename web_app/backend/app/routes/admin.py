"""
Super Admin Control Center API Endpoints with DB Health Check
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.models import User, ClassRoom, AuditLog, FaceEmbedding, AttendanceSession
from app.schemas import UserResponse, ClassResponse
from app.security import require_role

router = APIRouter(prefix="/api/v1/admin", tags=["Super Admin Controls"])

@router.get("/db-health")
def check_db_health(current_user: User = Depends(require_role(["ADMIN"])), db: Session = Depends(get_db)):
    """
    Kiểm tra sức khỏe CSDL PostgreSQL/SQLite, thống kê số lượng bản ghi
    """
    try:
        # Test active DB query
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

@router.get("/users", response_model=List[UserResponse])
def get_all_users(current_user: User = Depends(require_role(["ADMIN"])), db: Session = Depends(get_db)):
    return db.query(User).all()

@router.get("/classes", response_model=List[ClassResponse])
def get_all_classes(current_user: User = Depends(require_role(["ADMIN"])), db: Session = Depends(get_db)):
    return db.query(ClassRoom).all()

@router.post("/users/{user_id}/reset-face")
def reset_user_face_data(user_id: int, current_user: User = Depends(require_role(["ADMIN"])), db: Session = Depends(get_db)):
    db.query(FaceEmbedding).filter(FaceEmbedding.user_id == user_id).delete()
    db.commit()
    return {"status": "SUCCESS", "message": f"Đã reset thành công dữ liệu khuôn mặt cho User ID {user_id}"}

@router.post("/users/{user_id}/toggle-active")
def toggle_user_active(user_id: int, current_user: User = Depends(require_role(["ADMIN"])), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    user.is_active = not user.is_active
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

