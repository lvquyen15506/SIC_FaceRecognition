"""
Pydantic Validation Schemas
"""
from typing import List, Optional
from pydantic import BaseModel, EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str
    code: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[int] = None

class UserRegister(BaseModel):
    email: str
    code: str  # MSSV or MGV or ADMIN_ID
    full_name: str
    password: str
    role: str  # 'STUDENT', 'TEACHER', 'ADMIN'

class UserLogin(BaseModel):
    code_or_email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    code: str
    full_name: str
    role: str
    is_active: bool
    has_face_data: bool = False
    face_angles_count: int = 0

    class Config:
        from_attributes = True

class UserCreateRequest(BaseModel):
    email: str
    code: str
    full_name: str
    password: str
    role: str

class UserUpdateRequest(BaseModel):
    email: Optional[str] = None
    code: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None

class ClassCreateRequest(BaseModel):
    class_name: str
    subject_topic: str
    teacher_id: Optional[int] = None

class ClassUpdateRequest(BaseModel):
    class_name: Optional[str] = None
    subject_topic: Optional[str] = None
    teacher_id: Optional[int] = None

class AddMemberRequest(BaseModel):
    user_code_or_email: str

class ClassResponse(BaseModel):
    id: int
    class_code: str
    class_name: str
    subject_topic: str
    created_by_teacher_id: int

    class Config:
        from_attributes = True

class AddTeacherRequest(BaseModel):
    teacher_email_or_code: str

class EnrollFaceRequest(BaseModel):
    angle_label: str  # 'FRONT', 'LEFT', 'RIGHT', 'TILT'
    image_base64: str

class FullKycEnrollRequest(BaseModel):
    angles: dict  # {"FRONT": "base64...", "LEFT": "base64...", "RIGHT": "base64...", "TILT": "base64..."}

class AttendanceRecordResponse(BaseModel):
    student_name: str
    student_code: str
    status: str  # 'PRESENT', 'ABSENT'
    confidence: float

class SessionResponse(BaseModel):
    id: int
    class_id: int
    session_date: str
    title: str
    processed_files_count: int

    class Config:
        from_attributes = True
