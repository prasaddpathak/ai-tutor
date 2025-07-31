"""
Database module for AI Tutor application
Handles SQLite database operations for student profiles and progress tracking
"""

import sqlite3
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import json

# Database file location (relative to project root)
DB_PATH = Path("backend/data/ai_tutor.db")
DB_PATH.parent.mkdir(exist_ok=True)

class DatabaseManager:
    """Manages all database operations for the AI Tutor application."""
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or str(DB_PATH)
        self.init_database()
    
    def get_connection(self) -> sqlite3.Connection:
        """Get a database connection with row factory."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_database(self):
        """Initialize database with required tables. Drops and recreates all tables for clean state."""
        with self.get_connection() as conn:
            # Drop all existing tables for clean state (no migrations needed in early development)
            conn.execute('DROP TABLE IF EXISTS student_progress')
            conn.execute('DROP TABLE IF EXISTS student_subject_preferences')
            conn.execute('DROP TABLE IF EXISTS student_subject_difficulty') 
            conn.execute('DROP TABLE IF EXISTS subjects')
            conn.execute('DROP TABLE IF EXISTS students')
            
            # Students table (clean, no difficulty_level)
            conn.execute('''
                CREATE TABLE students (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Subjects table
            conn.execute('''
                CREATE TABLE subjects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    description TEXT
                )
            ''')
            
            # Student-Subject difficulty mapping
            conn.execute('''
                CREATE TABLE student_subject_difficulty (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id INTEGER NOT NULL,
                    subject_id INTEGER NOT NULL,
                    difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('Foundation', 'Intermediate', 'Advanced', 'Expert')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(student_id, subject_id),
                    FOREIGN KEY (student_id) REFERENCES students (id),
                    FOREIGN KEY (subject_id) REFERENCES subjects (id)
                )
            ''')
            
            # Student progress table
            conn.execute('''
                CREATE TABLE student_progress (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id INTEGER NOT NULL,
                    subject_id INTEGER NOT NULL,
                    topic TEXT NOT NULL,
                    chapter TEXT NOT NULL,
                    completed BOOLEAN DEFAULT FALSE,
                    quiz_score REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students (id),
                    FOREIGN KEY (subject_id) REFERENCES subjects (id)
                )
            ''')
            
            # Student subject preferences table (for AI-generated custom subjects)
            conn.execute('''
                CREATE TABLE student_subject_preferences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id INTEGER NOT NULL,
                    subject_id INTEGER NOT NULL,
                    original_request TEXT NOT NULL,
                    ai_generated_description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(student_id, subject_id),
                    FOREIGN KEY (student_id) REFERENCES students (id),
                    FOREIGN KEY (subject_id) REFERENCES subjects (id)
                )
            ''')
            
            # Initialize default subjects
            self._init_default_subjects(conn)
            conn.commit()
    
    def _init_default_subjects(self, conn: sqlite3.Connection):
        """Initialize default subjects from the design spec."""
        default_subjects = [
            ('Computer Science', 'Fundamentals of computer science and algorithms'),
            ('Programming', 'Programming languages and software development'),
            ('Data Science', 'Data analysis, statistics, and machine learning'),
            ('Physics', 'Classical and modern physics concepts'),
            ('Geography', 'Physical and human geography'),
            ('History', 'World history and historical analysis')
        ]
        
        for name, description in default_subjects:
            conn.execute(
                'INSERT OR IGNORE INTO subjects (name, description) VALUES (?, ?)',
                (name, description)
            )
    
    def create_student(self, name: str) -> int:
        """Create a new student profile."""
        with self.get_connection() as conn:
            cursor = conn.execute(
                'INSERT INTO students (name) VALUES (?)',
                (name,)
            )
            return cursor.lastrowid
    
    def get_student_by_name(self, name: str) -> Optional[Dict]:
        """Get student profile by name."""
        with self.get_connection() as conn:
            row = conn.execute(
                'SELECT * FROM students WHERE name = ?', (name,)
            ).fetchone()
            return dict(row) if row else None
    
    def update_student_login(self, student_id: int):
        """Update student's last login timestamp."""
        with self.get_connection() as conn:
            conn.execute(
                'UPDATE students SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                (student_id,)
            )
    
    def get_all_subjects(self) -> List[Dict]:
        """Get all available subjects."""
        with self.get_connection() as conn:
            rows = conn.execute('SELECT * FROM subjects ORDER BY name').fetchall()
            return [dict(row) for row in rows]
    
    def save_student_progress(self, student_id: int, subject_id: int, 
                            topic: str, chapter: str, completed: bool = False, 
                            quiz_score: float = None):
        """Save or update student progress for a chapter."""
        with self.get_connection() as conn:
            conn.execute('''
                INSERT OR REPLACE INTO student_progress 
                (student_id, subject_id, topic, chapter, completed, quiz_score)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (student_id, subject_id, topic, chapter, completed, quiz_score))
    
    def get_student_progress(self, student_id: int, subject_id: int = None) -> List[Dict]:
        """Get student progress, optionally filtered by subject."""
        with self.get_connection() as conn:
            if subject_id:
                rows = conn.execute('''
                    SELECT sp.*, s.name as subject_name 
                    FROM student_progress sp
                    JOIN subjects s ON sp.subject_id = s.id
                    WHERE sp.student_id = ? AND sp.subject_id = ?
                    ORDER BY sp.created_at
                ''', (student_id, subject_id)).fetchall()
            else:
                rows = conn.execute('''
                    SELECT sp.*, s.name as subject_name 
                    FROM student_progress sp
                    JOIN subjects s ON sp.subject_id = s.id
                    WHERE sp.student_id = ?
                    ORDER BY sp.created_at
                ''', (student_id,)).fetchall()
            return [dict(row) for row in rows]
    
    def set_student_subject_difficulty(self, student_id: int, subject_id: int, difficulty_level: str):
        """Set difficulty level for a student's subject."""
        with self.get_connection() as conn:
            conn.execute('''
                INSERT OR REPLACE INTO student_subject_difficulty 
                (student_id, subject_id, difficulty_level, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ''', (student_id, subject_id, difficulty_level))
    
    def get_student_subject_difficulty(self, student_id: int, subject_id: int) -> Optional[str]:
        """Get difficulty level for a student's subject."""
        with self.get_connection() as conn:
            row = conn.execute('''
                SELECT difficulty_level FROM student_subject_difficulty
                WHERE student_id = ? AND subject_id = ?
            ''', (student_id, subject_id)).fetchone()
            return row['difficulty_level'] if row else None
    
    def get_student_subject_difficulties(self, student_id: int) -> Dict[int, str]:
        """Get all subject difficulty levels for a student."""
        with self.get_connection() as conn:
            rows = conn.execute('''
                SELECT subject_id, difficulty_level 
                FROM student_subject_difficulty
                WHERE student_id = ?
            ''', (student_id,)).fetchall()
            return {row['subject_id']: row['difficulty_level'] for row in rows}
    
    def get_subjects_with_difficulty(self, student_id: int) -> List[Dict]:
        """Get all subjects with their difficulty levels for a student."""
        with self.get_connection() as conn:
            rows = conn.execute('''
                SELECT s.*, ssd.difficulty_level, ssp.original_request, ssp.ai_generated_description
                FROM subjects s
                LEFT JOIN student_subject_difficulty ssd 
                    ON s.id = ssd.subject_id AND ssd.student_id = ?
                LEFT JOIN student_subject_preferences ssp
                    ON s.id = ssp.subject_id AND ssp.student_id = ?
                ORDER BY s.name
            ''', (student_id, student_id)).fetchall()
            return [dict(row) for row in rows]
    
    def create_custom_subject(self, student_id: int, name: str, description: str, 
                             original_request: str, ai_generated_description: str = None) -> int:
        """Create a custom subject for a student with their original request."""
        with self.get_connection() as conn:
            # First create the subject
            cursor = conn.execute(
                'INSERT INTO subjects (name, description) VALUES (?, ?)',
                (name, description)
            )
            subject_id = cursor.lastrowid
            
            # Then store the student's original request and AI description
            conn.execute('''
                INSERT INTO student_subject_preferences 
                (student_id, subject_id, original_request, ai_generated_description)
                VALUES (?, ?, ?, ?)
            ''', (student_id, subject_id, original_request, ai_generated_description))
            
            return subject_id
    
    def get_student_subject_preference(self, student_id: int, subject_id: int) -> Optional[Dict]:
        """Get student's original request and AI description for a subject."""
        with self.get_connection() as conn:
            row = conn.execute('''
                SELECT original_request, ai_generated_description, created_at
                FROM student_subject_preferences
                WHERE student_id = ? AND subject_id = ?
            ''', (student_id, subject_id)).fetchone()
            return dict(row) if row else None

# Global database instance
db = DatabaseManager()