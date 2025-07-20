
# app/curriculum/prompts.py

def get_topics_prompt(subject: str, level: str) -> str:
    return f"""
    You are an expert curriculum designer.
    Generate a list of 10-15 high-level topics for a course in '{subject}' 
    at the '{level}' level.
    
    Return your response as a valid JSON array of objects, where each object has:
    - "title": The topic name (concise, 2-6 words)
    - "description": A brief description of what this topic covers (1-2 sentences)
    
    Example format:
    [
        {{"title": "Introduction to Algebra", "description": "Basic algebraic concepts including variables, expressions, and simple equations."}},
        {{"title": "Linear Equations", "description": "Solving and graphing linear equations in one and two variables."}}
    ]
    
    Ensure the JSON is valid and properly formatted. Do not include any additional text outside the JSON array.
    """

def get_chapters_prompt(topic: str, level: str) -> str:
    return f"""
    You are an expert curriculum designer.
    For the topic '{topic}' at the '{level}' level, generate a detailed, 
    chapter-level syllabus with 8-12 chapters.
    
    Return your response as a valid JSON array of objects, where each object has:
    - "title": The chapter name (concise, 3-8 words)
    - "content": Detailed chapter content including key concepts, learning objectives, and important points (2-4 paragraphs)
    
    Example format:
    [
        {{"title": "Chapter 1: Basic Concepts", "content": "This chapter introduces fundamental concepts...\\n\\nKey learning objectives include...\\n\\nStudents will explore important topics such as..."}},
        {{"title": "Chapter 2: Advanced Applications", "content": "Building on previous knowledge, this chapter covers..."}}
    ]
    
    Ensure the JSON is valid and properly formatted. Do not include any additional text outside the JSON array.
    Make the content comprehensive and educational, suitable for the {level} level.
    """
