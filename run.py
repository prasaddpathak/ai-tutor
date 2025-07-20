#!/usr/bin/env python3
"""
Simple run script for AI Tutor application
"""

import subprocess
import sys
from pathlib import Path

def main():
    """Run the AI Tutor application."""
    try:
        # Run the main application
        subprocess.run([sys.executable, "main.py"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running application: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nApplication interrupted by user")
        sys.exit(0)

if __name__ == "__main__":
    main()