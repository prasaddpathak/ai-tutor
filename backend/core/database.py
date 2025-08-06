"""
Database module for AI Tutor application
Handles SQLite database operations for student profiles and progress tracking
"""

import sqlite3
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import json

# Database file location - use root data directory for consistency 
ROOT_DIR = Path(__file__).parent.parent.parent  # Go up to project root
DB_PATH = ROOT_DIR / "data" / "ai_tutor.db"
DB_PATH.parent.mkdir(exist_ok=True)

class DatabaseManager:
    """Manages all database operations for the AI Tutor application."""
    
    def __init__(self, db_path: str = None, force_reset: bool = False):
        self.db_path = db_path or str(DB_PATH)
        self.init_database(force_reset=force_reset)
    
    def get_connection(self) -> sqlite3.Connection:
        """Get a database connection with row factory."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_database(self, force_reset: bool = False):
        """Initialize database with required tables."""
        with self.get_connection() as conn:
            # Check if tables already exist
            existing_tables = [row[0] for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()]
            
            # Create tables if they don't exist OR if force_reset is True
            if not existing_tables or 'students' not in existing_tables or force_reset:
                # Drop all existing tables for clean state (no migrations needed in early development)
                conn.execute('DROP TABLE IF EXISTS quiz_results')
                conn.execute('DROP TABLE IF EXISTS quizzes')
                conn.execute('DROP TABLE IF EXISTS student_progress')
                conn.execute('DROP TABLE IF EXISTS student_subject_preferences')
                conn.execute('DROP TABLE IF EXISTS student_subject_difficulty') 
                conn.execute('DROP TABLE IF EXISTS content_translations')
                conn.execute('DROP TABLE IF EXISTS generated_content')
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
                
                # Generated content table (stores original English content)
                conn.execute('''
                    CREATE TABLE generated_content (
                        id TEXT PRIMARY KEY,
                        student_id INTEGER NOT NULL,
                        subject_id INTEGER NOT NULL,
                        content_type TEXT NOT NULL CHECK (content_type IN ('topics', 'chapters', 'chapter_detail')),
                        topic_title TEXT,
                        chapter_title TEXT,
                        difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('Foundation', 'Intermediate', 'Advanced', 'Expert')),
                        content_json TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(student_id, subject_id, content_type, topic_title, chapter_title, difficulty_level),
                        FOREIGN KEY (student_id) REFERENCES students (id),
                        FOREIGN KEY (subject_id) REFERENCES subjects (id)
                    )
                ''')
                
                # Content translations table
                conn.execute('''
                    CREATE TABLE content_translations (
                        id TEXT PRIMARY KEY,
                        content_id TEXT NOT NULL,
                        language_code TEXT NOT NULL CHECK (language_code IN ('en', 'es')),
                        translated_content_json TEXT NOT NULL,
                        translation_status TEXT NOT NULL DEFAULT 'pending' CHECK (translation_status IN ('pending', 'in_progress', 'completed', 'failed')),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(content_id, language_code),
                        FOREIGN KEY (content_id) REFERENCES generated_content (id) ON DELETE CASCADE
                    )
                ''')
                
                # Chat history table
                conn.execute('''
                    CREATE TABLE chat_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        student_id INTEGER NOT NULL,
                        subject_id INTEGER NOT NULL,
                        topic_title TEXT NOT NULL,
                        chapter_title TEXT NOT NULL,
                        difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('Foundation', 'Intermediate', 'Advanced', 'Expert')),
                        user_message TEXT NOT NULL,
                        assistant_message TEXT NOT NULL,
                        current_page INTEGER DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (student_id) REFERENCES students (id),
                        FOREIGN KEY (subject_id) REFERENCES subjects (id)
                    )
                ''')
                
                # Initialize default subjects
                self._init_default_subjects(conn)
                conn.commit()
            else:
                # If tables exist, just ensure default subjects are present
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
    
    def get_student_by_id(self, student_id: int) -> Optional[Dict]:
        """Get student profile by ID."""
        with self.get_connection() as conn:
            row = conn.execute(
                'SELECT * FROM students WHERE id = ?', (student_id,)
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
        """Get subjects with their difficulty levels for a student (default subjects + user's custom subjects only)."""
        with self.get_connection() as conn:
            rows = conn.execute('''
                SELECT s.*, ssd.difficulty_level, ssp.original_request, ssp.ai_generated_description
                FROM subjects s
                LEFT JOIN student_subject_difficulty ssd 
                    ON s.id = ssd.subject_id AND ssd.student_id = ?
                LEFT JOIN student_subject_preferences ssp
                    ON s.id = ssp.subject_id AND ssp.student_id = ?
                WHERE 
                    -- Include default subjects (not in any student_subject_preferences)
                    s.id NOT IN (SELECT DISTINCT subject_id FROM student_subject_preferences)
                    OR 
                    -- Include custom subjects created by this specific student
                    ssp.student_id = ?
                ORDER BY s.name
            ''', (student_id, student_id, student_id)).fetchall()
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

    # Content and Translation methods
    
    def save_generated_content(self, content_id: str, student_id: int, subject_id: int, 
                              content_type: str, difficulty_level: str, content_json: str,
                              topic_title: str = None, chapter_title: str = None) -> str:
        """Save generated content (English original)."""
        with self.get_connection() as conn:
            conn.execute('''
                INSERT OR REPLACE INTO generated_content 
                (id, student_id, subject_id, content_type, topic_title, chapter_title, 
                 difficulty_level, content_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (content_id, student_id, subject_id, content_type, topic_title, 
                  chapter_title, difficulty_level, content_json))
            
            # Invalidate any existing translations for this content
            conn.execute('''
                DELETE FROM content_translations WHERE content_id = ?
            ''', (content_id,))
            
            return content_id
    
    def get_generated_content(self, student_id: int, subject_id: int, content_type: str,
                             difficulty_level: str, topic_title: str = None, 
                             chapter_title: str = None) -> Optional[Dict]:
        """Get generated content by identifiers."""
        with self.get_connection() as conn:
            row = conn.execute('''
                SELECT * FROM generated_content
                WHERE student_id = ? AND subject_id = ? AND content_type = ? 
                AND difficulty_level = ? AND topic_title IS ? AND chapter_title IS ?
            ''', (student_id, subject_id, content_type, difficulty_level, topic_title, chapter_title)).fetchone()
            return dict(row) if row else None
    
    def save_content_translation(self, translation_id: str, content_id: str, 
                                language_code: str, translated_content_json: str,
                                translation_status: str = 'completed') -> str:
        """Save a content translation."""
        with self.get_connection() as conn:
            conn.execute('''
                INSERT OR REPLACE INTO content_translations 
                (id, content_id, language_code, translated_content_json, translation_status, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (translation_id, content_id, language_code, translated_content_json, translation_status))
            return translation_id
    
    def get_content_translation(self, content_id: str, language_code: str) -> Optional[Dict]:
        """Get content translation by content ID and language."""
        with self.get_connection() as conn:
            row = conn.execute('''
                SELECT * FROM content_translations
                WHERE content_id = ? AND language_code = ?
            ''', (content_id, language_code)).fetchone()
            return dict(row) if row else None
    
    def update_translation_status(self, content_id: str, language_code: str, status: str):
        """Update translation status."""
        with self.get_connection() as conn:
            conn.execute('''
                UPDATE content_translations 
                SET translation_status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE content_id = ? AND language_code = ?
            ''', (status, content_id, language_code))
    
    def get_pending_translations(self, language_code: str = 'es') -> List[Dict]:
        """Get all pending translations for a language."""
        with self.get_connection() as conn:
            rows = conn.execute('''
                SELECT ct.*, gc.student_id, gc.subject_id, gc.content_type, 
                       gc.topic_title, gc.chapter_title, gc.difficulty_level, gc.content_json
                FROM content_translations ct
                JOIN generated_content gc ON ct.content_id = gc.id
                WHERE ct.language_code = ? AND ct.translation_status IN ('pending', 'failed')
                ORDER BY ct.created_at ASC
            ''', (language_code,)).fetchall()
            return [dict(row) for row in rows]
    
    def create_translation_entry(self, translation_id: str, content_id: str, language_code: str) -> str:
        """Create a pending translation entry."""
        with self.get_connection() as conn:
            conn.execute('''
                INSERT OR IGNORE INTO content_translations 
                (id, content_id, language_code, translated_content_json, translation_status)
                VALUES (?, ?, ?, '', 'pending')
            ''', (translation_id, content_id, language_code))
            return translation_id
    
    # Chat functionality methods
    def add_chat_message(self, student_id: int, subject_id: int, topic_title: str, 
                        chapter_title: str, difficulty_level: str, user_message: str, 
                        assistant_message: str, current_page: int = 1) -> None:
        """Add a chat message to the database."""
        with self.get_connection() as conn:
            conn.execute('''
                INSERT INTO chat_history 
                (student_id, subject_id, topic_title, chapter_title, difficulty_level, 
                 user_message, assistant_message, current_page)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (student_id, subject_id, topic_title, chapter_title, difficulty_level,
                  user_message, assistant_message, current_page))
    
    def get_chat_history(self, student_id: int, subject_id: int, topic_title: str, 
                        chapter_title: str, difficulty_level: str, limit: int = 50) -> List[Dict]:
        """Get chat history for a specific chapter."""
        with self.get_connection() as conn:
            rows = conn.execute('''
                SELECT user_message, assistant_message, current_page, created_at
                FROM chat_history
                WHERE student_id = ? AND subject_id = ? AND topic_title = ? 
                      AND chapter_title = ? AND difficulty_level = ?
                ORDER BY created_at DESC
                LIMIT ?
            ''', (student_id, subject_id, topic_title, chapter_title, difficulty_level, limit)).fetchall()
            # Return in chronological order (oldest first)
            return [dict(row) for row in reversed(rows)]
    
    def get_chapter_content_from_db(self, student_id: int, subject_id: int, topic_title: str, 
                                   chapter_title: str, difficulty_level: str) -> Optional[Dict]:
        """Get chapter content from the database."""
        with self.get_connection() as conn:
            row = conn.execute('''
                SELECT content_json
                FROM generated_content
                WHERE student_id = ? AND subject_id = ? AND content_type = 'chapter_detail'
                      AND topic_title = ? AND chapter_title = ? AND difficulty_level = ?
            ''', (student_id, subject_id, topic_title, chapter_title, difficulty_level)).fetchone()
            
            if row:
                import json
                return json.loads(row['content_json'])
            return None

# Global database instance
db = DatabaseManager()