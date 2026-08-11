import os
import cv2
import numpy as np
from PIL import Image


class FaceDetector:
    """
    Module Phat hien va Crop khuon mat (Face Detection & Alignment Pipeline)
    Su dung OpenCV Haar Cascade / YuNet nhe, toc do cao, phat hien nhieu khuon mat
    tren khung hinh realtime.
    """

    def __init__(self, min_face_size=(40, 40), scale_factor=1.1, min_neighbors=5):
        """
        Khoi tao FaceDetector voi OpenCV Cascade.
        """
        self.min_face_size = min_face_size
        self.scale_factor = scale_factor
        self.min_neighbors = min_neighbors

        # Tim va nap file cascade xml cua OpenCV
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        if not os.path.exists(cascade_path):
            raise FileNotFoundError(f"Khong tim thay file haarcascade tại: {cascade_path}")

        self.detector = cv2.CascadeClassifier(cascade_path)
        print(f"[Detector] Da khoi tao OpenCV Face Detector tu: {cascade_path}")

    def detect_faces(self, image):
        """
        Phat hien tat ca cac khuon mat trong mot buc anh hoac frame camera.
        :param image: numpy array BGR (cv2 frame) hoac PIL Image hoac string path
        :return: list cac bounding box [(x, y, w, h), ...]
        """
        if isinstance(image, str):
            image = cv2.imread(image)
        elif isinstance(image, Image.Image):
            image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

        if image is None:
            return []

        # Chuyen anh sang xam đe phat hien nhanh hon
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray) # Tăng tuong phan xam

        # Phat hien bounding box
        faces = self.detector.detectMultiScale(
            gray,
            scaleFactor=self.scale_factor,
            minNeighbors=self.min_neighbors,
            minSize=self.min_face_size,
        )

        return list(faces)

    def crop_face(self, image, box, padding=0.15, target_size=(224, 224)):
        """
        Crop khuon mat tu bounding box (x, y, w, h) voi padding goc va resize ve target_size.
        :param image: numpy array BGR
        :param box: tuple (x, y, w, h)
        :param padding: Ty le mo rong box (15% padding xung quanh tran va cam)
        :param target_size: Kich thuoc anh dau ra (224, 224)
        :return: (cropped_face_bgr, cropped_face_pil)
        """
        if isinstance(image, Image.Image):
            image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

        h_img, w_img = image.shape[:2]
        x, y, w, h = box

        # Tinh toán padding xung quanh khuon mat
        pad_w = int(w * padding)
        pad_h = int(h * padding)

        x1 = max(0, x - pad_w)
        y1 = max(0, y - pad_h)
        x2 = min(w_img, x + w + pad_w)
        y2 = min(h_img, y + h + pad_h)

        # Crop vung khuon mat
        face_crop = image[y1:y2, x1:x2]

        if face_crop.size == 0:
            face_crop = image[y : y + h, x : x + w]

        # Resize ve target_size (224x224)
        face_resized_bgr = cv2.resize(face_crop, target_size, interpolation=cv2.INTER_CUBIC)
        face_resized_rgb = cv2.cvtColor(face_resized_bgr, cv2.COLOR_BGR2RGB)
        face_pil = Image.fromarray(face_resized_rgb)

        return face_resized_bgr, face_pil


if __name__ == "__main__":
    print("=== TESTING FACE DETECTOR MODULE ===")
    detector = FaceDetector()

    # Tạo mot khung hinh synthetic test
    test_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.rectangle(test_frame, (100, 100), (300, 300), (255, 255, 255), -1)

    boxes = detector.detect_faces(test_frame)
    print(f"Phat hien duoc {len(boxes)} khuon mat trong anh test.")
