import os
import sys
import json
import numpy as np
import cv2
from PIL import Image
import onnxruntime as ort

from app.models import User, ClassroomStudent, AttendanceSession, AttendanceRecord, db


class FaceViTAIEngineService:
    """Singleton AI Engine Service running YuNet Face Detector & ArcFace v2 ONNX Model (Pure NumPy & ONNXRuntime)"""
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(FaceViTAIEngineService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, experiment_name="sic_facevit_arcface_v2", threshold=0.42):
        if self._initialized:
            return
        self.experiment_name = experiment_name
        self.threshold = threshold
        
        # Paths
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
        weights_dir = os.path.join(project_root, "weights")
        
        detector_path = os.path.join(weights_dir, "face_detection_yunet_2023mar.onnx")
        model_onnx_path = os.path.join(weights_dir, f"{self.experiment_name}.onnx")

        # Ensure src is in sys.path for app_modules import
        src_dir = os.path.join(project_root, "src")
        if src_dir not in sys.path:
            sys.path.insert(0, src_dir)

        from app_modules.detector import YuNetFaceDetector
        self.detector = YuNetFaceDetector()

        # 2. Initialize ONNX Runtime Session
        if not os.path.exists(model_onnx_path):
            model_onnx_path = os.path.join("weights", f"{self.experiment_name}.onnx")

        print(f"[AI Engine Service] Loading lightweight ONNX model from: {model_onnx_path}")
        self.onnx_session = ort.InferenceSession(model_onnx_path, providers=["CPUExecutionProvider"])
        self.input_name = self.onnx_session.get_inputs()[0].name

        self._initialized = True

    def preprocess_face(self, face_pil_or_bgr):
        """Preprocess face image into (1, 3, 224, 224) normalized [-1, 1] float32 tensor via NumPy & OpenCV"""
        if isinstance(face_pil_or_bgr, Image.Image):
            img_rgb = np.array(face_pil_or_bgr)
        else:
            img_rgb = cv2.cvtColor(face_pil_or_bgr, cv2.COLOR_BGR2RGB)

        img_resized = cv2.resize(img_rgb, (224, 224))
        # Normalize [0, 255] -> [-1.0, 1.0] (mean=0.5, std=0.5)
        img_norm = (img_resized.astype(np.float32) / 127.5) - 1.0
        # HWC -> CHW (1, 3, 224, 224)
        img_chw = np.transpose(img_norm, (2, 0, 1))[np.newaxis, ...]
        return img_chw

    def extract_embedding(self, face_pil):
        """Extract 128-d L2 normalized face embedding numpy array from image"""
        inp_tensor = self.preprocess_face(face_pil)
        outputs = self.onnx_session.run(None, {self.input_name: inp_tensor})
        embedding = outputs[0].squeeze(0).astype(np.float32)

        # L2 norm
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        return embedding

    def match_against_classroom_students(self, query_emb_np, classroom_id):
        """Match face embedding against all registered users with eKYC in database via L2 distance"""
        from app.models import User, ClassroomStudent
        
        # Get classroom student IDs for reference
        class_students = ClassroomStudent.query.filter_by(classroom_id=classroom_id).all()
        class_student_ids = {cs.student_id for cs in class_students}

        # Query all users who have completed eKYC
        ekyc_users = User.query.filter(User.ekyc_completed == True).all()
        
        best_name = "Nguoi_la_Unregistered"
        best_student_id = None
        min_dist = 999.0

        for user in ekyc_users:
            if not user.face_embeddings_json:
                continue

            try:
                raw_vector_list = json.loads(user.face_embeddings_json)
                target_emb = np.array(raw_vector_list, dtype=np.float32)
                norm = np.linalg.norm(target_emb)
                if norm > 0:
                    target_emb = target_emb / norm

                dist = float(np.linalg.norm(query_emb_np - target_emb))
                if dist < min_dist:
                    min_dist = dist
                    best_name = user.full_name
                    best_student_id = user.id
            except Exception as e:
                continue

        # Exact ArcFace v2 L2 distance threshold matching app_demo.py (0.42)
        match_threshold = 0.42

        if min_dist <= match_threshold:
            confidence = max(0.0, min(100.0, (1.0 - (min_dist / match_threshold)) * 100.0))
            return {
                "matched": True,
                "student_id": best_student_id,
                "name": best_name,
                "distance": float(min_dist),
                "confidence": float(confidence),
                "in_classroom": best_student_id in class_student_ids if best_student_id else False
            }
        else:
            return {
                "matched": False,
                "student_id": None,
                "name": "Nguoi_la_Unregistered",
                "distance": float(min_dist),
                "confidence": 0.0,
                "in_classroom": False
            }
