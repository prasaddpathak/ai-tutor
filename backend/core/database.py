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
            conn.execute('DROP TABLE IF EXISTS quiz_results')
            conn.execute('DROP TABLE IF EXISTS quizzes')
            conn.execute('DROP TABLE IF EXISTS student_progress')
            conn.execute('DROP TABLE IF EXISTS student_subject_preferences')
            conn.execute('DROP TABLE IF EXISTS student_subject_difficulty') 
            conn.execute('DROP TABLE IF EXISTS subjects')
            conn.execute('DROP TABLE IF EXISTS students')
            
            # Students table (clean, no difficulty_level, with language preference)
            conn.execute('''
                CREATE TABLE students (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    language_preference TEXT DEFAULT 'en' CHECK (language_preference IN ('en', 'es')),
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
            
            # Quizzes table
            conn.execute('''
                CREATE TABLE quizzes (
                    id TEXT PRIMARY KEY,
                    student_id INTEGER NOT NULL,
                    subject_id INTEGER NOT NULL,
                    topic_title TEXT NOT NULL,
                    difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('Foundation', 'Intermediate', 'Advanced', 'Expert')),
                    questions_json TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(student_id, subject_id, topic_title, difficulty_level),
                    FOREIGN KEY (student_id) REFERENCES students (id),
                    FOREIGN KEY (subject_id) REFERENCES subjects (id)
                )
            ''')
            
            # Quiz results table
            conn.execute('''
                CREATE TABLE quiz_results (
                    id TEXT PRIMARY KEY,
                    quiz_id TEXT NOT NULL,
                    student_id INTEGER NOT NULL,
                    answers_json TEXT NOT NULL,
                    score INTEGER NOT NULL,
                    percentage REAL NOT NULL,
                    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (quiz_id) REFERENCES quizzes (id),
                    FOREIGN KEY (student_id) REFERENCES students (id)
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
    
    def create_student(self, name: str, language_preference: str = 'en') -> int:
        """Create a new student profile with language preference."""
        with self.get_connection() as conn:
            cursor = conn.execute(
                'INSERT INTO students (name, language_preference) VALUES (?, ?)',
                (name, language_preference)
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
    
    def update_student_language(self, student_id: int, language_preference: str):
        """Update student's language preference."""
        with self.get_connection() as conn:
            conn.execute(
                'UPDATE students SET language_preference = ? WHERE id = ?',
                (language_preference, student_id)
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
    
    # Quiz-related methods
    
    def create_quiz(self, quiz_id: str, student_id: int, subject_id: int, 
                   topic_title: str, difficulty_level: str, questions_json: str) -> str:
        """Create a new quiz for a student."""
        with self.get_connection() as conn:
            conn.execute('''
                INSERT OR REPLACE INTO quizzes 
                (id, student_id, subject_id, topic_title, difficulty_level, questions_json)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (quiz_id, student_id, subject_id, topic_title, difficulty_level, questions_json))
            return quiz_id
    
    def get_quiz(self, student_id: int, subject_id: int, topic_title: str, difficulty_level: str) -> Optional[Dict]:
        """Get quiz for a specific student-subject-topic-difficulty combination."""
        with self.get_connection() as conn:
            row = conn.execute('''
                SELECT * FROM quizzes
                WHERE student_id = ? AND subject_id = ? AND topic_title = ? AND difficulty_level = ?
            ''', (student_id, subject_id, topic_title, difficulty_level)).fetchone()
            return dict(row) if row else None
    
    def save_quiz_result(self, result_id: str, quiz_id: str, student_id: int, 
                        answers_json: str, score: int, percentage: float) -> str:
        """Save a quiz result."""
        with self.get_connection() as conn:
            conn.execute('''
                INSERT INTO quiz_results 
                (id, quiz_id, student_id, answers_json, score, percentage)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (result_id, quiz_id, student_id, answers_json, score, percentage))
            return result_id
    
    def get_quiz_results(self, student_id: int, quiz_id: str) -> List[Dict]:
        """Get all quiz results for a student on a specific quiz."""
        with self.get_connection() as conn:
            rows = conn.execute('''
                SELECT * FROM quiz_results
                WHERE student_id = ? AND quiz_id = ?
                ORDER BY submitted_at DESC
            ''', (student_id, quiz_id)).fetchall()
            return [dict(row) for row in rows]
    
    def get_best_quiz_result(self, student_id: int, quiz_id: str) -> Optional[Dict]:
        """Get the best (highest scoring) quiz result for a student on a specific quiz."""
        with self.get_connection() as conn:
            row = conn.execute('''
                SELECT * FROM quiz_results
                WHERE student_id = ? AND quiz_id = ?
                ORDER BY score DESC, submitted_at ASC
                LIMIT 1
            ''', (student_id, quiz_id)).fetchone()
            return dict(row) if row else None

# Global database instance
db = DatabaseManager()