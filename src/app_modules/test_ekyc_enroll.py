import argparse
import os
import sys
import time
import math
from pathlib import Path

# Automatic Path Bootstrap
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parents[1] if CURRENT_DIR.name == "app_modules" else CURRENT_DIR
for p in [str(PROJECT_ROOT / "src"), str(PROJECT_ROOT)]:
    if p not in sys.path:
        sys.path.insert(0, p)

import cv2
import numpy as np
import torch
from torchvision import transforms
from PIL import Image

from app_modules import FaceDetector, GalleryManager, export_to_onnx
from core import build_model


class EKYCEnrollApp:
    def __init__(self, experiment_name="sic_facevit_infonce_v2", threshold=0.45, use_onnx=True):
        self.experiment_name = experiment_name
        self.use_onnx = use_onnx
        self.detector = FaceDetector()
        self.gallery = GalleryManager(threshold=threshold, db_path=str(PROJECT_ROOT / "data_gallery" / "gallery_db.pt"))

        self.transform = transforms.Compose(
            [
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.5] * 3, std=[0.5] * 3),
            ]
        )

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.onnx_session = None

        if use_onnx:
            self._init_onnx_engine()
        else:
            self._init_pytorch_engine()

    def _init_pytorch_engine(self):
        ckpt_path = PROJECT_ROOT / "checkpoints" / f"{self.experiment_name}_best.pth"
        if not ckpt_path.exists():
            ckpt_path = PROJECT_ROOT / "src" / "checkpoints" / f"{self.experiment_name}_best.pth"

        print(f"[Engine] Nap checkpoint PyTorch tu: {ckpt_path}")
        checkpoint = torch.load(str(ckpt_path), map_location=self.device, weights_only=False)
        model_cfg = argparse.Namespace(**checkpoint["config"])

        self.model = build_model(model_cfg).to(self.device)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.eval()

    def _init_onnx_engine(self):
        import onnxruntime as ort

        onnx_path = PROJECT_ROOT / "weights" / f"{self.experiment_name}.onnx"
        if not onnx_path.exists():
            print(f"[ONNX Engine] Khong tim thay file .onnx, dang xuat ONNX tu dong...")
            export_to_onnx(self.experiment_name, output_dir=str(PROJECT_ROOT / "weights"))

        print(f"[ONNX Engine] Nap ONNX model tu: {onnx_path}")
        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"] if torch.cuda.is_available() else ["CPUExecutionProvider"]
        self.onnx_session = ort.InferenceSession(str(onnx_path), providers=providers)
        self.input_name = self.onnx_session.get_inputs()[0].name

    def extract_embedding(self, face_pil):
        face_tensor = self.transform(face_pil).unsqueeze(0)

        if self.use_onnx:
            input_data = face_tensor.cpu().numpy()
            onnx_outputs = self.onnx_session.run(None, {self.input_name: input_data})
            embedding = torch.from_numpy(onnx_outputs[0]).squeeze(0)
        else:
            face_tensor = face_tensor.to(self.device)
            with torch.no_grad():
                embedding = self.model(face_tensor).squeeze(0)

        embedding = embedding / torch.linalg.vector_norm(embedding, ord=2)
        return embedding

    @staticmethod
    def estimate_head_pose(landmarks):
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

    @staticmethod
    def check_face_distance(box, frame_shape):
        h_frame, w_frame = frame_shape[:2]
        bw = box[2]
        ratio = bw / float(w_frame)

        if ratio < 0.22:
            return "TOO_FAR", False, "CANH BAO: KHUON MAT XA QUA! Vui long tien lai gan."
        elif ratio > 0.65:
            return "TOO_CLOSE", False, "CANH BAO: KHUON MAT GAN QUA! Vui long lui ra xa."
        else:
            return "OPTIMAL", True, "Khoang cach dat chuan"

    def enroll_with_ekyc(self, name, capture_count=60):
        print(f"\n=== BAT DAU DANG KY DANH TINH eKYC DA TUP THE CHO: '{name}' ===")
        print("Quy trinh thu thap du lieu eKYC chia deu 60 mau theo 4 tu the:")
        print("  - Tu the 1 (Nhin thang): Thu thap 15 mau vector")
        print("  - Tu the 2 (Quay trai) : Thu thap 15 mau vector")
        print("  - Tu the 3 (Quay phai) : Thu thap 15 mau vector")
        print("  - Tu the 4 (Nguoc len) : Thu thap 15 mau vector\n")

        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("[Loi] Khong the mo Webcam.")
            return

        challenges = [
            {"action": "NHIN THANG", "instruction": "1/4: VOI LONG NHIN THANG VAO CAMERA (Thu thap 15 mau)"},
            {"action": "QUAY TRAI",  "instruction": "2/4: VOI LONG QUAY DAU SANG TRAI (Thu thap 15 mau)"},
            {"action": "QUAY PHAI",  "instruction": "3/4: VOI LONG QUAY DAU SANG PHAI (Thu thap 15 mau)"},
            {"action": "NGUOC LEN",  "instruction": "4/4: VOI LONG NGUOC CAM LEN TREN (Thu thap 15 mau)"},
        ]

        samples_per_step = capture_count // len(challenges)  # 15 mau moi tu the
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

            # Ve Thanh Header eKYC
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
                dist_code, is_opt_dist, dist_msg = self.check_face_distance(box, frame.shape)
                face_bgr, face_pil = self.detector.crop_face(frame, box)
                is_good_light, mean_bright, light_msg = self.detector.check_lighting_quality(face_bgr)

                now = time.time()
                total_captured = sum(step_samples)

                if not completed:
                    target = challenges[current_step]
                    step_count = step_samples[current_step]

                    # Hien thi Header eKYC
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

                        # Kiem tra neu dang o dung tu thach thuc -> TIEN HANH CHUP MAU CHO TU THE DO
                        if pose == target["action"]:
                            if now - last_capture_time >= 0.08:
                                embedding = self.extract_embedding(face_pil)
                                self.gallery.add_identity(name, embedding)
                                step_samples[current_step] += 1
                                last_capture_time = now

                            # Hien thanh tien trinh thu thap mau cho tu the nay
                            pct = int((step_samples[current_step] / float(samples_per_step)) * 100)
                            cv2.putText(display_frame, f"Dang thu thap {target['action']}: {step_samples[current_step]}/{samples_per_step} ({pct}%)", (x, y + bh + 25),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

                            # Khi thu thap du 15 mau cho tu the hien tai -> Chuyen sang tu the tiep theo!
                            if step_samples[current_step] >= samples_per_step:
                                current_step += 1
                                if current_step >= len(challenges):
                                    completed = True
                                    print(f"\n🎉 HOAN THANH DANG KY DANH TINH eKYC DA TU THE CHO: '{name}'!")
                                    self.gallery.save_db()
                else:
                    cv2.rectangle(display_frame, (0, 0), (w, 65), (0, 200, 0), -1)
                    cv2.putText(display_frame, f"DANG KY EKYC DA TU THE THANH CONG CHO: {name}! ({capture_count} mau)", (15, 38),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)
                    cv2.imshow("Test eKYC Enrollment Demo", display_frame)
                    cv2.waitKey(2500)
                    break

            cv2.imshow("Test eKYC Enrollment Demo", display_frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                if sum(step_samples) > 0:
                    print("[Gallery] Tu dong luu du lieu da thu thap truoc khi thoat...")
                    self.gallery.save_db()
                print("[Huy] Da thoat qua trinh dang ky eKYC.")
                break

        cap.release()
        cv2.destroyAllWindows()


def main():
    parser = argparse.ArgumentParser(description="SIC FaceViT eKYC Enrollment Test Demo")
    parser.add_argument("--enroll_name", type=str, required=True, help="Ten nguoi muon dang ky qua eKYC")
    parser.add_argument("--use_onnx", action="store_true", help="Chay bang ONNX Engine")
    parser.add_argument("--capture_count", type=int, default=120, help="So luong mau thu thap sau eKYC (mac dinh 120 mau - 30 mau/tu the)")
    args = parser.parse_args()

    app = EKYCEnrollApp(use_onnx=args.use_onnx)
    app.enroll_with_ekyc(name=args.enroll_name, capture_count=args.capture_count)


if __name__ == "__main__":
    main()
