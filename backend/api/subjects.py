"""
Subjects API endpoints
Handles curriculum management and LLM content generation
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Dict
import sys
from pathlib import Path
import asyncio
from datetime import datetime, timedelta

# Import from backend core modules
from backend.core.database import db
from backend.core.curriculum.curriculum_service import generate_topics, generate_chapters
from backend.models.curriculum import (
    Subject, Topic, Chapter, GenerateTopicsRequest, GenerateChaptersRequest
)

router = APIRouter()

# In-memory cache for generated content (similar to GUI version)
content_cache: Dict[str, any] = {
    "topics": {},
    "chapters": {},
    "generation_status": {}
}

@router.get("/", response_model=List[Subject])
async def get_all_subjects():
    """Get all available subjects."""
    try:
        subjects = db.get_all_subjects()
        return [Subject(**subject) for subject in subjects]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get subjects: {str(e)}")

@router.get("/{subject_id}/topics")
async def get_topics(subject_id: int, difficulty_level: str):
    """Get or generate topics for a subject."""
    try:
        # Get subject info
        with db.get_connection() as conn:
            subject = conn.execute("SELECT * FROM subjects WHERE id = ?", (subject_id,)).fetchone()
            if not subject:
                raise HTTPException(status_code=404, detail="Subject not found")
        
        subject_dict = dict(subject)
        cache_key = f"{subject_dict['name']}_{difficulty_level}"
        
        # Check cache first
        if cache_key in content_cache["topics"]:
            cached_data = content_cache["topics"][cache_key]
            # Check if cache is still fresh (cache for 1 hour)
            if datetime.now() - cached_data["generated_at"] < timedelta(hours=1):
                return {
                    "subject": subject_dict,
                    "topics": cached_data["topics"],
                    "from_cache": True
                }
        
        # Check if generation is in progress
        if cache_key in content_cache["generation_status"] and content_cache["generation_status"][cache_key] == "generating":
            return {
                "subject": subject_dict,
                "topics": [],
                "generating": True,
                "message": "Topics are being generated. Please check back in a moment."
            }
        
        # Start generation
        content_cache["generation_status"][cache_key] = "generating"
        
        try:
            # Generate topics using improved curriculum service
            topics = generate_topics(subject_dict['name'], difficulty_level)
            
            # Cache the results
            content_cache["topics"][cache_key] = {
                "topics": topics,
                "generated_at": datetime.now()
            }
            
            # Clear generation status
            del content_cache["generation_status"][cache_key]
            
            return {
                "subject": subject_dict,
                "topics": topics,
                "from_cache": False
            }
            
        except Exception as e:
            # Clear generation status on error
            if cache_key in content_cache["generation_status"]:
                del content_cache["generation_status"][cache_key]
            raise e
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get topics: {str(e)}")

@router.get("/{subject_id}/topics/{topic_title}/chapters")
async def get_chapters(subject_id: int, topic_title: str, difficulty_level: str):
    """Get or generate chapters for a topic."""
    try:
        # Get subject info
        with db.get_connection() as conn:
            subject = conn.execute("SELECT * FROM subjects WHERE id = ?", (subject_id,)).fetchone()
            if not subject:
                raise HTTPException(status_code=404, detail="Subject not found")
        
        subject_dict = dict(subject)
        cache_key = f"{subject_dict['name']}_{topic_title}_{difficulty_level}"
        
        # Check cache first
        if cache_key in content_cache["chapters"]:
            cached_data = content_cache["chapters"][cache_key]
            # Check if cache is still fresh (cache for 1 hour)
            if datetime.now() - cached_data["generated_at"] < timedelta(hours=1):
                return {
                    "subject": subject_dict,
                    "topic_title": topic_title,
                    "chapters": cached_data["chapters"],
                    "from_cache": True
                }
        
        # Check if generation is in progress
        if cache_key in content_cache["generation_status"] and content_cache["generation_status"][cache_key] == "generating":
            return {
                "subject": subject_dict,
                "topic_title": topic_title,
                "chapters": [],
                "generating": True,
                "message": "Chapters are being generated. Please check back in a moment."
            }
        
        # Start generation
        content_cache["generation_status"][cache_key] = "generating"
        
        try:
            # Generate chapters using improved curriculum service
            chapters = generate_chapters(topic_title, difficulty_level)
            
            # Cache the results
            content_cache["chapters"][cache_key] = {
                "chapters": chapters,
                "generated_at": datetime.now()
            }
            
            # Clear generation status
            del content_cache["generation_status"][cache_key]
            
            return {
                "subject": subject_dict,
                "topic_title": topic_title,
                "chapters": chapters,
                "from_cache": False
            }
            
        except Exception as e:
            # Clear generation status on error
            if cache_key in content_cache["generation_status"]:
                del content_cache["generation_status"][cache_key]
            raise e
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get chapters: {str(e)}")

@router.post("/generate-topics")
async def generate_topics_async(request: GenerateTopicsRequest, background_tasks: BackgroundTasks):
    """Trigger asynchronous topic generation."""
    cache_key = f"{request.subject_name}_{request.difficulty_level}"
    
    if cache_key in content_cache["generation_status"] and content_cache["generation_status"][cache_key] == "generating":
        return {"message": "Generation already in progress", "cache_key": cache_key}
    
    # Mark as generating
    content_cache["generation_status"][cache_key] = "generating"
    
    def generate_in_background():
        try:
            topics = generate_topics(request.subject_name, request.difficulty_level)
            # Cache the results
            content_cache["topics"][cache_key] = {
                "topics": topics,
                "generated_at": datetime.now()
            }
            content_cache["generation_status"][cache_key] = "completed"
        except Exception as e:
            content_cache["generation_status"][cache_key] = f"error: {str(e)}"
    
    background_tasks.add_task(generate_in_background)
    
    return {"message": "Topic generation started", "cache_key": cache_key}

@router.get("/generation-status/{cache_key}")
async def get_generation_status(cache_key: str):
    """Check the status of content generation."""
    status = content_cache["generation_status"].get(cache_key, "not_found")
    
    return {
        "cache_key": cache_key,
        "status": status,
        "is_generating": status == "generating",
        "is_completed": status == "completed",
        "is_error": status.startswith("error:") if isinstance(status, str) else False
    } 