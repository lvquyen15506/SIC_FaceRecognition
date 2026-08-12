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

    def enroll_user_from_camera(self, name, capture_count=60, min_duration_sec=5.0, cooldown_sec=0.08):
        """Đang ky nguoi dung moi qua Webcam trong toi thieu 5s, tu dong huy neu co 2 khuon mat"""
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("[Error] Khong the mo Webcam.")
            return

        print(f"=== DANG KY NGUOI DUNG MOI: '{name}' ===")
        print(f"Huong dan: Nhin vao camera va xoay nhe dau trong toi thieu {min_duration_sec}s...")

        captured = 0
        last_capture_time = 0.0
        start_time = time.time()

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            now = time.time()
            elapsed = now - start_time

            # Kiem tra dieu kien ket thuc: Duyen it nhat min_duration_sec VA da du capture_count mau
            if elapsed >= min_duration_sec and captured >= capture_count:
                break

            # Lat anh ngang de tao hieu ung guong soi tu nhien (Mirror Effect)
            frame = cv2.flip(frame, 1)
            display_frame = frame.copy()

            # Phat hien tat ca khuon mat trong khung hinh
            boxes = self.detector.detect_faces(frame)

            if len(boxes) > 1:
                # ❌ PHAT HIEN NHIEU KHUON MAT: CANH BAO VA KHONG THU THAP
                for (bx, by, bw, bh) in boxes:
                    cv2.rectangle(display_frame, (bx, by), (bx + bw, by + bh), (0, 0, 255), 2)

                cv2.rectangle(display_frame, (10, 10), (frame.shape[1] - 10, 50), (0, 0, 255), -1)
                cv2.putText(
                    display_frame,
                    f"CANH BAO: Phat hien {len(boxes)} khuon mat! Chi duoc dung 1 nguoi.",
                    (20, 38),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (255, 255, 255),
                    2,
                )
            elif len(boxes) == 1:
                # ✅ CHINH XAC 1 KHUON MAT: THU THAP HOLE
                box = boxes[0]
                x, y, w, h = box

                cv2.rectangle(display_frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

                if captured < capture_count and (now - last_capture_time >= cooldown_sec):
                    _, face_pil = self.detector.crop_face(frame, box)
                    embedding = self.extract_embedding(face_pil)
                    self.gallery.add_identity(name, embedding)
                    captured += 1
                    last_capture_time = now

            cv2.imshow("Enrollment - Nhan phim 'q' de huy", display_frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        cap.release()
        cv2.destroyAllWindows()

        if captured > 0:
            self.gallery.save_db()
            print(f"[Success] Da dang ky thanh cong '{name}' voi {captured} mau dac trung (Thoi gian: {time.time() - start_time:.1f}s).")

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

            # 2. Vong lap qua tung khuon mat
            for box in boxes:
                x, y, w, h = box
                _, face_pil = self.detector.crop_face(frame, box)

                # Trich xuat embedding va truy van Gallery
                embedding = self.extract_embedding(face_pil)
                match = self.gallery.identify(embedding)

                # Dinh dang mau sac: Xanh la (Known), Do (Unknown)
                color = (0, 255, 0) if match["is_known"] else (0, 0, 255)
                label_str = f"{match['name']} ({match['confidence']:.1f}% | d={match['distance']:.2f})" if match["is_known"] else f"Unknown (d={match['distance']:.2f})"

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
    parser.add_argument("--threshold", type=float, default=0.52, help="Real-time L2 distance threshold (mac dinh 0.52 - An ninh cao chong nham nguoi)")
    parser.add_argument("--use_onnx", action="store_true", help="Chay bang ONNX Runtime")
    parser.add_argument("--enroll_name", type=str, default=None, help="Ten nguoi muon dang ky qua webcam")
    parser.add_argument("--capture_count", type=int, default=60, help="So luong anh thu thap khi dang ky nguoi moi (mac dinh 60)")
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
    elif args.enroll_name:
        app.enroll_user_from_camera(args.enroll_name, capture_count=args.capture_count, min_duration_sec=args.min_duration)
    elif args.webcam:
        app.run_webcam()
    else:
        print("\n[Huong dan su dung app_demo.py]:")
        print("  1. Dang ky nguoi dung moi qua webcam:")
        print("     python src/app_demo.py --enroll_name 'NguyenVanA'\n")
        print("  2. Chay nhan dien realtime qua webcam:")
        print("     python src/app_demo.py --webcam\n")
        print("  3. Chay nhan dien sieu toc bang ONNX Engine:")
        print("     python src/app_demo.py --webcam --use_onnx\n")


if __name__ == "__main__":
    main()
