
from backend.core.auth.face_db import save_encoding, load_all_encodings
from backend.core.auth.face_detector import FaceDetector
import numpy as np
from skimage.metrics import structural_similarity as ssim

# Stricter tolerance for better security
_DEF_TOLERANCE = 0.85  # Adjusted for HOG embeddings
_DUPLICATE_THRESHOLD = 0.95  # Adjusted for HOG embeddings

def _calculate_similarity(emb1, emb2):
    """Calculate similarity between two HOG embeddings."""
    # Using cosine similarity, where higher is better
    return np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))

def _check_for_duplicate_face(new_encoding, existing_names, existing_encodings):
    """Check if this face is already registered. Returns (is_duplicate, existing_name)."""
    if existing_encodings.size == 0:
        return False, None
    
    for i, existing_encoding in enumerate(existing_encodings):
        similarity = _calculate_similarity(new_encoding, existing_encoding)
        if similarity > _DUPLICATE_THRESHOLD:
            return True, existing_names[i]
    
    return False, None

def register_face(name: str, frame) -> None:
    """Capture a single face and store its encoding under the given name."""
    existing_names, existing_encodings = load_all_encodings()
    
    if name in existing_names:
        raise RuntimeError(f"Student '{name}' is already registered.")
    
    detector = FaceDetector()
    try:
        faces = detector.detect_faces(frame)
        
        if len(faces) == 0:
            raise RuntimeError("No face detected. Please ensure your face is clearly visible.")
        if len(faces) > 1:
            raise RuntimeError("Multiple faces detected. Only one person at a time.")
            
        new_encoding = detector.extract_face_embedding(frame, faces)
        if new_encoding is None:
            raise RuntimeError("Could not extract face features. Please try again.")

        is_duplicate, existing_name = _check_for_duplicate_face(new_encoding, existing_names, existing_encodings)
        if is_duplicate:
            raise RuntimeError(f"This face is already registered as '{existing_name}'.")
        
        save_encoding(name, new_encoding)
        print(f"Successfully registered unique face for {name}")
                
    except Exception as e:
        raise e

def authenticate(frame, tolerance: float = _DEF_TOLERANCE) -> str:
    """Authenticate a face against registered encodings."""
    names, known_encodings = load_all_encodings()
    if not names:
        raise RuntimeError("No registered students found. Please register first.")

    detector = FaceDetector()
    try:
        faces = detector.detect_faces(frame)
        
        if len(faces) == 0:
            raise RuntimeError("No face detected. Please ensure your face is clearly visible.")
        if len(faces) > 1:
            raise RuntimeError("Multiple faces detected. Only one person at a time.")

        unknown_encoding = detector.extract_face_embedding(frame, faces)
        if unknown_encoding is None:
            raise RuntimeError("Could not extract face features. Please try again.")
        
        similarities = [_calculate_similarity(unknown_encoding, known) for known in known_encodings]
        
        if not similarities:
            raise RuntimeError("Authentication failed. No known faces to compare against.")

        max_similarity = np.max(similarities)
        best_match_idx = np.argmax(similarities)
        
        if max_similarity >= tolerance:
            authenticated_name = names[best_match_idx]
            print(f"AUTHENTICATED: {authenticated_name} with similarity {max_similarity:.2f}")
            return authenticated_name
        else:
            print(f"AUTHENTICATION FAILED: Best match similarity {max_similarity:.2f} < threshold {tolerance}")
            raise RuntimeError("Face not registered. Access denied.")
            
    except Exception as e:
        raise e 