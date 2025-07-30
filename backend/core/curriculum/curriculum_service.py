
# app/curriculum/curriculum_service.py

from backend.core.curriculum.llm_client import query_llm
from backend.core.curriculum.prompts import get_topics_prompt, get_chapters_prompt
from backend.models.curriculum import Topic, Chapter, ChapterPage
import json
import re
from typing import List

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

def generate_topics(subject: str, level: str) -> List[Topic]:
    """Generates a list of Topic objects for a given subject and level."""
    prompt = get_topics_prompt(subject, level)
    response = query_llm(prompt)
    return _parse_topics_response(response)

def generate_chapters(topic: str, level: str) -> List[Chapter]:
    """Generates a list of Chapter objects for a given topic and level."""
    prompt = get_chapters_prompt(topic, level)
    response = query_llm(prompt)
    return _parse_chapters_response(response)

# Add new function for generating paginated content with advanced prompt engineering
def generate_paginated_chapter_content(chapter_title: str, chapter_description: str, level: str) -> List[ChapterPage]:
    """Generate paginated content for a specific chapter using advanced sub-querying."""
    
    # Step 1: Generate page structure/outline
    structure_prompt = f"""You are an expert educational content architect.

Based on this chapter overview:
Title: {chapter_title}
Description: {chapter_description}
Level: {level}

Create a well-structured outline of 3-5 pages that will break down this chapter into logical, progressive sections.

CRITICAL REQUIREMENTS:
1. Each page should focus on ONE key concept or skill
2. Pages should build upon each other logically
3. Include clear learning objectives for each page
4. Estimate reading time for each page (3-6 minutes)

OUTPUT FORMAT:
Return a valid JSON array of page outlines:
[
  {{
    "page_number": 1,
    "title": "Clear, descriptive page title",
    "learning_objectives": ["Objective 1", "Objective 2"],
    "key_concepts": ["Concept 1", "Concept 2", "Concept 3"],
    "estimated_read_time": 4
  }},
  ...
]

Generate the JSON array now:"""
    
    structure_response = query_llm(structure_prompt)
    
    try:
        # Parse structure response
        structure_json = _extract_json_from_response(structure_response)
        page_structures = json.loads(structure_json)
        
        if not isinstance(page_structures, list):
            raise ValueError("Expected JSON array of page structures")
        
        # Step 2: Generate detailed content for each page
        detailed_pages = []
        
        for page_structure in page_structures:
            if not isinstance(page_structure, dict):
                continue
                
            page_number = page_structure.get('page_number', 1)
            page_title = page_structure.get('title', f'Page {page_number}')
            learning_objectives = page_structure.get('learning_objectives', [])
            key_concepts = page_structure.get('key_concepts', [])
            estimated_read_time = page_structure.get('estimated_read_time', 4)
            
            # Generate detailed content for this specific page
            content_prompt = f"""You are an expert educational content writer.

Create detailed, engaging content for this specific page:

CHAPTER CONTEXT:
Title: {chapter_title}
Description: {chapter_description}
Level: {level}

PAGE DETAILS:
Title: {page_title}
Learning Objectives: {', '.join(learning_objectives)}
Key Concepts to Cover: {', '.join(key_concepts)}
Target Reading Time: {estimated_read_time} minutes

CONTENT REQUIREMENTS:
1. Write 400-600 words of educational content
2. Start with a brief introduction connecting to previous pages
3. Use clear section headings to organize content
4. Include practical examples and real-world applications
5. Use bullet points and numbered lists where appropriate
6. End with a summary that transitions to the next page
7. Make it engaging and easy to understand for {level} level

FORMATTING GUIDELINES:
- Use markdown formatting for headings (##, ###)
- Use **bold** for key terms and concepts
- Use bullet points (•) for lists
- Include code blocks with ``` if relevant
- Use > for important callouts or tips

Generate the detailed content now:"""
            
            content_response = query_llm(content_prompt)
            content = _clean_markdown_text(content_response)
            
            # Create the page object
            page = ChapterPage(
                page_number=page_number,
                title=_clean_markdown_text(page_title),
                content=content,
                estimated_read_time=estimated_read_time
            )
            detailed_pages.append(page)
        
        return detailed_pages
        
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        print(f"Error in advanced content generation: {e}")
        # Fallback to simple generation if advanced method fails
        return _fallback_generate_simple_pages(chapter_title, chapter_description, level)

def _fallback_generate_simple_pages(chapter_title: str, chapter_description: str, level: str) -> List[ChapterPage]:
    """Fallback method for simple page generation."""
    return [ChapterPage(
        page_number=1,
        title=chapter_title,
        content=chapter_description,
        estimated_read_time=5
    )]
