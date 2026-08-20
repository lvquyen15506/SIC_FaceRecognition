"""
Integration Test for Batch Attendance API Endpoint
"""
import sys
import os
import io
from PIL import Image
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../web_app/backend')))

from main import app
from app.database import Base, engine

client = TestClient(app)

def test_batch_attendance():
    print("🧪 Running Quinn QA Batch Attendance Studio Test...")
    Base.metadata.create_all(bind=engine)
    from main import seed_default_users
    seed_default_users()

    login_res = client.post(
        "/api/v1/auth/login",
        json={"code_or_email": "GV001", "password": "teacher123"}
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]

    # Create dummy image bytes
    img = Image.new('RGB', (400, 400), color=(73, 109, 137))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_bytes = img_byte_arr.getvalue()

    files = [
        ('files', ('test1.jpg', img_bytes, 'image/jpeg')),
        ('files', ('test2.jpg', img_bytes, 'image/jpeg'))
    ]
    data = {'session_title': 'Buổi Điểm Danh Kiểm Thử Automated'}
    headers = {'Authorization': f'Bearer {token}'}

    res = client.post(
        "/api/v1/attendance/1/batch-process",
        headers=headers,
        data=data,
        files=files
    )

    assert res.status_code == 200, f"Batch attendance failed: {res.text}"
    resp_data = res.json()
    assert "session_id" in resp_data
    print(f"  ✅ Batch Attendance Status Code: {res.status_code}")
    print("  ✅ TEST BATCH ATTENDANCE PASSED PERFECTLY!")

if __name__ == "__main__":
    test_batch_attendance()
