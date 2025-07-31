"""
Pydantic models for authentication endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Student name")

class LoginRequest(BaseModel):
    pass  # Face authentication doesn't need request body

class StudentResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    last_login: datetime

class AuthResponse(BaseModel):
    success: bool
    message: str
    student: Optional[StudentResponse] = None
    token: Optional[str] = None  # For future JWT implementation

class CameraInfo(BaseModel):
    index: int
    name: str
    available: bool 