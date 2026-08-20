"""
Batch Multi-Media Attendance & Excel Report API Endpoints
"""
import os
import io
import json
import datetime
import cv2
import numpy as np
import subprocess
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from openpyxl import Workbook

try:
    import imageio_ffmpeg
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_EXE = "ffmpeg"

from app.database import get_db
from app.models import User, ClassRoom, ClassStudent, AttendanceSession, SessionMediaFile, AttendanceRecord, FaceEmbedding
from app.security import get_current_user, require_role
from app.services.ai_engine import process_classroom_image
from app.services.audit import log_action
from app.config import UPLOADS_PATH, REPORTS_PATH

router = APIRouter(prefix="/api/v1/attendance", tags=["Attendance Studio & Reports"])

@router.get("/my-history")
def get_my_attendance_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sinh viên tra cứu lịch sử điểm danh cá nhân theo từng lớp học
    """
    if current_user.role != "STUDENT":
        raise HTTPException(status_code=403, detail="Chỉ sinh viên mới có quyền xem lịch sử cá nhân")

    joined_classes = db.query(ClassStudent).filter(
        ClassStudent.student_id == current_user.id,
        ClassStudent.status == "APPROVED"
    ).all()

    class_history = []
    total_all_sessions = 0
    total_all_present = 0

    for jc in joined_classes:
        cls = jc.classroom
        sessions = db.query(AttendanceSession).filter(
            AttendanceSession.class_id == cls.id
        ).order_by(AttendanceSession.created_at.desc()).all()

        session_records = []
        present_count = 0

        for sess in sessions:
            rec = db.query(AttendanceRecord).filter(
                AttendanceRecord.session_id == sess.id,
                AttendanceRecord.user_id == current_user.id
            ).first()

            status_str = rec.status if rec else "ABSENT"
            if status_str == "PRESENT":
                present_count += 1

            session_records.append({
                "session_id": sess.id,
                "title": sess.title,
                "date": sess.session_date,
                "created_at": sess.created_at.isoformat() if sess.created_at else None,
                "status": status_str,
                "confidence": rec.confidence if rec else 0.0
            })

        total_sessions = len(sessions)
        attendance_rate = (present_count / total_sessions * 100.0) if total_sessions > 0 else 100.0

        total_all_sessions += total_sessions
        total_all_present += present_count

        class_history.append({
            "class_id": cls.id,
            "class_code": cls.class_code,
            "class_name": cls.class_name,
            "subject_topic": cls.subject_topic,
            "total_sessions": total_sessions,
            "present_count": present_count,
            "absent_count": total_sessions - present_count,
            "attendance_rate": round(attendance_rate, 1),
            "sessions": session_records
        })

    overall_rate = (total_all_present / total_all_sessions * 100.0) if total_all_sessions > 0 else 100.0

    return {
        "student_info": {
            "id": current_user.id,
            "code": current_user.code,
            "full_name": current_user.full_name
        },
        "overall_summary": {
            "total_classes": len(joined_classes),
            "total_sessions": total_all_sessions,
            "total_present": total_all_present,
            "total_absent": total_all_sessions - total_all_present,
            "overall_rate": round(overall_rate, 1)
        },
        "classes": class_history
    }

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
                "processed_url": f"/api/v1/attendance/media/{mf.id}",
                "thumbnail_url": f"/api/v1/attendance/media/{mf.id}/thumbnail" if mf.media_type == "VIDEO" else f"/api/v1/attendance/media/{mf.id}"
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

        unknown_cnt = getattr(sess, "unknown_count", 0) or 0
        total_faces = getattr(sess, "total_faces_detected", 0) or (present_cnt + unknown_cnt)

        for u_idx in range(1, unknown_cnt + 1):
            records.append({
                "student_name": f"Người lạ #{u_idx} (Khung đỏ)",
                "student_code": "NGƯỜI LẠ",
                "status": "UNKNOWN",
                "confidence": 0.0
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
            "total_faces_detected": total_faces,
            "unknown_count": unknown_cnt,
            "media_files": media_files,
            "summary": records
        })

    return response_list

@router.post("/{class_id}/batch-process")
async def process_batch_attendance(
    class_id: int,
    session_title: str = Form("Buổi điểm danh lớp học"),
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

    # Fallback to system-wide enrolled faces if class enrollment is empty (e.g. newly created class testing)
    if not student_gallery:
        all_embeddings = db.query(FaceEmbedding).all()
        for fe in all_embeddings:
            u = fe.user
            if u:
                if u.code not in student_gallery:
                    student_gallery[u.code] = []
                student_gallery[u.code].append(json.loads(fe.embedding_json))

    # Track overall attendance & exact confidence scores across all uploaded files
    detected_user_confidences = {}  # code -> max confidence float
    file_face_counts = []
    file_unknown_counts = []
    media_file_responses = []

    # 3. Process each uploaded image / video file
    for upload in files:
        filename = f"{session.id}_{upload.filename}"
        raw_save_path = os.path.join(UPLOADS_PATH, f"raw_{filename}")
        processed_save_path = os.path.join(REPORTS_PATH, f"processed_{filename}")

        contents = await upload.read()
        with open(raw_save_path, "wb") as f:
            f.write(contents)

        is_video = upload.content_type.startswith("video") or filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv'))

        if not is_video:
            # Process Image
            processed_bytes, results = process_classroom_image(contents, student_gallery)
            with open(processed_save_path, "wb") as f:
                f.write(processed_bytes)

            img_unknown_cnt = 0
            for res in results:
                if res["code"] != "UNKNOWN":
                    c_code = res["code"]
                    c_conf = float(res.get("confidence", 0.0))
                    if c_code not in detected_user_confidences or c_conf > detected_user_confidences[c_code]:
                        detected_user_confidences[c_code] = c_conf
                else:
                    img_unknown_cnt += 1

            file_face_counts.append(len(results))
            file_unknown_counts.append(img_unknown_cnt)

            media_rec = SessionMediaFile(
                session_id=session.id,
                media_type="IMAGE",
                raw_file_path=raw_save_path,
                processed_file_path=processed_save_path,
                status="COMPLETED"
            )
        else:
            # Full Video Frame-by-Frame Bounding Box Overlay
            raw_video_path = os.path.join(REPORTS_PATH, f"raw_vid_{filename}.mp4")
            h264_mp4_path = os.path.join(REPORTS_PATH, f"processed_h264_{filename}.mp4")
            thumbnail_jpg_path = os.path.join(REPORTS_PATH, f"processed_{filename}.jpg")

            cap = cv2.VideoCapture(raw_save_path)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 480
            fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
            if fps <= 0 or np.isnan(fps):
                fps = 25.0

            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(raw_video_path, fourcc, fps, (width, height))

            best_keyframe_bytes = None
            max_faces_found = 0
            frame_idx = 0
            cached_results = []

            while cap.isOpened():
                ret, frame = cap.read()
                if not ret or frame is None:
                    break

                # Run AI face detection every 8th frame for high speed
                if frame_idx % 8 == 0 or len(cached_results) == 0:
                    frame_bytes = cv2.imencode('.jpg', frame)[1].tobytes()
                    p_bytes, cached_results = process_classroom_image(frame_bytes, student_gallery)

                    if best_keyframe_bytes is None or len(cached_results) > max_faces_found:
                        best_keyframe_bytes = p_bytes
                        max_faces_found = len(cached_results)

                    for res in cached_results:
                        if res["code"] != "UNKNOWN":
                            c_code = res["code"]
                            c_conf = float(res.get("confidence", 0.0))
                            if c_code not in detected_user_confidences or c_conf > detected_user_confidences[c_code]:
                                detected_user_confidences[c_code] = c_conf

                # Draw green/red bounding boxes frame-by-frame on the video with exact confidence %
                for res in cached_results:
                    [x, y, w, h] = res["box"]
                    c_conf = float(res.get("confidence", 0.0))
                    conf_pct = c_conf * 100.0 if c_conf <= 1.0 else c_conf
                    if res["code"] != "UNKNOWN":
                        color = (0, 255, 0)
                        label = f"{res['code']} ({conf_pct:.1f}%)"
                    else:
                        color = (0, 0, 255)
                        label = "Nguoi la"

                    cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
                    text_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                    banner_w = max(w, text_size[0] + 10)
                    cv2.rectangle(frame, (x, max(0, y-22)), (x+banner_w, y), color, -1)
                    cv2.putText(frame, label, (x+5, max(12, y-6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

                out.write(frame)
                frame_idx += 1

            cap.release()
            out.release()

            vid_unknown_cnt = sum(1 for res in cached_results if res["code"] == "UNKNOWN")
            file_face_counts.append(max_faces_found)
            file_unknown_counts.append(vid_unknown_cnt)

            # Re-encode to H.264 (yuv420p) using imageio_ffmpeg binary for 100% HTML5 browser playback
            final_video_path = raw_video_path
            if os.path.exists(raw_video_path):
                try:
                    subprocess.run(
                        [FFMPEG_EXE, "-y", "-i", raw_video_path, "-vcodec", "libx264", "-pix_fmt", "yuv420p", h264_mp4_path],
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL
                    )
                    if os.path.exists(h264_mp4_path) and os.path.getsize(h264_mp4_path) > 0:
                        final_video_path = h264_mp4_path
                except Exception as e:
                    print(f"[FFMPEG Error] Re-encoding failed: {e}")

            # Save Keyframe thumbnail image
            if best_keyframe_bytes is None:
                blank_img = np.zeros((height, width, 3), dtype=np.uint8)
                best_keyframe_bytes = cv2.imencode('.jpg', blank_img)[1].tobytes()

            with open(thumbnail_jpg_path, "wb") as f:
                f.write(best_keyframe_bytes)

            media_rec = SessionMediaFile(
                session_id=session.id,
                media_type="VIDEO",
                raw_file_path=raw_save_path,
                processed_file_path=final_video_path,
                status="COMPLETED"
            )

        db.add(media_rec)
        db.commit()
        db.refresh(media_rec)

        media_file_responses.append({
            "id": media_rec.id,
            "filename": upload.filename,
            "media_type": media_rec.media_type,
            "processed_url": f"/api/v1/attendance/media/{media_rec.id}",
            "thumbnail_url": f"/api/v1/attendance/media/{media_rec.id}/thumbnail" if media_rec.media_type == "VIDEO" else f"/api/v1/attendance/media/{media_rec.id}"
        })

    # 4. Save consolidated attendance records for all students in class
    all_students = db.query(ClassStudent).filter(
        ClassStudent.class_id == class_id,
        ClassStudent.status == "APPROVED"
    ).all()

    total_faces_detected = max(file_face_counts) if file_face_counts else 0
    total_unknown_count = max(file_unknown_counts) if file_unknown_counts else 0

    session.total_faces_detected = total_faces_detected
    session.unknown_count = total_unknown_count

    summary_records = []
    for cs in all_students:
        is_present = cs.student.code in detected_user_confidences
        actual_conf = detected_user_confidences.get(cs.student.code, 0.0) if is_present else 0.0

        record = AttendanceRecord(
            session_id=session.id,
            user_id=cs.student.id,
            status="PRESENT" if is_present else "ABSENT",
            confidence=round(actual_conf, 4)
        )
        db.add(record)
        summary_records.append({
            "student_name": cs.student.full_name,
            "student_code": cs.student.code,
            "status": record.status,
            "confidence": record.confidence
        })

    # Add unknown stranger entries to summary table
    for u_idx in range(1, total_unknown_count + 1):
        summary_records.append({
            "student_name": f"Người lạ #{u_idx} (Khung đỏ)",
            "student_code": "NGƯỜI LẠ",
            "status": "UNKNOWN",
            "confidence": 0.0
        })

    db.commit()

    return {
        "session_id": session.id,
        "session_date": session.session_date,
        "title": session.title,
        "total_files_processed": len(files),
        "total_students": len(all_students),
        "present_count": len(detected_user_confidences),
        "absent_count": len(all_students) - len(detected_user_confidences),
        "total_faces_detected": total_faces_detected,
        "unknown_count": total_unknown_count,
        "media_files": media_file_responses,
        "summary": summary_records
    }

@router.get("/media/{media_id}")
def get_processed_media(media_id: int, db: Session = Depends(get_db)):
    media = db.query(SessionMediaFile).filter(SessionMediaFile.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media record not found")

    if media.media_type == "VIDEO":
        target_path = media.processed_file_path if os.path.exists(media.processed_file_path) else media.raw_file_path
        if not os.path.exists(target_path):
            raise HTTPException(status_code=404, detail="Processed video file missing")
        return FileResponse(target_path, media_type="video/mp4")

    if not os.path.exists(media.processed_file_path):
        raise HTTPException(status_code=404, detail="Image file missing")
    return FileResponse(media.processed_file_path, media_type="image/jpeg")

@router.get("/media/{media_id}/thumbnail")
def get_processed_thumbnail(media_id: int, db: Session = Depends(get_db)):
    media = db.query(SessionMediaFile).filter(SessionMediaFile.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media record not found")

    thumb_path = media.processed_file_path + ".jpg" if media.media_type == "VIDEO" and not media.processed_file_path.endswith(".jpg") else media.processed_file_path
    
    if not os.path.exists(thumb_path):
        thumb_path = media.processed_file_path

    if not os.path.exists(thumb_path):
        raise HTTPException(status_code=404, detail="Thumbnail file not found")
        
    return FileResponse(thumb_path, media_type="image/jpeg")

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
