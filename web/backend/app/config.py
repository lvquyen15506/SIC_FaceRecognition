import os
from datetime import timedelta


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "sic_facevit_super_secret_jwt_key_2026")

    # PostgreSQL connection string (Fallback to local SQLite database for instant dev testing)
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(os.path.abspath(os.path.dirname(__file__)), 'sic_facevit.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "sic_facevit_jwt_secret_key_2026")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=2)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)

    # File Upload Directory
    UPLOAD_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), "..", "uploads")
    OUTPUT_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), "..", "outputs")
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500 MB max for video uploads
