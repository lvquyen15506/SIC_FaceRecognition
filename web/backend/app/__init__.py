import os
import sys
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from app.config import Config
from app.models import db, User


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    JWTManager(app)

    # Create tables automatically on startup
    with app.app_context():
        db.create_all()
        _seed_initial_admin(app)

    # Register Blueprints
    from app.routes.auth import auth_bp
    app.register_blueprint(auth_bp)

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return {"status": "ok", "message": "SIC FaceViT Backend REST API is running!"}, 200

    return app


def _seed_initial_admin(app):
    """Seed initial Super Admin account if database is fresh"""
    try:
        admin_user = User.query.filter_by(username="admin").first()
        if not admin_user:
            admin = User(
                username="admin",
                email="admin@sic.edu.vn",
                full_name="Quản Trị Viên Hệ Thống (Super Admin)",
                system_role="ADMIN",
            )
            admin.set_password("admin123")
            db.session.add(admin)
            db.session.commit()
            print("[Backend Init] Created initial Super Admin account (username: 'admin', pass: 'admin123').")
    except Exception as e:
        print(f"[Backend Init Warning] Seed admin check skipped: {e}")
