
# app/curriculum/prompts.py

def get_topics_prompt(subject: str, level: str) -> str:
    return f"""
    You are an expert curriculum designer.
    Generate a list of 10-15 high-level topics for a course in '{subject}' 
    at the '{level}' level.
    Return the topics as a numbered list.
    """

def get_chapters_prompt(topic: str, level: str) -> str:
    return f"""
    You are an expert curriculum designer.
    For the topic '{topic}' at the '{level}' level, generate a detailed, 
    chapter-level syllabus.
    Each chapter should cover a specific concept.
    Return the chapters as a numbered list.
    """
