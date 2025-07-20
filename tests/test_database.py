"""
Test database functionality
"""

import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.database import DatabaseManager
import tempfile
import sqlite3

def test_database_initialization():
    """Test that database initializes correctly with all tables."""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp:
        db = DatabaseManager(tmp.name)
        
        # Check that all tables exist
        with db.get_connection() as conn:
            tables = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
            table_names = [row[0] for row in tables]
            
            expected_tables = ['students', 'subjects', 'student_progress']
            for table in expected_tables:
                assert table in table_names, f"Table {table} not found"
            
            # Check that default subjects are populated
            subjects = conn.execute("SELECT COUNT(*) FROM subjects").fetchone()[0]
            assert subjects == 6, f"Expected 6 subjects, found {subjects}"
            
        print("✅ Database initialization test passed")
        
        # Clean up (Windows-safe)
        try:
            os.unlink(tmp.name)
        except PermissionError:
            pass  # File will be cleaned up by system

def test_student_operations():
    """Test student creation and retrieval."""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp:
        db = DatabaseManager(tmp.name)
        
        # Create a student
        student_id = db.create_student("Test Student", "High School")
        assert student_id > 0, "Student ID should be positive"
        
        # Retrieve the student
        student = db.get_student_by_name("Test Student")
        assert student is not None, "Student should be found"
        assert student['name'] == "Test Student"
        assert student['difficulty_level'] == "High School"
        
        print("✅ Student operations test passed")
        
        # Clean up (Windows-safe)
        try:
            os.unlink(tmp.name)
        except PermissionError:
            pass  # File will be cleaned up by system

if __name__ == "__main__":
    test_database_initialization()
    test_student_operations()
    print("🎉 All database tests passed!")