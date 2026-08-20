from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.models import User, ClassRoom, AuditLog, FaceEmbedding, AttendanceSession, ClassStudent
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

@router.get("/classes", response_model=List[ClassResponse])
def get_all_classes(current_user: User = Depends(require_role(["ADMIN"])), db: Session = Depends(get_db)):
    return db.query(ClassRoom).all()

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

