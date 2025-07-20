import cv2

def get_available_cameras():
    """Get a list of available camera indices."""
    index = 0
    arr = []
    while True:
        cap = cv2.VideoCapture(index)
        if not cap.read()[0]:
            break
        else:
            arr.append(index)
        cap.release()
        index += 1
    return arr

def open_camera(camera_index: int = 0):
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        raise RuntimeError("Could not open webcam")
    return cap


def capture_frame(cap: cv2.VideoCapture):
    """Capture a single frame from an opened webcam."""
    ret, frame = cap.read()
    if not ret:
        raise RuntimeError("Failed to read frame from webcam")
    return frame


def release_camera(cap: cv2.VideoCapture):
    """Release webcam resources cleanly."""
    cap.release()
    cv2.destroyAllWindows() 