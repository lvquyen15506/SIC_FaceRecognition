import os
import sys
import json
import numpy as np
import cv2
import torch
from PIL import Image
import torchvision.transforms as transforms
import onnxruntime as ort

from app.models import User, ClassroomStudent, AttendanceSession, AttendanceRecord, db


class FaceViTAIEngineService:
    """Singleton AI Engine Service running YuNet Face Detector & ArcFace v2 ONNX Model"""
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

        # 1. Initialize YuNet Face Detector
        if not os.path.exists(detector_path):
            detector_path = "face_detection_yunet_2023mar.onnx"

        from app_modules.detector import YuNetFaceDetector
        self.detector = YuNetFaceDetector(model_path=detector_path)

        # 2. Initialize ONNX Runtime Session
        if not os.path.exists(model_onnx_path):
            model_onnx_path = os.path.join("weights", f"{self.experiment_name}.onnx")

        print(f"[AI Engine Service] Loading ONNX model from: {model_onnx_path}")
        self.onnx_session = ort.InferenceSession(model_onnx_path, providers=["CPUExecutionProvider"])
        self.input_name = self.onnx_session.get_inputs()[0].name

        # 3. Transform (224x224)
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5] * 3, std=[0.5] * 3),
        ])

        self._initialized = True

    def extract_embedding(self, face_pil):
        """Extract 128-d L2 normalized face embedding tensor from PIL Image"""
        tensor_img = self.transform(face_pil).unsqueeze(0).numpy().astype(np.float32)
        outputs = self.onnx_session.run(None, {self.input_name: tensor_img})
        embedding = torch.from_numpy(outputs[0]).squeeze(0)
        norm_emb = embedding / torch.linalg.vector_norm(embedding, ord=2)
        return norm_emb.numpy()

    def match_against_classroom_students(self, query_emb_np, classroom_id):
        """Match face embedding against registered students in a specific classroom"""
        class_students = ClassroomStudent.query.filter_by(classroom_id=classroom_id).all()
        
        best_name = "Nguoi_la_Unregistered"
        best_student_id = None
        min_dist = 999.0

        query_tensor = torch.from_numpy(query_emb_np)

        for cs in class_students:
            student = cs.student
            if not student or not student.face_embeddings_json:
                continue

            try:
                raw_vector_list = json.loads(student.face_embeddings_json)
                target_vector = torch.tensor(raw_vector_list, dtype=torch.float32)
                target_vector = target_vector / torch.linalg.vector_norm(target_vector, ord=2)

                dist = torch.dist(query_tensor, target_vector, p=2).item()
                if dist < min_dist:
                    min_dist = dist
                    best_name = student.full_name
                    best_student_id = student.id
            except Exception as e:
                continue

        if min_dist <= self.threshold:
            confidence = max(0.0, min(100.0, (1.0 - (min_dist / self.threshold)) * 100.0))
            return {
                "matched": True,
                "student_id": best_student_id,
                "name": best_name,
                "distance": float(min_dist),
                "confidence": float(confidence),
            }
        else:
            return {
                "matched": False,
                "student_id": None,
                "name": "Nguoi_la_Unregistered",
                "distance": float(min_dist),
                "confidence": 0.0,
            }
