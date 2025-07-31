
# app/curriculum/curriculum_service.py

from backend.core.curriculum.llm_client import query_llm
from backend.core.curriculum.prompts import get_topics_prompt, get_chapters_prompt, get_subject_recommendations_prompt
from backend.models.curriculum import Topic, Chapter
import json
import re
from typing import List, Dict

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

def generate_chapters(topic: str, level: str) -> List[Chapter]:
    """Generates a list of Chapter objects for a given topic and level."""
    prompt = get_chapters_prompt(topic, level)
    response = query_llm(prompt)
    return _parse_chapters_response(response)

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
