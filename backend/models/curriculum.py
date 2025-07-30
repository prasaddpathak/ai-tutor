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

class Topic(BaseModel):
    title: str
    description: Optional[str] = None

# Enhanced Chapter model with pages support
class ChapterPage(BaseModel):
    page_number: int
    title: str
    content: str
    estimated_read_time: Optional[int] = None  # minutes

class Chapter(BaseModel):
    title: str
    content: str
    pages: Optional[List[ChapterPage]] = None
    total_pages: Optional[int] = None
    estimated_read_time: Optional[int] = None  # total minutes for entire chapter

class GenerateTopicsRequest(BaseModel):
    subject_name: str
    difficulty_level: str

class GenerateChaptersRequest(BaseModel):
    topic_title: str
    difficulty_level: str

# Enhanced progress tracking models
class PageProgress(BaseModel):
    id: Optional[int] = None
    student_id: int
    subject_id: int
    topic: str
    chapter: str
    page_number: int
    completed: bool = False
    time_spent_minutes: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ChapterProgressSummary(BaseModel):
    chapter: str
    total_pages: int
    completed_pages: int
    completion_percentage: float
    time_spent_minutes: int
    last_page_accessed: Optional[int] = None

class TopicProgressSummary(BaseModel):
    topic: str
    total_chapters: int
    completed_chapters: int
    total_pages: int
    completed_pages: int
    completion_percentage: float
    time_spent_minutes: int

class SubjectProgressSummary(BaseModel):
    subject_id: int
    subject_name: str
    total_topics: int
    completed_topics: int
    total_chapters: int
    completed_chapters: int
    total_pages: int
    completed_pages: int
    completion_percentage: float
    time_spent_minutes: int

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

# Enhanced progress tracking requests
class UpdatePageProgressRequest(BaseModel):
    topic: str
    chapter: str
    page_number: int
    completed: bool = False
    time_spent_minutes: Optional[int] = None

class ProgressAnalyticsRequest(BaseModel):
    student_id: int
    subject_id: Optional[int] = None
    topic: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None 