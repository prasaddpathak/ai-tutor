
# app/curriculum/prompts.py

def get_topics_prompt(subject: str, level: str, user_context: str = None) -> str:
    context_instruction = ""
    if user_context:
        context_instruction = f"""
        
        IMPORTANT CONTEXT - The student originally requested to learn about: "{user_context}"
        
        Please ensure your curriculum design specifically addresses their original learning interest while maintaining academic rigor.
        Tailor the topics to be relevant to their stated goals and interests.
        Consider how each topic connects to their original request and learning motivation.
        """
    
    return f"""
    You are an expert curriculum designer and educational specialist.
    Generate a list of 10-15 high-level topics for a course in '{subject}' 
    at the '{level}' level.{context_instruction}
    
    CRITICAL REQUIREMENTS:
    - Arrange topics in LOGICAL LEARNING ORDER from foundational concepts to advanced applications
    - Each topic should build upon previous topics naturally
    - Start with fundamental concepts and prerequisites
    - Progress to intermediate concepts that use the fundamentals
    - End with advanced topics and real-world applications
    - Consider the cognitive load and learning progression appropriate for {level} level
    {f"- Make sure the curriculum is specifically relevant to the student's original interest: '{user_context}'" if user_context else ""}
    
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
    return f"""
    You are an expert curriculum designer and educational specialist.
    For the topic '{topic}' at the '{level}' level, generate a detailed, 
    chapter-level syllabus with 8-12 chapters.
    
    CRITICAL REQUIREMENTS:
    - Arrange chapters in OPTIMAL LEARNING SEQUENCE from basic to advanced
    - Each chapter should logically build upon the previous chapter's content
    - Follow a clear pedagogical progression: Introduction → Core Concepts → Applications → Advanced Topics
    - Consider prerequisite knowledge and skill development at each step
    - Ensure smooth transitions between chapters for {level} level students
    - Include both theoretical understanding and practical application opportunities
    
    Return your response as a valid JSON array of objects, where each object has:
    - "title": The chapter name (concise, 3-8 words that clearly indicate learning progression)
    - "content": Comprehensive chapter content including:
      * Learning objectives for this stage
      * Key concepts introduced (and how they build on previous chapters)
      * Important skills developed
      * Examples and applications relevant to {level} level
      * How this chapter prepares students for subsequent learning (2-4 paragraphs)
    
    Example format:
    [
        {{"title": "Chapter 1: Foundational Concepts", "content": "This introductory chapter establishes the fundamental building blocks students need before progressing further...\\n\\nLearning objectives include understanding basic terminology, recognizing key patterns, and developing initial problem-solving strategies...\\n\\nStudents will master essential skills that serve as prerequisites for all subsequent chapters, ensuring a solid foundation for advanced learning...\\n\\nBy completing this chapter, students will be prepared to tackle more complex concepts introduced in Chapter 2."}},
        {{"title": "Chapter 2: Building Core Skills", "content": "Building directly on Chapter 1's foundations, this chapter develops core competencies and introduces intermediate concepts..."}}
    ]
    
    Ensure the JSON is valid and properly formatted. Do not include any additional text outside the JSON array.
    REMEMBER: The sequence of chapters represents the optimal learning pathway - each chapter should naturally lead to the next.
    Make the content comprehensive and educational, suitable for the {level} level with clear learning progression.
    """

def get_subject_recommendations_prompt(user_request: str) -> str:
    return f"""
    You are an expert educational consultant and curriculum designer.
    A student has expressed interest in learning about: "{user_request}"
    
    Based on their request, recommend exactly 4 specific subject areas that would best address their learning goals.
    Consider:
    - The core academic disciplines that relate to their interest
    - Practical skills they might need
    - Different approaches or perspectives on the topic
    - Prerequisites or foundational subjects if needed
    - Real-world applications and career relevance
    
    For each recommended subject, provide:
    - A clear, concise subject name (2-4 words, suitable for a course catalog)
    - A comprehensive description explaining why this subject is relevant to their request
    - How this subject specifically addresses their learning goals
    - What practical skills or knowledge they'll gain
    
    Return your response as a valid JSON array of objects, where each object has:
    - "name": The subject name (concise, 2-4 words)
    - "description": Detailed explanation of the subject and its relevance (3-4 sentences)
    - "relevance_explanation": Specific explanation of how this addresses their original request (2-3 sentences)
    
    Example format:
    [
        {{"name": "Data Science Fundamentals", "description": "A comprehensive introduction to data analysis, statistical methods, and machine learning techniques. Students learn to collect, clean, analyze, and visualize data to extract meaningful insights. This subject covers Python programming, statistical analysis, data visualization, and basic machine learning algorithms. Practical applications include business analytics, research methodology, and data-driven decision making.", "relevance_explanation": "This directly addresses your interest in understanding data patterns and making data-driven decisions. You'll gain hands-on experience with real datasets and learn industry-standard tools for data analysis."}},
        {{"name": "Business Analytics", "description": "Focuses on applying analytical techniques to solve business problems and optimize decision-making processes. Students learn to use data to identify trends, forecast outcomes, and recommend strategic actions. The subject combines statistical analysis with business acumen to drive organizational success.", "relevance_explanation": "This provides the business context for data analysis that you mentioned, teaching you how to translate data insights into actionable business strategies."}}
    ]
    
    Ensure the JSON is valid and properly formatted. Do not include any additional text outside the JSON array.
    Make each subject recommendation specific, practical, and clearly connected to the student's original request.
    """
