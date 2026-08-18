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
