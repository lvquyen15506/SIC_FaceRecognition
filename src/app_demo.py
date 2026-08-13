import argparse
import os
import sys
import time
from pathlib import Path

# Automatic Path Bootstrap
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent if CURRENT_DIR.name == "src" else CURRENT_DIR
for p in [str(PROJECT_ROOT / "src"), str(PROJECT_ROOT)]:
    if p not in sys.path:
        sys.path.insert(0, p)

import cv2
import torch
import numpy as np
from PIL import Image
from torchvision import transforms

from app_modules import FaceDetector, GalleryManager, export_to_onnx
from core import build_model
from data_pipeline import get_parser


class FaceRecognitionApp:
    """
    Ung dung Nhan dien Khuon mat Thoi gian thuc SIC FaceViT.
    Tich hop Face Detector + SIC FaceViT Engine + Gallery Manager (Unknown Threshold = 0.7641).
    """

    def __init__(self, experiment_name="sic_facevit_infonce_v2", threshold=0.7641, use_onnx=False):
        self.experiment_name = experiment_name
        self.threshold = threshold
        self.use_onnx = use_onnx

        print(f"=== KHOI TAO UNG DUNG SIC FACEVIT ({experiment_name}) ===")
        # 1. Khoi tao Face Detector
        self.detector = FaceDetector()

        # 2. Khoi tao Gallery Manager
        os.makedirs("data_gallery", exist_ok=True)
        db_path = os.path.join("data_gallery", "gallery_db.pt")
        self.gallery = GalleryManager(threshold=threshold, db_path=db_path)

        # 3. Transform chuan hoa anh dau vao cho FaceViT (224x224)
        self.transform = transforms.Compose(
            [
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.5] * 3, std=[0.5] * 3),
            ]
        )

        # 4. Nap mo hinh Inference Engine (PyTorch hoac ONNX)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.onnx_session = None

        if self.use_onnx:
            self._init_onnx_engine()
        else:
            self._init_pytorch_engine()

    def _init_pytorch_engine(self):
        """Nap checkpoint PyTorch (.pth)"""
        possible_paths = [
            os.path.join("checkpoints", f"{self.experiment_name}_best.pth"),
            os.path.join("src", "checkpoints", f"{self.experiment_name}_best.pth"),
        ]
        ckpt_path = None
        for p in possible_paths:
            if os.path.exists(p):
                ckpt_path = p
                break

        if not ckpt_path:
            raise FileNotFoundError(f"Khong tim thay checkpoint: {self.experiment_name}_best.pth")

        print(f"[Engine] Nap checkpoint PyTorch tu: {ckpt_path} (Device: {self.device})")
        checkpoint = torch.load(ckpt_path, map_location=self.device, weights_only=False)
        model_cfg = argparse.Namespace(**checkpoint["config"])

        self.model = build_model(model_cfg).to(self.device)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.eval()

    def _init_onnx_engine(self):
        """Nap mo hinh ONNX (.onnx) qua ONNX Runtime"""
        import onnxruntime as ort

        onnx_path = os.path.join("weights", f"{self.experiment_name}.onnx")
        if not os.path.exists(onnx_path):
            print(f"[Engine] File ONNX chua co tại {onnx_path}. Dang tu dong export sang ONNX...")
            onnx_path = export_to_onnx(self.experiment_name)

        print(f"[Engine] Nap ONNX Engine tu: {onnx_path}")
        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"] if torch.cuda.is_available() else ["CPUExecutionProvider"]
        self.onnx_session = ort.InferenceSession(onnx_path, providers=providers)

    @torch.no_grad()
    def extract_embedding(self, face_pil):
        """Trich xuat vector 128 chiều tu mot anh khuon mat cropped (PIL Image)"""
        img_tensor = self.transform(face_pil).unsqueeze(0) # [1, 3, 224, 224]

        if self.use_onnx:
            input_name = self.onnx_session.get_inputs()[0].name
            embedding = self.onnx_session.run(None, {input_name: img_tensor.numpy()})[0]
            embedding = torch.from_numpy(embedding).squeeze(0)
        else:
            img_tensor = img_tensor.to(self.device)
            embedding = self.model(img_tensor).cpu().squeeze(0)

        return embedding

    @staticmethod
    def estimate_head_pose(landmarks):
        import math
        re, le, nose, rm, lm = landmarks

        d_right_eye = math.hypot(nose[0] - re[0], nose[1] - re[1])
        d_left_eye = math.hypot(nose[0] - le[0], nose[1] - le[1])
        yaw_ratio = d_left_eye / (d_right_eye + 1e-6)

        eyes_y = (re[1] + le[1]) / 2.0
        mouth_y = (rm[1] + lm[1]) / 2.0
        d_nose_eyes = nose[1] - eyes_y
        d_nose_mouth = mouth_y - nose[1]
        pitch_ratio = d_nose_eyes / (d_nose_mouth + 1e-6)

        if yaw_ratio > 1.25:
            pose = "QUAY TRAI"
        elif yaw_ratio < 0.75:
            pose = "QUAY PHAI"
        elif pitch_ratio < 0.95:
            pose = "NGUOC LEN"
        elif pitch_ratio > 1.45:
            pose = "CUI XUONG"
        else:
            pose = "NHIN THANG"

        return pose, yaw_ratio, pitch_ratio

    def enroll_user_from_image(self, name, image_path):
        """Đang ky nguoi dung moi qua tệp anh co san (Image File Enrollment)"""
        print(f"\n=== DANG KY DANH TINH QUA FILE ANH: '{name}' ===")
        print(f"File anh: {image_path}")

        img = cv2.imread(image_path)
        if img is None:
            print(f"[Loi] Khong the mo file anh tu: {image_path}")
            return False

        boxes = self.detector.detect_faces(img)
        if len(boxes) == 0:
            print(f"[Loi] Khong tim thay khuon mat nao trong anh: {image_path}")
            return False

        # Cropped va nhap mau
        face_bgr, face_pil = self.detector.crop_face(img, boxes[0])
        embedding = self.extract_embedding(face_pil)
        self.gallery.add_identity(name, embedding)
        self.gallery.save_db()
        print(f"🎉 [THANH CONG] Đã nạp danh tinh '{name}' tu file anh vao CSDL gallery_db.pt!")
        return True

    def enroll_user_from_camera(self, name, capture_count=120, min_duration_sec=5.0, cooldown_sec=0.08):
        """Đang ky nguoi dung moi qua luong eKYC Đa tư the Challenge-Response (120 mau)"""
        print(f"\n=== BAT DAU DANG KY DANH TINH eKYC DA TU THE CHO: '{name}' ===")
        print("Quy trinh thu thap du lieu eKYC chia deu 120 mau theo 4 tu the:")
        print("  - Tu the 1 (Nhin thang): Thu thap 30 mau vector")
        print("  - Tu the 2 (Quay trai) : Thu thap 30 mau vector")
        print("  - Tu the 3 (Quay phai) : Thu thap 30 mau vector")
        print("  - Tu the 4 (Nguoc len) : Thu thap 30 mau vector\n")

        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("[Error] Khong the mo Webcam.")
            return

        challenges = [
            {"action": "NHIN THANG", "instruction": "1/4: VOI LONG NHIN THANG VAO CAMERA (Thu thap 30 mau)"},
            {"action": "QUAY TRAI",  "instruction": "2/4: VOI LONG QUAY DAU SANG TRAI (Thu thap 30 mau)"},
            {"action": "QUAY PHAI",  "instruction": "3/4: VOI LONG QUAY DAU SANG PHAI (Thu thap 30 mau)"},
            {"action": "NGUOC LEN",  "instruction": "4/4: VOI LONG NGUOC CAM LEN TREN (Thu thap 30 mau)"},
        ]

        samples_per_step = capture_count // len(challenges)
        step_samples = [0] * len(challenges)
        current_step = 0
        last_capture_time = time.time()
        completed = False

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame = cv2.flip(frame, 1)
            h, w = frame.shape[:2]
            display_frame = frame.copy()

            results = self.detector.detect_faces_with_landmarks(frame)

            cv2.rectangle(display_frame, (0, 0), (w, 65), (30, 30, 30), -1)

            if len(results) == 0:
                cv2.putText(display_frame, "KHONG PHAT HIEN KHUON MAT!", (20, 40),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            elif len(results) > 1:
                cv2.rectangle(display_frame, (0, 0), (w, 65), (0, 0, 255), -1)
                cv2.putText(display_frame, f"CANH BAO: Phat hien {len(results)} khuon mat! Chi duoc 1 nguoi.", (20, 40),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)
            else:
                largest_face = results[0]
                box = largest_face["box"]
                landmarks = largest_face["landmarks"]
                x, y, bw, bh = box

                pose, yaw_r, pitch_r = self.estimate_head_pose(landmarks)
                face_ratio = bw / float(w)

                if face_ratio < 0.22:
                    is_opt_dist = False
                    dist_msg = "CANH BAO: KHUON MAT XA QUA! Vui long tien lai gan."
                elif face_ratio > 0.65:
                    is_opt_dist = False
                    dist_msg = "CANH BAO: KHUON MAT GAN QUA! Vui long lui ra xa."
                else:
                    is_opt_dist = True
                    dist_msg = "OK"

                face_bgr, face_pil = self.detector.crop_face(frame, box)
                is_good_light, mean_bright, light_msg = self.detector.check_lighting_quality(face_bgr)
                now = time.time()
                total_captured = sum(step_samples)

                if not completed:
                    target = challenges[current_step]
                    step_count = step_samples[current_step]

                    header_str = f"[{current_step+1}/4: {target['action']}] Layer {step_count}/{samples_per_step} mau | Tong: {total_captured}/{capture_count}"
                    cv2.putText(display_frame, header_str, (15, 38),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 255), 2)

                    if not is_opt_dist or not is_good_light:
                        warn_msg = light_msg if not is_good_light else dist_msg
                        cv2.rectangle(display_frame, (0, 0), (w, 65), (0, 0, 255), -1)
                        cv2.putText(display_frame, warn_msg, (15, 38),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                        cv2.rectangle(display_frame, (x, y), (x + bw, y + bh), (0, 0, 255), 2)
                    else:
                        cv2.rectangle(display_frame, (x, y), (x + bw, y + bh), (0, 255, 0), 2)
                        cv2.putText(display_frame, f"Tu the: {pose}", (x, max(30, y - 10)),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

                        if pose == target["action"]:
                            if now - last_capture_time >= cooldown_sec:
                                embedding = self.extract_embedding(face_pil)
                                self.gallery.add_identity(name, embedding)
                                step_samples[current_step] += 1
                                last_capture_time = now

                            pct = int((step_samples[current_step] / float(samples_per_step)) * 100)
                            cv2.rectangle(display_frame, (x, y + bh + 10), (x + int(bw * (pct / 100.0)), y + bh + 25), (0, 255, 0), -1)

                            if step_samples[current_step] >= samples_per_step:
                                current_step += 1
                                if current_step >= len(challenges):
                                    completed = True

                else:
                    cv2.rectangle(display_frame, (0, 0), (w, 65), (0, 255, 0), -1)
                    cv2.putText(display_frame, f"🎉 HOP LE! DA DANG KY eKYC THANH CONG FOR '{name}'!", (15, 40),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)

            cv2.imshow(f"SIC FaceViT eKYC Enrollment - '{name}'", display_frame)
            if cv2.waitKey(1) & 0xFF == ord('q') or completed:
                if completed:
                    cv2.waitKey(1500)
                break

        cap.release()
        cv2.destroyAllWindows()

        if sum(step_samples) > 0:
            self.gallery.save_db()
            print(f"\n🎉 [THANH CONG] Đã dang ky eKYC cho '{name}' voi {sum(step_samples)} mau dac trung va luu vao CSDL gallery_db.pt!")

    def run_webcam(self):
        """Chay ung dung Nhan dien Thoi gian thuc qua Webcam (Real-time Demo)"""
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("[Error] Khong the mo Webcam.")
            return

        print("=== BAT DAU DEMO NHAN DIEN KHUON MAT WEBCAM REAL-TIME ===")
        print("Bấm phím 'q' trên cửa sổ camera để thoát.")

        prev_time = time.time()
        fps = 0.0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Lat anh ngang de tao hieu ung guong soi tu nhien (Mirror Effect)
            frame = cv2.flip(frame, 1)

            # Tinh toán FPS
            curr_time = time.time()
            fps = 0.9 * fps + 0.1 * (1.0 / (curr_time - prev_time + 1e-6))
            prev_time = curr_time

            # 1. Phat hien tat ca khuon mat trong frame
            boxes = self.detector.detect_faces(frame)

            # 2. Thu thap ket qua truy van cua tat ca khuon mat
            face_matches = []
            for box in boxes:
                _, face_pil = self.detector.crop_face(frame, box)
                embedding = self.extract_embedding(face_pil)
                match = self.gallery.identify(embedding)
                face_matches.append({
                    "box": box,
                    "name": match["name"],
                    "distance": match["distance"],
                    "confidence": match["confidence"],
                    "is_known": match["is_known"],
                })

            # 3. Thuat toan Rang buoc Doc quyen Danh tinh (Non-Duplicate Identity Constraint)
            # Sap xep cac khuon mat theo khoang cach tang dan (uu tien nguoi khop nhat)
            face_matches.sort(key=lambda item: item["distance"])
            assigned_names = set()

            for item in face_matches:
                box = item["box"]
                x, y, w, h = box
                name = item["name"]
                dist = item["distance"]
                conf = item["confidence"]
                is_known = item["is_known"]

                if is_known and name not in assigned_names:
                    # Trao danh tinh doc quyen cho khuon mat khop nhat trong frame!
                    assigned_names.add(name)
                    color = (0, 255, 0)
                    label_str = f"{name} ({conf:.1f}% | d={dist:.2f})"
                else:
                    # Neu ten nay da duoc gan cho khuon mat khac tot hon -> Ep thanh Unknown (Vien Do)!
                    color = (0, 0, 255)
                    label_str = f"Unknown (d={dist:.2f})"

                # Ve khung bounding box va nhan ten
                cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
                cv2.rectangle(frame, (x, y - 25), (x + w, y), color, -1)
                cv2.putText(frame, label_str, (x + 5, y - 7), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

            # Hien thi thông so FPS
            cv2.putText(frame, f"FPS: {fps:.1f} | Engine: {'ONNX' if self.use_onnx else 'PyTorch'}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)

            cv2.imshow("SIC FaceViT Real-time Recognition", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        cap.release()
        cv2.destroyAllWindows()


def main():
    parser = argparse.ArgumentParser(description="SIC FaceViT Real-time Face Recognition App")
    parser.add_argument("--experiment_name", type=str, default="sic_facevit_infonce_v2")
    parser.add_argument("--threshold", type=float, default=0.42, help="Real-time L2 distance threshold (mac dinh 0.42 - Can bang Vang cho do nhan dien cao)")
    parser.add_argument("--use_onnx", action="store_true", help="Chay bang ONNX Runtime")
    parser.add_argument("--enroll_name", type=str, default=None, help="Ten nguoi muon dang ky qua webcam hoac file anh")
    parser.add_argument("--enroll_image", type=str, default=None, help="Duong dan file anh co san de nap va dang ky danh tinh")
    parser.add_argument("--capture_count", type=int, default=120, help="So luong anh thu thap khi dang ky nguoi moi (mac dinh 120 mau eKYC)")
    parser.add_argument("--min_duration", type=float, default=5.0, help="Thoi gian mo camera dang ky toi thieu giay (mac dinh 5.0s)")
    parser.add_argument("--clear_gallery", action="store_true", help="Xoa sach toan bo du lieu gallery da dang ky")
    parser.add_argument("--webcam", action="store_true", help="Chay nhan dien thoi gian thuc qua webcam")

    args = parser.parse_args()

    app = FaceRecognitionApp(
        experiment_name=args.experiment_name,
        threshold=args.threshold,
        use_onnx=args.use_onnx,
    )

    if args.clear_gallery:
        app.gallery.clear_db()
    elif args.enroll_name and args.enroll_image:
        app.enroll_user_from_image(args.enroll_name, args.enroll_image)
    elif args.enroll_name:
        app.enroll_user_from_camera(args.enroll_name, capture_count=args.capture_count)
    elif args.webcam:
        app.run_webcam()
    else:
        print("\n[Huong dan su dung app_demo.py]:")
        print("  1. Dang ky nguoi dung moi qua eKYC Đa tu thế (120 mau):")
        print("     python src/app_demo.py --enroll_name 'NguyenVanA' --use_onnx\n")
        print("  2. Dang ky nguoi dung qua File anh co san:")
        print("     python src/app_demo.py --enroll_name 'NguyenVanA' --enroll_image 'path/to/photo.jpg'\n")
        print("  3. Chay nhan dien realtime qua webcam ONNX Engine:")
        print("     python src/app_demo.py --webcam --use_onnx\n")


if __name__ == "__main__":
    main()
