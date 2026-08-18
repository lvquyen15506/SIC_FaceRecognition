"""
Super Admin Control Center API Endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, ClassRoom, AuditLog, FaceEmbedding
from app.schemas import UserResponse, ClassResponse
from app.security import require_role

router = APIRouter(prefix="/api/v1/admin", tags=["Super Admin Controls"])

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
