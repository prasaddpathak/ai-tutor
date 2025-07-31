"""
Authentication API endpoints
Handles face recognition login and registration
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
import cv2
import numpy as np
import io
import base64
from PIL import Image
import sys
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.core.auth.face_auth import register_face, authenticate
from backend.core.database import db
from backend.models.auth import RegisterRequest, AuthResponse, StudentResponse

router = APIRouter()

def decode_base64_image(base64_string: str) -> np.ndarray:
    """Decode base64 image string to numpy array."""
    try:
        # Remove data URL prefix if present
        if 'base64,' in base64_string:
            base64_string = base64_string.split('base64,')[1]
        
        # Decode base64 to bytes
        image_bytes = base64.b64decode(base64_string)
        
        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if needed
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        
        # Convert to numpy array
        image_array = np.array(pil_image)
        
        return image_array
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

@router.post("/register", response_model=AuthResponse)
async def register_student(
    name: str = Form(...),
    image_data: str = Form(..., description="Base64 encoded image data")
):
    """Register a new student with face recognition."""
    try:
        # Check if student already exists
        existing_student = db.get_student_by_name(name)
        if existing_student:
            raise HTTPException(status_code=400, detail=f"Student '{name}' already exists")
        
        # Decode image data
        frame = decode_base64_image(image_data)
        
        # Register face
        register_face(name, frame)
        
        # Create student in database (no difficulty level needed)
        student_id = db.create_student(name)
        student = db.get_student_by_name(name)
        
        return AuthResponse(
            success=True,
            message=f"Successfully registered {name}",
            student=StudentResponse(**student)
        )
        
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.post("/login", response_model=AuthResponse)
async def login_student(
    image_data: str = Form(..., description="Base64 encoded image data")
):
    """Authenticate student with face recognition."""
    try:
        # Decode image data
        frame = decode_base64_image(image_data)
        
        # Authenticate face
        name = authenticate(frame)
        
        # Get student from database
        student = db.get_student_by_name(name)
        if not student:
            raise HTTPException(status_code=404, detail="Student not found in database")
        
        # Update last login
        db.update_student_login(student['id'])
        
        # Get updated student data
        updated_student = db.get_student_by_name(name)
        
        return AuthResponse(
            success=True,
            message=f"Welcome back, {name}!",
            student=StudentResponse(**updated_student)
        )
        
    except RuntimeError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")

@router.get("/validate/{student_name}")
async def validate_student(student_name: str):
    """Check if a student exists in the system."""
    student = db.get_student_by_name(student_name)
    return {
        "exists": student is not None,
        "student": StudentResponse(**student) if student else None
    } 