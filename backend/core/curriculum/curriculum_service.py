
# app/curriculum/curriculum_service.py

from backend.core.curriculum.llm_client import query_llm
from backend.core.curriculum.prompts import get_topics_prompt, get_chapters_prompt
import re

def _parse_list(text: str) -> list[str]:
    """Parses a numbered list from the LLM's response."""
    return [item.strip() for item in re.findall(r"\d+\.\s*(.*)", text)]

def generate_topics(subject: str, level: str) -> list[str]:
    """Generates a list of topics for a given subject and level."""
    prompt = get_topics_prompt(subject, level)
    response = query_llm(prompt)
    return _parse_list(response)

def generate_chapters(topic: str, level: str) -> list[str]:
    """Generates a list of chapters for a given topic and level."""
    prompt = get_chapters_prompt(topic, level)
    response = query_llm(prompt)
    return _parse_list(response)
