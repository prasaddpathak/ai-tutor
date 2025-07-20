#!/usr/bin/env python3
"""
Verification script for AI Tutor setup
Tests all major components without requiring camera/GUI
"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

def test_imports():
    """Test that all required modules can be imported."""
    print("🔍 Testing module imports...")
    
    try:
        # Core modules
        import cv2
        import numpy as np
        import face_recognition
        import customtkinter as ctk
        print("✅ Core dependencies imported successfully")
        
        # Application modules
        from app.database import db
        from app.ui.main import AITutorApp
        from app.auth.face_auth import register_face, authenticate
        print("✅ Application modules imported successfully")
        
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def test_database():
    """Test database functionality."""
    print("🔍 Testing database...")
    
    try:
        from app.database import db
        
        # Test database initialization
        subjects = db.get_all_subjects()
        assert len(subjects) == 6, f"Expected 6 subjects, got {len(subjects)}"
        
        # Test subject names
        subject_names = [s['name'] for s in subjects]
        expected_subjects = [
            'Computer Science', 'Programming', 'Data Science', 
            'Physics', 'Geography', 'History'
        ]
        
        for subject in expected_subjects:
            assert subject in subject_names, f"Subject '{subject}' not found"
        
        print("✅ Database functionality verified")
        return True
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

def test_directory_structure():
    """Test that all required directories exist."""
    print("🔍 Testing directory structure...")
    
    required_dirs = [
        'app', 'app/auth', 'app/ui', 'app/chat', 'app/curriculum', 
        'app/quiz', 'data', 'face_embeddings', 'models', 'tests'
    ]
    
    missing_dirs = []
    for dir_path in required_dirs:
        if not Path(dir_path).exists():
            missing_dirs.append(dir_path)
    
    if missing_dirs:
        print(f"❌ Missing directories: {missing_dirs}")
        return False
    
    print("✅ Directory structure verified")
    return True

def test_files():
    """Test that all required files exist."""
    print("🔍 Testing required files...")
    
    required_files = [
        'main.py', 'run.py', 'setup.py', 'requirements.txt', 'README.md',
        'app/__init__.py', 'app/database.py', 'app/ui/main.py',
        'app/auth/face_auth.py', 'app/auth/face_db.py', 'app/auth/camera.py'
    ]
    
    missing_files = []
    for file_path in required_files:
        if not Path(file_path).exists():
            missing_files.append(file_path)
    
    if missing_files:
        print(f"❌ Missing files: {missing_files}")
        return False
    
    print("✅ Required files verified")
    return True

def main():
    """Run all verification tests."""
    print("🚀 AI Tutor Setup Verification")
    print("=" * 40)
    
    tests = [
        test_directory_structure,
        test_files,
        test_imports,
        test_database
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 40)
    print(f"📊 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! AI Tutor is ready to use.")
        print("\n📋 To start the application:")
        print("   python main.py")
        return True
    else:
        print("❌ Some tests failed. Please check the errors above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)