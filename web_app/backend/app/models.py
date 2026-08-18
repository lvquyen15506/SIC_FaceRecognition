"""
Database ORM Models (SQLAlchemy 2.0 Compliant)
"""
import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Boolean, Table
from sqlalchemy.orm import relationship
from app.database import Base

# Association table for Multi-Teacher Co-Teaching
class_teachers = Table(
    'class_teachers',
    Base.metadata,
    Column('class_id', Integer, ForeignKey('classes.id'), primary_key=True),
    Column('teacher_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('assigned_at', DateTime, default=datetime.datetime.utcnow)
)

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)  # MSSV or MGV or ADMIN_ID
    full_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # 'STUDENT', 'TEACHER', 'ADMIN'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    face_embeddings = relationship("FaceEmbedding", back_populates="user", cascade="all, delete-orphan")
    teaching_classes = relationship("ClassRoom", secondary=class_teachers, back_populates="teachers")

class ClassRoom(Base):
    __tablename__ = 'classes'
    id = Column(Integer, primary_key=True, index=True)
    class_code = Column(String, unique=True, index=True, nullable=False)
    class_name = Column(String, nullable=False)
    subject_topic = Column(String, nullable=False)
    created_by_teacher_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    teachers = relationship("User", secondary=class_teachers, back_populates="teaching_classes")
    students = relationship("ClassStudent", back_populates="classroom", cascade="all, delete-orphan")
    sessions = relationship("AttendanceSession", back_populates="classroom", cascade="all, delete-orphan")

class ClassStudent(Base):
    __tablename__ = 'class_students'
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey('classes.id'), nullable=False)
    student_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    status = Column(String, default="APPROVED")  # 'PENDING', 'APPROVED'
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    classroom = relationship("ClassRoom", back_populates="students")
    student = relationship("User")

class FaceEmbedding(Base):
    __tablename__ = 'face_embeddings'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    angle_label = Column(String, nullable=False)  # 'FRONT', 'LEFT', 'RIGHT', 'TILT'
    embedding_json = Column(Text, nullable=False)  # 512-d list as JSON string
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="face_embeddings")

class AttendanceSession(Base):
    __tablename__ = 'attendance_sessions'
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey('classes.id'), nullable=False)
    session_date = Column(String, nullable=False)  # YYYY-MM-DD
    title = Column(String, default="Buổi điểm danh")
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    classroom = relationship("ClassRoom", back_populates="sessions")
    media_files = relationship("SessionMediaFile", back_populates="session", cascade="all, delete-orphan")
    records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")

class SessionMediaFile(Base):
    __tablename__ = 'session_media_files'
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey('attendance_sessions.id'), nullable=False)
    media_type = Column(String, nullable=False)  # 'IMAGE', 'VIDEO'
    raw_file_path = Column(String, nullable=False)
    processed_file_path = Column(String, nullable=True)
    status = Column(String, default="COMPLETED")  # 'PROCESSING', 'COMPLETED', 'FAILED'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("AttendanceSession", back_populates="media_files")

class AttendanceRecord(Base):
    __tablename__ = 'attendance_records'
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey('attendance_sessions.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    status = Column(String, nullable=False)  # 'PRESENT', 'ABSENT'
    confidence = Column(Float, default=0.0)
    detected_in_media_id = Column(Integer, ForeignKey('session_media_files.id'), nullable=True)

    session = relationship("AttendanceSession", back_populates="records")
    user = relationship("User")

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    action = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
