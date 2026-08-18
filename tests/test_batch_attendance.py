"""
Integration Test for Batch Attendance API Endpoint
"""
import requests
import io
from PIL import Image

def test_batch_attendance():
    login_res = requests.post(
        "http://localhost:8000/api/v1/auth/login",
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

    res = requests.post(
        "http://localhost:3000/api/v1/attendance/1/batch-process",
        headers=headers,
        data=data,
        files=files
    )

    print("Batch Attendance Status Code:", res.status_code)
    print("Batch Attendance Response:", res.text)
    assert res.status_code == 200, f"Batch attendance failed: {res.text}"
    print("✅ TEST BATCH ATTENDANCE PASSED PERFECTLY!")

if __name__ == "__main__":
    test_batch_attendance()
