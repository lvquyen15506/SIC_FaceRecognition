"""
Application Configuration Settings
"""
import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
SECRET_KEY = os.getenv("SECRET_KEY", "sic_face_recognition_super_secret_jwt_key_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/web_app/backend/data/sic_facerecognition.db")

# Path to core AI files
CORE_AI_PATH = os.path.join(BASE_DIR, "src")
GALLERY_PATH = os.path.join(BASE_DIR, "data_gallery")
REPORTS_PATH = os.path.join(BASE_DIR, "reports")
UPLOADS_PATH = os.path.join(BASE_DIR, "web_app/backend/data/uploads")

# Ensure required data directories exist
os.makedirs(GALLERY_PATH, exist_ok=True)
os.makedirs(REPORTS_PATH, exist_ok=True)
os.makedirs(UPLOADS_PATH, exist_ok=True)
os.makedirs(os.path.dirname(DATABASE_URL.replace("sqlite:///", "")), exist_ok=True)
