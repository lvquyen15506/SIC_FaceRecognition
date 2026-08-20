"""
Unit tests for Core AI modules in src/
Managed by Quinn (QA Lead & Tester Agent)
"""

import sys
import os

# Add src to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

def test_imports():
    """Verify that core modules can be imported without errors."""
    try:
        from core import model
        from core import arcface
        assert model is not None
        assert arcface is not None
        print("  ✅ Core AI Modules Import: PASS")
    except ImportError as e:
        raise AssertionError(f"Failed to import core AI modules: {e}")

def test_liveness_module_existence():
    """Verify pose liveness script exists in app_modules."""
    liveness_path = os.path.join(os.path.dirname(__file__), '../src/app_modules/test_pose_liveness.py')
    assert os.path.exists(liveness_path), "Pose liveness module does not exist!"
    print("  ✅ Core AI Liveness Module Existence: PASS")

if __name__ == "__main__":
    print("🧪 Running Quinn QA Core AI Verification Suite...")
    test_imports()
    test_liveness_module_existence()
    print("\n🎉 Core AI Tests Passed!")
