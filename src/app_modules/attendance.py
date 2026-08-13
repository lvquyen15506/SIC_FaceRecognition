import argparse
import os
import sys
import time
import csv
from datetime import datetime
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


class ClassroomAttendanceSystem:
    """
    Hệ thống Điểm danh Sinh viên Lớp học SIC FaceViT.
    Hỗ trợ:
      1. Điểm danh qua Ảnh chụp tập thể lớp học (--image classroom.jpg)
      2. Điểm danh qua Video / Stream Camera giám sát lớp học (--video class.mp4 hoac --webcam)
      3. Tự động Xuất báo cáo CSV / Excel kết quả điểm danh.
    """

    def __init__(self, experiment_name="sic_facevit_infonce_v2", threshold=0.42, use_onnx=True):
        self.experiment_name = experiment_name
        self.use_onnx = use_onnx
        self.detector = FaceDetector()
        self.gallery = GalleryManager(threshold=threshold, db_path=str(PROJECT_ROOT / "data_gallery" / "gallery_db.pt"))

        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5] * 3, std=[0.5] * 3),
        ])

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.onnx_session = None

        if use_onnx:
            self._init_onnx_engine()
        else:
            self._init_pytorch_engine()

        os.makedirs("outputs", exist_ok=True)
        os.makedirs(str(PROJECT_ROOT / "outputs"), exist_ok=True)

    def _init_pytorch_engine(self):
        ckpt_path = PROJECT_ROOT / "checkpoints" / f"{self.experiment_name}_best.pth"
        if not ckpt_path.exists():
            ckpt_path = PROJECT_ROOT / "src" / "checkpoints" / f"{self.experiment_name}_best.pth"

        print(f"[Attendance Engine] Nap PyTorch checkpoint tu: {ckpt_path}")
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

        print(f"[Attendance Engine] Nap ONNX Engine tu: {onnx_path}")
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

    def export_csv_report(self, attendance_records, report_filename=None):
        """
        Xuất file CSV báo cáo kết quả điểm danh cho giảng viên.
        """
        if not report_filename:
            date_str = datetime.now().strftime("%Y-%m-%d")
            report_filename = str(PROJECT_ROOT / "outputs" / f"attendance_report_{date_str}.csv")

        registered_students = set(self.gallery.get_registered_names())
        present_students = {rec["name"]: rec for rec in attendance_records if rec["is_known"]}
        absent_students = registered_students - set(present_students.keys())

        with open(report_filename, mode="w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(["STT", "Ten Sinh Vien", "Trang Thai", "Thoi Gian Diem Danh", "Do Tin Cay (%)", "Ghi Chu"])

            stt = 1
            # Danh sách sinh viên có mặt
            for name, rec in present_students.items():
                writer.writerow([stt, name, "CO MAT", rec["timestamp"], f"{rec['confidence']:.1f}%", "Diem danh thanh cong"])
                stt += 1

            # Danh sách sinh viên vắng mặt
            for name in sorted(absent_students):
                writer.writerow([stt, name, "VANG MAT", "--:--:--", "0.0%", "Khong co mat trong lop"])
                stt += 1

            # Danh sách người lạ / chưa đăng ký
            unregistered_records = [rec for rec in attendance_records if not rec["is_known"]]
            if unregistered_records:
                writer.writerow([])
                writer.writerow(["--- DANH SACH NGUOI LA / PHAT HIEN TRONG LOP ---"])
                for idx, rec in enumerate(unregistered_records, 1):
                    writer.writerow([idx, "Unknown", "NGUOI LA", rec["timestamp"], f"d={rec['distance']:.2f}", "Phat hien nguoi la trong lop"])

        print(f"\n✅ ĐÃ XUẤT BÁO CÁO ĐIỂM DANH CSV THÀNH CÔNG VÀO: {report_filename}")
        return report_filename

    def process_image(self, image_path):
        """
        1. Điểm danh qua Ảnh chụp tập thể lớp học.
        """
        print(f"\n=== PROCESS IMAGE: DIEM DANH QUA ANH TAP THE LOP HOC ===")
        print(f"File anh: {image_path}")

        image = cv2.imread(image_path)
        if image is None:
            print(f"[Loi] Khong the doc file anh tu: {image_path}")
            return

        h, w = image.shape[:2]
        boxes = self.detector.detect_faces(image)
        print(f"[Detection] Phat hien {len(boxes)} khuon mat trong anh tap the lop.")

        attendance_records = []
        present_count = 0
        unknown_count = 0
        now_str = datetime.now().strftime("%H:%M:%S")

        display_img = image.copy()

        face_matches = []
        for box in boxes:
            _, face_pil = self.detector.crop_face(image, box)
            embedding = self.extract_embedding(face_pil)
            match = self.gallery.identify(embedding)
            face_matches.append({
                "box": box,
                "name": match["name"],
                "distance": match["distance"],
                "confidence": match["confidence"],
                "is_known": match["is_known"],
            })

        # Rang buoc Doc quyen Danh tinh trong Anh tap the:
        # Sap xep cac khuon mat theo khoang cach tang dan (1 ten trong DB chi duoc gan cho 1 mat khop nhat!)
        face_matches.sort(key=lambda item: item["distance"])
        assigned_names = set()

        for item in face_matches:
            box = item["box"]
            x, y, bw, bh = box
            name = item["name"]
            dist = item["distance"]
            conf = item["confidence"]
            is_known = item["is_known"]

            if is_known and name not in assigned_names:
                assigned_names.add(name)
                present_count += 1
                color = (0, 255, 0)
                label_str = f"{name} ({conf:.1f}%)"
                rec_is_known = True
                rec_name = name
            else:
                unknown_count += 1
                color = (0, 0, 255)
                label_str = f"Unknown (d={dist:.2f})"
                rec_is_known = False
                rec_name = "Unknown"

            attendance_records.append({
                "name": rec_name,
                "confidence": conf,
                "distance": dist,
                "is_known": rec_is_known,
                "timestamp": now_str
            })

            # Ve bounding box va nhan ten
            cv2.rectangle(display_img, (x, y), (x + bw, y + bh), color, 2)
            cv2.rectangle(display_img, (x, max(0, y - 25)), (x + bw, y), color, -1)
            cv2.putText(display_img, label_str, (x + 5, max(15, y - 7)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

        # Ve Thanh Header Tong hop Ket qua Điểm danh
        cv2.rectangle(display_img, (0, 0), (w, 55), (30, 30, 30), -1)
        summary_str = f"DIEM DANH LOP HOC | Tong: {len(boxes)} SV | Co Mat: {present_count} | Nguoi La: {unknown_count}"
        cv2.putText(display_img, summary_str, (15, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

        # Luu file anh ket qua
        output_img_path = str(PROJECT_ROOT / "outputs" / f"attendance_result_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg")
        cv2.imwrite(output_img_path, display_img)
        print(f"✅ Đã luu anh ket qua diem danh vao: {output_img_path}")

        # Xuat bao cao CSV
        self.export_csv_report(attendance_records)

        # Hien thi anh ket qua
        cv2.imshow("SIC FaceViT - Ket qua Diem danh Lop hoc", display_img)
        print("Bấm phím bat ky tren cua so anh de thoat...")
        cv2.waitKey(0)
        cv2.destroyAllWindows()

    def process_video(self, video_source=0):
        """
        2. Điểm danh qua Video hoac Stream Camera giam sat lop hoc realtime.
        """
        source_name = "Webcam Realtime" if video_source == 0 else f"Video File: {video_source}"
        print(f"\n=== PROCESS VIDEO: DIEM DANH QUA VIDEO STREAM LOP HOC ===")
        print(f"Nguon: {source_name}")

        cap = cv2.VideoCapture(video_source)
        if not cap.isOpened():
            print(f"[Loi] Khong the mo luong video tu: {video_source}")
            return

        fps = 0.0
        prev_time = time.time()
        attendance_log = {}  # {student_name: {timestamp, confidence, distance}}

        out_video_writer = None
        out_vid_path = None
        if isinstance(video_source, str) or video_source == 0:
            out_vid_name = f"attendance_video_result_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4"
            out_vid_path = str(PROJECT_ROOT / "outputs" / out_vid_name)
            input_fps = cap.get(cv2.CAP_PROP_FPS)
            input_fps = 20.0 if input_fps <= 0 or np.isnan(input_fps) else input_fps
            frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out_video_writer = cv2.VideoWriter(out_vid_path, fourcc, input_fps, (frame_w, frame_h))
            print(f"[Video Writer] Sẽ xuất Video Minh chứng điểm danh vào: {out_vid_path}")

        while True:
            ret, frame = cap.read()
            if not ret:
                print("[End] Luong video da ket thuc.")
                break

            if video_source == 0:
                frame = cv2.flip(frame, 1)

            h, w = frame.shape[:2]
            curr_time = time.time()
            fps = 0.9 * fps + 0.1 * (1.0 / (curr_time - prev_time + 1e-6))
            prev_time = curr_time

            boxes = self.detector.detect_faces(frame)

            face_matches = []
            for box in boxes:
                x, y, bw, bh = box
                # 1. Loc Khuon mat qua nho hoac qua xa (Avoid low-res blur false matches)
                if bw < 36 or bh < 36:
                    continue

                _, face_pil = self.detector.crop_face(frame, box)
                embedding = self.extract_embedding(face_pil)
                match = self.gallery.identify(embedding)

                # 2. Siết ngưỡng an ninh video (Video Strict Match Distance: dist <= 0.36 hoac conf >= 72%)
                is_strict_known = match["is_known"] and match["distance"] <= 0.36

                face_matches.append({
                    "box": box,
                    "name": match["name"],
                    "distance": match["distance"],
                    "confidence": match["confidence"],
                    "is_known": is_strict_known,
                })

            # Rang buoc Doc quyen Danh tinh trong cung 1 frame
            face_matches.sort(key=lambda item: item["distance"])
            assigned_names = set()

            for item in face_matches:
                box = item["box"]
                x, y, bw, bh = box
                name = item["name"]
                dist = item["distance"]
                conf = item["confidence"]
                is_known = item["is_known"]

                if is_known and name not in assigned_names:
                    assigned_names.add(name)
                    color = (0, 255, 0)
                    label_str = f"{name} ({conf:.1f}%)"

                    # Ghi nhan Log diem danh neu chua co
                    if name not in attendance_log:
                        timestamp_str = datetime.now().strftime("%H:%M:%S")
                        attendance_log[name] = {
                            "name": name,
                            "confidence": conf,
                            "distance": dist,
                            "is_known": True,
                            "timestamp": timestamp_str
                        }
                        print(f"🎉 [DIEM DANH CO MAT] Sinh vien: '{name}' luc {timestamp_str} (Conf: {conf:.1f}%)")
                else:
                    color = (0, 0, 255)
                    label_str = f"Unknown (d={dist:.2f})"

                cv2.rectangle(frame, (x, y), (x + bw, y + bh), color, 2)
                cv2.rectangle(frame, (x, max(0, y - 25)), (x + bw, y), color, -1)
                cv2.putText(frame, label_str, (x + 5, max(15, y - 7)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

            # Ve Bảng Danh sach Sinh vien Da diem danh o goc tren trai
            cv2.rectangle(frame, (0, 0), (w, 50), (30, 30, 30), -1)
            summary_str = f"DIEM DANH LOP HOC REALTIME | FPS: {fps:.1f} | Da diem danh: {len(attendance_log)} SV"
            cv2.putText(frame, summary_str, (15, 32),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 255), 2)

            if out_video_writer is not None:
                out_video_writer.write(frame)

            cv2.imshow("SIC FaceViT - Camera Giam Sat Diem Danh Lop Hoc", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                print("[User] Nguoi dung thuc hien ket thuc diem danh.")
                break

        cap.release()
        if out_video_writer is not None:
            out_video_writer.release()
            print(f"✅ ĐÃ XUẤT VIDEO MINH CHỨNG THÀNH CÔNG VÀO: {out_vid_path}")

        cv2.destroyAllWindows()

        # Xuat bao cao CSV sau khi ket thuc luong video
        records_list = list(attendance_log.values())
        self.export_csv_report(records_list)

    def process_folder(self, folder_path):
        """
        3. Điểm danh tự động qua Thư mục Folder chứa tất cả ảnh và video của ngày hôm đó.
        """
        folder = Path(folder_path)
        if not folder.exists() or not folder.is_dir():
            print(f"[Loi] Thu muc khong ton tai hoac khong hop le: {folder_path}")
            return

        image_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
        video_extensions = {".mp4", ".avi", ".mov", ".mkv"}

        all_files = sorted(list(folder.iterdir()))
        image_files = [f for f in all_files if f.suffix.lower() in image_extensions]
        video_files = [f for f in all_files if f.suffix.lower() in video_extensions]

        session_dir = PROJECT_ROOT / "outputs" / f"attendance_session_{folder.name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        img_out_dir = session_dir / "annotated_images"
        vid_out_dir = session_dir / "annotated_videos"
        os.makedirs(img_out_dir, exist_ok=True)
        os.makedirs(vid_out_dir, exist_ok=True)

        print(f"\n==================================================")
        print(f"📁 BAT DAU QUET DIEM DANH TOAN BO THU MUC: {folder.name}")
        print(f"   Vị tri: {folder}")
        print(f"   Tim thay: {len(image_files)} tệp anh, {len(video_files)} tệp video")
        print(f"   Thu muc ket qua tong hop: {session_dir}")
        print(f"==================================================\n")

        master_attendance_log = {}
        unregistered_log = []
        file_unknown_counts = {}

        # 1. Quét tất cả các file ảnh trong thư mục
        for img_path in image_files:
            print(f"[Scanning Image] {img_path.name}...")
            img = cv2.imread(str(img_path))
            if img is None:
                continue

            h, w = img.shape[:2]
            boxes = self.detector.detect_faces(img)

            face_matches = []
            for box in boxes:
                _, face_pil = self.detector.crop_face(img, box)
                embedding = self.extract_embedding(face_pil)
                match = self.gallery.identify(embedding)
                face_matches.append({
                    "box": box,
                    "name": match["name"],
                    "distance": match["distance"],
                    "confidence": match["confidence"],
                    "is_known": match["is_known"]
                })

            face_matches.sort(key=lambda item: item["distance"])
            assigned_names = set()
            display_img = img.copy()
            file_unk_cnt = 0

            for item in face_matches:
                box = item["box"]
                x, y, bw, bh = box
                name = item["name"]
                dist = item["distance"]
                conf = item["confidence"]
                is_known = item["is_known"]

                if is_known and name not in assigned_names:
                    assigned_names.add(name)
                    color = (0, 255, 0)
                    label_str = f"{name} ({conf:.1f}%)"

                    if name not in master_attendance_log or conf > master_attendance_log[name]["confidence"]:
                        master_attendance_log[name] = {
                            "name": name,
                            "confidence": conf,
                            "distance": dist,
                            "is_known": True,
                            "timestamp": datetime.now().strftime("%H:%M:%S"),
                            "source": img_path.name
                        }
                else:
                    color = (0, 0, 255)
                    label_str = f"Unknown (d={dist:.2f})"
                    file_unk_cnt += 1
                    unregistered_log.append({
                        "name": "Unknown",
                        "confidence": conf,
                        "distance": dist,
                        "is_known": False,
                        "timestamp": datetime.now().strftime("%H:%M:%S"),
                        "source": img_path.name
                    })

                cv2.rectangle(display_img, (x, y), (x + bw, y + bh), color, 2)
                cv2.rectangle(display_img, (x, max(0, y - 25)), (x + bw, y), color, -1)
                cv2.putText(display_img, label_str, (x + 5, max(15, y - 7)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

            file_unknown_counts[img_path.name] = file_unk_cnt
            cv2.imwrite(str(img_out_dir / f"result_{img_path.name}"), display_img)

        # 2. Quét tất cả các file video trong thư mục và ghi video minh chứng
        for vid_path in video_files:
            print(f"[Scanning Video] {vid_path.name}...")
            cap = cv2.VideoCapture(str(vid_path))
            input_fps = cap.get(cv2.CAP_PROP_FPS)
            input_fps = 20.0 if input_fps <= 0 or np.isnan(input_fps) else input_fps
            frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')

            out_v_path = str(vid_out_dir / f"result_{vid_path.stem}.mp4")
            v_writer = cv2.VideoWriter(out_v_path, fourcc, input_fps, (frame_w, frame_h))
            vid_unk_cnt = 0

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                boxes = self.detector.detect_faces(frame)
                face_matches = []
                for box in boxes:
                    x, y, bw, bh = box
                    if bw < 36 or bh < 36:
                        continue

                    _, face_pil = self.detector.crop_face(frame, box)
                    embedding = self.extract_embedding(face_pil)
                    match = self.gallery.identify(embedding)
                    is_strict_known = match["is_known"] and match["distance"] <= 0.36

                    face_matches.append({
                        "box": box,
                        "name": match["name"],
                        "distance": match["distance"],
                        "confidence": match["confidence"],
                        "is_known": is_strict_known
                    })

                face_matches.sort(key=lambda item: item["distance"])
                assigned_names = set()
                frame_unk = 0

                for item in face_matches:
                    box = item["box"]
                    x, y, bw, bh = box
                    name = item["name"]
                    dist = item["distance"]
                    conf = item["confidence"]
                    is_known = item["is_known"]

                    if is_known and name not in assigned_names:
                        assigned_names.add(name)
                        color = (0, 255, 0)
                        label_str = f"{name} ({conf:.1f}%)"
                        if name not in master_attendance_log or conf > master_attendance_log[name]["confidence"]:
                            master_attendance_log[name] = {
                                "name": name,
                                "confidence": conf,
                                "distance": dist,
                                "is_known": True,
                                "timestamp": datetime.now().strftime("%H:%M:%S"),
                                "source": vid_path.name
                            }
                    else:
                        color = (0, 0, 255)
                        label_str = f"Unknown (d={dist:.2f})"
                        frame_unk += 1

                    cv2.rectangle(frame, (x, y), (x + bw, y + bh), color, 2)
                    cv2.rectangle(frame, (x, max(0, y - 25)), (x + bw, y), color, -1)
                    cv2.putText(frame, label_str, (x + 5, max(15, y - 7)),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

                vid_unk_cnt = max(vid_unk_cnt, frame_unk)
                if v_writer is not None:
                    v_writer.write(frame)

            cap.release()
            if v_writer is not None:
                v_writer.release()
                print(f"   ✅ Đã lưu Video Minh chứng: {out_v_path}")

            file_unknown_counts[vid_path.name] = vid_unk_cnt

        # Loc trung lap nguoi la: Lay duy nhat so luong nguoi la DINH CAO (Peak Unregistered Count) trong 1 tep
        # Tránh viec 21 nguoi la o anh 1 + 20 nguoi la o anh 2 bi nhan doi len 41!
        peak_unknown_log = []
        if file_unknown_counts:
            max_unknown_peak = max(file_unknown_counts.values())
            unregistered_log.sort(key=lambda x: x["distance"])
            peak_unknown_log = unregistered_log[:max_unknown_peak]

        # 3. Xuất Báo cáo CSV Tổng hợp duy nhất vào thẳng thư mục Session
        all_records = list(master_attendance_log.values()) + peak_unknown_log
        summary_filename = str(session_dir / f"attendance_summary_{folder.name}.csv")
        self.export_csv_report(all_records, report_filename=summary_filename)

        print(f"\n==================================================")
        print(f"📊 BÁO CÁO TỔNG HỢP ĐIỂM DANH TOÀN BỘ THƯ MỤC: {folder.name}")
        print(f"   Gom chung toàn bộ tệp vào duy nhất 1 Thư mục Session:")
        print(f"   📍 {session_dir}")
        print(f"   - File Báo cáo CSV: {summary_filename}")
        print(f"   - Thư mục Ảnh quét: {img_out_dir}")
        print(f"   Tổng số sinh viên CÓ MẶT: {len(master_attendance_log)} SV")
        print(f"==================================================\n")


def main():
    parser = argparse.ArgumentParser(description="SIC FaceViT Classroom Student Attendance System")
    parser.add_argument("--experiment_name", type=str, default="sic_facevit_infonce_v2")
    parser.add_argument("--threshold", type=float, default=0.42, help="Real-time threshold (mac dinh 0.42)")
    parser.add_argument("--use_onnx", action="store_true", help="Chay bang ONNX Runtime Engine")
    parser.add_argument("--image", type=str, default=None, help="Duong dan file anh tap the lop hoc (--image classroom.jpg)")
    parser.add_argument("--video", type=str, default=None, help="Duong dan file video stream camera lop hoc (--video class.mp4)")
    parser.add_argument("--folder", type=str, default=None, help="Duong dan thu muc chua tat ca anh va video cua ngay hoc (--folder path/to/day_folder)")
    parser.add_argument("--webcam", action="store_true", help="Diem danh webcam camera truc tiep")

    args = parser.parse_args()

    app = ClassroomAttendanceSystem(
        experiment_name=args.experiment_name,
        threshold=args.threshold,
        use_onnx=args.use_onnx
    )

    if args.folder:
        app.process_folder(args.folder)
    elif args.image:
        app.process_image(args.image)
    elif args.video:
        app.process_video(args.video)
    elif args.webcam:
        app.process_video(0)
    else:
        print("[HD] Vui long cung cap 1 trong cac tham so:")
        print("  --folder path/to/day_folder     (Diem danh tu dong toan bo thu muc anh & video)")
        print("  --image path/to/classroom.jpg   (Diem danh qua 1 file anh tap the)")
        print("  --video path/to/class_video.mp4 (Diem danh qua 1 file video stream)")
        print("  --webcam                        (Diem danh qua webcam truc tiep)")


if __name__ == "__main__":
    main()
