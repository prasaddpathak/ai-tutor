"""
Database module for AI Tutor application
Handles SQLite database operations for student profiles and progress tracking
"""

import sqlite3
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import json
from datetime import datetime

# Database file location (relative to project root)
DB_PATH = Path("backend/data/ai_tutor.db")
DB_PATH.parent.mkdir(exist_ok=True)

class DatabaseManager:
    def get_unified_progress(self, student_id: int):
        """Return all progress for a student, grouped by subject/topic/chapter/page."""
        with self.get_connection() as conn:
            rows = conn.execute('''
                SELECT subject_id, topic, chapter, page_number, completed, time_spent_minutes
                FROM page_progress
                WHERE student_id = ?
                ORDER BY subject_id, topic, chapter, page_number
            ''', (student_id,)).fetchall()
            progress = []
            for row in rows:
                progress.append({
                    'subject_id': row['subject_id'],
                    'topic': row['topic'],
                    'chapter': row['chapter'],
                    'page': row['page_number'],
                    'completed': bool(row['completed']),
                    'time_spent': row['time_spent_minutes']
                })
            return progress

    def save_unified_progress(self, student_id: int, progress: dict):
        """Save or update progress for any granularity (subject/topic/chapter/page)."""
        # Only require subject_id, topic, chapter, page, completed, time_spent
        subject_id = progress.get('subject_id')
        topic = progress.get('topic')
        chapter = progress.get('chapter')
        page = progress.get('page')
        completed = bool(progress.get('completed', False))
        time_spent = progress.get('time_spent', 0)
        with self.get_connection() as conn:
            conn.execute('''
                INSERT OR REPLACE INTO page_progress
                (student_id, subject_id, topic, chapter, page_number, completed, time_spent_minutes, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (student_id, subject_id, topic, chapter, page, completed, time_spent))

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
        """Initialize database with required tables."""
        with self.get_connection() as conn:
            # Students table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS students (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('School', 'High School', 'Intermediate', 'Advanced')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Subjects table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS subjects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    description TEXT
                )
            ''')
            
            # Student progress table (legacy - keeping for compatibility)
            conn.execute('''
                CREATE TABLE IF NOT EXISTS student_progress (
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
            
            # Enhanced page-level progress tracking
            conn.execute('''
                CREATE TABLE IF NOT EXISTS page_progress (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id INTEGER NOT NULL,
                    subject_id INTEGER NOT NULL,
                    topic TEXT NOT NULL,
                    chapter TEXT NOT NULL,
                    page_number INTEGER NOT NULL,
                    completed BOOLEAN DEFAULT FALSE,
                    time_spent_minutes INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students (id),
                    FOREIGN KEY (subject_id) REFERENCES subjects (id),
                    UNIQUE(student_id, subject_id, topic, chapter, page_number)
                )
            ''')
            
            # Create indexes for better performance
            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_page_progress_student 
                ON page_progress(student_id)
            ''')
            
            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_page_progress_subject 
                ON page_progress(student_id, subject_id)
            ''')
            
            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_page_progress_topic 
                ON page_progress(student_id, subject_id, topic)
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
    
    def create_student(self, name: str, difficulty_level: str) -> int:
        """Create a new student profile."""
        with self.get_connection() as conn:
            cursor = conn.execute(
                'INSERT INTO students (name, difficulty_level) VALUES (?, ?)',
                (name, difficulty_level)
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
        """Save or update student progress for a chapter (legacy method)."""
        with self.get_connection() as conn:
            conn.execute('''
                INSERT OR REPLACE INTO student_progress 
                (student_id, subject_id, topic, chapter, completed, quiz_score)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (student_id, subject_id, topic, chapter, completed, quiz_score))
    
    def get_student_progress(self, student_id: int, subject_id: int = None) -> List[Dict]:
        """Get student progress, optionally filtered by subject (legacy method)."""
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

    # New enhanced progress tracking methods
    def save_page_progress(self, student_id: int, subject_id: int, topic: str, 
                          chapter: str, page_number: int, completed: bool = False,
                          time_spent_minutes: int = 0):
        """Save or update page-level progress."""
        with self.get_connection() as conn:
            conn.execute('''
                INSERT OR REPLACE INTO page_progress 
                (student_id, subject_id, topic, chapter, page_number, completed, 
                 time_spent_minutes, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (student_id, subject_id, topic, chapter, page_number, completed, time_spent_minutes))
    
    def get_page_progress(self, student_id: int, subject_id: int = None, 
                         topic: str = None, chapter: str = None) -> List[Dict]:
        """Get page-level progress with optional filters."""
        with self.get_connection() as conn:
            query = '''
                SELECT pp.*, s.name as subject_name 
                FROM page_progress pp
                JOIN subjects s ON pp.subject_id = s.id
                WHERE pp.student_id = ?
            '''
            params = [student_id]
            
            if subject_id:
                query += ' AND pp.subject_id = ?'
                params.append(subject_id)
            if topic:
                query += ' AND pp.topic = ?'
                params.append(topic)
            if chapter:
                query += ' AND pp.chapter = ?'
                params.append(chapter)
            
            query += ' ORDER BY pp.updated_at DESC'
            
            rows = conn.execute(query, params).fetchall()
            return [dict(row) for row in rows]
    
    def get_chapter_progress_summary(self, student_id: int, subject_id: int, 
                                   topic: str, chapter: str, total_pages_in_chapter: int = None) -> Dict:
        """Get chapter progress summary with completion percentages."""
        with self.get_connection() as conn:
            # First get the actual progress data
            row = conn.execute('''
                SELECT 
                    chapter,
                    COUNT(*) as records_count,
                    SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_pages,
                    SUM(time_spent_minutes) as time_spent_minutes,
                    MAX(CASE WHEN completed = 1 THEN page_number ELSE NULL END) as last_completed_page,
                    MAX(page_number) as last_page_accessed
                FROM page_progress 
                WHERE student_id = ? AND subject_id = ? AND topic = ? AND chapter = ?
                GROUP BY chapter
            ''', (student_id, subject_id, topic, chapter)).fetchone()
            
            if row:
                row_dict = dict(row)
                completed_pages = row_dict['completed_pages']
                # Use provided total_pages_in_chapter if available, otherwise fall back to records count
                actual_total_pages = total_pages_in_chapter or row_dict['records_count']
                completion_percentage = (completed_pages * 100.0 / actual_total_pages) if actual_total_pages > 0 else 0.0
                
                return {
                    'chapter': chapter,
                    'total_pages': actual_total_pages,
                    'completed_pages': completed_pages,
                    'completion_percentage': completion_percentage,
                    'time_spent_minutes': row_dict['time_spent_minutes'],
                    'last_completed_page': row_dict['last_completed_page'],
                    'last_page_accessed': row_dict['last_page_accessed']
                }
            else:
                # No progress records yet
                actual_total_pages = total_pages_in_chapter or 0
                return {
                    'chapter': chapter,
                    'total_pages': actual_total_pages,
                    'completed_pages': 0,
                    'completion_percentage': 0.0,
                    'time_spent_minutes': 0,
                    'last_completed_page': None,
                    'last_page_accessed': None
                }
    
    def get_topic_progress_summary(self, student_id: int, subject_id: int, topic: str) -> Dict:
        """Get topic progress summary across all chapters."""
        with self.get_connection() as conn:
            row = conn.execute('''
                SELECT 
                    topic,
                    COUNT(DISTINCT chapter) as total_chapters,
                    COUNT(DISTINCT CASE WHEN completed = 1 THEN chapter END) as completed_chapters,
                    COUNT(*) as total_pages,
                    SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_pages,
                    CAST(SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS REAL) as completion_percentage,
                    SUM(time_spent_minutes) as time_spent_minutes
                FROM page_progress 
                WHERE student_id = ? AND subject_id = ? AND topic = ?
                GROUP BY topic
            ''', (student_id, subject_id, topic)).fetchone()
            
            if row:
                return dict(row)
            return {
                'topic': topic,
                'total_chapters': 0,
                'completed_chapters': 0,
                'total_pages': 0,
                'completed_pages': 0,
                'completion_percentage': 0.0,
                'time_spent_minutes': 0
            }
    
    def get_subject_progress_summary(self, student_id: int, subject_id: int) -> Dict:
        """Get subject progress summary across all topics."""
        with self.get_connection() as conn:
            row = conn.execute('''
                SELECT 
                    subject_id,
                    s.name as subject_name,
                    COUNT(DISTINCT topic) as total_topics,
                    COUNT(DISTINCT CASE WHEN pp.completed = 1 THEN topic END) as completed_topics,
                    COUNT(DISTINCT chapter) as total_chapters,
                    COUNT(DISTINCT CASE WHEN pp.completed = 1 THEN chapter END) as completed_chapters,
                    COUNT(*) as total_pages,
                    SUM(CASE WHEN pp.completed = 1 THEN 1 ELSE 0 END) as completed_pages,
                    CAST(SUM(CASE WHEN pp.completed = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS REAL) as completion_percentage,
                    SUM(pp.time_spent_minutes) as time_spent_minutes
                FROM page_progress pp
                JOIN subjects s ON pp.subject_id = s.id
                WHERE pp.student_id = ? AND pp.subject_id = ?
                GROUP BY pp.subject_id, s.name
            ''', (student_id, subject_id)).fetchone()
            
            if row:
                return dict(row)
            return {
                'subject_id': subject_id,
                'subject_name': '',
                'total_topics': 0,
                'completed_topics': 0,
                'total_chapters': 0,
                'completed_chapters': 0,
                'total_pages': 0,
                'completed_pages': 0,
                'completion_percentage': 0.0,
                'time_spent_minutes': 0
            }
    
    def get_overall_progress_summary(self, student_id: int) -> Dict:
        """Get overall progress summary across all subjects."""
        with self.get_connection() as conn:
            row = conn.execute('''
                SELECT 
                    COUNT(DISTINCT subject_id) as total_subjects,
                    COUNT(DISTINCT topic) as total_topics,
                    COUNT(DISTINCT chapter) as total_chapters,
                    COUNT(*) as total_pages,
                    SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_pages,
                    CAST(SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS REAL) as completion_percentage,
                    SUM(time_spent_minutes) as time_spent_minutes
                FROM page_progress 
                WHERE student_id = ?
            ''', (student_id,)).fetchone()
            
            if row:
                return dict(row)
            return {
                'total_subjects': 0,
                'total_topics': 0,
                'total_chapters': 0,
                'total_pages': 0,
                'completed_pages': 0,
                'completion_percentage': 0.0,
                'time_spent_minutes': 0
            }

# Global database instance
db = DatabaseManager()