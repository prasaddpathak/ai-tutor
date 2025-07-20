#!/usr/bin/env python3
"""
AI Tutor - Offline LLM Learning Platform
Main entry point for the application
"""

import sys
import os
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def main():
    """Main entry point for the AI Tutor application."""
    try:
        from app.ui.main import AITutorApp
        app = AITutorApp()
        app.mainloop()
    except ImportError as e:
        print(f"Error importing application modules: {e}")
        print("Please ensure all dependencies are installed: pip install -r requirements.txt")
        sys.exit(1)
    except Exception as e:
        print(f"Error starting application: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()