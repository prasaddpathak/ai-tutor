"""
Pydantic models for authentication endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Student name")
    language_preference: str = Field(default='en', pattern='^(en|es)$', description="Student language preference")

class LoginRequest(BaseModel):
    pass  # Face authentication doesn't need request body

class StudentResponse(BaseModel):
    id: int
    name: str
    language_preference: str = 'en'
    created_at: datetime
    last_login: datetime

class AuthResponse(BaseModel):
    success: bool
    message: str
    student: Optional[StudentResponse] = None
    token: Optional[str] = None  # For future JWT implementation

class UpdateLanguageRequest(BaseModel):
    language_preference: str = Field(..., pattern='^(en|es)$', description="New language preference")

class CameraInfo(BaseModel):
    index: int
    name: str
    available: bool 