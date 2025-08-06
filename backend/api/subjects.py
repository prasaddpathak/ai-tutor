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
import json

# Import from backend core modules
from backend.core.database import db
from backend.core.curriculum.curriculum_service import (
    generate_topics, generate_chapters, generate_subject_recommendations,
    generate_and_store_topics, generate_and_store_chapters, 
    generate_and_store_chapter_content, get_content_by_language
)
from backend.models.curriculum import (
    Subject, Topic, Chapter, GenerateTopicsRequest, GenerateChaptersRequest,
    SetSubjectDifficultyRequest, SubjectDifficultyResponse, DIFFICULTY_LEVELS,
    Quiz, QuizQuestion, QuizSubmission, QuizResult, QuizResultWithDetails
)

router = APIRouter()

# User-specific generated content storage (no expiration)
user_generated_content: Dict[str, any] = {
    "topics": {},  # Format: f"{student_id}_{subject_name}_{difficulty_level}"
    "chapters": {},  # Format: f"{student_id}_{subject_name}_{topic_title}_{difficulty_level}"
    "chapter_content": {},  # Format: f"{student_id}_{subject_name}_{topic_title}_{chapter_title}_{difficulty_level}"
    "chapter_completions": {},  # Format: f"{student_id}_{subject_name}_{topic_title}_{chapter_title}_{difficulty_level}"
    "chat_history": {},  # Format: f"{student_id}_{subject_name}_{topic_title}_{chapter_title}_{difficulty_level}"
    "generation_status": {}
}

def get_user_content_key(student_id: int, subject_name: str, difficulty_level: str, topic_title: str = None) -> str:
    """Generate user-specific content key."""
    if topic_title:
        return f"{student_id}_{subject_name}_{topic_title}_{difficulty_level}"
    return f"{student_id}_{subject_name}_{difficulty_level}"

def get_chapter_content_key(student_id: int, subject_name: str, difficulty_level: str, topic_title: str, chapter_title: str) -> str:
    """Generate user-specific chapter content key."""
    return f"{student_id}_{subject_name}_{topic_title}_{chapter_title}_{difficulty_level}"

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
        
        # Legacy cache check removed - now using database-first approach with display_title support
        
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
            # Get student language preference
            student = db.get_student_by_id(student_id)
            language_code = student['language_preference'] if student else 'en'
            
            # Check if this subject has user preferences (original request)
            user_preference = db.get_student_subject_preference(student_id, subject_id)
            user_context = user_preference['original_request'] if user_preference else None
            
            # First, check if content already exists in the database
            if not force_regenerate:
                # Always get English topics first (for consistent URLs)
                english_topics = get_content_by_language(
                    student_id=student_id,
                    subject_id=subject_id,
                    content_type='topics',
                    difficulty_level=difficulty_level,
                    language_code='en'
                )
                if english_topics:
                    # Create base topics with English titles
                    topics_data = []
                    
                    # If user wants Spanish, get Spanish translations for display
                    spanish_topics = None
                    if language_code == 'es':
                        spanish_topics = get_content_by_language(
                            student_id=student_id,
                            subject_id=subject_id,
                            content_type='topics',
                            difficulty_level=difficulty_level,
                            language_code='es'
                        )
                    
                    # Build topic objects with both English (for URLs) and display titles
                    for i, topic in enumerate(english_topics):
                        topic_data = {
                            "title": topic['title'],  # Always English for URLs
                            "description": topic.get('description', ''),
                            "display_title": topic['title']  # Default to English
                        }
                        
                        # Override with Spanish display title if available
                        if spanish_topics and i < len(spanish_topics):
                            topic_data["display_title"] = spanish_topics[i]['title']
                            topic_data["description"] = spanish_topics[i].get('description', topic_data["description"])
                        
                        topics_data.append(topic_data)
                    
                    # Clear generation status
                    del user_generated_content["generation_status"][content_key]
                    subject_dict['difficulty_level'] = difficulty_level
                    
                    return {
                        "subject": subject_dict,
                        "topics": topics_data,
                        "is_generated": True,
                        "generated_at": datetime.now().isoformat(),
                        "generating": False,
                        "was_force_regenerated": False,
                        "language": language_code,
                        "content_source": "database_existing"
                    }
            
            # Generate and store topics with automatic translation
            english_topics = generate_and_store_topics(
                student_id=student_id,
                subject_id=subject_id,
                subject_name=subject_dict['name'],
                difficulty_level=difficulty_level,
                user_context=user_context
            )
            
            # Build topic data with both English titles (for URLs) and display titles
            topics_data = []
            spanish_topics = None
            
            # If user prefers Spanish, try to get translated content
            if language_code == 'es':
                spanish_topics = get_content_by_language(
                    student_id=student_id,
                    subject_id=subject_id,
                    content_type='topics',
                    difficulty_level=difficulty_level,
                    language_code='es'
                )
            
            # Build response with English titles for URLs and display titles for UI
            for i, topic in enumerate(english_topics):
                topic_data = {
                    "title": topic.title,  # Always English for URLs
                    "description": topic.description or '',
                    "display_title": topic.title  # Default to English
                }
                
                # Override with Spanish display title if available
                if spanish_topics and i < len(spanish_topics):
                    topic_data["display_title"] = spanish_topics[i]['title']
                    topic_data["description"] = spanish_topics[i].get('description', topic_data["description"])
                
                topics_data.append(topic_data)
            
            # Store in legacy cache for backward compatibility (using English topics)
            generated_at = datetime.now()
            user_generated_content["topics"][content_key] = {
                "topics": english_topics,
                "generated_at": generated_at
            }
            
            # Clear generation status
            del user_generated_content["generation_status"][content_key]
            
            # Add difficulty level to subject object
            subject_dict['difficulty_level'] = difficulty_level
            
            return {
                "subject": subject_dict,
                "topics": topics_data,
                "is_generated": True,
                "generated_at": generated_at.isoformat(),
                "generating": False,
                "was_force_regenerated": force_regenerate,
                "language": language_code,
                "content_source": "generated_new"
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
        
        # Get student language preference for database lookup
        student = db.get_student_by_id(student_id)
        language_code = student['language_preference'] if student else 'en'
        
        # First priority: Check database for ENGLISH content (always get English titles for URLs)
        if not force_regenerate:
            english_chapters = get_content_by_language(
                student_id=student_id,
                subject_id=subject_id,
                content_type='chapters',
                difficulty_level=difficulty_level,
                language_code='en',  # Always get English first for consistent URLs
                topic_title=topic_title
            )
            if english_chapters:
                # Handle both list of chapters and single chapter content
                if isinstance(english_chapters, list):
                    chapters = [Chapter(title=chapter['title'], content=chapter['content']) 
                               for chapter in english_chapters]
                else:
                    # Single chapter structure - convert to list
                    chapters = [Chapter(title=english_chapters.get('title', topic_title), 
                                      content=english_chapters.get('content', 'No content available'))]
                
                # If user wants Spanish, get translated content for display (but keep English titles for URLs)
                if language_code == 'es':
                    spanish_chapters = get_content_by_language(
                        student_id=student_id,
                        subject_id=subject_id,
                        content_type='chapters',
                        difficulty_level=difficulty_level,
                        language_code='es',
                        topic_title=topic_title
                    )
                    if spanish_chapters and isinstance(spanish_chapters, list):
                        # Use Spanish content but keep English titles for URLs
                        for i, chapter in enumerate(chapters):
                            if i < len(spanish_chapters):
                                chapter.content = spanish_chapters[i]['content']
                
                # Build chapters with content status
                chapters_with_content_status = []
                for i, chapter in enumerate(chapters):
                    chapter_content_key = get_chapter_content_key(
                        student_id, subject_dict['name'], difficulty_level, topic_title, chapter.title
                    )
                    has_content = chapter_content_key in user_generated_content["chapter_content"]
                    
                    # Check completion status from database (fallback to in-memory)
                    with db.get_connection() as conn:
                        completion_record = conn.execute("""
                            SELECT completed FROM student_progress 
                            WHERE student_id = ? AND subject_id = ? AND topic = ? AND chapter = ?
                        """, (student_id, subject_id, topic_title, chapter.title)).fetchone()
                        is_completed_db = bool(completion_record and completion_record[0] == 1)
                    
                    # Use database completion status, fallback to in-memory
                    is_completed = is_completed_db or (chapter_content_key in user_generated_content["chapter_completions"])
                    
                    # For Spanish users, get the translated title for display
                    display_title = chapter.title
                    if language_code == 'es' and spanish_chapters and isinstance(spanish_chapters, list):
                        if i < len(spanish_chapters):
                            display_title = spanish_chapters[i].get('title', chapter.title)
                    
                    chapters_with_content_status.append({
                        "title": chapter.title,  # Always English title for URLs
                        "display_title": display_title,  # Translated title for display
                        "content": chapter.content,  # Translated content if available
                        "has_content_generated": has_content,
                        "is_completed": is_completed
                    })
                
                return {
                    "subject": subject_dict,
                    "topic_title": topic_title,
                    "chapters": chapters_with_content_status,
                    "is_generated": True,
                    "generated_at": datetime.now().isoformat(),
                    "generating": False,
                    "was_force_regenerated": False,
                    "language": language_code,
                    "content_source": "database_existing"
                }
        
        # Generate new chapters and store in database
        try:
            
            # Generate and store chapters with automatic translation
            chapters = generate_and_store_chapters(
                student_id=student_id,
                subject_id=subject_id,
                topic_title=topic_title,
                difficulty_level=difficulty_level
            )
            
            # Get Spanish translations if user prefers Spanish
            spanish_chapters = None
            if language_code == 'es':
                spanish_chapters = get_content_by_language(
                    student_id=student_id,
                    subject_id=subject_id,
                    content_type='chapters',
                    difficulty_level=difficulty_level,
                    language_code='es',
                    topic_title=topic_title
                )
                if spanish_chapters and isinstance(spanish_chapters, list):
                    # Update content but keep English titles for URLs
                    for i, chapter in enumerate(chapters):
                        if i < len(spanish_chapters):
                            chapter.content = spanish_chapters[i]['content']
            
            # Format chapters with content status - check database for chapter detail content
            chapters_with_content_status = []
            for i, chapter in enumerate(chapters):
                # Check if detailed chapter content exists in database
                chapter_detail_content = get_content_by_language(
                    student_id=student_id,
                    subject_id=subject_id,
                    content_type='chapter_detail',
                    difficulty_level=difficulty_level,
                    language_code='en',  # Check English since that's what gets generated first
                    topic_title=topic_title,
                    chapter_title=chapter.title
                )
                has_content = chapter_detail_content is not None
                
                # Check completion status from database
                with db.get_connection() as conn:
                    completion_record = conn.execute("""
                        SELECT completed FROM student_progress 
                        WHERE student_id = ? AND subject_id = ? AND topic = ? AND chapter = ?
                    """, (student_id, subject_id, topic_title, chapter.title)).fetchone()
                    is_completed = bool(completion_record and completion_record[0] == 1)
                
                # For Spanish users, get the translated title for display
                display_title = chapter.title
                if language_code == 'es' and spanish_chapters and isinstance(spanish_chapters, list):
                    if i < len(spanish_chapters):
                        display_title = spanish_chapters[i].get('title', chapter.title)
                
                chapters_with_content_status.append({
                    "title": chapter.title,  # Always English title for URLs
                    "display_title": display_title,  # Translated title for display
                    "content": chapter.content,  # Translated content if available
                    "has_content_generated": has_content,  # Based on database check
                    "is_completed": is_completed  # Based on database completion tracking
                })
            
            return {
                "subject": subject_dict,
                "topic_title": topic_title,
                "chapters": chapters_with_content_status,
                "is_generated": True,
                "generated_at": datetime.now().isoformat(),
                "generating": False,
                "was_force_regenerated": force_regenerate,
                "language": language_code,
                "content_source": "database_generated"
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate chapters: {str(e)}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get chapters: {str(e)}")

@router.get("/{subject_id}/topics/{topic_title}/chapters/{chapter_title}/content")
async def get_chapter_content(
    subject_id: int, 
    topic_title: str, 
    chapter_title: str,
    student_id: int = Query(..., description="Student ID for user-specific content"),
    page: int = Query(1, description="Page number (1-based)")
):
    """Get paginated content for a specific chapter."""
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
                "error": "Difficulty level required",
                "message": "Please select a difficulty level for this subject first.",
                "available_levels": DIFFICULTY_LEVELS
            }
        
        content_key = get_user_content_key(student_id, subject_dict['name'], difficulty_level, topic_title)
        
        # Check if chapters exist in database for this user
        existing_chapters = get_content_by_language(
            student_id=student_id,
            subject_id=subject_id,
            content_type='chapters',
            difficulty_level=difficulty_level,
            language_code='en',  # Check English chapters first
            topic_title=topic_title
        )
        
        if not existing_chapters:
            raise HTTPException(status_code=404, detail="Chapters not found. Please generate chapters first.")
        
        # Verify the requested chapter exists
        chapter_exists = False
        if isinstance(existing_chapters, list):
            chapter_exists = any(ch['title'] == chapter_title for ch in existing_chapters)
        else:
            chapter_exists = existing_chapters.get('title') == chapter_title
            
        if not chapter_exists:
            raise HTTPException(status_code=404, detail="Chapter not found")
        
        # Get student language preference
        student = db.get_student_by_id(student_id)
        language_code = student['language_preference'] if student else 'en'
        
        # Check if content exists in database
        chapter_content_key = get_chapter_content_key(
            student_id, subject_dict['name'], difficulty_level, topic_title, chapter_title
        )
        
        # First check the database for existing content
        existing_content = get_content_by_language(
            student_id=student_id,
            subject_id=subject_id,
            content_type='chapter_detail',
            difficulty_level=difficulty_level,
            language_code=language_code,
            topic_title=topic_title,
            chapter_title=chapter_title,
            allow_fallback=(language_code == 'en')  # Only allow fallback for English users
        )
        
        if existing_content:
            # Return content from database - use translated chapter title if available
            pages = [existing_content[f'page_{i}'] for i in range(1, 7)]
            # Use translated chapter title if available, otherwise fall back to original
            translated_chapter_title = existing_content.get('chapter_title', chapter_title)
            return {
                "subject": subject_dict,
                "topic_title": topic_title,
                "chapter_title": translated_chapter_title,
                "total_pages": len(pages),
                "pages": pages,
                "chapter_summary": existing_content['chapter_summary'],
                "difficulty_level": difficulty_level,
                "language": language_code,
                "content_source": "database_existing"
            }
        
        # If not in database, generate new content
        
        # Generate and store paginated content with automatic translation
        paginated_content = generate_and_store_chapter_content(
            student_id=student_id,
            subject_id=subject_id,
            chapter_title=chapter_title,
            topic_title=topic_title,
            subject_name=subject_dict['name'],
            difficulty_level=difficulty_level
        )
        
        # If user prefers Spanish, try to get translated content (no English fallback)
        display_chapter_title = chapter_title  # Default to English title
        if language_code == 'es':
            translated_content = get_content_by_language(
                student_id=student_id,
                subject_id=subject_id,
                content_type='chapter_detail',
                difficulty_level=difficulty_level,
                language_code='es',
                topic_title=topic_title,
                chapter_title=chapter_title,
                allow_fallback=False  # Don't fall back to English - wait for Spanish
            )
            if translated_content:
                paginated_content = {
                    'pages': [translated_content[f'page_{i}'] for i in range(1, 7)],
                    'summary': translated_content['chapter_summary']
                }
                # Use translated chapter title if available
                display_chapter_title = translated_content.get('chapter_title', chapter_title)
        
        # Content is already stored in database by generate_and_store_chapter_content
        
        # Return ALL pages at once
        return {
            "subject": subject_dict,
            "topic_title": topic_title,
            "chapter_title": display_chapter_title,  # Use translated title for display
            "total_pages": len(paginated_content['pages']),
            "pages": paginated_content['pages'],  # All pages
            "chapter_summary": paginated_content['summary'],
            "difficulty_level": difficulty_level,
            "language": language_code,
            "content_source": "generated_new"
        }
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get chapter content: {str(e)}")

@router.post("/{subject_id}/topics/{topic_title}/chapters/{chapter_title}/complete")
async def complete_chapter(
    subject_id: int, 
    topic_title: str, 
    chapter_title: str,
    student_id: int = Query(..., description="Student ID for user-specific completion tracking")
):
    """Mark a chapter as completed by the student."""
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
            raise HTTPException(status_code=400, detail="Difficulty level required")
        
        # Generate completion key
        chapter_content_key = get_chapter_content_key(
            student_id, subject_dict['name'], difficulty_level, topic_title, chapter_title
        )
        
        # Mark chapter as completed in memory
        user_generated_content["chapter_completions"][chapter_content_key] = {
            "completed_at": datetime.now(),
            "student_id": student_id,
            "subject_name": subject_dict['name'],
            "topic_title": topic_title,
            "chapter_title": chapter_title,
            "difficulty_level": difficulty_level
        }
        
        # Persist completion to database
        with db.get_connection() as conn:
            # Check if progress record exists
            existing = conn.execute("""
                SELECT id FROM student_progress 
                WHERE student_id = ? AND subject_id = ? AND topic = ? AND chapter = ?
            """, (student_id, subject_id, topic_title, chapter_title)).fetchone()
            
            if existing:
                # Update existing record
                conn.execute("""
                    UPDATE student_progress 
                    SET completed = 1, created_at = CURRENT_TIMESTAMP
                    WHERE student_id = ? AND subject_id = ? AND topic = ? AND chapter = ?
                """, (student_id, subject_id, topic_title, chapter_title))
            else:
                # Insert new progress record
                conn.execute("""
                    INSERT INTO student_progress (student_id, subject_id, topic, chapter, completed, created_at)
                    VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
                """, (student_id, subject_id, topic_title, chapter_title))
            
            conn.commit()
        
        return {
            "success": True,
            "message": f"Chapter '{chapter_title}' marked as completed",
            "completed_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete chapter: {str(e)}")

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

class ChatMessage(BaseModel):
    message: str
    current_page: int = 1

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

@router.post("/{subject_id}/topics/{topic_title}/chapters/{chapter_title}/chat")
async def chat_with_chapter(
    subject_id: int,
    topic_title: str,
    chapter_title: str,
    chat_message: ChatMessage,
    student_id: int = Query(..., description="Student ID for user-specific chat")
):
    """Chat with AI tutor about chapter content."""
    try:
        # URL decode the parameters
        from urllib.parse import unquote
        topic_title = unquote(topic_title)
        chapter_title = unquote(chapter_title)
        
        # Get subject info
        with db.get_connection() as conn:
            subject = conn.execute("SELECT * FROM subjects WHERE id = ?", (subject_id,)).fetchone()
            if not subject:
                raise HTTPException(status_code=404, detail="Subject not found")
        
        subject_dict = dict(subject)

        # Get difficulty level
        difficulty_level = db.get_student_subject_difficulty(student_id, subject_id)
        if not difficulty_level:
            raise HTTPException(status_code=400, detail="Difficulty level required")
        # Get chapter content from database
        chapter_data = db.get_chapter_content_from_db(
            student_id, subject_id, topic_title, chapter_title, difficulty_level
        )

        if not chapter_data:
            raise HTTPException(
                status_code=404, 
                detail="Chapter content not found. Please read the chapter first before starting a chat."
            )
        
        # Get student language preference
        student = db.get_student_by_id(student_id)
        language_code = student['language_preference'] if student else 'en'
        
        # Get chat history from database
        chat_history = db.get_chat_history(
            student_id, subject_id, topic_title, chapter_title, difficulty_level
        )
        # Get current page content
        current_page_content = ""
        if chat_message.current_page <= len(chapter_data):
            current_page_content = chapter_data[f'page_{chat_message.current_page}']
        
        
        # Build context with recent chat history for better continuity
        recent_conversation = ""
        if chat_history:
            recent_conversation = "\n".join([
                f"Student: {msg['user_message']}\nTutor: {msg['assistant_message']}"
                for msg in chat_history[-3:]  # Last 3 exchanges for context
            ])
            recent_conversation = f"\n\nRECENT CONVERSATION:\n{recent_conversation}\n"
        
        # Language specific instructions
        language_instruction = ""
        if language_code == 'es':
            language_instruction = "\n\nIMPORTANT: You MUST respond ONLY in Spanish (Español). Do not use any English words or phrases in your response."
        elif language_code == 'en':
            language_instruction = "\n\nIMPORTANT: You MUST respond ONLY in English. Do not use any Spanish or other language words or phrases in your response."
        
        # Create a simple prompt with context
        prompt = f"""You are an AI tutor helping a student understand educational content.

CONTEXT:
- Subject: {subject_dict['name']}
- Topic: {topic_title}
- Chapter: {chapter_title}
- Difficulty Level: {difficulty_level}
- Current Page: {current_page_content}
- Recent Conversations: {recent_conversation}

STUDENT QUESTION: {chat_message.message}

Please provide a helpful, clear answer that matches the {difficulty_level} difficulty level and references the chapter content when relevant. Keep your response concise but thorough. Reponses should be always less than 100 words.{language_instruction}

TUTOR RESPONSE:"""
        
        # Get response from LLM
        from backend.core.curriculum.llm_client import query_llm
        assistant_response = query_llm(prompt)
        
        # Store the conversation in database
        db.add_chat_message(
            student_id=student_id,
            subject_id=subject_id,
            topic_title=topic_title,
            chapter_title=chapter_title,
            difficulty_level=difficulty_level,
            user_message=chat_message.message,
            assistant_message=assistant_response,
            current_page=chat_message.current_page
        )
        
        return {
            "response": assistant_response,
            "success": True,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{subject_id}/topics/{topic_title}/chapters/{chapter_title}/chat/history")
async def get_chat_history(
    subject_id: int,
    topic_title: str,
    chapter_title: str,
    student_id: int = Query(..., description="Student ID for user-specific chat history")
):
    """Get chat history for a specific chapter."""
    try:
        # URL decode the parameters
        from urllib.parse import unquote
        topic_title = unquote(topic_title)
        chapter_title = unquote(chapter_title)
        
        # Get subject info
        with db.get_connection() as conn:
            subject = conn.execute("SELECT * FROM subjects WHERE id = ?", (subject_id,)).fetchone()
            if not subject:
                raise HTTPException(status_code=404, detail="Subject not found")
        
        subject_dict = dict(subject)
        
        # Get difficulty level
        difficulty_level = db.get_student_subject_difficulty(student_id, subject_id)
        if not difficulty_level:
            return {
                "chat_history": [],
                "message_count": 0
            }
        
        # Get chat history from database
        chat_history = db.get_chat_history(
            student_id, subject_id, topic_title, chapter_title, difficulty_level
        )

        return {
            "subject_name": subject_dict['name'],
            "topic_title": topic_title,
            "chapter_title": chapter_title,
            "difficulty_level": difficulty_level,
            "chat_history": chat_history,
            "message_count": len(chat_history)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Quiz generation function
def generate_quiz_questions(subject_name: str, topic_title: str, difficulty_level: str, chapter_contents: List[str]) -> List[QuizQuestion]:
    """Generate 20 quiz questions based on chapter contents using LLM."""
    from backend.core.curriculum.llm_client import query_llm
    import uuid
    import json
    
    # Combine all chapter content for context
    content_context = "\n\n".join(chapter_contents)
    
    prompt = f"""Generate exactly 10 multiple choice questions for a quiz on the topic "{topic_title}" in the subject "{subject_name}" at {difficulty_level} difficulty level.

CONTENT TO BASE QUESTIONS ON:
{content_context[:8000]}

REQUIREMENTS:
1. Generate exactly 10 questions
2. Each question should have exactly 4 options (A, B, C, D)
3. Questions should be highly relevant to the provided content
4. Difficulty should match {difficulty_level} level
5. Include a brief explanation for each correct answer
6. Questions should test understanding, not just memorization
7. Cover different aspects of the topic comprehensively

FORMAT YOUR RESPONSE AS VALID JSON:
{{
  "questions": [
    {{
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Brief explanation of why this is correct."
    }}
  ]
}}

IMPORTANT: 
- Respond ONLY with valid JSON, no markdown formatting, no code blocks, no additional text
- Start your response directly with {{ and end with }}
- Do not include ```json or ``` markers
- Ensure the JSON is properly formatted and parseable

Generate the quiz now:"""

    try:
        response = query_llm(prompt)
        
        # Clean up the response - remove markdown code blocks if present
        response = response.strip()
        if response.startswith('```json'):
            response = response[7:]  # Remove ```json
        if response.startswith('```'):
            response = response[3:]   # Remove ```
        if response.endswith('```'):
            response = response[:-3]  # Remove trailing ```
        
        response = response.strip()
        
        # Try to parse JSON response
        quiz_data = json.loads(response)
        
        questions = []
        for i, q in enumerate(quiz_data.get("questions", [])[:10]):  # Ensure max 10 questions
            questions.append(QuizQuestion(
                id=str(uuid.uuid4()),
                question=q["question"],
                options=q["options"][:4],  # Ensure max 4 options
                correct_answer=q["correct_answer"],
                explanation=q["explanation"]
            ))
        
        # Ensure we have exactly 10 questions
        if len(questions) != 10:
            raise ValueError(f"Expected 10 questions, got {len(questions)}")
            
        return questions
        
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        # Log the raw response for debugging
        print(f"Failed to parse LLM response. Raw response: {response[:500]}...")
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz questions: {str(e)}")

@router.get("/{subject_id}/topics/{topic_title}/quiz")
async def get_or_generate_quiz(
    subject_id: int,
    topic_title: str,
    student_id: int = Query(..., description="Student ID for user-specific quiz")
):
    """Get or generate a quiz for a topic."""
    try:
        from urllib.parse import unquote
        import json
        topic_title = unquote(topic_title)
        
        # Get subject info
        with db.get_connection() as conn:
            subject = conn.execute("SELECT * FROM subjects WHERE id = ?", (subject_id,)).fetchone()
            if not subject:
                raise HTTPException(status_code=404, detail="Subject not found")
        
        subject_dict = dict(subject)
        
        # Get difficulty level
        difficulty_level = db.get_student_subject_difficulty(student_id, subject_id)
        if not difficulty_level:
            raise HTTPException(status_code=400, detail="Difficulty level required")
        
        # Check if quiz already exists
        existing_quiz = db.get_quiz(student_id, subject_id, topic_title, difficulty_level)
        
        if existing_quiz:
            # Return existing quiz
            questions_data = json.loads(existing_quiz['questions_json'])
            questions = [QuizQuestion(**q) for q in questions_data]
            
            # Get best score if any attempts exist
            best_result = db.get_best_quiz_result(student_id, existing_quiz['id'])
            
            return {
                "quiz_id": existing_quiz['id'],
                "subject_name": subject_dict['name'],
                "topic_title": topic_title,
                "difficulty_level": difficulty_level,
                "questions": questions,
                "total_questions": len(questions),
                "best_score": best_result['score'] if best_result else None,
                "best_percentage": best_result['percentage'] if best_result else None,
                "has_attempted": best_result is not None
            }
        
        # Check if chapters exist in database first (database-first approach)
        english_chapters = get_content_by_language(
            student_id=student_id,
            subject_id=subject_id,
            content_type='chapters',
            difficulty_level=difficulty_level,
            language_code='en',
            topic_title=topic_title
        )
        
        if not english_chapters:
            raise HTTPException(status_code=400, detail="No chapters found. Please generate chapters first.")
        
        # Handle both list of chapters and single chapter content
        if isinstance(english_chapters, list):
            chapters = [Chapter(title=chapter['title'], content=chapter['content']) 
                       for chapter in english_chapters]
        else:
            # Single chapter structure - convert to list
            chapters = [Chapter(title=english_chapters.get('title', topic_title), 
                              content=english_chapters.get('content', 'No content available'))]
        
        # Get all chapter content from database for quiz generation
        chapter_contents = []
        for chapter in chapters:
            # Get chapter detail content from database
            chapter_detail_content = get_content_by_language(
                student_id=student_id,
                subject_id=subject_id,
                content_type='chapter_detail',
                difficulty_level=difficulty_level,
                language_code='en',
                topic_title=topic_title,
                chapter_title=chapter.title
            )
            
            if not chapter_detail_content:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Chapter '{chapter.title}' content not generated. Please read all chapters first."
                )
            
            # Get all page content for this chapter from database
            pages = [chapter_detail_content[f'page_{i}'] for i in range(1, 7)]
            chapter_full_content = "\n\n".join(pages)
            chapter_contents.append(f"Chapter: {chapter.title}\n{chapter_full_content}")
        
        # Generate quiz questions
        questions = generate_quiz_questions(subject_dict['name'], topic_title, difficulty_level, chapter_contents)
        
        # Store quiz in database
        import uuid
        quiz_id = str(uuid.uuid4())
        questions_json = json.dumps([q.dict() for q in questions])
        
        db.create_quiz(quiz_id, student_id, subject_id, topic_title, difficulty_level, questions_json)
        
        return {
            "quiz_id": quiz_id,
            "subject_name": subject_dict['name'],
            "topic_title": topic_title,
            "difficulty_level": difficulty_level,
            "questions": questions,
            "total_questions": len(questions),
            "best_score": None,
            "best_percentage": None,
            "has_attempted": False
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{subject_id}/topics/{topic_title}/quiz/submit")
async def submit_quiz(
    subject_id: int,
    topic_title: str,
    submission: QuizSubmission,
    student_id: int = Query(..., description="Student ID for user-specific quiz submission")
):
    """Submit quiz answers and get results."""
    try:
        from urllib.parse import unquote
        import uuid
        import json
        
        topic_title = unquote(topic_title)
        
        # Get the quiz
        difficulty_level = db.get_student_subject_difficulty(student_id, subject_id)
        if not difficulty_level:
            raise HTTPException(status_code=400, detail="Difficulty level required")
        
        existing_quiz = db.get_quiz(student_id, subject_id, topic_title, difficulty_level)
        if not existing_quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")
        
        # Verify quiz_id matches
        if submission.quiz_id != existing_quiz['id']:
            raise HTTPException(status_code=400, detail="Invalid quiz ID")
        
        # Parse questions and calculate score
        questions_data = json.loads(existing_quiz['questions_json'])
        questions = [QuizQuestion(**q) for q in questions_data]
        
        if len(submission.answers) != len(questions):
            raise HTTPException(status_code=400, detail="Number of answers doesn't match number of questions")
        
        # Calculate score
        score = 0
        for i, answer in enumerate(submission.answers):
            if answer == questions[i].correct_answer:
                score += 1
        
        percentage = (score / len(questions)) * 100
        
        # Save result
        result_id = str(uuid.uuid4())
        answers_json = json.dumps(submission.answers)
        
        db.save_quiz_result(result_id, submission.quiz_id, student_id, answers_json, score, percentage)
        
        # Get all results to determine if this is the best score
        all_results = db.get_quiz_results(student_id, submission.quiz_id)
        is_best_score = score >= max([r['score'] for r in all_results])
        
        return QuizResultWithDetails(
            id=result_id,
            quiz_id=submission.quiz_id,
            student_id=student_id,
            answers=submission.answers,
            score=score,
            percentage=percentage,
            submitted_at=datetime.now(),
            questions=questions,
            is_best_score=is_best_score
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{subject_id}/topics/{topic_title}/quiz/results")
async def get_quiz_results_history(
    subject_id: int,
    topic_title: str,
    student_id: int = Query(..., description="Student ID for user-specific quiz results")
):
    """Get quiz results history for a student."""
    try:
        from urllib.parse import unquote
        import json
        
        topic_title = unquote(topic_title)
        
        # Get difficulty level
        difficulty_level = db.get_student_subject_difficulty(student_id, subject_id)
        if not difficulty_level:
            raise HTTPException(status_code=400, detail="Difficulty level required")
        
        # Get quiz
        existing_quiz = db.get_quiz(student_id, subject_id, topic_title, difficulty_level)
        if not existing_quiz:
            # Return empty results if no quiz exists yet
            return {
                "quiz_id": None,
                "topic_title": topic_title,
                "total_attempts": 0,
                "best_score": None,
                "best_percentage": None,
                "results_history": []
            }
        
        # Get all results
        results = db.get_quiz_results(student_id, existing_quiz['id'])
        best_result = db.get_best_quiz_result(student_id, existing_quiz['id'])
        
        return {
            "quiz_id": existing_quiz['id'],
            "topic_title": topic_title,
            "total_attempts": len(results),
            "best_score": best_result['score'] if best_result else None,
            "best_percentage": best_result['percentage'] if best_result else None,
            "results_history": [
                {
                    "id": r['id'],
                    "score": r['score'],
                    "percentage": r['percentage'],
                    "submitted_at": r['submitted_at'],
                    "is_best": r['score'] == best_result['score'] if best_result else False
                }
                for r in results
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 