import numpy as np
from pathlib import Path

EMBED_DIR = Path("face_embeddings")
EMBED_DIR.mkdir(exist_ok=True)

def save_encoding(name: str, encoding: np.ndarray):
    """Save a face encoding as a .npy file under the given name."""
    np.save(EMBED_DIR / f"{name}.npy", encoding)

def load_all_encodings():
    """Return list of names and stacked encodings array."""
    names = []
    encodings = []
    for file in EMBED_DIR.glob("*.npy"):
        names.append(file.stem)
        encodings.append(np.load(file))
    if encodings:
        return names, np.vstack(encodings)
    return names, np.array([])