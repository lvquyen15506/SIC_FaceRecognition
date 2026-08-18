"""
Application Configuration Settings
"""
import os

# Safe BASE_DIR and Path resolution for both local dev and Docker container
GALLERY_PATH = os.getenv("GALLERY_PATH")
if not GALLERY_PATH:
    CURRENT_DIR = os.path.abspath(os.path.dirname(__file__))
    if os.path.exists("/app/src"):
        BASE_DIR = "/app"
    else:
        BASE_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "../../../"))
    GALLERY_PATH = os.path.join(BASE_DIR, "data_gallery")
    REPORTS_PATH = os.path.join(BASE_DIR, "reports")
    UPLOADS_PATH = os.path.join(BASE_DIR, "web_app/backend/data/uploads")
    CORE_AI_PATH = os.path.join(BASE_DIR, "src")
else:
    BASE_DIR = "/app"
    REPORTS_PATH = os.getenv("REPORTS_PATH", "/app/reports")
    UPLOADS_PATH = os.getenv("UPLOADS_PATH", "/app/web_app/backend/data/uploads")
    CORE_AI_PATH = os.getenv("CORE_AI_PATH", "/app/src")

SECRET_KEY = os.getenv("SECRET_KEY", "sic_face_recognition_super_secret_jwt_key_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/web_app/backend/data/sic_facerecognition.db")

# Ensure required data directories exist
os.makedirs(GALLERY_PATH, exist_ok=True)
os.makedirs(REPORTS_PATH, exist_ok=True)
os.makedirs(UPLOADS_PATH, exist_ok=True)
if "sqlite" in DATABASE_URL:
    os.makedirs(os.path.dirname(DATABASE_URL.replace("sqlite:///", "")), exist_ok=True)
