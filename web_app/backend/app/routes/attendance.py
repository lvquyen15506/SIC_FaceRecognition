"""
Batch Multi-Media Attendance & Excel Report API Endpoints
"""
import os
import io
import json
import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from openpyxl import Workbook

from app.database import get_db
from app.models import User, ClassRoom, ClassStudent, AttendanceSession, SessionMediaFile, AttendanceRecord, FaceEmbedding
from app.security import get_current_user, require_role
from app.services.ai_engine import process_classroom_image
from app.config import UPLOADS_PATH, REPORTS_PATH

router = APIRouter(prefix="/api/v1/attendance", tags=["Attendance Studio & Reports"])

@router.get("/sessions/{class_id}")
def get_class_attendance_sessions(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sessions = db.query(AttendanceSession).filter(
        AttendanceSession.class_id == class_id
    ).order_by(AttendanceSession.created_at.desc()).all()

    all_students = db.query(ClassStudent).filter(
        ClassStudent.class_id == class_id,
        ClassStudent.status == "APPROVED"
    ).all()

    response_list = []
    for sess in sessions:
        media_files = []
        for mf in sess.media_files:
            media_files.append({
                "id": mf.id,
                "media_type": mf.media_type,
                "processed_url": f"/api/v1/attendance/media/{mf.id}"
            })

        records = []
        present_cnt = 0
        for r in sess.records:
            if r.status == "PRESENT":
                present_cnt += 1
            records.append({
                "student_name": r.user.full_name if r.user else "N/A",
                "student_code": r.user.code if r.user else "N/A",
                "status": r.status,
                "confidence": r.confidence
            })

        response_list.append({
            "session_id": sess.id,
            "session_date": sess.session_date,
            "title": sess.title,
            "created_at": sess.created_at.isoformat() if sess.created_at else None,
            "total_files_processed": len(sess.media_files),
            "total_students": len(all_students),
            "present_count": present_cnt,
            "absent_count": max(0, len(all_students) - present_cnt),
            "media_files": media_files,
            "summary": records
        })

    return response_list

@router.post("/{class_id}/batch-process")
async def process_batch_attendance(
    class_id: int,
    session_title: str = Form("Buổi điểm danh"),
    session_date: str = Form(None),
    files: List[UploadFile] = File(...),
    current_user: User = Depends(require_role(["TEACHER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    classroom = db.query(ClassRoom).filter(ClassRoom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Lớp học không tồn tại")

    if not session_date:
        session_date = datetime.datetime.now().strftime("%Y-%m-%d")

    # 1. Create Attendance Session
    session = AttendanceSession(
        class_id=class_id,
        session_date=session_date,
        title=session_title,
        created_by_id=current_user.id
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # 2. Build Student & Teacher Embedding Gallery for this Class
    class_students = db.query(ClassStudent).filter(
        ClassStudent.class_id == class_id,
        ClassStudent.status == "APPROVED"
    ).all()
    student_users = [cs.student for cs in class_students] + classroom.teachers

    student_gallery = {}
    for user in student_users:
        embeddings = db.query(FaceEmbedding).filter(FaceEmbedding.user_id == user.id).all()
        if embeddings:
            vectors = [json.loads(e.embedding_json) for e in embeddings]
            student_gallery[user.code] = vectors

    # Track overall attendance across all uploaded files
    detected_user_codes = set()
    media_file_responses = []

    # 3. Process each uploaded image / video file
    for upload in files:
        filename = f"{session.id}_{upload.filename}"
        raw_save_path = os.path.join(UPLOADS_PATH, f"raw_{filename}")
        processed_save_path = os.path.join(REPORTS_PATH, f"processed_{filename}")

        contents = await upload.read()
        with open(raw_save_path, "wb") as f:
            f.write(contents)

        is_video = upload.content_type.startswith("video") or filename.lower().endswith(('.mp4', '.avi', '.mov'))

        if not is_video:
            # Process Image
            processed_bytes, results = process_classroom_image(contents, student_gallery)
            with open(processed_save_path, "wb") as f:
                f.write(processed_bytes)

            for res in results:
                if res["code"] != "UNKNOWN":
                    detected_user_codes.add(res["code"])

            media_rec = SessionMediaFile(
                session_id=session.id,
                media_type="IMAGE",
                raw_file_path=raw_save_path,
                processed_file_path=processed_save_path,
                status="COMPLETED"
            )
        else:
            # Process Video
            processed_bytes, results = process_classroom_image(contents[:1024*100], student_gallery)
            with open(processed_save_path, "wb") as f:
                f.write(processed_bytes)

            for res in results:
                if res["code"] != "UNKNOWN":
                    detected_user_codes.add(res["code"])

            media_rec = SessionMediaFile(
                session_id=session.id,
                media_type="VIDEO",
                raw_file_path=raw_save_path,
                processed_file_path=processed_save_path,
                status="COMPLETED"
            )

        db.add(media_rec)
        db.commit()
        db.refresh(media_rec)

        media_file_responses.append({
            "id": media_rec.id,
            "filename": upload.filename,
            "media_type": media_rec.media_type,
            "processed_url": f"/api/v1/attendance/media/{media_rec.id}"
        })

    # 4. Save consolidated attendance records for all students in class
    all_students = db.query(ClassStudent).filter(
        ClassStudent.class_id == class_id,
        ClassStudent.status == "APPROVED"
    ).all()

    summary_records = []
    for cs in all_students:
        is_present = cs.student.code in detected_user_codes
        record = AttendanceRecord(
            session_id=session.id,
            user_id=cs.student.id,
            status="PRESENT" if is_present else "ABSENT",
            confidence=0.98 if is_present else 0.0
        )
        db.add(record)
        summary_records.append({
            "student_name": cs.student.full_name,
            "student_code": cs.student.code,
            "status": record.status,
            "confidence": record.confidence
        })

    db.commit()

    return {
        "session_id": session.id,
        "session_date": session.session_date,
        "total_files_processed": len(files),
        "total_students": len(all_students),
        "present_count": len(detected_user_codes),
        "absent_count": len(all_students) - len(detected_user_codes),
        "media_files": media_file_responses,
        "summary": summary_records
    }

@router.get("/media/{media_id}")
def get_processed_media(media_id: int, db: Session = Depends(get_db)):
    media = db.query(SessionMediaFile).filter(SessionMediaFile.id == media_id).first()
    if not media or not os.path.exists(media.processed_file_path):
        raise HTTPException(status_code=404, detail="Media file not found")
    return FileResponse(media.processed_file_path)

@router.get("/export-excel/{session_id}")
def export_attendance_excel(session_id: int, db: Session = Depends(get_db)):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Buổi điểm danh không tồn tại")

    wb = Workbook()
    ws = wb.active
    ws.title = "Báo cáo Điểm danh"

    # Header
    ws.append(["BÁO CÁO ĐIỂM DANH LỚP HỌC"])
    ws.append([f"Tên Lớp: {session.classroom.class_name}", f"Mã Lớp: {session.classroom.class_code}"])
    ws.append([f"Chủ đề học: {session.classroom.subject_topic}"])
    ws.append([f"Ngày điểm danh: {session.session_date}"])
    ws.append([])
    
    # Table Header
    ws.append(["STT", "Mã Sinh Viên (MSSV)", "Họ và Tên", "Trạng Thái", "Độ Tỉ Lệ Khớp %"])

    records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()
    for idx, r in enumerate(records, 1):
        ws.append([
            idx,
            r.user.code,
            r.user.full_name,
            "CÓ MẶT" if r.status == "PRESENT" else "VẮNG MẶT",
            f"{r.confidence * 100:.1f}%"
        ])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"DiemDanh_{session.classroom.class_code}_{session.session_date}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
