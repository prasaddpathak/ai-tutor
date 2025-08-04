"""
Pydantic models for curriculum and subject endpoints
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Subject(BaseModel):
    id: int
    name: str
    description: str
    difficulty_level: Optional[str] = None  # For when subject is retrieved with student-specific difficulty

class Topic(BaseModel):
    title: str
    description: Optional[str] = None

class Chapter(BaseModel):
    title: str
    content: str

class GenerateTopicsRequest(BaseModel):
    subject_name: str
    difficulty_level: str

class GenerateChaptersRequest(BaseModel):
    topic_title: str
    difficulty_level: str

class StudentProgress(BaseModel):
    id: int
    student_id: int
    subject_id: int
    topic: str
    chapter: str
    completed: bool
    quiz_score: Optional[float] = None
    created_at: datetime
    subject_name: Optional[str] = None

class UpdateProgressRequest(BaseModel):
    topic: str
    chapter: str
    completed: bool = False
    quiz_score: Optional[float] = None

class SetSubjectDifficultyRequest(BaseModel):
    subject_id: int
    difficulty_level: str = Field(..., description="Difficulty level: Foundation, Intermediate, Advanced, Expert")

class SubjectDifficultyResponse(BaseModel):
    subject_id: int
    difficulty_level: str
    created_at: datetime
    updated_at: datetime

# Quiz models
class QuizQuestion(BaseModel):
    id: str
    question: str
    options: List[str]  # 4 multiple choice options
    correct_answer: int  # Index of correct answer (0-3)
    explanation: str

class Quiz(BaseModel):
    id: str
    subject_id: int
    topic_title: str
    difficulty_level: str
    questions: List[QuizQuestion]
    created_at: datetime

class QuizSubmission(BaseModel):
    quiz_id: str
    student_id: int
    answers: List[int]  # List of selected answer indices

class QuizResult(BaseModel):
    id: str
    quiz_id: str
    student_id: int
    answers: List[int]
    score: int  # Number of correct answers (0-20)
    percentage: float  # Score as percentage
    submitted_at: datetime

class QuizResultWithDetails(BaseModel):
    id: str
    quiz_id: str
    student_id: int
    answers: List[int]
    score: int
    percentage: float
    submitted_at: datetime
    questions: List[QuizQuestion]  # Include questions for review
    is_best_score: Optional[bool] = False

# Available difficulty levels
DIFFICULTY_LEVELS = ["Foundation", "Intermediate", "Advanced", "Expert"] 