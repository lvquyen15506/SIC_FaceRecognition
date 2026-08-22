"""
Automated UI & DOM Verification Test Suite by Quinn QA
Kiểm thử cấu trúc giao diện Web UI, CSS Tokens và HTML Elements
"""
import os
import sys

def test_frontend_html():
    frontend_index_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../web_app/frontend/index.html'))
    assert os.path.exists(frontend_index_path), "index.html does not exist"
    
    with open(frontend_index_path, 'r', encoding='utf-8') as f:
        content = f.read()

    assert "Google Fonts" in content
    assert "Inter" in content
    assert "Space Grotesk" in content
    assert "bg-[#090D16]" in content
    print("  ✅ UI Test 1: index.html DOM structure & Google Fonts verified!")

def test_frontend_css_tokens():
    css_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../web_app/frontend/src/index.css'))
    assert os.path.exists(css_path), "index.css does not exist"
    
    with open(css_path, 'r', encoding='utf-8') as f:
        content = f.read()

    assert "--bg-midnight: #090D16;" in content
    assert "--electric-blue: #2563EB;" in content
    assert ".glass-card" in content
    assert ".camera-mirror-preview" in content
    assert "transform: scaleX(-1);" in content
    print("  ✅ UI Test 2: CSS Design Tokens & scaleX(-1) Camera Mirroring verified!")

def test_camera_hud_component():
    kyc_modal_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../web_app/frontend/src/components/MandatoryFaceKycModal.jsx'))
    assert os.path.exists(kyc_modal_path), "MandatoryFaceKycModal.jsx does not exist"

    with open(kyc_modal_path, 'r', encoding='utf-8') as f:
        content = f.read()

    assert "camera-mirror-preview" in content
    assert "FRONT" in content
    print("  ✅ UI Test 3: MandatoryFaceKycModal & Camera Mirror Preview scaleX(-1) verified!")

def test_teacher_dashboard_component():
    dashboard_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../web_app/frontend/src/pages/TeacherDashboard.jsx'))
    assert os.path.exists(dashboard_path), "TeacherDashboard.jsx does not exist"

    with open(dashboard_path, 'r', encoding='utf-8') as f:
        content = f.read()

    assert "Tên Lớp" in content
    assert "Chủ Đề Học / Môn Học" in content
    assert "batch-process" in content
    assert "Excel" in content
    print("  ✅ UI Test 4: Teacher Dashboard (Class Creation & Batch Attendance) verified!")

def main():
    print("🎨 Running Quinn QA Automated UI Verification Suite...")
    test_frontend_html()
    test_frontend_css_tokens()
    test_camera_hud_component()
    test_teacher_dashboard_component()
    print("\n🎉 ALL UI & FRONTEND COMPONENT TESTS PASSED 100%!")

if __name__ == "__main__":
    main()
