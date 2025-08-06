# 🚀 Setup Guide - EduLibreX

Complete setup instructions for deploying the EduLibreX AI Education Platform locally.

## Prerequisites

- **Python 3.8+** with pip
- **Node.js 18.2+** with npm
- **Git** for cloning the repository
- **8GB+ RAM** (recommended for optimal AI model performance)

---

## 🔧 Manual Setup Instructions

### 1. 🦙 Install and Configure Ollama

**Download and Install Ollama:**

```bash
# Windows: Download from https://ollama.ai/download
# macOS: brew install ollama
# Linux: curl -fsSL https://ollama.ai/install.sh | sh
```

**Create and Load the AI Model:**

```bash
# Create the Gemma 3n model using our modelfile
ollama create gemma3n-custom -f modelfile

# Verify the model is loaded
ollama list
```

**Start Ollama Service:**

```bash
# Start Ollama in the background
ollama serve
```

> **Note:** Ollama runs on `http://localhost:11434` by default. Keep this service running during application use.

---

**Create .env file in root directory with the following content:**

```bash
BASE_LLM_URL=http://127.0.0.1:11434
LLM_MODEL=gemma3n-custom
```

### 2. 🐍 Backend Setup (FastAPI + Python)

**Create Python Virtual Environment:**

```bash
# Navigate to project root
cd ai-education

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
```

**Install Backend Dependencies:**

```bash
# Install all Python dependencies
pip install -r backend/requirements.txt
```

**Initialize Database and Start Backend:**

```bash
# Navigate to backend directory
cd backend

# Start the FastAPI server
python main.py
```

The backend will be available at `http://localhost:8000`

**Backend Features:**
- Face recognition authentication
- AI curriculum generation
- Student progress tracking
- Real-time chat with AI tutor
- Multilingual content translation

---

### 3. ⚡ Frontend Setup (React + TypeScript)

**Install Node.js Dependencies:**

```bash
# Navigate to frontend directory
cd frontend

# Install all npm dependencies
npm install
```

**Start Development Server:**

```bash
# Start React development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

**Frontend Features:**
- Modern React 18 with TypeScript
- Material-UI components
- Progressive Web App (PWA)
- Responsive design for all devices
- Real-time updates with React Query

---

## 🌐 Access the Application

1. **Open your browser** and navigate to `http://localhost:3000`
2. **Register a new student** using face recognition
3. **Create your first subject** by describing your learning interests
4. **Start learning** with personalized AI-generated content

---

## 📊 System Requirements

### Minimum Requirements
- **RAM:** 4GB (8GB+ recommended)
- **Storage:** 10GB free space
- **OS:** Windows 10+, macOS 10.15+, Ubuntu 18.04+

### Recommended for Jetson Orin Nano
- **RAM:** 8GB
- **GPU:** NVIDIA GPU with CUDA support
- **Storage:** 32GB+ SSD
- **Network:** Offline operation supported

---