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
from backend.core.curriculum.curriculum_service import generate_topics, generate_chapters, generate_paginated_chapter_content
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

@router.post("/{subject_id}/topics/{topic_title}/chapters/{chapter_title}/generate-content")
async def generate_chapter_content(
    subject_id: int,
    topic_title: str,
    chapter_title: str,
    student_id: int = Query(..., description="Student ID for user-specific content"),
    difficulty_level: str = Query(..., description="Difficulty level"),
    force_regenerate: bool = Query(False, description="Force regenerate content")
):
    """Generate paginated content for a specific chapter."""
    try:
        # Get subject info
        with db.get_connection() as conn:
            subject = conn.execute("SELECT * FROM subjects WHERE id = ?", (subject_id,)).fetchone()
            if not subject:
                raise HTTPException(status_code=404, detail="Subject not found")
        
        subject_dict = dict(subject)
        
        # First get the chapters to find the chapter description
        chapters_content_key = get_user_content_key(student_id, subject_dict['name'], difficulty_level, topic_title)
        
        if chapters_content_key not in user_generated_content["chapters"]:
            raise HTTPException(status_code=404, detail="Chapters not found. Please generate chapters first.")
        
        chapters_data = user_generated_content["chapters"][chapters_content_key]
        target_chapter = None
        
        for chapter in chapters_data["chapters"]:
            if chapter.title == chapter_title:
                target_chapter = chapter
                break
        
        if not target_chapter:
            raise HTTPException(status_code=404, detail="Chapter not found")
        
        # Create content key for paginated content
        paginated_content_key = f"{chapters_content_key}_{chapter_title}_paginated"
        
        # Check if force regeneration is requested
        if force_regenerate:
            if paginated_content_key in user_generated_content.get("paginated_chapters", {}):
                del user_generated_content["paginated_chapters"][paginated_content_key]
        
        # Initialize paginated_chapters if not exists
        if "paginated_chapters" not in user_generated_content:
            user_generated_content["paginated_chapters"] = {}
        
        # Check if content exists
        if not force_regenerate and paginated_content_key in user_generated_content["paginated_chapters"]:
            existing_data = user_generated_content["paginated_chapters"][paginated_content_key]
            return {
                "subject": subject_dict,
                "topic_title": topic_title,
                "chapter": {
                    "title": target_chapter.title,
                    "content": target_chapter.content,
                    "total_pages": len(existing_data["pages"]),
                    "estimated_read_time": sum(page.estimated_read_time or 0 for page in existing_data["pages"])
                },
                "pages": existing_data["pages"],
                "is_generated": True,
                "generated_at": existing_data["generated_at"].isoformat(),
                "was_force_regenerated": False
            }
        
        # Check if generation is in progress
        if paginated_content_key in user_generated_content["generation_status"] and user_generated_content["generation_status"][paginated_content_key] == "generating":
            return {
                "subject": subject_dict,
                "topic_title": topic_title,
                "chapter": {
                    "title": target_chapter.title,
                    "content": target_chapter.content
                },
                "pages": [],
                "generating": True,
                "is_generated": False,
                "message": "Paginated content is being generated. Please check back in a moment."
            }
        
        # Start generation
        user_generated_content["generation_status"][paginated_content_key] = "generating"
        
        try:
            # Generate paginated content
            pages = generate_paginated_chapter_content(
                target_chapter.title, 
                target_chapter.content, 
                difficulty_level
            )
            
            # Store the results
            generated_at = datetime.now()
            user_generated_content["paginated_chapters"][paginated_content_key] = {
                "pages": pages,
                "generated_at": generated_at
            }
            
            # Clear generation status
            del user_generated_content["generation_status"][paginated_content_key]
            
            return {
                "subject": subject_dict,
                "topic_title": topic_title,
                "chapter": {
                    "title": target_chapter.title,
                    "content": target_chapter.content,
                    "total_pages": len(pages),
                    "estimated_read_time": sum(page.estimated_read_time or 0 for page in pages)
                },
                "pages": pages,
                "is_generated": True,
                "generated_at": generated_at.isoformat(),
                "generating": False,
                "was_force_regenerated": force_regenerate
            }
            
        except Exception as e:
            # Clear generation status on error
            if paginated_content_key in user_generated_content["generation_status"]:
                del user_generated_content["generation_status"][paginated_content_key]
            raise e
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate chapter content: {str(e)}")

@router.get("/{subject_id}/topics/{topic_title}/chapters/{chapter_title}/pages")
async def get_chapter_pages(
    subject_id: int,
    topic_title: str,
    chapter_title: str,
    student_id: int = Query(..., description="Student ID for progress tracking"),
    difficulty_level: str = Query(..., description="Difficulty level")
):
    """Get all pages for a specific chapter with progress tracking (requires content generation first)."""
    try:
        # Get subject info
        with db.get_connection() as conn:
            subject = conn.execute("SELECT * FROM subjects WHERE id = ?", (subject_id,)).fetchone()
            if not subject:
                raise HTTPException(status_code=404, detail="Subject not found")
        
        subject_dict = dict(subject)
        
        # Check if paginated content exists
        chapters_content_key = get_user_content_key(student_id, subject_dict['name'], difficulty_level, topic_title)
        paginated_content_key = f"{chapters_content_key}_{chapter_title}_paginated"
        
        if "paginated_chapters" not in user_generated_content or paginated_content_key not in user_generated_content["paginated_chapters"]:
            raise HTTPException(status_code=404, detail="Paginated content not found. Please generate chapter content first.")
        
        pages_data = user_generated_content["paginated_chapters"][paginated_content_key]
        
        # Get page-level progress for this chapter
        page_progress = db.get_page_progress(
            student_id=student_id,
            subject_id=subject_id,
            topic=topic_title,
            chapter=chapter_title
        )
        
        # Create a progress map
        progress_map = {p['page_number']: p for p in page_progress}
        
        # Enhance pages with progress data
        enhanced_pages = []
        for page in pages_data["pages"]:
            page_dict = page.dict()
            page_progress_data = progress_map.get(page.page_number, {})
            page_dict.update({
                'progress': {
                    'completed': page_progress_data.get('completed', False),
                    'time_spent_minutes': page_progress_data.get('time_spent_minutes', 0),
                    'last_accessed': page_progress_data.get('updated_at')
                }
            })
            enhanced_pages.append(page_dict)
        
        # Get chapter progress summary
        chapter_summary = db.get_chapter_progress_summary(
            student_id=student_id,
            subject_id=subject_id,
            topic=topic_title,
            chapter=chapter_title,
            total_pages_in_chapter=len(pages_data["pages"])  # Pass actual total pages
        )
        
        return {
            "subject": subject_dict,
            "topic_title": topic_title,
            "chapter": {
                "title": chapter_title,
                "total_pages": len(pages_data["pages"]),
                "estimated_read_time": sum(page.estimated_read_time or 0 for page in pages_data["pages"])
            },
            "pages": enhanced_pages,
            "progress_summary": chapter_summary
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get chapter pages: {str(e)}")

@router.get("/{subject_id}/topics/{topic_title}/chapters/{chapter_title}/pages/{page_number}")
async def get_specific_page(
    subject_id: int,
    topic_title: str,
    chapter_title: str,
    page_number: int,
    student_id: int = Query(..., description="Student ID for progress tracking"),
    difficulty_level: str = Query(..., description="Difficulty level")
):
    """Get a specific page with navigation context (requires content generation first)."""
    try:
        # Get subject info
        with db.get_connection() as conn:
            subject = conn.execute("SELECT * FROM subjects WHERE id = ?", (subject_id,)).fetchone()
            if not subject:
                raise HTTPException(status_code=404, detail="Subject not found")
        
        subject_dict = dict(subject)
        
        # Check if paginated content exists
        chapters_content_key = get_user_content_key(student_id, subject_dict['name'], difficulty_level, topic_title)
        paginated_content_key = f"{chapters_content_key}_{chapter_title}_paginated"
        
        if "paginated_chapters" not in user_generated_content or paginated_content_key not in user_generated_content["paginated_chapters"]:
            raise HTTPException(status_code=404, detail="Paginated content not found. Please generate chapter content first.")
        
        pages_data = user_generated_content["paginated_chapters"][paginated_content_key]
        
        # Find the specific page
        target_page = None
        for page in pages_data["pages"]:
            if page.page_number == page_number:
                target_page = page
                break
        
        if not target_page:
            raise HTTPException(status_code=404, detail="Page not found")
        
        # Get page progress
        page_progress = db.get_page_progress(
            student_id=student_id,
            subject_id=subject_id,
            topic=topic_title,
            chapter=chapter_title
        )
        
        current_page_progress = next(
            (p for p in page_progress if p['page_number'] == page_number),
            {}
        )
        
        # Determine navigation context
        page_numbers = sorted([p.page_number for p in pages_data["pages"]])
        current_index = page_numbers.index(page_number)
        
        navigation = {
            "has_previous": current_index > 0,
            "has_next": current_index < len(page_numbers) - 1,
            "previous_page": page_numbers[current_index - 1] if current_index > 0 else None,
            "next_page": page_numbers[current_index + 1] if current_index < len(page_numbers) - 1 else None,
            "current_page": page_number,
            "total_pages": len(page_numbers)
        }
        
        return {
            "subject": subject_dict,
            "topic_title": topic_title,
            "chapter_title": chapter_title,
            "page": {
                **target_page.dict(),
                "progress": {
                    "completed": current_page_progress.get('completed', False),
                    "time_spent_minutes": current_page_progress.get('time_spent_minutes', 0),
                    "last_accessed": current_page_progress.get('updated_at')
                }
            },
            "navigation": navigation
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get page: {str(e)}")

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