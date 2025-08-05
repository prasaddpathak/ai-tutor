
# app/curriculum/curriculum_service.py

from .llm_client import query_llm
from .prompts import get_topics_prompt, get_chapters_prompt, get_subject_recommendations_prompt
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))
from models.curriculum import Topic, Chapter
from ..database import db
from .translation_service import translation_service
import json
import re
import uuid
import logging
from typing import List, Dict, Optional
from fastapi import HTTPException

# Setup logging
logger = logging.getLogger(__name__)

def _clean_markdown_text(text: str) -> str:
    """Clean up markdown formatting from text."""
    if not text:
        return ""
    
    # Remove extra markdown formatting
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)  # Remove bold formatting
    text = re.sub(r'\*(.*?)\*', r'\1', text)      # Remove italic formatting
    text = re.sub(r'^#+\s*', '', text, flags=re.MULTILINE)  # Remove header marks
    text = re.sub(r'^[\d\.\)\-\*]+\s*', '', text, flags=re.MULTILINE)  # Remove list markers
    
    # Clean up extra whitespace
    text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)  # Remove excessive line breaks
    text = re.sub(r'^\s+|\s+$', '', text, flags=re.MULTILINE)  # Remove leading/trailing spaces
    text = text.strip()
    
    return text

def _extract_json_from_response(response: str) -> str:
    """Extract JSON content from LLM response, handling cases where extra text is included."""
    # Look for JSON array pattern
    json_match = re.search(r'\[\s*\{.*?\}\s*\]', response, re.DOTALL)
    if json_match:
        return json_match.group(0)
    
    # Fallback: try to find the content between first [ and last ]
    start_idx = response.find('[')
    end_idx = response.rfind(']')
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        return response[start_idx:end_idx + 1]
    
    # If no JSON found, return original response
    return response

def _parse_topics_response(response: str) -> List[Topic]:
    """Parse LLM response into Topic objects."""
    try:
        # Extract JSON from response
        json_content = _extract_json_from_response(response)
        
        # Parse JSON
        topics_data = json.loads(json_content)
        
        if not isinstance(topics_data, list):
            raise ValueError("Expected JSON array of topics")
        
        topics = []
        for item in topics_data:
            if isinstance(item, dict) and 'title' in item:
                title = _clean_markdown_text(item.get('title', ''))
                description = _clean_markdown_text(item.get('description', ''))
                
                if title:  # Only add if title is not empty
                    topics.append(Topic(title=title, description=description))
        
        return topics
        
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        # Fallback to legacy parsing if JSON parsing fails
        print(f"JSON parsing failed: {e}. Falling back to legacy parsing.")
        return _fallback_parse_list_to_topics(response)

def _parse_chapters_response(response: str) -> List[Chapter]:
    """Parse LLM response into Chapter objects."""
    try:
        # Extract JSON from response
        json_content = _extract_json_from_response(response)
        
        # Parse JSON
        chapters_data = json.loads(json_content)
        
        if not isinstance(chapters_data, list):
            raise ValueError("Expected JSON array of chapters")
        
        chapters = []
        for item in chapters_data:
            if isinstance(item, dict) and 'title' in item:
                title = _clean_markdown_text(item.get('title', ''))
                content = _clean_markdown_text(item.get('content', ''))
                
                if title:  # Only add if title is not empty
                    chapters.append(Chapter(title=title, content=content))
        
        return chapters
        
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        # Fallback to legacy parsing if JSON parsing fails
        print(f"JSON parsing failed: {e}. Falling back to legacy parsing.")
        return _fallback_parse_list_to_chapters(response)

def _fallback_parse_list_to_topics(text: str) -> List[Topic]:
    """Fallback parser for numbered list format to Topic objects."""
    items = [item.strip() for item in re.findall(r"\d+\.\s*(.*)", text)]
    topics = []
    
    for item in items:
        if item:
            # Try to split title and description
            if '**' in item:
                match = re.match(r'\*\*(.*?)\*\*(.*)', item)
                if match:
                    title = _clean_markdown_text(match.group(1))
                    description = _clean_markdown_text(match.group(2))
                else:
                    title = _clean_markdown_text(item)
                    description = ""
            else:
                title = _clean_markdown_text(item)
                description = ""
            
            if title:
                topics.append(Topic(title=title, description=description))
    
    return topics

def _fallback_parse_list_to_chapters(text: str) -> List[Chapter]:
    """Fallback parser for numbered list format to Chapter objects."""
    items = [item.strip() for item in re.findall(r"\d+\.\s*(.*)", text)]
    chapters = []
    
    for item in items:
        if item:
            # Try to extract title and use full item as content
            if '**' in item:
                match = re.match(r'\*\*(.*?)\*\*(.*)', item)
                if match:
                    title = _clean_markdown_text(match.group(1))
                    content = _clean_markdown_text(item)
                else:
                    title = _clean_markdown_text(item.split('\n')[0])
                    content = _clean_markdown_text(item)
            else:
                title = _clean_markdown_text(item.split('\n')[0])
                content = _clean_markdown_text(item)
            
            if title:
                chapters.append(Chapter(title=title, content=content))
    
    return chapters

def generate_topics(subject: str, level: str, user_context: str = None) -> List[Topic]:
    """Generates a list of Topic objects for a given subject and level, optionally considering user context."""
    prompt = get_topics_prompt(subject, level, user_context)
    response = query_llm(prompt)
    return _parse_topics_response(response)

def generate_and_store_topics(student_id: int, subject_id: int, subject_name: str, 
                             difficulty_level: str, user_context: str = None) -> List[Topic]:
    """Generate topics and store them persistently with automatic translation."""
    logger.info(f"Generating topics for student {student_id}, subject {subject_id}")
    
    # Check if topics already exist
    content_id = f"topics_{student_id}_{subject_id}_{difficulty_level}"
    existing_content = db.get_generated_content(
        student_id=student_id,
        subject_id=subject_id,
        content_type='topics',
        difficulty_level=difficulty_level
    )
    
    if existing_content:
        logger.info(f"Using existing topics for {content_id}")
        topics_data = json.loads(existing_content['content_json'])
        return [Topic(title=topic['title'], description=topic.get('description', '')) for topic in topics_data]
    
    # Generate new topics
    topics = generate_topics(subject_name, difficulty_level, user_context)
    topics_json = [{'title': topic.title, 'description': topic.description} for topic in topics]
    
    # Store the generated content
    db.save_generated_content(
        content_id=content_id,
        student_id=student_id,
        subject_id=subject_id,
        content_type='topics',
        difficulty_level=difficulty_level,
        content_json=json.dumps(topics_json)
    )
    
    # Queue Spanish translation
    translation_service.queue_translation(content_id, 'es')
    
    # Trigger translation in background (non-blocking)
    try:
        translation_service.translate_content(content_id, 'es')
        logger.info(f"Spanish translation completed for topics {content_id}")
    except Exception as e:
        logger.error(f"Spanish translation failed for topics {content_id}: {str(e)}")
    
    return topics

def generate_chapters(topic: str, level: str) -> List[Chapter]:
    """Generates a list of Chapter objects for a given topic and level."""
    prompt = get_chapters_prompt(topic, level)
    response = query_llm(prompt)
    return _parse_chapters_response(response)

def generate_and_store_chapters(student_id: int, subject_id: int, topic_title: str,
                               difficulty_level: str) -> List[Chapter]:
    """Generate chapters and store them persistently with automatic translation."""
    logger.info(f"Generating chapters for student {student_id}, topic {topic_title}")
    
    # Check if chapters already exist
    content_id = f"chapters_{student_id}_{subject_id}_{topic_title}_{difficulty_level}"
    existing_content = db.get_generated_content(
        student_id=student_id,
        subject_id=subject_id,
        content_type='chapters',
        difficulty_level=difficulty_level,
        topic_title=topic_title
    )
    
    if existing_content:
        logger.info(f"Using existing chapters for {content_id}")
        chapters_data = json.loads(existing_content['content_json'])
        return [Chapter(title=chapter['title'], content=chapter['content']) for chapter in chapters_data]
    
    # Generate new chapters
    chapters = generate_chapters(topic_title, difficulty_level)
    chapters_json = [{'title': chapter.title, 'content': chapter.content} for chapter in chapters]
    
    # Store the generated content
    db.save_generated_content(
        content_id=content_id,
        student_id=student_id,
        subject_id=subject_id,
        content_type='chapters',
        difficulty_level=difficulty_level,
        content_json=json.dumps(chapters_json),
        topic_title=topic_title
    )
    
    # Queue Spanish translation
    translation_service.queue_translation(content_id, 'es')
    
    # Trigger translation in background (non-blocking)
    try:
        translation_service.translate_content(content_id, 'es')
        logger.info(f"Spanish translation completed for chapters {content_id}")
    except Exception as e:
        logger.error(f"Spanish translation failed for chapters {content_id}: {str(e)}")
    
    return chapters

def _parse_subject_recommendations_response(response: str) -> List[Dict]:
    """Parse LLM response into subject recommendation objects."""
    try:
        # Extract JSON from response
        json_content = _extract_json_from_response(response)
        
        # Parse JSON
        subjects_data = json.loads(json_content)
        
        if not isinstance(subjects_data, list):
            raise ValueError("Expected JSON array of subject recommendations")
        
        subjects = []
        for item in subjects_data:
            if isinstance(item, dict) and 'name' in item and 'description' in item:
                name = _clean_markdown_text(item.get('name', ''))
                description = _clean_markdown_text(item.get('description', ''))
                relevance_explanation = _clean_markdown_text(item.get('relevance_explanation', ''))
                
                if name and description:  # Only add if required fields are not empty
                    subjects.append({
                        'name': name,
                        'description': description,
                        'relevance_explanation': relevance_explanation
                    })
        
        return subjects
        
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        print(f"Subject recommendations JSON parsing failed: {e}")
        # Return a fallback response
        return [{
            'name': 'General Studies',
            'description': 'A broad introduction to the topic you requested, covering fundamental concepts and practical applications.',
            'relevance_explanation': 'This subject provides a comprehensive foundation for your learning interests.'
        }]

def generate_subject_recommendations(user_request: str) -> List[Dict]:
    """Generates AI-recommended subjects based on user's natural language request."""
    prompt = get_subject_recommendations_prompt(user_request)
    response = query_llm(prompt)
    return _parse_subject_recommendations_response(response)


def generate_paginated_chapter_content(chapter_title: str, topic_title: str, subject_name: str, difficulty_level: str) -> Dict:
    """Generate comprehensive, paginated content for a specific chapter."""
    from backend.core.curriculum.prompts import get_detailed_chapter_content_prompt
    
    prompt = get_detailed_chapter_content_prompt(chapter_title, topic_title, subject_name, difficulty_level)
    response = query_llm(prompt)
    
    # Parse the JSON response directly - no fallbacks
    try:
        # Clean up markdown code blocks if present
        clean_response = response.strip()
        if clean_response.startswith('```json'):
            clean_response = clean_response[7:]  # Remove ```json
        if clean_response.endswith('```'):
            clean_response = clean_response[:-3]  # Remove ```
        clean_response = clean_response.strip()
        
        chapter_data = json.loads(clean_response)
        
        if not isinstance(chapter_data, dict):
            raise ValueError("LLM did not return a JSON object")
        
        # Extract pages directly from the structured response
        pages = []
        for i in range(1, 7):  # pages 1-6
            page_key = f'page_{i}'
            if page_key in chapter_data:
                pages.append(chapter_data[page_key])
            else:
                raise ValueError(f"Missing {page_key} in LLM response")
        
        # Validate that we have exactly 6 pages
        if len(pages) != 6:
            raise ValueError(f"Expected 6 pages, got {len(pages)}")
        
        # Validate chapter_summary exists
        if 'chapter_summary' not in chapter_data:
            raise ValueError("Missing chapter_summary in LLM response")
        
        return {
            'pages': pages,
            'summary': chapter_data['chapter_summary']
        }
        
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        # If JSON parsing fails, it means the LLM didn't follow instructions
        raise HTTPException(
            status_code=500, 
            detail=f"LLM failed to generate proper JSON content: {str(e)}. Raw response: {response[:200]}..."
        )

def generate_and_store_chapter_content(student_id: int, subject_id: int, chapter_title: str, 
                                      topic_title: str, subject_name: str, difficulty_level: str) -> Dict:
    """Generate paginated chapter content and store it persistently with automatic translation."""
    logger.info(f"Generating chapter content for student {student_id}, chapter {chapter_title}")
    
    # Check if chapter content already exists
    content_id = f"chapter_detail_{student_id}_{subject_id}_{topic_title}_{chapter_title}_{difficulty_level}"
    existing_content = db.get_generated_content(
        student_id=student_id,
        subject_id=subject_id,
        content_type='chapter_detail',
        difficulty_level=difficulty_level,
        topic_title=topic_title,
        chapter_title=chapter_title
    )
    
    if existing_content:
        logger.info(f"Using existing chapter content for {content_id}")
        chapter_data = json.loads(existing_content['content_json'])
        return {
            'pages': [chapter_data[f'page_{i}'] for i in range(1, 7)],
            'summary': chapter_data['chapter_summary']
        }
    
    # Generate new content
    content_result = generate_paginated_chapter_content(chapter_title, topic_title, subject_name, difficulty_level)
    
    # Prepare content for storage
    chapter_content_json = {
        'page_1': content_result['pages'][0],
        'page_2': content_result['pages'][1],
        'page_3': content_result['pages'][2],
        'page_4': content_result['pages'][3],
        'page_5': content_result['pages'][4],
        'page_6': content_result['pages'][5],
        'chapter_summary': content_result['summary']
    }
    
    # Store the generated content
    db.save_generated_content(
        content_id=content_id,
        student_id=student_id,
        subject_id=subject_id,
        content_type='chapter_detail',
        difficulty_level=difficulty_level,
        content_json=json.dumps(chapter_content_json),
        topic_title=topic_title,
        chapter_title=chapter_title
    )
    
    # Queue Spanish translation
    translation_service.queue_translation(content_id, 'es')
    
    # Trigger translation in background (non-blocking)
    try:
        translation_service.translate_content(content_id, 'es')
        logger.info(f"Spanish translation completed for chapter content {content_id}")
    except Exception as e:
        logger.error(f"Spanish translation failed for chapter content {content_id}: {str(e)}")
    
    return content_result

def get_content_by_language(student_id: int, subject_id: int, content_type: str,
                           difficulty_level: str, language_code: str,
                           topic_title: str = None, chapter_title: str = None, allow_fallback: bool = True) -> Optional[Dict]:
    """Get content in specified language, optionally falling back to English if translation not available."""
    
    # Generate content ID
    if content_type == 'topics':
        content_id = f"topics_{student_id}_{subject_id}_{difficulty_level}"
    elif content_type == 'chapters':
        content_id = f"chapters_{student_id}_{subject_id}_{topic_title}_{difficulty_level}"
    elif content_type == 'chapter_detail':
        content_id = f"chapter_detail_{student_id}_{subject_id}_{topic_title}_{chapter_title}_{difficulty_level}"
    else:
        return None
    
    # Try to get translated content first
    if language_code != 'en':
        translated_content = translation_service.get_translated_content(content_id, language_code)
        if translated_content:
            return translated_content['translated_content']
        
        # If no fallback allowed and translation not available, return None
        if not allow_fallback:
            logger.info(f"No translation available for {content_id} in {language_code} and fallback disabled")
            return None
    
    # Fall back to English content (only if fallback is allowed)
    original_content = db.get_generated_content(
        student_id=student_id,
        subject_id=subject_id,
        content_type=content_type,
        difficulty_level=difficulty_level,
        topic_title=topic_title,
        chapter_title=chapter_title
    )
    
    if original_content:
        return json.loads(original_content['content_json'])
    
    return None
