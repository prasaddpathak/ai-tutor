"""
AI Tutor - FastAPI Backend
Main application entry point for React + FastAPI architecture
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
from pathlib import Path
import sys
import os

# Add the project root to Python path for imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.api import auth, students, subjects, camera
from backend.core.database import db

# Initialize FastAPI app
app = FastAPI(
    title="AI Tutor API",
    description="Offline LLM Learning Platform API",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(students.router, prefix="/api/students", tags=["Students"])
app.include_router(subjects.router, prefix="/api/subjects", tags=["Subjects"])
app.include_router(camera.router, prefix="/api/camera", tags=["Camera"])

# Serve React static files in production only
frontend_dist = project_root / "frontend" / "dist"
import os
if frontend_dist.exists() and os.getenv("NODE_ENV") == "production":
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")
    
    @app.get("/")
    async def serve_react_app():
        """Serve React app for production."""
        return FileResponse(str(frontend_dist / "index.html"))
    
    # Catch-all route for React Router (only in production)
    @app.get("/{path:path}")
    async def serve_react_router(path: str):
        """Serve React app for all routes (SPA routing)."""
        return FileResponse(str(frontend_dist / "index.html"))

@app.on_event("startup") 
async def startup_event():
    """Initialize database and services on startup."""
    print("🚀 Starting AI Tutor API...")
    print("📊 Initializing database...")
    try:
        db.init_database()
        print("✅ Database initialized successfully")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        raise

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "2.0.0"}

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["backend", "app"]
    ) 