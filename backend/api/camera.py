"""
Camera API endpoints
Handles camera detection and WebRTC streaming
"""

from fastapi import APIRouter, HTTPException
from typing import List
import sys
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.core.auth.camera import get_available_cameras
from backend.models.auth import CameraInfo

router = APIRouter()

@router.get("/available", response_model=List[CameraInfo])
async def get_cameras():
    """Get list of available cameras."""
    try:
        camera_indices = get_available_cameras()
        cameras = []
        
        for i, index in enumerate(camera_indices):
            cameras.append(CameraInfo(
                index=index,
                name=f"Camera {index}",
                available=True
            ))
        
        return cameras
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cameras: {str(e)}")

@router.get("/test/{camera_index}")
async def test_camera(camera_index: int):
    """Test if a specific camera is working."""
    try:
        import cv2
        cap = cv2.VideoCapture(camera_index)
        
        if not cap.isOpened():
            return {"available": False, "error": "Camera not accessible"}
        
        ret, frame = cap.read()
        cap.release()
        
        if not ret:
            return {"available": False, "error": "Failed to capture frame"}
        
        return {
            "available": True,
            "index": camera_index,
            "resolution": f"{frame.shape[1]}x{frame.shape[0]}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Camera test failed: {str(e)}") 