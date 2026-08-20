"""
Audit Log Helper Service
"""
import json
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models import AuditLog

def log_action(db: Session, user_id: Optional[int], action: str, details: Optional[Dict[str, Any]] = None):
    """
    Ghi lại nhật ký hệ thống vào bảng audit_logs
    """
    try:
        details_str = json.dumps(details, ensure_ascii=False) if details else None
        audit = AuditLog(
            user_id=user_id,
            action=action,
            details=details_str
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[Audit Log Error] Không thể ghi audit log: {str(e)}")
