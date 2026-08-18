"""
Lightweight Test Runner for Quinn QA Agent
"""
import sys
import os

# Add paths
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../web_app/backend')))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from test_api import setup_test_db, test_root_endpoint, test_login_student, test_login_teacher, test_create_class

def main():
    print("🧪 Running Quinn QA Automated Tests...")
    try:
        # Run DB setup
        setup_test_db()
        print("  ✅ setup_test_db: Initialized Test Users & Tables")

        test_root_endpoint()
        print("  ✅ test_root_endpoint: PASSED")

        test_login_student()
        print("  ✅ test_login_student: PASSED")

        test_login_teacher()
        print("  ✅ test_login_teacher: PASSED")

        test_create_class()
        print("  ✅ test_create_class: PASSED")

        print("\n🎉 ALL BACKEND API TESTS PASSED SUCCESSFULLY! (100% PASS)")
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
