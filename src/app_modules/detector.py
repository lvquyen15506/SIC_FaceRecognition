import os
import urllib.request
import cv2
import numpy as np
from PIL import Image


class FaceDetector:
    """
    Module Phat hien va Crop khuon mat (SOTA Face Detection Pipeline)
    Su dung OpenCV YuNet (Deep Learning Face Detector), phat hien va crop
    khuon mat chinh xac tuyet doi voi toc do cao realtime.
    """

    def __init__(self, score_threshold=0.6, nms_threshold=0.3, target_size=(320, 320)):
        self.score_threshold = score_threshold
        self.nms_threshold = nms_threshold
        self.target_size = target_size

        # 1. Duong dan cu te toi file YuNet ONNX
        local_data_dir = os.path.join(os.path.dirname(__file__), "data")
        os.makedirs(local_data_dir, exist_ok=True)
        yunet_path = os.path.join(local_data_dir, "face_detection_yunet_2023mar.onnx")

        # 2. Neu chua co model, tu dong tai YuNet tu GitHub OpenCV Zoo
        if not os.path.exists(yunet_path):
            print("[Detector] Dang tu dong tai SOTA YuNet Face Detector model...")
            url = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
            try:
                urllib.request.urlretrieve(url, yunet_path)
                print(f"[Detector] Da tai thanh cong YuNet model vao: {yunet_path}")
            except Exception as e:
                raise RuntimeError(f"Khong thê tai model YuNet: {e}")

        # 3. Khoi tao OpenCV YuNet Detector
        self.detector = cv2.FaceDetectorYN.create(
            model=yunet_path,
            config="",
            input_size=self.target_size,
            score_threshold=self.score_threshold,
            nms_threshold=self.nms_threshold,
            top_k=5000,
        )
        print(f"[Detector] Da khoi tao OpenCV YuNet Face Detector tu: {yunet_path}")

    def detect_faces(self, image):
        """
        Phat hien tat ca khuon mat trong buc anh hoac frame camera.
        :param image: numpy array BGR (cv2 frame) hoac PIL Image hoac string path
        :return: list cac bounding box [(x, y, w, h), ...]
        """
        if isinstance(image, str):
            image = cv2.imread(image)
        elif isinstance(image, Image.Image):
            image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

        if image is None:
            return []

        h, w = image.shape[:2]
        self.detector.setInputSize((w, h))

        # Perform YuNet Face Detection
        _, faces = self.detector.detect(image)

        boxes = []
        if faces is not None:
            for face in faces:
                # YuNet Format: [x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rc, y_rc, x_lc, y_lc, score]
                x, y, box_w, box_h = int(face[0]), int(face[1]), int(face[2]), int(face[3])
                boxes.append((x, y, box_w, box_h))

        return boxes

    def detect_faces_with_landmarks(self, image):
        """
        Phat hien tat ca khuon mat va tra ve ca bounding box va 5 facial landmarks YuNet.
        :return: list dict [{'box': (x,y,w,h), 'landmarks': [(x_re,y_re), (x_le,y_le), (x_nt,y_nt), (x_rc,y_rc), (x_lc,y_lc)], 'score': float}, ...]
        """
        if isinstance(image, str):
            image = cv2.imread(image)
        elif isinstance(image, Image.Image):
            image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

        if image is None:
            return []

        h, w = image.shape[:2]
        self.detector.setInputSize((w, h))

        _, faces = self.detector.detect(image)

        results = []
        if faces is not None:
            for face in faces:
                x, y, box_w, box_h = int(face[0]), int(face[1]), int(face[2]), int(face[3])
                landmarks = [
                    (int(face[4]), int(face[5])),    # Mắt phải
                    (int(face[6]), int(face[7])),    # Mắt trái
                    (int(face[8]), int(face[9])),    # Đỉnh mũi
                    (int(face[10]), int(face[11])),  # Miệng phải
                    (int(face[12]), int(face[13]))   # Miệng trái
                ]
                results.append({
                    "box": (x, y, box_w, box_h),
                    "landmarks": landmarks,
                    "score": float(face[14])
                })

        return results

    def check_lighting_quality(self, face_bgr):
        """
        Kiem tra danh gia chat luong anh sang khuon mat.
        :return: (is_good: bool, mean_brightness: float, status_msg: str)
        """
        gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
        mean_brightness = float(np.mean(gray))

        if mean_brightness < 40.0:
            return False, mean_brightness, "ANH QUA TOI! Vui long bat them den."
        elif mean_brightness > 220.0:
            return False, mean_brightness, "ANH QUA SANG! Vui long tranh anh sang chieu truc tiep."
        else:
            return True, mean_brightness, "Anh sang dat tieu chuan"

    def crop_face(self, image, box, padding=0.15, target_size=(224, 224), enhance_light=True):
        """
        Crop khuon mat tu bounding box (x, y, w, h) voi padding goc va resize ve target_size.
        Tu dong can bang anh sang bang thuat toan CLAHE.
        """
        if isinstance(image, Image.Image):
            image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

        h_img, w_img = image.shape[:2]
        x, y, w, h = box

        pad_w = int(w * padding)
        pad_h = int(h * padding)

        x1 = max(0, x - pad_w)
        y1 = max(0, y - pad_h)
        x2 = min(w_img, x + w + pad_w)
        y2 = min(h_img, y + h + pad_h)

        face_crop = image[y1:y2, x1:x2]

        if face_crop.size == 0:
            face_crop = image[max(0, y) : min(h_img, y + h), max(0, x) : min(w_img, x + w)]

        face_resized_bgr = cv2.resize(face_crop, target_size, interpolation=cv2.INTER_CUBIC)

        if enhance_light:
            # Tu dong can bang anh sang toi/sang bang CLAHE tren kenh Y (Luminance)
            ycrcb = cv2.cvtColor(face_resized_bgr, cv2.COLOR_BGR2YCrCb)
            y_chan, cr, cb = cv2.split(ycrcb)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            y_eq = clahe.apply(y_chan)
            ycrcb_eq = cv2.merge((y_eq, cr, cb))
            face_resized_bgr = cv2.cvtColor(ycrcb_eq, cv2.COLOR_YCrCb2BGR)

        face_resized_rgb = cv2.cvtColor(face_resized_bgr, cv2.COLOR_BGR2RGB)
        face_pil = Image.fromarray(face_resized_rgb)

        return face_resized_bgr, face_pil


if __name__ == "__main__":
    print("=== TESTING YUNET FACE DETECTOR MODULE ===")
    detector = FaceDetector()

    test_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.rectangle(test_frame, (100, 100), (300, 300), (255, 255, 255), -1)

    boxes = detector.detect_faces(test_frame)
    print(f"Phat hien duoc {len(boxes)} khuon mat trong anh test.")
