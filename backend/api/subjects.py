"""
Subjects API endpoints
Handles curriculum management and LLM content generation
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from typing import List, Dict
import sys
from pathlib import Path
import asyncio
from datetime import datetime

# Import from backend core modules
from backend.core.database import db
from backend.core.curriculum.curriculum_service import generate_topics, generate_chapters
from backend.models.curriculum import (
    Subject, Topic, Chapter, GenerateTopicsRequest, GenerateChaptersRequest
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
async def get_all_subjects():
    """Get all available subjects."""
    try:
        subjects = db.get_all_subjects()
        return [Subject(**subject) for subject in subjects]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get subjects: {str(e)}")

@router.get("/{subject_id}/topics")
async def get_topics(
    subject_id: int, 
    difficulty_level: str,
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
            # Generate topics using improved curriculum service
            topics = generate_topics(subject_dict['name'], difficulty_level)
            
            # Store the results for this user
            generated_at = datetime.now()
            user_generated_content["topics"][content_key] = {
                "topics": topics,
                "generated_at": generated_at
            }
            
            # Clear generation status
            del user_generated_content["generation_status"][content_key]
            
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
    difficulty_level: str,
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
    difficulty_level: str,
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
    difficulty_level: str,
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