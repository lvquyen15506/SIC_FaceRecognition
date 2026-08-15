import os
import uuid
import pandas as pd
import numpy as np
import cv2
from datetime import datetime
from PIL import Image
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models import db, User, Classroom, ClassroomStudent, AttendanceSession, AttendanceRecord
from app.middleware.auth_middleware import teacher_required, check_teacher_class_access
from app.services.ai_engine import FaceViTAIEngineService

attendance_bp = Blueprint("attendance", __name__, url_prefix="/api/attendance")


@attendance_bp.route("/process-photo", methods=["POST"])
@jwt_required()
def process_photo_attendance():
    """
    Giảng viên / Lớp trưởng được phân quyền upload ảnh tập thể điểm danh
    -> AI Engine phát hiện & đối sánh -> Lưu Session, Báo cáo & File CSV: DiemDanh_[TenLop]_[TieuDe]_[NgayGio].csv
    """
    user_id = get_jwt_identity()
    
    if request.is_json:
        data = request.get_json() or {}
        classroom_id = data.get("classroom_id")
        title = data.get("title", f"Điểm danh Buổi {datetime.now().strftime('%Y-%m-%d %H:%M')}").strip()
        live_records = data.get("live_records", [])

        if not classroom_id:
            return jsonify({"error": "Vui lòng chọn 1 Lớp học"}), 400

        has_access, _ = check_teacher_class_access(user_id, classroom_id)
        if not has_access:
            return jsonify({"error": "Bạn không có quyền điểm danh cho Lớp học này"}), 403

        classroom = Classroom.query.get(classroom_id)
        session_id = str(uuid.uuid4())
        
        session = AttendanceSession(
            id=session_id,
            classroom_id=classroom_id,
            created_by_user_id=user_id,
            title=title,
            session_type="LIVE_CAMERA"
        )
        db.session.add(session)

        # Create Records for live recognized students & generate CSV file
        records_to_return = []
        csv_data = []

        for idx, rec_data in enumerate(live_records, 1):
            s_id = rec_data.get("student_id")
            s_name = rec_data.get("student_name", "Sinh viên")
            conf = rec_data.get("confidence_score", 100.0)

            rec = AttendanceRecord(
                id=str(uuid.uuid4()),
                session_id=session_id,
                student_id=s_id,
                student_name=s_name,
                status="PRESENT",
                confidence_score=conf
            )
            db.session.add(rec)
            records_to_return.append(rec.to_dict())

            csv_data.append({
                "STT": idx,
                "Mã Sinh Viên": s_id or "N/A",
                "Họ và Tên": s_name,
                "Trạng Thái": "Có mặt",
                "Độ Tin Cậy (%)": f"{conf:.1f}%",
                "Thời Gian": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })

        # Save physical CSV file
        output_dir = os.path.join(os.getcwd(), "outputs", "attendance_sessions")
        os.makedirs(output_dir, exist_ok=True)
        csv_filename = f"DiemDanh_{classroom.class_code}_{session_id[:8]}.csv"
        csv_path = os.path.join(output_dir, csv_filename)

        if csv_data:
            df = pd.DataFrame(csv_data)
            df.to_csv(csv_path, index=False, encoding="utf-8-sig")

        session.csv_export_path = csv_path
        db.session.commit()

        return jsonify({
            "message": f"🎉 Đã lưu phiên điểm danh trực tiếp thành công cho Lớp [{classroom.class_code}]!",
            "session": session.to_dict(),
            "csv_filename": csv_filename,
            "records": records_to_return
        }), 200

    classroom_id = request.form.get("classroom_id", "").strip()
    title = request.form.get("title", f"Điểm danh Buổi {datetime.now().strftime('%Y-%m-%d %H:%M')}").strip()

    if not classroom_id:
        return jsonify({"error": "Vui lòng chọn 1 Lớp học"}), 400

    has_access, _ = check_teacher_class_access(user_id, classroom_id)
    if not has_access:
        return jsonify({"error": "Bạn không có quyền điểm danh cho Lớp học này"}), 403

    classroom = Classroom.query.get(classroom_id)

    if "file" not in request.files:
        return jsonify({"error": "Vui lòng chọn file ảnh để upload"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Tệp ảnh không hợp lệ"}), 400

    # Ensure upload directory
    output_dir = os.path.join(os.getcwd(), "outputs", "attendance_sessions")
    os.makedirs(output_dir, exist_ok=True)

    session_id = str(uuid.uuid4())
    filename = f"photo_{session_id[:8]}_{file.filename}"
    img_path = os.path.join(output_dir, filename)
    file.save(img_path)

    img_bgr = cv2.imread(img_path)
    if img_bgr is None:
        return jsonify({"error": "Không thể mở file ảnh upload"}), 400

    ai_engine = FaceViTAIEngineService()
    boxes = ai_engine.detector.detect_faces(img_bgr)

    # 1. Create Session Record
    session = AttendanceSession(
        id=session_id,
        classroom_id=classroom_id,
        created_by_user_id=user_id,
        title=title,
        session_type="PHOTO",
    )
    db.session.add(session)

    # Fetch all students in classroom
    class_students = ClassroomStudent.query.filter_by(classroom_id=classroom_id).all()
    student_dict = {cs.student_id: cs.student for cs in class_students if cs.student}
    present_student_ids = set()

    display_img = img_bgr.copy()
    records_to_add = []

    for box in boxes:
        x, y, bw, bh = box
        face_bgr, face_pil = ai_engine.detector.crop_face(img_bgr, box)
        emb = ai_engine.extract_embedding(face_pil)

        match_res = ai_engine.match_against_classroom_students(emb, classroom_id)

        if match_res["matched"] and match_res["student_id"]:
            present_student_ids.add(match_res["student_id"])
            cv2.rectangle(display_img, (x, y), (x + bw, y + bh), (0, 255, 0), 2)
            label_str = f"{match_res['name']} ({match_res['confidence']:.0f}%)"
            cv2.putText(display_img, label_str, (x, max(25, y - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

            rec = AttendanceRecord(
                session_id=session_id,
                student_id=match_res["student_id"],
                student_name=match_res["name"],
                status="PRESENT",
                confidence_score=match_res["confidence"],
            )
            records_to_add.append(rec)
        else:
            cv2.rectangle(display_img, (x, y), (x + bw, y + bh), (0, 0, 255), 2)
            cv2.putText(display_img, "Nguoi_la_Unregistered", (x, max(25, y - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

            rec = AttendanceRecord(
                session_id=session_id,
                student_id=None,
                student_name="Nguoi_la_Unregistered",
                status="UNREGISTERED",
                confidence_score=0.0,
            )
            records_to_add.append(rec)

    # Mark ABSENT students in class who were not detected
    for st_id, student_obj in student_dict.items():
        if st_id not in present_student_ids:
            rec = AttendanceRecord(
                session_id=session_id,
                student_id=st_id,
                student_name=student_obj.full_name,
                status="ABSENT",
                confidence_score=0.0,
            )
            records_to_add.append(rec)

    db.session.add_all(records_to_add)

    # Save annotated proof image
    proof_path = os.path.join(output_dir, f"proof_{session_id[:8]}.jpg")
    cv2.imwrite(proof_path, display_img)
    session.media_proof_path = proof_path

    # Export CSV File: DiemDanh_[TenLop]_[TieuDe]_[NgayGio].csv
    now_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_title = title.replace(" ", "_")
    clean_class = classroom.class_code.replace(" ", "_")
    csv_filename = f"DiemDanh_{clean_class}_{clean_title}_{now_str}.csv"
    csv_path = os.path.join(output_dir, csv_filename)

    df_data = []
    for r in records_to_add:
        df_data.append({
            "Mã Lớp": classroom.class_code,
            "Tên Lớp": classroom.class_name,
            "Tiêu Đề Phiên": title,
            "Tên Sinh Viên": r.student_name,
            "Trạng Thái": r.status,
            "Độ Tin Cậy %": f"{r.confidence_score:.1f}%",
            "Thời Gian Thực Hiện": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })

    df = pd.DataFrame(df_data)
    df.to_csv(csv_path, index=False, encoding="utf-8-sig")
    session.csv_report_path = csv_path

    db.session.commit()

    return jsonify({
        "message": "🎉 Đã hoàn thành điểm danh và xuất báo cáo CSV thành công!",
        "session": session.to_dict(),
        "records": [r.to_dict() for r in records_to_add],
        "csv_filename": csv_filename,
    }), 201


@attendance_bp.route("/records/<int:record_id>/toggle", methods=["PUT"])
@jwt_required()
def toggle_manual_attendance(record_id):
    """Giảng viên / Lớp trưởng tích chọn sửa trạng thái điểm danh bằng tay (PRESENT / ABSENT)"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    new_status = data.get("status", "").upper()

    if new_status not in ["PRESENT", "ABSENT"]:
        return jsonify({"error": "Trạng thái không hợp lệ (PRESENT hoặc ABSENT)"}), 400

    rec = AttendanceRecord.query.get(record_id)
    if not rec:
        return jsonify({"error": "Không tìm thấy bản ghi điểm danh"}), 404

    session = AttendanceSession.query.get(rec.session_id)
    has_access, _ = check_teacher_class_access(user_id, session.classroom_id)
    if not has_access:
        return jsonify({"error": "Bạn không có quyền sửa kết quả điểm danh của Lớp này"}), 403

    rec.status = new_status
    rec.is_manually_edited = True
    rec.edited_by_user_id = user_id
    db.session.commit()

    return jsonify({
        "message": f"Đã cập nhật trạng thái điểm danh của '{rec.student_name}' thành '{new_status}'!",
        "record": rec.to_dict()
    }), 200


@attendance_bp.route("/sessions/<session_id>", methods=["GET"])
@jwt_required()
def get_session_details(session_id):
    """Lấy chi tiết Phiên điểm danh & danh sách kết quả"""
    session = AttendanceSession.query.get(session_id)
    if not session:
        return jsonify({"error": "Phiên điểm danh không tồn tại"}), 404

@attendance_bp.route("/proof/<filename>", methods=["GET"])
def serve_proof_media(filename):
    """Serve output annotated proof image or video to frontend"""
    output_dir = os.path.join(os.getcwd(), "outputs", "attendance_sessions")
    file_path = os.path.join(output_dir, filename)
    if os.path.exists(file_path):
        return send_file(file_path)
    return jsonify({"error": "Tệp minh chứng không tồn tại"}), 404


@attendance_bp.route("/process-live-frame", methods=["POST"])
@jwt_required()
def process_live_attendance_frame():
    """
    Nhận frame base64 từ Web Camera, chạy YuNet Face Detector + ArcFace v2 ONNX:
    1. Khoanh box XANH LÁ (0, 255, 0) + Tên Sinh Viên nếu trùng khớp.
    2. Khoanh box ĐỎ (0, 0, 255) + Label [Nguoi_la] nếu không có trong CSDL.
    3. Trả về ảnh base64 đã vẽ box xanh/đỏ rực rỡ để hiển thị trên Web.
    """
    import base64
    import cv2
    import numpy as np

    data = request.get_json() or {}
    image_base64 = data.get("image_base64", "")
    classroom_id = data.get("classroom_id")

    if not image_base64 or not classroom_id:
        return jsonify({"error": "Thiếu thông tin image_base64 hoặc classroom_id"}), 400

    try:
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]

        img_bytes = base64.b64decode(image_base64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame_bgr is None:
            return jsonify({"error": "Ảnh base64 không hợp lệ"}), 400

        # Handle 4-channel BGRA/RGBA images
        if len(frame_bgr.shape) == 3 and frame_bgr.shape[2] == 4:
            frame_bgr = cv2.cvtColor(frame_bgr, cv2.COLOR_BGRA2BGR)

        # Mirror frame to match selfie view
        frame_bgr = cv2.flip(frame_bgr, 1)

        ai_engine = FaceViTAIEngineService()
        if hasattr(ai_engine.detector, "detector") and hasattr(ai_engine.detector.detector, "setScoreThreshold"):
            ai_engine.detector.detector.setScoreThreshold(0.35)

        h_img, w_img, _ = frame_bgr.shape

        # Detect faces
        if hasattr(ai_engine.detector, "detect_faces_with_landmarks"):
            results = ai_engine.detector.detect_faces_with_landmarks(frame_bgr)
            boxes = [f["box"] for f in results]
        else:
            boxes = ai_engine.detector.detect_faces(frame_bgr)

        detections = []

        if boxes:
            for box in boxes:
                x, y, w, h = map(int, box)
                x1, y1 = max(0, x), max(0, y)
                x2, y2 = min(w_img, x + w), min(h_img, y + h)

                face_crop = frame_bgr[y1:y2, x1:x2]
                if face_crop.size == 0:
                    continue

                emb = ai_engine.extract_embedding(face_crop)
                match_res = ai_engine.match_against_classroom_students(emb, classroom_id)

                if match_res["matched"]:
                    status = "PRESENT"
                    display_name = match_res['name']
                else:
                    status = "UNREGISTERED"
                    display_name = "Nguoi_la_Unregistered"

                detections.append({
                    "bbox": [x1, y1, x2 - x1, y2 - y1],
                    "student_id": match_res.get("student_id"),
                    "name": display_name,
                    "status": status,
                    "confidence": match_res.get("confidence", 0.0)
                })

        # Deduplicate detections per student_id (keep highest confidence box)
        seen_students = {}
        unregistered_list = []

        for det in detections:
            s_id = det.get("student_id")
            if s_id:
                if s_id not in seen_students or det["confidence"] > seen_students[s_id]["confidence"]:
                    seen_students[s_id] = det
            else:
                unregistered_list.append(det)

        final_detections = list(seen_students.values()) + unregistered_list

        return jsonify({
            "frame_size": [w_img, h_img],
            "detections": final_detections
        }), 200

    except Exception as e:
        return jsonify({"error": f"Lỗi live stream: {str(e)}"}), 500
