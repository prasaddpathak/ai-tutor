
import cv2
import numpy as np
from pathlib import Path

class FaceDetector:
    def __init__(self):
        # Use a pre-trained Haar Cascade model for face detection
        model_path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
        self.face_cascade = cv2.CascadeClassifier(str(model_path))

    def detect_faces(self, frame):
        gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(100, 100)
        )
        return faces

    def extract_face_embedding(self, frame, faces):
        if len(faces) != 1:
            return None
        
        x, y, w, h = faces[0]
        face_roi = frame[y:y+h, x:x+w]
        
        # Use a simple and robust embedding technique
        gray_face = cv2.cvtColor(face_roi, cv2.COLOR_RGB2GRAY)
        
        # Resize to a dimension compatible with HOG parameters
        resized_face = cv2.resize(gray_face, (96, 96))
        
        # Define HOG parameters compatible with the 96x96 image size
        win_size = (96, 96)
        block_size = (16, 16)
        block_stride = (8, 8)
        cell_size = (8, 8)
        nbins = 9
        
        hog = cv2.HOGDescriptor(win_size, block_size, block_stride, cell_size, nbins)
        embedding = hog.compute(resized_face)
        
        return embedding.flatten()
