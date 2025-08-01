"""
Subjects API endpoints
Handles curriculum management and LLM content generation
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel
from typing import List, Dict
import sys
from pathlib import Path
import asyncio
from datetime import datetime

# Import from backend core modules
from backend.core.database import db
from backend.core.curriculum.curriculum_service import generate_topics, generate_chapters, generate_subject_recommendations
from backend.models.curriculum import (
    Subject, Topic, Chapter, GenerateTopicsRequest, GenerateChaptersRequest,
    SetSubjectDifficultyRequest, SubjectDifficultyResponse, DIFFICULTY_LEVELS
)

router = APIRouter()

# User-specific generated content storage (no expiration)
user_generated_content: Dict[str, any] = {
    "topics": {},  # Format: f"{student_id}_{subject_name}_{difficulty_level}"
    "chapters": {},  # Format: f"{student_id}_{subject_name}_{topic_title}_{difficulty_level}"
    "generation_status": {}
}

def get_user_content_key(student_id: int, subject_name: str, difficulty_level: str, topic_title: str = None) -> str:
    """Generate user-specific content key."""
    if topic_title:
        return f"{student_id}_{subject_name}_{topic_title}_{difficulty_level}"
    return f"{student_id}_{subject_name}_{difficulty_level}"

@router.get("/", response_model=List[Subject])
async def get_all_subjects(student_id: int = Query(None, description="Student ID to include difficulty levels")):
    """Get all available subjects, optionally with student-specific difficulty levels."""
    try:
        if student_id:
            subjects = db.get_subjects_with_difficulty(student_id)
        else:
            subjects = db.get_all_subjects()
        return [Subject(**subject) for subject in subjects]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get subjects: {str(e)}")

@router.post("/difficulty")
async def set_subject_difficulty(
    student_id: int = Query(..., description="Student ID"),
    request: SetSubjectDifficultyRequest = None
):
    """Set difficulty level for a student's subject."""
    try:
        # Validate difficulty level
        if request.difficulty_level not in DIFFICULTY_LEVELS:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid difficulty level. Must be one of: {DIFFICULTY_LEVELS}"
            )
        
        # Set the difficulty level
        db.set_student_subject_difficulty(student_id, request.subject_id, request.difficulty_level)
        
        return {
            "success": True,
            "message": f"Difficulty level set to {request.difficulty_level}",
            "student_id": student_id,
            "subject_id": request.subject_id,
            "difficulty_level": request.difficulty_level
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set difficulty: {str(e)}")

@router.get("/difficulty/{subject_id}")
async def get_subject_difficulty(
    subject_id: int,
    student_id: int = Query(..., description="Student ID")
):
    """Get difficulty level for a student's subject."""
    try:
        difficulty = db.get_student_subject_difficulty(student_id, subject_id)
        
        if not difficulty:
            return {
                "student_id": student_id,
                "subject_id": subject_id,
                "difficulty_level": None,
                "is_set": False
            }
        
        return {
            "student_id": student_id,
            "subject_id": subject_id,
            "difficulty_level": difficulty,
            "is_set": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get difficulty: {str(e)}")

@router.get("/difficulty-levels")
async def get_difficulty_levels():
    """Get all available difficulty levels."""
    return {
        "levels": DIFFICULTY_LEVELS,
        "descriptions": {
            "Foundation": "Basic concepts, perfect for beginners",
            "Intermediate": "Building on fundamentals, moderate complexity",
            "Advanced": "Complex topics, requires solid background",
            "Expert": "Professional/academic level, most challenging"
        }
    }

@router.get("/{subject_id}/topics")
async def get_topics(
    subject_id: int, 
    student_id: int = Query(..., description="Student ID for user-specific content"),
    force_regenerate: bool = Query(False, description="Force regenerate content")
):
    """Get or generate topics for a subject for a specific student."""
    try:
        # Get subject info
        with db.get_connection() as conn:
            subject = conn.execute("SELECT * FROM subjects WHERE id = ?", (subject_id,)).fetchone()
            if not subject:
                raise HTTPException(status_code=404, detail="Subject not found")
        
        subject_dict = dict(subject)
        
        # Get difficulty level for this student-subject combination
        difficulty_level = db.get_student_subject_difficulty(student_id, subject_id)
        if not difficulty_level:
            return {
                "subject": subject_dict,
                "topics": [],
                "generating": False,
                "is_generated": False,
                "difficulty_required": True,
                "message": "Please select a difficulty level for this subject first.",
                "available_levels": DIFFICULTY_LEVELS
            }
        
        content_key = get_user_content_key(student_id, subject_dict['name'], difficulty_level)
        
        # Check if force regeneration is requested
        if force_regenerate:
            # Clear existing content
            if content_key in user_generated_content["topics"]:
                del user_generated_content["topics"][content_key]
            if content_key in user_generated_content["generation_status"]:
                del user_generated_content["generation_status"][content_key]
        
        # Check if content exists for this user
        if not force_regenerate and content_key in user_generated_content["topics"]:
            existing_data = user_generated_content["topics"][content_key]
            # Add difficulty level to subject object
            subject_dict['difficulty_level'] = difficulty_level
            return {
                "subject": subject_dict,
                "topics": existing_data["topics"],
                "is_generated": True,
                "generated_at": existing_data["generated_at"].isoformat(),
                "generating": False,
                "was_force_regenerated": False
            }
        
        # Check if generation is in progress
        if content_key in user_generated_content["generation_status"] and user_generated_content["generation_status"][content_key] == "generating":
            # Add difficulty level to subject object
            subject_dict['difficulty_level'] = difficulty_level
            return {
                "subject": subject_dict,
                "topics": [],
                "generating": True,
                "is_generated": False,
                "message": "Topics are being generated. Please check back in a moment."
            }
        
        # Start generation
        user_generated_content["generation_status"][content_key] = "generating"
        
        try:
            # Check if this subject has user preferences (original request)
            user_preference = db.get_student_subject_preference(student_id, subject_id)
            user_context = user_preference['original_request'] if user_preference else None
            
            # Generate topics using improved curriculum service with user context
            topics = generate_topics(subject_dict['name'], difficulty_level, user_context)
            
            # Store the results for this user
            generated_at = datetime.now()
            user_generated_content["topics"][content_key] = {
                "topics": topics,
                "generated_at": generated_at
            }
            
            # Clear generation status
            del user_generated_content["generation_status"][content_key]
            
            # Add difficulty level to subject object
            subject_dict['difficulty_level'] = difficulty_level
            
            return {
                "subject": subject_dict,
                "topics": topics,
                "is_generated": True,
                "generated_at": generated_at.isoformat(),
                "generating": False,
                "was_force_regenerated": force_regenerate
            }
            
        except Exception as e:
            # Clear generation status on error
            if content_key in user_generated_content["generation_status"]:
                del user_generated_content["generation_status"][content_key]
            raise e
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get topics: {str(e)}")

@router.get("/{subject_id}/topics/{topic_title}/chapters")
async def get_chapters(
    subject_id: int, 
    topic_title: str, 
    student_id: int = Query(..., description="Student ID for user-specific content"),
    force_regenerate: bool = Query(False, description="Force regenerate content")
):
    """Get or generate chapters for a topic for a specific student."""
    try:
        # Get subject info
        with db.get_connection() as conn:
            subject = conn.execute("SELECT * FROM subjects WHERE id = ?", (subject_id,)).fetchone()
            if not subject:
                raise HTTPException(status_code=404, detail="Subject not found")
        
        subject_dict = dict(subject)
        
        # Get difficulty level for this student-subject combination
        difficulty_level = db.get_student_subject_difficulty(student_id, subject_id)
        if not difficulty_level:
            return {
                "subject": subject_dict,
                "topic_title": topic_title,
                "chapters": [],
                "generating": False,
                "is_generated": False,
                "difficulty_required": True,
                "message": "Please select a difficulty level for this subject first.",
                "available_levels": DIFFICULTY_LEVELS
            }
        
        content_key = get_user_content_key(student_id, subject_dict['name'], difficulty_level, topic_title)
        
        # Check if force regeneration is requested
        if force_regenerate:
            # Clear existing content
            if content_key in user_generated_content["chapters"]:
                del user_generated_content["chapters"][content_key]
            if content_key in user_generated_content["generation_status"]:
                del user_generated_content["generation_status"][content_key]
        
        # Check if content exists for this user
        if not force_regenerate and content_key in user_generated_content["chapters"]:
            existing_data = user_generated_content["chapters"][content_key]
            return {
                "subject": subject_dict,
                "topic_title": topic_title,
                "chapters": existing_data["chapters"],
                "is_generated": True,
                "generated_at": existing_data["generated_at"].isoformat(),
                "generating": False,
                "was_force_regenerated": False
            }
        
        # Check if generation is in progress
        if content_key in user_generated_content["generation_status"] and user_generated_content["generation_status"][content_key] == "generating":
            return {
                "subject": subject_dict,
                "topic_title": topic_title,
                "chapters": [],
                "generating": True,
                "is_generated": False,
                "message": "Chapters are being generated. Please check back in a moment."
            }
        
        # Start generation
        user_generated_content["generation_status"][content_key] = "generating"
        
        try:
            # Generate chapters using improved curriculum service
            chapters = generate_chapters(topic_title, difficulty_level)
            
            # Store the results for this user
            generated_at = datetime.now()
            user_generated_content["chapters"][content_key] = {
                "chapters": chapters,
                "generated_at": generated_at
            }
            
            # Clear generation status
            del user_generated_content["generation_status"][content_key]
            
            return {
                "subject": subject_dict,
                "topic_title": topic_title,
                "chapters": chapters,
                "is_generated": True,
                "generated_at": generated_at.isoformat(),
                "generating": False,
                "was_force_regenerated": force_regenerate
            }
            
        except Exception as e:
            # Clear generation status on error
            if content_key in user_generated_content["generation_status"]:
                del user_generated_content["generation_status"][content_key]
            raise e
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get chapters: {str(e)}")

@router.delete("/{subject_id}/topics/content")
async def clear_topics_content(
    subject_id: int, 
    student_id: int = Query(..., description="Student ID for user-specific content")
):
    """Clear generated topics for a subject for a specific student."""
    try:
        # Get subject info
        with db.get_connection() as conn:
            subject = conn.execute("SELECT * FROM subjects WHERE id = ?", (subject_id,)).fetchone()
            if not subject:
                raise HTTPException(status_code=404, detail="Subject not found")
        
        subject_dict = dict(subject)
        
        # Get difficulty level for this student-subject combination
        difficulty_level = db.get_student_subject_difficulty(student_id, subject_id)
        if not difficulty_level:
            raise HTTPException(status_code=400, detail="No difficulty level set for this subject")
        
        content_key = get_user_content_key(student_id, subject_dict['name'], difficulty_level)
        
        # Clear content
        if content_key in user_generated_content["topics"]:
            del user_generated_content["topics"][content_key]
        if content_key in user_generated_content["generation_status"]:
            del user_generated_content["generation_status"][content_key]
        
        return {"message": "Topics content cleared successfully", "content_key": content_key}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear content: {str(e)}")

@router.delete("/{subject_id}/topics/{topic_title}/chapters/content")
async def clear_chapters_content(
    subject_id: int, 
    topic_title: str, 
    student_id: int = Query(..., description="Student ID for user-specific content")
):
    """Clear generated chapters for a topic for a specific student."""
    try:
        # Get subject info
        with db.get_connection() as conn:
            subject = conn.execute("SELECT * FROM subjects WHERE id = ?", (subject_id,)).fetchone()
            if not subject:
                raise HTTPException(status_code=404, detail="Subject not found")
        
        subject_dict = dict(subject)
        
        # Get difficulty level for this student-subject combination
        difficulty_level = db.get_student_subject_difficulty(student_id, subject_id)
        if not difficulty_level:
            raise HTTPException(status_code=400, detail="No difficulty level set for this subject")
        
        content_key = get_user_content_key(student_id, subject_dict['name'], difficulty_level, topic_title)
        
        # Clear content
        if content_key in user_generated_content["chapters"]:
            del user_generated_content["chapters"][content_key]
        if content_key in user_generated_content["generation_status"]:
            del user_generated_content["generation_status"][content_key]
        
        return {"message": "Chapters content cleared successfully", "content_key": content_key}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear content: {str(e)}")

@router.get("/user/{student_id}/generated-content")
async def get_user_generated_content(student_id: int):
    """Get overview of generated content for a specific student."""
    try:
        # Find all content keys for this student
        student_prefix = f"{student_id}_"
        
        topics_content = {k: v for k, v in user_generated_content["topics"].items() if k.startswith(student_prefix)}
        chapters_content = {k: v for k, v in user_generated_content["chapters"].items() if k.startswith(student_prefix)}
        
        # Count generation status for this student
        generating_count = len([k for k, v in user_generated_content["generation_status"].items() 
                               if k.startswith(student_prefix) and v == "generating"])
        
        return {
            "student_id": student_id,
            "generated_topics_count": len(topics_content),
            "generated_chapters_count": len(chapters_content),
            "currently_generating": generating_count,
            "topics_keys": list(topics_content.keys()),
            "chapters_keys": list(chapters_content.keys()),
            "generation_status": {k: v for k, v in user_generated_content["generation_status"].items() 
                                if k.startswith(student_prefix)}
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user content: {str(e)}")

@router.post("/generate-topics")
async def generate_topics_async(request: GenerateTopicsRequest, background_tasks: BackgroundTasks):
    """Trigger asynchronous topic generation."""
    # Note: This endpoint would need to be updated to include student_id in the request model
    # For now, keeping it as is for backward compatibility
    content_key = f"{request.subject_name}_{request.difficulty_level}"
    
    if content_key in user_generated_content["generation_status"] and user_generated_content["generation_status"][content_key] == "generating":
        return {"message": "Generation already in progress", "content_key": content_key}
    
    # Mark as generating
    user_generated_content["generation_status"][content_key] = "generating"
    
    def generate_in_background():
        try:
            topics = generate_topics(request.subject_name, request.difficulty_level)
            # Store the results
            user_generated_content["topics"][content_key] = {
                "topics": topics,
                "generated_at": datetime.now()
            }
            user_generated_content["generation_status"][content_key] = "completed"
        except Exception as e:
            user_generated_content["generation_status"][content_key] = f"error: {str(e)}"
    
    background_tasks.add_task(generate_in_background)
    
    return {"message": "Topic generation started", "content_key": content_key}

@router.get("/generation-status/{content_key}")
async def get_generation_status(content_key: str):
    """Check the status of content generation."""
    status = user_generated_content["generation_status"].get(content_key, "not_found")
    
    return {
        "content_key": content_key,
        "status": status,
        "is_generating": status == "generating",
        "is_completed": status == "completed",
        "is_error": status.startswith("error:") if isinstance(status, str) else False
    }

class RecommendSubjectsRequest(BaseModel):
    user_request: str

@router.post("/recommend")
async def recommend_subjects(
    request: RecommendSubjectsRequest,
    student_id: int = Query(..., description="Student ID")
):
    """Get AI-generated subject recommendations based on user's natural language request."""
    try:
        if not request.user_request or len(request.user_request.strip()) < 5:
            raise HTTPException(
                status_code=400, 
                detail="Please provide a meaningful description of what you want to learn (at least 5 characters)"
            )
        
        # Generate subject recommendations using AI
        recommendations = generate_subject_recommendations(request.user_request.strip())
        
        return {
            "user_request": request.user_request.strip(),
            "student_id": student_id,
            "recommendations": recommendations,
            "count": len(recommendations),
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {str(e)}")

class CreateCustomSubjectRequest(BaseModel):
    subject_name: str
    subject_description: str
    original_request: str
    ai_generated_description: str = None

@router.post("/create-custom")
async def create_custom_subject(
    request: CreateCustomSubjectRequest,
    student_id: int = Query(..., description="Student ID")
):
    """Create a custom subject based on user's request and AI recommendations."""
    try:
        if not request.subject_name or len(request.subject_name.strip()) < 2:
            raise HTTPException(
                status_code=400, 
                detail="Subject name must be at least 2 characters long"
            )
        
        if not request.subject_description or len(request.subject_description.strip()) < 10:
            raise HTTPException(
                status_code=400, 
                detail="Subject description must be at least 10 characters long"
            )
        
        if not request.original_request or len(request.original_request.strip()) < 5:
            raise HTTPException(
                status_code=400, 
                detail="Original request must be at least 5 characters long"
            )
        
        # Check if subject with same name already exists
        existing_subjects = db.get_all_subjects()
        for subject in existing_subjects:
            if subject['name'].lower() == request.subject_name.strip().lower():
                raise HTTPException(
                    status_code=409, 
                    detail=f"A subject with the name '{request.subject_name.strip()}' already exists"
                )
        
        # Create the custom subject
        subject_id = db.create_custom_subject(
            student_id=student_id,
            name=request.subject_name.strip(),
            description=request.subject_description.strip(),
            original_request=request.original_request.strip(),
            ai_generated_description=request.ai_generated_description.strip() if request.ai_generated_description else None
        )
        
        return {
            "success": True,
            "message": f"Custom subject '{request.subject_name.strip()}' created successfully",
            "subject_id": subject_id,
            "student_id": student_id,
            "original_request": request.original_request.strip(),
            "created_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create custom subject: {str(e)}") 