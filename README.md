# AI Tutor - Offline LLM Learning Platform

A 100% local-first AI tutor designed for the Jetson Orin Nano (8 GB) that provides personalized education without requiring internet connectivity.

## Overview

This application provides multi-student desktop learning with webcam-based face recognition login, personalized curriculum generation, and interactive lessons. Built for the Gemma 3n Challenge to make high-quality education accessible in remote, low-connectivity regions.

## Features

### Current Implementation (Stage 0-1)
- ✅ **Multi-student desktop application** with modern GUI
- ✅ **Webcam-based face recognition** for secure login
- ✅ **Student profile wizard** with difficulty level selection
- ✅ **SQLite database** for local data storage
- ✅ **Robust error handling** and logging

### Planned Features (Stage 2-6)
- 🔄 Subject catalogue and curriculum generation
- 🔄 Interactive lesson chat with LLM
- 🔄 Auto-generated MCQ quizzes with grading
- 🔄 Performance optimization for Jetson Orin Nano

## Installation

### Prerequisites
- Python 3.9 or higher
- Webcam/camera device
- Windows/Linux/macOS

### Setup
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ai-tutor
   ```

2. Create and activate virtual environment:
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # Linux/macOS
   source .venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

### Running the Application
```bash
python main.py
```

### First Time Setup
1. **Register a Student**: Click "Register" and enter student name
2. **Face Capture**: Look at the camera when prompted
3. **Select Difficulty**: Choose from School, High School, Intermediate, or Advanced
4. **Login**: Use "Login" button for face recognition authentication

### Supported Difficulty Levels
- **School**: Elementary/primary education level
- **High School**: Secondary education level  
- **Intermediate**: College/university introductory level
- **Advanced**: Graduate/professional level

## Technical Architecture

### Directory Structure
```
ai-tutor/
├── app/
│   ├── auth/          # Face recognition & authentication
│   ├── curriculum/    # Topic & syllabus generation (planned)
│   ├── chat/          # LLM inference & prompts (planned)
│   ├── quiz/          # Quiz creation & grading (planned)
│   ├── ui/            # Tkinter GUI components
│   └── database.py    # SQLite database operations
├── data/              # SQLite DB, embeddings, backups
├── face_embeddings/   # Face recognition data
├── models/            # LLM weights & tokenizer (planned)
├── tests/             # Unit tests
├── main.py           # Application entry point
└── requirements.txt   # Python dependencies
```

### Technology Stack
- **Language**: Python 3.9+
- **GUI**: CustomTkinter with ttkbootstrap theming
- **Face Recognition**: OpenCV + face_recognition/dlib
- **Database**: SQLite with proper schema design
- **Future LLM**: Gemma 3n (4-bit quantized) via Transformers

## Database Schema

### Students Table
- `id`: Primary key
- `name`: Student name (unique)
- `difficulty_level`: School/High School/Intermediate/Advanced
- `created_at`: Registration timestamp
- `last_login`: Last authentication timestamp

### Subjects Table (Pre-populated)
- Computer Science
- Programming  
- Data Science
- Physics
- Geography
- History

### Student Progress Table
- Tracks chapter completion and quiz scores
- Links students to subjects and topics

## Development Status

### Stage 0: ✅ Complete
- Project structure and virtual environment
- Requirements.txt with all dependencies
- Main entry point and error handling

### Stage 1: ✅ Complete  
- Webcam authentication (register & login)
- Student profile wizard with difficulty selection
- SQLite database with proper schema
- Modern GUI with CustomTkinter

### Next Stages (Planned)
- **Stage 2**: Subject selection and curriculum generation
- **Stage 3**: LLM integration for lesson content
- **Stage 4**: Interactive chat interface
- **Stage 5**: MCQ quiz system with grading
- **Stage 6**: Jetson Orin Nano optimization

## Privacy & Security

- Face embeddings stored locally as .npy files
- No internet connectivity required at runtime
- All data remains on device
- Future: Encryption of biometric data planned

## Contributing

This project is part of the Gemma 3n Challenge. Contributions welcome for:
- Performance optimization
- UI/UX improvements  
- Additional subject areas
- Testing and bug fixes

## License

[License information to be added]

---

**Target Platform**: Jetson Orin Nano (8 GB RAM)  
**Challenge**: Gemma 3n Challenge  
**Goal**: 100% offline AI education platform