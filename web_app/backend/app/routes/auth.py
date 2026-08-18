"""
Authentication API Endpoints (Login & Register with Smart Auto-Role Redirection & KYC Check)
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, FaceEmbedding
from app.schemas import UserRegister, UserLogin, Token, UserResponse
from app.security import verify_password, get_password_hash, create_access_token, get_current_user
from app.config import ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse)
def register_user(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check existing user
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | (User.code == user_data.code)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email hoặc Mã số đã được đăng ký"
        )
    
    new_user = User(
        email=user_data.email,
        code=user_data.code.upper(),
        full_name=user_data.full_name,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role.upper(),
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login")
def login_user(login_data: UserLogin, db: Session = Depends(get_db)):
    # Single login form: Match email or code (MSSV/MGV/ADMIN_ID)
    user = db.query(User).filter(
        (User.email == login_data.code_or_email) | (User.code == login_data.code_or_email.upper())
    ).first()
    
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mã số / Email hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    face_count = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == user.id).count()
    kyc_status = "VERIFIED" if face_count > 0 else "UNVERIFIED"

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name,
        "code": user.code,
        "face_count": face_count,
        "kyc_status": kyc_status
    }

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    face_count = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == current_user.id).count()
    kyc_status = "VERIFIED" if face_count > 0 else "UNVERIFIED"
    return {
        "id": current_user.id,
        "email": current_user.email,
        "code": current_user.code,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "face_count": face_count,
        "kyc_status": kyc_status
    }
