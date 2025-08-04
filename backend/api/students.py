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
from backend.models.auth import StudentResponse, UpdateLanguageRequest
from backend.models.curriculum import StudentProgress, UpdateProgressRequest

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

@router.get("/{student_id}/progress", response_model=List[StudentProgress])
async def get_student_progress(student_id: int, subject_id: int = None):
    """Get student progress, optionally filtered by subject."""
    try:
        progress = db.get_student_progress(student_id, subject_id)
        return [StudentProgress(**p) for p in progress]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get progress: {str(e)}")

@router.post("/{student_id}/progress")
async def update_student_progress(
    student_id: int, 
    subject_id: int,
    progress_data: UpdateProgressRequest
):
    """Update student progress for a chapter."""
    try:
        db.save_student_progress(
            student_id=student_id,
            subject_id=subject_id,
            topic=progress_data.topic,
            chapter=progress_data.chapter,
            completed=progress_data.completed,
            quiz_score=progress_data.quiz_score
        )
        
        return {"message": "Progress updated successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update progress: {str(e)}")

@router.put("/{student_id}/language")
async def update_student_language(student_id: int, language_data: UpdateLanguageRequest):
    """Update student's language preference."""
    try:
        # Verify student exists
        student = db.get_connection().execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Update language preference
        db.update_student_language(student_id, language_data.language_preference)
        
        return {"message": "Language preference updated successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update language: {str(e)}")

@router.get("/{student_id}/dashboard")
async def get_student_dashboard(student_id: int):
    """Get dashboard data for student including progress summary."""
    try:
        with db.get_connection() as conn:
            # Get student info
            student = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
            if not student:
                raise HTTPException(status_code=404, detail="Student not found")
            
            # Get overall progress stats
            progress_stats = conn.execute("""
                SELECT 
                    COUNT(*) as total_chapters,
                    SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_chapters,
                    AVG(quiz_score) as avg_quiz_score,
                    COUNT(DISTINCT subject_id) as subjects_started
                FROM student_progress 
                WHERE student_id = ?
            """, (student_id,)).fetchone()
            
            # Get recent activity
            recent_activity = conn.execute("""
                SELECT sp.*, s.name as subject_name 
                FROM student_progress sp
                JOIN subjects s ON sp.subject_id = s.id
                WHERE sp.student_id = ?
                ORDER BY sp.created_at DESC
                LIMIT 5
            """, (student_id,)).fetchall()
            
            # Get subject-wise progress
            subject_progress = conn.execute("""
                SELECT 
                    s.name as subject_name,
                    s.id as subject_id,
                    COUNT(sp.id) as total_chapters,
                    SUM(CASE WHEN sp.completed = 1 THEN 1 ELSE 0 END) as completed_chapters,
                    AVG(sp.quiz_score) as avg_score
                FROM subjects s
                LEFT JOIN student_progress sp ON s.id = sp.subject_id AND sp.student_id = ?
                GROUP BY s.id, s.name
                ORDER BY s.name
            """, (student_id,)).fetchall()
            
            return {
                "student": StudentResponse(**dict(student)),
                "stats": dict(progress_stats) if progress_stats else {},
                "recent_activity": [dict(row) for row in recent_activity],
                "subject_progress": [dict(row) for row in subject_progress]
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard: {str(e)}") 