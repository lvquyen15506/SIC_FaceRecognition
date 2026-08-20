"""
Core AI Engine Wrapper
Bọc trực tiếp các module YuNet & FaceViT ArcFace ONNX trong src/ để phục vụ Web API
Bổ sung thuật toán ước lượng 3D Head Pose (Yaw / Pitch) từ 5 YuNet Facial Landmarks
"""
import sys
import os
import io
import json
import base64
import numpy as np
import cv2
import onnxruntime as ort
from PIL import Image
from app.config import CORE_AI_PATH, BASE_DIR

# Add src to python path
if CORE_AI_PATH not in sys.path:
    sys.path.insert(0, CORE_AI_PATH)

# Initialize YuNet Face Detector with lower score threshold (0.25) to detect small faces in group photos
try:
    from app_modules.detector import FaceDetector
    detector = FaceDetector(score_threshold=0.25, nms_threshold=0.3)
    print("[AI Engine] Successfully loaded YuNet Face Detector with score_threshold=0.25")
except Exception as e:
    print(f"[AI Engine Warning] YuNet Detector load failed: {e}")
    detector = None

# Initialize ONNX inference session for FaceViT ArcFace v2
model_type = os.getenv("AI_MODEL_TYPE", "arcface").lower()
model_filename = f"sic_facevit_{model_type}_v2.onnx"

candidate_paths = [
    os.path.join(BASE_DIR, "weights", model_filename),
    os.path.join(CORE_AI_PATH, "weights", model_filename),
    os.path.join(BASE_DIR, "src", "weights", model_filename),
    # Fallback paths
    os.path.join(BASE_DIR, "weights", "sic_facevit_arcface_v2.onnx"),
    os.path.join(BASE_DIR, "src", "weights", "sic_facevit_arcface_v2.onnx"),
    os.path.join(BASE_DIR, "weights", "sic_facevit_infonce_v2.onnx"),
    os.path.join(BASE_DIR, "src", "weights", "sic_facevit_infonce_v2.onnx"),
]

onnx_model_path = None
for p in candidate_paths:
    if os.path.exists(p):
        onnx_model_path = p
        break

try:
    if onnx_model_path and os.path.exists(onnx_model_path):
        onnx_session = ort.InferenceSession(onnx_model_path, providers=["CPUExecutionProvider"])
        onnx_input_name = onnx_session.get_inputs()[0].name
        print(f"[AI Engine] Loaded FaceViT ONNX Model from: {onnx_model_path}")
    else:
        onnx_session = None
        onnx_input_name = None
        print(f"[AI Engine Warning] No ONNX model file found in candidate paths")
except Exception as e:
    print(f"[AI Engine Warning] ONNX Session load failed: {e}")
    onnx_session = None
    onnx_input_name = None

def check_image_quality(image_bytes: bytes, required_angle: str = None) -> dict:
    """
    Đánh giá chất lượng & Ước lượng tư thế góc xoay 3D (Head Pose Yaw / Pitch) từ 5 landmarks YuNet
    Khớp 100% với mô hình tham chiếu trong src/app_modules/test_pose_liveness.py
    """
    import math
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return {"pass": False, "status": "ERROR", "message": "Không thể đọc dữ liệu ảnh"}

    # 1. Check Brightness (Ánh sáng)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))

    if brightness < 15:
        return {
            "pass": False,
            "status": "TOO_DARK",
            "message": "Ánh sáng quá tối, vui lòng di chuyển ra vùng sáng hơn",
            "brightness": brightness
        }
    if brightness > 245:
        return {
            "pass": False,
            "status": "TOO_BRIGHT",
            "message": "Ánh sáng quá chói, vui lòng tránh nguồn sáng chiếu thẳng camera",
            "brightness": brightness
        }

    # 2. Detect Face & 5 Landmarks via YuNet
    face_data_list = []
    if detector is not None:
        try:
            face_data_list = detector.detect_faces_with_landmarks(img)
        except Exception:
            face_data_list = []

    if not face_data_list:
        return {
            "pass": False,
            "status": "NO_FACE",
            "message": "Hãy đưa khuôn mặt vào trong khung Oval..."
        }

    face_info = face_data_list[0]
    (x, y, w, h) = face_info["box"]
    landmarks = face_info["landmarks"] # [re, le, nose, rm, lm]

    re, le, nose = landmarks[0], landmarks[1], landmarks[2]

    # 1. Khoảng cách từ Mũi tới 2 Mắt (Kiểm tra Quay Trái / Phải - Yaw)
    d_right_eye = math.hypot(nose[0] - re[0], nose[1] - re[1])
    d_left_eye = math.hypot(nose[0] - le[0], nose[1] - le[1])
    yaw_ratio = d_left_eye / (d_right_eye + 1e-6)

    # 2. Trung điểm Mắt và Miệng (Kiểm tra Ngửa / Cúi - Pitch)
    eyes_y = (re[1] + le[1]) / 2.0
    mouth_y = (landmarks[3][1] + landmarks[4][1]) / 2.0
    d_nose_eyes = nose[1] - eyes_y
    d_nose_mouth = mouth_y - nose[1]
    pitch_ratio = d_nose_eyes / (d_nose_mouth + 1e-6)

    # Kiểm tra khoảng cách xa / gần
    ratio = w / float(img.shape[1])
    if ratio < 0.20:
        return {"pass": False, "status": "TOO_FAR", "message": "Vui lòng di chuyển mặt LẠI GẦN camera hơn..."}
    elif ratio > 0.68:
        return {"pass": False, "status": "TOO_CLOSE", "message": "Vui lòng lùi mặt RA XA camera một chút..."}

    # Kiểm tra khớp tư thế yêu cầu (Trực diện, Trái, Phải, Ngửa)
    if required_angle:
        req = required_angle.upper()
        if req == "FRONT":
            if yaw_ratio < 0.75 or yaw_ratio > 1.25 or pitch_ratio < 0.90 or pitch_ratio > 1.45:
                return {
                    "pass": False,
                    "status": "WRONG_POSE",
                    "message": "Hãy nhìn THẲNG CHÍNH DIỆN vào camera...",
                    "yaw_ratio": round(yaw_ratio, 2), "pitch_ratio": round(pitch_ratio, 2)
                }
        elif req == "LEFT":
            if yaw_ratio <= 1.25:
                return {
                    "pass": False,
                    "status": "WRONG_POSE",
                    "message": "Hãy QUAY MẶT SANG TRÁI...",
                    "yaw_ratio": round(yaw_ratio, 2)
                }
        elif req == "RIGHT":
            if yaw_ratio >= 0.75:
                return {
                    "pass": False,
                    "status": "WRONG_POSE",
                    "message": "Hãy QUAY MẶT SANG PHẢI...",
                    "yaw_ratio": round(yaw_ratio, 2)
                }
        elif req == "TILT":
            if pitch_ratio >= 0.95:
                return {
                    "pass": False,
                    "status": "WRONG_POSE",
                    "message": "Hãy NGỬA CẰM LÊN TRÊN...",
                    "pitch_ratio": round(pitch_ratio, 2)
                }
        elif req == "DOWN":
            if pitch_ratio <= 1.40:
                return {
                    "pass": False,
                    "status": "WRONG_POSE",
                    "message": "Hãy CÚI NHẸ ĐẦU XUỐNG DƯỚI...",
                    "pitch_ratio": round(pitch_ratio, 2)
                }

    return {
        "pass": True,
        "status": "PASS",
        "message": "Góc quay mặt đạt chuẩn!",
        "brightness": brightness,
        "yaw_ratio": round(yaw_ratio, 2),
        "pitch_ratio": round(pitch_ratio, 2),
        "box": [int(x), int(y), int(w), int(h)]
    }

def extract_face_feature_512d(image_bytes: bytes) -> list:
    """
    Trích xuất vector 512-d từ ảnh bằng Core AI FaceViT ONNX Model
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Cannot decode image bytes")

    # Resize & Normalize to (1, 3, 224, 224)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_resized = cv2.resize(img_rgb, (224, 224))
    img_norm = (img_resized.astype(np.float32) / 255.0 - 0.5) / 0.5
    img_input = np.transpose(img_norm, (2, 0, 1))[np.newaxis, :]  # Shape: (1, 3, 224, 224)

    if onnx_session is not None:
        outputs = onnx_session.run(None, {onnx_input_name: img_input})
        raw_vec = outputs[0].squeeze(0)
    else:
        seed = int(np.sum(img_resized) * 1000) % (2**31 - 1)
        np.random.seed(seed)
        raw_vec = np.random.randn(512).astype(np.float32)

    norm_vec = raw_vec / np.linalg.norm(raw_vec)
    return norm_vec.tolist()

try:
    from app_modules.gallery import GalleryManager
    print("[AI Engine] Successfully loaded Core AI GalleryManager")
except Exception as e:
    print(f"[AI Engine Warning] GalleryManager load failed: {e}")
    GalleryManager = None

def process_classroom_image(image_bytes: bytes, student_gallery: dict) -> tuple:
    """
    Xử lý ảnh toàn cảnh lớp học:
    1. Bóc tách tất cả khuôn mặt bằng SOTA YuNet Face Detector (score_threshold=0.25)
    2. Trích xuất 512-d embeddings & So khớp với Core AI GalleryManager (ngưỡng L2 0.7641 ~ Cosine 0.70)
    3. Phân loại: Có trong DB & Khớp khuôn mặt ➔ Khớp MSSV (Khung xanh). Không có/Không khớp ➔ Nguoi la (Khung đỏ)
    4. Khử trùng lặp (Duplicate Identity Disambiguation): Mỗi Mã SV chỉ được gán 1 lần cho vị trí khớp nhất trong cùng 1 ảnh.
    5. Vẽ Bounding Box & xuất ảnh cùng kết quả chi tiết
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return image_bytes, []

    faces = []
    if detector is not None:
        try:
            faces = detector.detect_faces(img)
        except Exception:
            faces = []

    # Fallback to OpenCV Haar Cascade if YuNet yielded no faces
    if not faces:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        try:
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            if os.path.exists(cascade_path):
                face_cascade = cv2.CascadeClassifier(cascade_path)
                detected = face_cascade.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=3, minSize=(20, 20))
                faces = [(int(x), int(y), int(w), int(h)) for (x, y, w, h) in detected]
        except Exception:
            faces = []

    # Step 1: Extract features for all valid face crops using Core AI Detector padding (15%) and shadow lifting
    face_data_list = []
    for idx, (x, y, w, h) in enumerate(faces):
        if w < 10 or h < 10:
            continue
        if detector is not None:
            try:
                face_bgr, _ = detector.crop_face(img, (x, y, w, h))
            except Exception:
                face_bgr = img[max(0,y):min(img.shape[0], y+h), max(0,x):min(img.shape[1], x+w)]
                face_bgr = cv2.resize(face_bgr, (224, 224))
        else:
            face_bgr = img[max(0,y):min(img.shape[0], y+h), max(0,x):min(img.shape[1], x+w)]
            face_bgr = cv2.resize(face_bgr, (224, 224))

        if face_bgr is None or face_bgr.size == 0:
            continue
        crop_bytes = cv2.imencode('.jpg', face_bgr)[1].tobytes()
        face_vec = extract_face_feature_512d(crop_bytes)
        face_data_list.append({
            "idx": idx,
            "box": [int(x), int(y), int(w), int(h)],
            "vec": face_vec
        })

    if not face_data_list:
        processed_bytes = cv2.imencode('.jpg', img)[1].tobytes()
        return processed_bytes, []

    # Step 2: Build GalleryManager instance with ArcFace L2 threshold (0.22 ~ EER Threshold 0.1844)
    gallery_mgr = None
    model_dim = len(face_data_list[0]["vec"]) if face_data_list else 512

    # ArcFace v2 Optimal EER Threshold (Pos Dist ~0.1149, Neg Dist ~0.2407, EER ~0.1844 -> Cosine ~0.9758)
    if "arcface" in (onnx_model_path or "").lower():
        l2_thresh = 0.22
        cosine_thresh = 0.9758
    else:
        l2_thresh = 0.7641
        cosine_thresh = 0.68

    if GalleryManager is not None and student_gallery:
        try:
            gallery_mgr = GalleryManager(threshold=l2_thresh)
            # Clear static disk-loaded gallery samples to use ONLY class-specific student gallery
            gallery_mgr.gallery_embeddings = []
            gallery_mgr.gallery_names = []
            gallery_mgr.threshold = l2_thresh
            for u_code, u_vecs in student_gallery.items():
                for vec in u_vecs:
                    if len(vec) == model_dim:
                        gallery_mgr.add_identity(u_code, np.array(vec, dtype=np.float32))
                    else:
                        print(f"[AI Engine Warning] Skipping vector for {u_code} with mismatched dim ({len(vec)} != {model_dim})")
        except Exception as e:
            print(f"[AI Engine Gallery Warning] {e}")
            gallery_mgr = None

    # Step 3: Match each face against Gallery
    raw_matches = []
    for item in face_data_list:
        f_vec = item["vec"]
        matched_code = None
        closest_candidate = None
        best_sim = -1.0
        is_known = False

        if gallery_mgr is not None and len(gallery_mgr.gallery_embeddings) > 0:
            # Core AI Hybrid Gallery Manager Matching
            res = gallery_mgr.identify(np.array(f_vec, dtype=np.float32))
            is_known = res.get("is_known", False)
            closest_candidate = res.get("matched_gallery_name")
            if is_known:
                matched_code = res.get("name")
                best_sim = res.get("confidence", 0.0) / 100.0
            else:
                best_sim = max(0.0, res.get("confidence", 0.0) / 100.0)
        else:
            # Fallback Cosine Match with dimension filtering
            for u_code, u_vecs in student_gallery.items():
                for ref_vec in u_vecs:
                    if len(ref_vec) == len(f_vec):
                        sim = float(np.dot(np.array(f_vec), np.array(ref_vec)))
                        if sim > best_sim:
                            best_sim = sim
                            closest_candidate = u_code
            is_known = (best_sim >= cosine_thresh and closest_candidate is not None)
            if is_known:
                matched_code = closest_candidate

        raw_matches.append({
            "idx": item["idx"],
            "box": item["box"],
            "matched_code": matched_code if is_known else None,
            "closest_code": closest_candidate,
            "similarity": best_sim,
            "is_known": is_known
        })

    # Step 4: Duplicate Identity Disambiguation (One student code per face in image)
    known_matches = [m for m in raw_matches if m["is_known"] and m["matched_code"]]
    known_matches.sort(key=lambda x: x["similarity"], reverse=True)

    assigned_codes = set()
    final_face_results = {}  # face idx -> final match dict

    for m in known_matches:
        f_idx = m["idx"]
        code = m["matched_code"]
        if code not in assigned_codes:
            assigned_codes.add(code)
            final_face_results[f_idx] = {
                "code": code,
                "closest_code": code,
                "status": "PRESENT",
                "confidence": m["similarity"],
                "is_known": True,
                "box": m["box"]
            }
        else:
            # Demote duplicate face match to Nguoi la (Unknown)
            final_face_results[f_idx] = {
                "code": "UNKNOWN",
                "closest_code": code,
                "status": "UNKNOWN",
                "confidence": m["similarity"],
                "is_known": False,
                "box": m["box"]
            }

    for m in raw_matches:
        f_idx = m["idx"]
        if f_idx not in final_face_results:
            final_face_results[f_idx] = {
                "code": "UNKNOWN",
                "closest_code": m["closest_code"],
                "status": "UNKNOWN",
                "confidence": max(0.0, m["similarity"]),
                "is_known": False,
                "box": m["box"]
            }

    # Step 5: Draw Bounding Boxes & Render Output Image with Confidence %
    attendance_results = []
    for item in face_data_list:
        f_idx = item["idx"]
        res = final_face_results[f_idx]
        x, y, w, h = res["box"]
        conf_pct = res.get("confidence", 0.0) * 100.0

        if res["is_known"] and res["code"] != "UNKNOWN":
            color = (0, 255, 0)  # Green for Registered Student
            label = f"{res['code']} ({conf_pct:.1f}%)"
            attendance_results.append(res)
        else:
            color = (0, 0, 255)  # Red for Unknown / Nguoi la
            label = "Nguoi la"
            attendance_results.append(res)

        # Draw bounding box & text with solid top banner for maximum readability
        cv2.rectangle(img, (x, y), (x+w, y+h), color, 2)
        text_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        banner_w = max(w, text_size[0] + 10)
        cv2.rectangle(img, (x, max(0, y-22)), (x+banner_w, y), color, -1)
        cv2.putText(img, label, (x+5, max(12, y-6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

    processed_bytes = cv2.imencode('.jpg', img)[1].tobytes()
    return processed_bytes, attendance_results
