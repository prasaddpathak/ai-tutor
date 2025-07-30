"""
Students API endpoints
Handles student management and progress tracking
"""

from fastapi import APIRouter, HTTPException
from typing import List
import sys
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.core.database import db
from backend.models.auth import StudentResponse
from backend.models.curriculum import (
    StudentProgress, UpdateProgressRequest, PageProgress, UpdatePageProgressRequest,
    ChapterProgressSummary, TopicProgressSummary, SubjectProgressSummary,
    ProgressAnalyticsRequest
)

router = APIRouter()

@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(student_id: int):
    """Get student by ID."""
    try:
        # Get student by ID first to validate existence
        # Since our current db only has get_student_by_name, we'll need to add this method
        # For now, let's get all students and find by ID
        students = db.get_connection().execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
        if not students:
            raise HTTPException(status_code=404, detail="Student not found")
        
        student_dict = dict(students)
        return StudentResponse(**student_dict)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get student: {str(e)}")

@router.get("/{student_id}/progress")
async def get_progress(student_id: int):
    """Get unified progress for a student (subject, topic, chapter, page, all at once)."""
    try:
        progress = db.get_unified_progress(student_id)
        return progress
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get unified progress: {str(e)}")

@router.post("/{student_id}/progress/update")
async def update_progress(student_id: int, progress: dict):
    """Update any progress (subject, topic, chapter, page) for a student."""
    try:
        db.save_unified_progress(student_id, progress)
        return {"message": "Progress updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update progress: {str(e)}")
