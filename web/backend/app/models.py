import uuid
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(128), nullable=False)
    
    # System Roles: 'ADMIN', 'TEACHER', 'STUDENT'
    system_role = db.Column(db.String(20), nullable=False, default="STUDENT")
    
    # Student specific field
    student_id_code = db.Column(db.String(32), unique=True, nullable=True)
    ekyc_completed = db.Column(db.Boolean, default=False)
    
    # JSON String representation of 128-d face embedding vector
    face_embeddings_json = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "system_role": self.system_role,
            "student_id_code": self.student_id_code,
            "ekyc_completed": self.ekyc_completed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Classroom(db.Model):
    __tablename__ = "classrooms"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    class_code = db.Column(db.String(32), unique=True, nullable=False, index=True)
    class_name = db.Column(db.String(128), nullable=False)
    
    # Primary Teacher who created the classroom
    primary_teacher_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    primary_teacher = db.relationship("User", foreign_keys=[primary_teacher_id])

    def to_dict(self):
        return {
            "id": self.id,
            "class_code": self.class_code,
            "class_name": self.class_name,
            "primary_teacher_id": self.primary_teacher_id,
            "primary_teacher_name": self.primary_teacher.full_name if self.primary_teacher else "N/A",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ClassroomTeacher(db.Model):
    """Co-Teachers mapping table for multi-teacher classroom collaboration"""
    __tablename__ = "classroom_teachers"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    classroom_id = db.Column(db.String(36), db.ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False)
    teacher_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # 'PRIMARY_TEACHER' or 'CO_TEACHER'
    teacher_role = db.Column(db.String(32), default="CO_TEACHER")

    teacher = db.relationship("User", foreign_keys=[teacher_id])
    classroom = db.relationship("Classroom", foreign_keys=[classroom_id])


class ClassroomStudent(db.Model):
    """Students enrolled in classroom with roles (MONITOR, STUDENT) & granular permissions"""
    __tablename__ = "classroom_students"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    classroom_id = db.Column(db.String(36), db.ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False)
    student_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # 'MONITOR' (Lớp trưởng), 'SUB_MONITOR' (Lớp phó), 'STUDENT'
    student_class_role = db.Column(db.String(32), default="STUDENT")
    
    # JSON String for permissions: e.g. '["CAN_UPLOAD_ATTENDANCE", "CAN_VIEW_REPORTS"]'
    permissions_json = db.Column(db.Text, default='["CAN_VIEW_SELF"]')

    student = db.relationship("User", foreign_keys=[student_id])
    classroom = db.relationship("Classroom", foreign_keys=[classroom_id])


class AttendanceSession(db.Model):
    """Attendance Sessions created by Teachers or Class Monitors"""
    __tablename__ = "attendance_sessions"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    classroom_id = db.Column(db.String(36), db.ForeignKey("classrooms.id", ondelete="CASCADE"), nullable=False)
    created_by_user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    
    title = db.Column(db.String(128), nullable=False)  # e.g. "Điểm danh Buổi 5"
    session_type = db.Column(db.String(20), nullable=False)  # 'PHOTO', 'VIDEO', 'LIVE_CAMERA'
    
    media_proof_path = db.Column(db.String(256), nullable=True)
    csv_report_path = db.Column(db.String(256), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    creator = db.relationship("User", foreign_keys=[created_by_user_id])
    classroom = db.relationship("Classroom", foreign_keys=[classroom_id])

    def to_dict(self):
        return {
            "id": self.id,
            "classroom_id": self.classroom_id,
            "classroom_name": self.classroom.class_name if self.classroom else "N/A",
            "created_by_user_id": self.created_by_user_id,
            "creator_name": self.creator.full_name if self.creator else "N/A",
            "title": self.title,
            "session_type": self.session_type,
            "media_proof_path": self.media_proof_path,
            "csv_report_path": self.csv_report_path,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AttendanceRecord(db.Model):
    """Individual Student Attendance Check-in Result"""
    __tablename__ = "attendance_records"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    session_id = db.Column(db.String(36), db.ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False)
    student_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    
    student_name = db.Column(db.String(128), nullable=False)
    
    # 'PRESENT' (Có mặt), 'ABSENT' (Vắng), 'UNREGISTERED' (Người lạ)
    status = db.Column(db.String(20), nullable=False, default="ABSENT")
    confidence_score = db.Column(db.Float, default=0.0)
    
    # Manual Edit Override by Teacher / Monitor
    is_manually_edited = db.Column(db.Boolean, default=False)
    edited_by_user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = db.relationship("User", foreign_keys=[student_id])
    editor = db.relationship("User", foreign_keys=[edited_by_user_id])

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "student_id": self.student_id,
            "student_name": self.student_name,
            "status": self.status,
            "confidence_score": self.confidence_score,
            "is_manually_edited": self.is_manually_edited,
            "edited_by_name": self.editor.full_name if self.editor else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
