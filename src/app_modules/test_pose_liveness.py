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
from app_modules.detector import FaceDetector


def estimate_head_pose(landmarks):
    """
    Uoc luong goc quay 3D cua dau dua tren 5 diem moc YuNet:
      landmarks: [right_eye, left_eye, nose, right_mouth, left_mouth]
    :return: (pose_str, yaw_ratio, pitch_ratio)
    """
    re, le, nose, rm, lm = landmarks

    # 1. Tinh khoang cach tu Mui toi 2 Mat (Kiem tra Quay Trái / Phai - Yaw)
    d_right_eye = math.hypot(nose[0] - re[0], nose[1] - re[1])
    d_left_eye = math.hypot(nose[0] - le[0], nose[1] - le[1])
    yaw_ratio = d_left_eye / (d_right_eye + 1e-6)

    # 2. Tinh trung diem Mat va Mieng (Kiem tra Nguoc / Cui - Pitch)
    eyes_y = (re[1] + le[1]) / 2.0
    mouth_y = (rm[1] + lm[1]) / 2.0
    d_nose_eyes = nose[1] - eyes_y
    d_nose_mouth = mouth_y - nose[1]
    pitch_ratio = d_nose_eyes / (d_nose_mouth + 1e-6)

    # Xac dinh tư the voi nguong tu nhiên (Calibrated thresholds):
    if yaw_ratio < 0.70:
        pose = "QUAY TRAI"
    elif yaw_ratio > 1.40:
        pose = "QUAY PHAI"
    elif pitch_ratio < 0.45:
        pose = "NGUOC LEN"
    elif pitch_ratio > 1.15:
        pose = "CUI XUONG"
    else:
        pose = "NHIN THANG"

    return pose, yaw_ratio, pitch_ratio


def run_pose_test():
    print("=== TEST MO HINH EKYC LIVENESS & HEAD POSE ESTIMATION ===")
    print("Mô hinh se yeu cau ban thuc hien chuoi hanh dong eKYC:")
    print("  1. Nhin thang -> 2. Quay Trai -> 3. Quay Phai -> 4. Nguoc Len")
    print("Bấm phím 'q' de thoat.\n")

    detector = FaceDetector()
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("[Loi] Khong the mo Webcam.")
        return

    # Chuoi Thach thuc eKYC (Challenge sequence)
    challenges = [
        {"action": "NHIN THANG", "instruction": "1/4: VOI LONG NHIN THANG VAO CAMERA"},
        {"action": "QUAY TRAI",  "instruction": "2/4: VOI LONG QUAY DAU SANG TRAI"},
        {"action": "QUAY PHAI",  "instruction": "3/4: VOI LONG QUAY DAU SANG PHAI"},
        {"action": "NGUOC LEN",  "instruction": "4/4: VOI LONG NGUOC CAM LEN TREN"},
    ]

    current_step = 0
    step_start_time = time.time()
    completed_time = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Lat anh ngang de tao hieu ung guong soi tu nhien (Mirror Effect)
        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]

        results = detector.detect_faces_with_landmarks(frame)

        # Ve Thanh Header huong dan eKYC
        cv2.rectangle(frame, (0, 0), (w, 60), (30, 30, 30), -1)

        if completed_time is not None:
            # Da hoan thanh tat ca thach thuc!
            cv2.rectangle(frame, (0, 0), (w, 60), (0, 180, 0), -1)
            cv2.putText(frame, "EKYC SUCCESS: XAC THUC NGUOI THAT THANH CONG! (LIVE HUMAN)", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        else:
            target = challenges[current_step]
            cv2.putText(frame, target["instruction"], (20, 38),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

        if len(results) > 0:
            # Lay khuon mat lon nhat
            largest_face = max(results, key=lambda f: f["box"][2] * f["box"][3])
            box = largest_face["box"]
            landmarks = largest_face["landmarks"]

            x, y, bw, bh = box
            pose, yaw_r, pitch_r = estimate_head_pose(landmarks)

            # Ve Bounding box
            box_color = (0, 255, 0) if (completed_time or pose == challenges[current_step]["action"]) else (0, 165, 255)
            cv2.rectangle(frame, (x, y), (x + bw, y + bh), box_color, 2)

            # Ve 5 diem moc Facial Landmarks YuNet: [Mắt Phải (Màu Đỏ), Mắt Trái (Màu Xanh), Mũi (Vàng), Miệng]
            colors = [(0, 0, 255), (255, 0, 0), (0, 255, 255), (0, 255, 0), (0, 255, 0)]
            for pt, color in zip(landmarks, colors):
                cv2.circle(frame, pt, 5, color, -1)

            # Hien thi Tu the va Chi so thuc te tren man hinh
            label_text = f"Tu the: {pose} (yaw={yaw_r:.2f}, pitch={pitch_r:.2f})"
            cv2.putText(frame, label_text, (x, max(30, y - 10)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

            # Kiem tra xem nguoi dung da lam dung hanh dong thach thuc chua
            if completed_time is None:
                target_action = challenges[current_step]["action"]
                if pose == target_action:
                    cv2.putText(frame, "OK!", (x + bw - 60, y - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

                    # Chuyen sang buoc tiep theo ngay lap tuc (0.2s hold)
                    if time.time() - step_start_time >= 0.2:
                        current_step += 1
                        step_start_time = time.time()
                        if current_step >= len(challenges):
                            completed_time = time.time()
                else:
                    step_start_time = time.time()

        cv2.imshow("Test eKYC Head Pose Estimation & Liveness", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    run_pose_test()
