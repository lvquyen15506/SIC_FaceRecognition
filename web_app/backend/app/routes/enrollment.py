"""
Face Enrollment & Environment Quality API Endpoints
"""
import json
import base64
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, FaceEmbedding
from app.schemas import EnrollFaceRequest
from app.security import get_current_user
from app.services.ai_engine import check_image_quality, extract_face_feature_512d

router = APIRouter(prefix="/api/v1/enrollment", tags=["Face Enrollment"])

@router.post("/check-quality")
def check_quality(payload: EnrollFaceRequest):
    try:
        image_bytes = base64.b64decode(payload.image_base64.split(",")[-1])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image data")

    quality_result = check_image_quality(image_bytes, required_angle=payload.angle_label)
    return quality_result

@router.post("/save-face")
def save_face(payload: EnrollFaceRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        image_bytes = base64.b64decode(payload.image_base64.split(",")[-1])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image data")

    # Check environment quality & required pose angle
    quality = check_image_quality(image_bytes, required_angle=payload.angle_label)
    if not quality["pass"]:
        raise HTTPException(status_code=400, detail=quality["message"])

    # Extract 512-d vector
    vector_512d = extract_face_feature_512d(image_bytes)

    # Check existing angle label for user
    existing = db.query(FaceEmbedding).filter(
        FaceEmbedding.user_id == current_user.id,
        FaceEmbedding.angle_label == payload.angle_label.upper()
    ).first()

    if existing:
        existing.embedding_json = json.dumps(vector_512d)
    else:
        new_embedding = FaceEmbedding(
            user_id=current_user.id,
            angle_label=payload.angle_label.upper(),
            embedding_json=json.dumps(vector_512d)
        )
        db.add(new_embedding)

    db.commit()
    
    # Get total angles collected for user
    total_angles = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == current_user.id).count()
    return {
        "status": "SUCCESS",
        "message": f"Đã lưu thành công góc mặt {payload.angle_label}",
        "total_angles": total_angles,
        "is_complete": total_angles >= 4
    }

@router.get("/status")
def get_enrollment_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    embeddings = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == current_user.id).all()
    angles = [e.angle_label for e in embeddings]
    return {
        "user_code": current_user.code,
        "full_name": current_user.full_name,
        "total_angles": len(angles),
        "angles": angles,
        "is_complete": len(angles) >= 4
    }
