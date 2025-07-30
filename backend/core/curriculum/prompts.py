
# app/curriculum/prompts.py

def get_topics_prompt(subject: str, level: str) -> str:
    return f"""
    You are an expert curriculum designer and educational specialist.
    Generate a list of 10-15 high-level topics for a course in '{subject}' 
    at the '{level}' level.
    
    CRITICAL REQUIREMENTS:
    - Arrange topics in LOGICAL LEARNING ORDER from foundational concepts to advanced applications
    - Each topic should build upon previous topics naturally
    - Start with fundamental concepts and prerequisites
    - Progress to intermediate concepts that use the fundamentals
    - End with advanced topics and real-world applications
    - Consider the cognitive load and learning progression appropriate for {level} level
    
    Return your response as a valid JSON array of objects, where each object has:
    - "title": The topic name (concise, 2-6 words)
    - "description": A brief description explaining what this topic covers and why it comes at this point in the learning sequence (2-3 sentences)
    
    Example format:
    [
        {{"title": "Introduction to Algebra", "description": "Foundation concepts including variables, expressions, and basic operations. This forms the essential groundwork for all subsequent algebraic learning. Students must master these fundamentals before proceeding to equations."}},
        {{"title": "Linear Equations", "description": "Building on algebraic fundamentals, students learn to solve and graph linear equations in one and two variables. This logical next step applies the basic concepts in structured problem-solving contexts."}}
    ]
    
    Ensure the JSON is valid and properly formatted. Do not include any additional text outside the JSON array.
    REMEMBER: The order of topics in your response represents the optimal learning sequence.
    """

def get_chapters_prompt(topic: str, level: str) -> str:
    """Get the prompt for generating chapters for a given topic and level."""
    
    level_descriptions = {
        "School": "elementary to middle school level (ages 8-14)",
        "High School": "high school level (ages 14-18)", 
        "Intermediate": "college/university level (ages 18-22)",
        "Advanced": "graduate/professional level (ages 22+)"
    }
    
    level_desc = level_descriptions.get(level, "appropriate for the specified level")
    
    return f"""You are an expert curriculum designer and educational specialist.
For the topic '{topic}' at the '{level_desc}' level, generate a detailed, 
chapter-level syllabus with 6-8 chapters.

CRITICAL REQUIREMENTS:
- Arrange chapters in OPTIMAL LEARNING SEQUENCE from basic to advanced
- Each chapter should logically build upon the previous chapter's content
- Follow a clear pedagogical progression: Introduction → Core Concepts → Applications → Advanced Topics
- Consider prerequisite knowledge and skill development at each step
- Ensure smooth transitions between chapters for {level_desc} students
- Include both theoretical understanding and practical application opportunities

Return your response as a valid JSON array of objects, where each object has:
- "title": The chapter name (concise, 3-8 words that clearly indicate learning progression)
- "content": Comprehensive chapter description including:
  * Learning objectives for this stage
  * Key concepts introduced (and how they build on previous chapters)
  * Important skills developed
  * Examples and applications relevant to {level_desc}
  * How this chapter prepares students for subsequent learning (2-4 paragraphs)

Example format:
[
    {{"title": "Chapter 1: Foundational Concepts", "content": "This introductory chapter establishes the fundamental building blocks students need before progressing further...\\n\\nLearning objectives include understanding basic terminology, recognizing key patterns, and developing initial problem-solving strategies...\\n\\nStudents will master essential skills that serve as prerequisites for all subsequent chapters, ensuring a solid foundation for advanced learning...\\n\\nBy completing this chapter, students will be prepared to tackle more complex concepts introduced in Chapter 2."}},
    {{"title": "Chapter 2: Building Core Skills", "content": "Building directly on Chapter 1's foundations, this chapter develops core competencies and introduces intermediate concepts..."}}
]

Ensure the JSON is valid and properly formatted. Do not include any additional text outside the JSON array.
REMEMBER: The sequence of chapters represents the optimal learning pathway - each chapter should naturally lead to the next.
Make the content comprehensive and educational, suitable for the {level_desc} with clear learning progression.

Topic: {topic}
Level: {level_desc}

Generate the JSON array now:"""
