#!/usr/bin/env python3
"""
Setup script for AI Tutor application
Creates virtual environment and installs dependencies
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(cmd, description):
    """Run a command and handle errors."""
    print(f"📦 {description}...")
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return result
    except subprocess.CalledProcessError as e:
        print(f"❌ Error during {description}:")
        print(f"Command: {cmd}")
        print(f"Error: {e.stderr}")
        sys.exit(1)

def main():
    """Set up the AI Tutor application."""
    print("🚀 Setting up AI Tutor application...")
    
    # Check Python version
    if sys.version_info < (3, 9):
        print("❌ Python 3.9 or higher is required")
        sys.exit(1)
    
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} detected")
    
    # Create virtual environment if it doesn't exist
    venv_path = Path(".venv")
    if not venv_path.exists():
        run_command(f"{sys.executable} -m venv .venv", "Creating virtual environment")
    else:
        print("✅ Virtual environment already exists")
    
    # Determine activation script based on OS
    if os.name == 'nt':  # Windows
        activate_script = ".venv\\Scripts\\activate"
        pip_path = ".venv\\Scripts\\pip"
    else:  # Unix/Linux/macOS
        activate_script = "source .venv/bin/activate"
        pip_path = ".venv/bin/pip"
    
    # Install dependencies
    run_command(f"{pip_path} install -r requirements.txt", "Installing dependencies")
    
    # Test the installation
    print("🧪 Testing installation...")
    run_command(f"{pip_path} list", "Checking installed packages")
    
    print("\n🎉 Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Activate the virtual environment:")
    if os.name == 'nt':
        print("   .venv\\Scripts\\activate")
    else:
        print("   source .venv/bin/activate")
    print("2. Run the application:")
    print("   python main.py")
    print("   or")
    print("   python run.py")

if __name__ == "__main__":
    main()