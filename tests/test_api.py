"""
QA Lead & Tester (Quinn) Automated Test Suite for SIC_FaceRecognition API
"""
import sys
import os
from fastapi.testclient import TestClient

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../web_app/backend')))

from main import app
from app.database import Base, engine, SessionLocal
from app.security import get_password_hash
from app.models import User, ClassRoom

client = TestClient(app)

def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Create test accounts if not exist
    if not db.query(User).filter(User.code == "ADMIN01").first():
        admin = User(
            email="admin@sic.edu.vn",
            code="ADMIN01",
            full_name="System Super Admin",
            password_hash=get_password_hash("admin123"),
            role="ADMIN",
            is_active=True
        )
        db.add(admin)

    if not db.query(User).filter(User.code == "GV001").first():
        teacher = User(
            email="teacher@sic.edu.vn",
            code="GV001",
            full_name="ThS. Nguyễn Văn Thầy",
            password_hash=get_password_hash("teacher123"),
            role="TEACHER",
            is_active=True
        )
        db.add(teacher)

    if not db.query(User).filter(User.code == "SV001").first():
        student = User(
            email="student@sic.edu.vn",
            code="SV001",
            full_name="Trần Thị Trò",
            password_hash=get_password_hash("student123"),
            role="STUDENT",
            is_active=True
        )
        db.add(student)

    db.commit()
    db.close()

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ONLINE"

def test_login_student():
    response = client.post("/api/v1/auth/login", json={
        "code_or_email": "SV001",
        "password": "student123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "STUDENT"
    assert "access_token" in data

def test_login_teacher():
    response = client.post("/api/v1/auth/login", json={
        "code_or_email": "teacher@sic.edu.vn",
        "password": "teacher123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "TEACHER"

def test_create_class():
    # Login as teacher first
    login_resp = client.post("/api/v1/auth/login", json={
        "code_or_email": "GV001",
        "password": "teacher123"
    })
    token = login_resp.json()["access_token"]

    response = client.post(
        "/api/v1/classes/create",
        json={"class_name": "Kỹ thuật phần mềm K16", "subject_topic": "Thị giác máy tính"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "class_code" in data
    assert data["class_name"] == "Kỹ thuật phần mềm K16"
    assert data["subject_topic"] == "Thị giác máy tính"

def test_student_pending_join_flow():
    setup_test_db()
    # 1. Teacher creates a class
    t_login = client.post("/api/v1/auth/login", json={"code_or_email": "GV001", "password": "teacher123"}).json()
    t_token = t_login["access_token"]
    cls_resp = client.post(
        "/api/v1/classes/create",
        json={"class_name": "Trí tuệ nhân tạo K17", "subject_topic": "Deep Learning"},
        headers={"Authorization": f"Bearer {t_token}"}
    ).json()
    class_code = cls_resp["class_code"]
    class_id = cls_resp["id"]

    # 2. Student requests to join
    s_login = client.post("/api/v1/auth/login", json={"code_or_email": "SV001", "password": "student123"}).json()
    s_token = s_login["access_token"]
    join_resp = client.post(
        f"/api/v1/classes/join/{class_code}",
        headers={"Authorization": f"Bearer {s_token}"}
    )
    assert join_resp.status_code == 200
    assert join_resp.json()["status"] == "SUCCESS"

    # 3. Teacher checks pending list
    pending_resp = client.get(
        f"/api/v1/classes/{class_id}/pending-students",
        headers={"Authorization": f"Bearer {t_token}"}
    )
    assert pending_resp.status_code == 200
    pending_students = pending_resp.json()
    assert len(pending_students) >= 1

    # 4. Teacher approves student
    student_id = pending_students[0]["id"]
    appr_resp = client.post(
        f"/api/v1/classes/{class_id}/students/{student_id}/approve",
        headers={"Authorization": f"Bearer {t_token}"}
    )
    assert appr_resp.status_code == 200
    assert appr_resp.json()["status"] == "SUCCESS"

def test_my_attendance_history():
    setup_test_db()
    s_login = client.post("/api/v1/auth/login", json={"code_or_email": "SV001", "password": "student123"}).json()
    s_token = s_login["access_token"]
    hist_resp = client.get(
        "/api/v1/attendance/my-history",
        headers={"Authorization": f"Bearer {s_token}"}
    )
    assert hist_resp.status_code == 200
    data = hist_resp.json()
    assert "overall_summary" in data
    assert "classes" in data

def test_admin_audit_logs():
    setup_test_db()
    a_login = client.post("/api/v1/auth/login", json={"code_or_email": "ADMIN01", "password": "admin123"}).json()
    a_token = a_login["access_token"]
    logs_resp = client.get(
        "/api/v1/admin/audit-logs",
        headers={"Authorization": f"Bearer {a_token}"}
    )
    assert logs_resp.status_code == 200
    data = logs_resp.json()
    assert "total" in data
    assert "items" in data
    assert len(data["items"]) >= 1

def test_full_kyc_session_save():
    import io, base64
    from PIL import Image
    setup_test_db()
    s_login = client.post("/api/v1/auth/login", json={"code_or_email": "SV001", "password": "student123"}).json()
    s_token = s_login["access_token"]
    
    # 1. Missing angle test (should fail 400)
    fail_resp = client.post(
        "/api/v1/enrollment/save-full-kyc-session",
        json={"angles": {"FRONT": "data:image/jpeg;base64,/9j/4AAQSkZJRg=="}},
        headers={"Authorization": f"Bearer {s_token}"}
    )
    assert fail_resp.status_code == 400

    # 2. Complete 4 angles payload test with valid 224x224 JPEG
    test_img = Image.new('RGB', (224, 224), color=(100, 150, 200))
    buf = io.BytesIO()
    test_img.save(buf, format='JPEG')
    valid_base64 = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode('utf-8')

    full_resp = client.post(
        "/api/v1/enrollment/save-full-kyc-session",
        json={
            "angles": {
                "FRONT": valid_base64,
                "LEFT": valid_base64,
                "RIGHT": valid_base64,
                "TILT": valid_base64
            }
        },
        headers={"Authorization": f"Bearer {s_token}"}
    )
    assert full_resp.status_code == 200
    res_data = full_resp.json()
    assert res_data["status"] == "SUCCESS"
    assert res_data["is_complete"] is True


