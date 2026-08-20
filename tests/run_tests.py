"""
Lightweight Test Runner for Quinn QA Agent
"""
import sys
import os

# Add paths
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../web_app/backend')))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from test_core_ai import test_imports, test_liveness_module_existence
from test_postgresql import test_db_schema_creation, test_db_health_endpoint
from test_api import setup_test_db, test_root_endpoint, test_login_student, test_login_teacher, test_create_class
from test_batch_attendance import test_batch_attendance
from test_ui import test_frontend_html, test_frontend_css_tokens, test_camera_hud_component, test_teacher_dashboard_component

def main():
    print("🚀 Running Full Quinn QA Comprehensive Master Test Suite...")
    try:
        print("\n--- 🧠 1. Core AI ArcFace ONNX Suite ---")
        test_imports()
        test_liveness_module_existence()

        print("\n--- 🗄️ 2. PostgreSQL / SQLite DB Integration Suite ---")
        test_db_schema_creation()
        test_db_health_endpoint()

        print("\n--- 🔒 3. Backend API & Auth Suite ---")
        setup_test_db()
        test_root_endpoint()
        test_login_student()
        test_login_teacher()
        test_create_class()

        print("\n--- 📸 4. Batch Attendance Studio Media Suite ---")
        test_batch_attendance()

        print("\n--- 🎨 5. Frontend UI & Design System Suite ---")
        test_frontend_html()
        test_frontend_css_tokens()
        test_camera_hud_component()
        test_teacher_dashboard_component()

        print("\n🎉🎉🎉 ALL 5 MASTER QA TEST SUITES PASSED 100% PERFECTLY! 🎉🎉🎉")
    except Exception as e:
        print(f"\n❌ MASTER TEST SUITE FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
