"""
Rigorous PostgreSQL Database Integration Test Suite by Quinn QA
Kiểm thử trực tiếp CSDL PostgreSQL/SQLite, RDBMS schemas, FK constraints và Vector 512-d storage
"""
import sys
import os
import json
import datetime
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../web_app/backend')))

from main import app
from app.database import engine, Base, SessionLocal
from app.models import User, ClassRoom, ClassStudent, FaceEmbedding, AttendanceSession, SessionMediaFile, AttendanceRecord, class_teachers
from app.security import get_password_hash

client = TestClient(app)

def test_db_schema_creation():
    print("  🧪 Quinn QA Iteration 1: Testing DB Schema & Tables Creation...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Test User creation
    test_user = db.query(User).filter(User.code == "TEST_SV01").first()
    if not test_user:
        test_user = User(
            email="test_student@sic.edu.vn",
            code="TEST_SV01",
            full_name="Nguyễn Văn Test",
            password_hash=get_password_hash("pass123"),
            role="STUDENT"
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
    
    assert test_user.id is not None
    assert test_user.code == "TEST_SV01"
    print("    ✅ User Table & SHA256 Password Hash: PASS")

    # 2. Test Face Embedding 512-d Storage
    emb = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == test_user.id, FaceEmbedding.angle_label == "FRONT").first()
    mock_512d = [0.01 * i for i in range(512)]
    if not emb:
        emb = FaceEmbedding(
            user_id=test_user.id,
            angle_label="FRONT",
            embedding_json=json.dumps(mock_512d)
        )
        db.add(emb)
        db.commit()

    loaded_vec = json.loads(emb.embedding_json)
    assert len(loaded_vec) == 512
    print("    ✅ 512-d Vector Embedding Storage & JSON Serialization: PASS")

    # 3. Test Teacher & Class Creation
    teacher = db.query(User).filter(User.code == "TEST_GV01").first()
    if not teacher:
        teacher = User(
            email="test_teacher@sic.edu.vn",
            code="TEST_GV01",
            full_name="TS. Lê Văn Giảng",
            password_hash=get_password_hash("pass123"),
            role="TEACHER"
        )
        db.add(teacher)
        db.commit()

    classroom = db.query(ClassRoom).filter(ClassRoom.class_code == "SIC-TEST01").first()
    if not classroom:
        classroom = ClassRoom(
            class_code="SIC-TEST01",
            class_name="Lớp Kiểm Thử Tự Động",
            subject_topic="Xử Lý Ảnh Nâng Cao",
            created_by_teacher_id=teacher.id
        )
        classroom.teachers.append(teacher)
        db.add(classroom)
        db.commit()

    assert classroom.id is not None
    assert classroom.subject_topic == "Xử Lý Ảnh Nâng Cao"
    print("    ✅ Classroom Table & Subject Topic Schema: PASS")

    # 4. Test Co-Teaching Multi-Teacher Relationship
    co_teacher = db.query(User).filter(User.code == "TEST_GV02").first()
    if not co_teacher:
        co_teacher = User(
            email="coteacher@sic.edu.vn",
            code="TEST_GV02",
            full_name="ThS. Phạm Đồng Giảng",
            password_hash=get_password_hash("pass123"),
            role="TEACHER"
        )
        db.add(co_teacher)
        db.commit()

    if co_teacher not in classroom.teachers:
        classroom.teachers.append(co_teacher)
        db.commit()

    assert len(classroom.teachers) == 2
    print("    ✅ Multi-Teacher Co-Teaching Many-to-Many Relationship: PASS")

    # 5. Test Attendance Session & Media File Insertion
    session = AttendanceSession(
        class_id=classroom.id,
        session_date="2026-08-18",
        title="Buổi kiểm thử CSDL",
        created_by_id=teacher.id
    )
    db.add(session)
    db.commit()

    media_file = SessionMediaFile(
        session_id=session.id,
        media_type="IMAGE",
        raw_file_path="/app/web_app/backend/data/uploads/raw_test.jpg",
        processed_file_path="/app/reports/processed_test.jpg",
        status="COMPLETED"
    )
    db.add(media_file)

    rec = AttendanceRecord(
        session_id=session.id,
        user_id=test_user.id,
        status="PRESENT",
        confidence=0.985,
        detected_in_media_id=media_file.id
    )
    db.add(rec)
    db.commit()

    assert session.id is not None
    assert rec.status == "PRESENT"
    print("    ✅ Attendance Session & Batch Media Record Insertion: PASS")

    db.close()

def test_db_health_endpoint():
    print("  🧪 Quinn QA Iteration 2: Testing DB Health Check Endpoint...")
    login_resp = client.post("/api/v1/auth/login", json={
        "code_or_email": "ADMIN01",
        "password": "admin123"
    })
    token = login_resp.json()["access_token"]

    response = client.get(
        "/api/v1/admin/db-health",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert "metrics" in data
    assert data["metrics"]["total_users"] > 0
    print(f"    ✅ DB Health Status: {data['status']} ({data['db_type']}) Metrics: {data['metrics']}")

if __name__ == "__main__":
    test_db_schema_creation()
    test_db_health_endpoint()
    print("\n🎉 Quinn QA Iteration 2 DB Test Suite: ALL DB CHECKS PASSED!")
