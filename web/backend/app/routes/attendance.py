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

            valid_user = User.query.get(s_id) if s_id else None

            rec = AttendanceRecord(
                session_id=session_id,
                student_id=valid_user.id if valid_user else None,
                student_name=valid_user.full_name if valid_user else s_name,
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

        session.csv_report_path = csv_path
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

    # Collect uploaded files (supports single or multiple file selection)
    uploaded_files = request.files.getlist("files")
    if not uploaded_files or len(uploaded_files) == 0:
        if "file" in request.files:
            uploaded_files = [request.files["file"]]

    if not uploaded_files or len(uploaded_files) == 0 or uploaded_files[0].filename == "":
        return jsonify({"error": "Vui lòng chọn tệp ảnh/video để upload"}), 400

    output_dir = os.path.join(os.getcwd(), "outputs", "attendance_sessions")
    os.makedirs(output_dir, exist_ok=True)

    session_id = str(uuid.uuid4())
    session = AttendanceSession(
        id=session_id,
        classroom_id=classroom_id,
        created_by_user_id=user_id,
        title=title,
        session_type="PHOTO",
    )
    db.session.add(session)

    # Fetch classroom students map
    class_students = ClassroomStudent.query.filter_by(classroom_id=classroom_id).all()
    student_dict = {cs.student_id: cs.student for cs in class_students if cs.student}
    present_student_map = {} # student_id -> best_record
    unregistered_count = 0

    ai_engine = FaceViTAIEngineService()
    last_proof_path = None

    for f_idx, file_obj in enumerate(uploaded_files, 1):
        if file_obj.filename == "":
            continue
        save_filename = f"batch_{session_id[:8]}_{f_idx}_{file_obj.filename}"
        img_path = os.path.join(output_dir, save_filename)
        file_obj.save(img_path)

        img_bgr = cv2.imread(img_path)
        if img_bgr is None:
            continue

        if hasattr(ai_engine.detector, "detect_faces_with_landmarks"):
            results = ai_engine.detector.detect_faces_with_landmarks(img_bgr)
            boxes = [res["box"] for res in results]
        else:
            boxes = ai_engine.detector.detect_faces(img_bgr)

        display_img = img_bgr.copy()

        if boxes:
            for box in boxes:
                x, y, bw, bh = map(int, box)
                x1, y1 = max(0, x), max(0, y)
                x2, y2 = min(img_bgr.shape[1], x + bw), min(img_bgr.shape[0], y + bh)

                face_crop = img_bgr[y1:y2, x1:x2]
                if face_crop.size == 0:
                    continue

                emb = ai_engine.extract_embedding(face_crop)
                match_res = ai_engine.match_against_classroom_students(emb, classroom_id)

                if match_res["matched"] and match_res["student_id"]:
                    st_id = match_res["student_id"]
                    conf = match_res["confidence"]
                    if st_id not in present_student_map or conf > present_student_map[st_id]["confidence"]:
                        present_student_map[st_id] = {
                            "student_id": st_id,
                            "name": match_res["name"],
                            "confidence": conf
                        }
                    cv2.rectangle(display_img, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(display_img, f"{match_res['name']} ({conf:.0f}%)", (x1, max(25, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                else:
                    unregistered_count += 1
                    cv2.rectangle(display_img, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    cv2.putText(display_img, "Nguoi_la_Unregistered", (x1, max(25, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

        proof_path = os.path.join(output_dir, f"proof_{session_id[:8]}_{f_idx}.jpg")
        cv2.imwrite(proof_path, display_img)
        last_proof_path = proof_path

    session.media_proof_path = last_proof_path

    records_to_add = []
    # Add Present Records
    for st_id, data_rec in present_student_map.items():
        rec = AttendanceRecord(
            session_id=session_id,
            student_id=st_id,
            student_name=data_rec["name"],
            status="PRESENT",
            confidence_score=data_rec["confidence"]
        )
        records_to_add.append(rec)

    # Add Absent Records for students not detected in any photo
    for st_id, student_obj in student_dict.items():
        if st_id not in present_student_map:
            rec = AttendanceRecord(
                session_id=session_id,
                student_id=st_id,
                student_name=student_obj.full_name,
                status="ABSENT",
                confidence_score=0.0
            )
            records_to_add.append(rec)

    db.session.add_all(records_to_add)

    # Save physical CSV report file
    now_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_title = title.replace(" ", "_")
    clean_class = classroom.class_code.replace(" ", "_")
    csv_filename = f"DiemDanh_{clean_class}_{clean_title}_{now_str}.csv"
    csv_path = os.path.join(output_dir, csv_filename)

    df_data = []
    for idx, r in enumerate(records_to_add, 1):
        df_data.append({
            "STT": idx,
            "Mã Lớp": classroom.class_code,
            "Tên Lớp": classroom.class_name,
            "Tiêu Đề Phiên": title,
            "Tên Sinh Viên": r.student_name,
            "Trạng Thái": "Có mặt" if r.status == "PRESENT" else "Vắng mặt",
            "Độ Tin Cậy (%)": f"{r.confidence_score:.1f}%",
            "Thời Gian Thực Hiện": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })

    df = pd.DataFrame(df_data)
    df.to_csv(csv_path, index=False, encoding="utf-8-sig")
    session.csv_report_path = csv_path

    db.session.commit()

    return jsonify({
        "message": f"🎉 Đã quét {len(uploaded_files)} tệp ảnh/video và lưu phiên điểm danh thành công cho Lớp [{classroom.class_code}]!",
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


@attendance_bp.route("/sessions", methods=["GET"])
@jwt_required()
def get_all_attendance_sessions():
    """Lấy toàn bộ danh sách các Phiên điểm danh sắp xếp theo Tiêu đề và Thời gian"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Tài khoản không tồn tại"}), 404

    if user.system_role == "ADMIN":
        sessions = AttendanceSession.query.order_by(AttendanceSession.created_at.desc()).all()
    else:
        class_ids = [c.id for c in user.primary_classrooms] + [ct.classroom_id for ct in user.co_teacher_classrooms]
        sessions = AttendanceSession.query.filter(AttendanceSession.classroom_id.in_(class_ids)).order_by(AttendanceSession.created_at.desc()).all()

    result = []
    for s in sessions:
        s_dict = s.to_dict()
        recs = AttendanceRecord.query.filter_by(session_id=s.id).all()
        s_dict["records"] = [r.to_dict() for r in recs]
        s_dict["classroom"] = s.classroom.to_dict() if s.classroom else None
        result.append(s_dict)

    return jsonify({"sessions": result}), 200


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

        # Mirror frame horizontally to match eKYC embedding orientation exactly (ekyc.py line 129)
        frame_bgr = cv2.flip(frame_bgr, 1)

        ai_engine = FaceViTAIEngineService()
        if hasattr(ai_engine.detector, "detector") and hasattr(ai_engine.detector.detector, "setScoreThreshold"):
            ai_engine.detector.detector.setScoreThreshold(0.65)

        h_img, w_img, _ = frame_bgr.shape

        # Detect faces with landmarks
        if hasattr(ai_engine.detector, "detect_faces_with_landmarks"):
            results = ai_engine.detector.detect_faces_with_landmarks(frame_bgr)
        else:
            boxes = ai_engine.detector.detect_faces(frame_bgr)
            results = [{"box": b, "landmarks": []} for b in (boxes if boxes else [])]

        detections = []

        if results:
            for item in results:
                box = item["box"]
                landmarks = item.get("landmarks", [])

                x, y, w, h = map(int, box)
                x1, y1 = max(0, x), max(0, y)
                x2, y2 = min(w_img, x + w), min(h_img, y + h)

                face_crop = frame_bgr[y1:y2, x1:x2]
                if face_crop.size == 0 or w < 30 or h < 30:
                    continue

                # Filter out ceiling light glare / flat background artifacts via texture variance
                gray_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
                mean_val = float(np.mean(gray_crop))
                std_dev = float(np.std(gray_crop))

                # Real human faces have skin/eyes/mouth texture variance std_dev > 22.0
                if mean_val > 230 or mean_val < 25 or std_dev < 22.0:
                    continue

                # Validate facial landmarks if present
                if len(landmarks) >= 5:
                    re, le, nt = landmarks[0], landmarks[1], landmarks[2]
                    eye_dist = float(np.linalg.norm(np.array(re) - np.array(le)))
                    if eye_dist < 8.0:
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
