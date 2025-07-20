## AI Tutor – Offline LLM Learning Platform (Jetson Orin Nano 8 GB)

### Overview
I am participating in the **Gemma 3n Challenge** and will deploy on the **Jetson Orin Nano (8 GB)**.  The goal is to build a 100 % _local-first_ AI tutor that runs fully offline, making high-quality education accessible in remote, low-connectivity regions.

### Key Functional Requirements
1. **Multi-student desktop application** with webcam-based face recognition login.
2. **Student profile wizard** collects name and preferred **difficulty level** at first login: `School`, `High School`, `Intermediate`, or `Advanced`.
3. **Subject catalogue** (initial set): `Computer Science`, `Programming`, `Data Science`, `Physics`, `Geography`, `History`.
4. For any chosen subject + level, the LLM **invents a personalised curriculum**:
   • Generate a list of high-level topics.  
   • Student selects a topic → LLM creates a chapter-level syllabus.
5. **Lesson chat** – the student converses with the current chapter for deeper understanding.
6. After each chapter the system **auto-generates an MCQ quiz**; provides **numeric grading** and stores the result.

### Non-Functional Requirements
• Runs entirely **offline** – no internet needed at runtime.  
• Must fit within **8 GB RAM** and GPU constraints of the Orin Nano.  
• **Lightweight desktop GUI** – implemented in **Tkinter** (standard library) to avoid browser overhead.  
• All dependencies recorded in `requirements.txt`; installation script creates/uses the project-root virtual-env (per user rules).  
• **Local storage only**: SQLite for structured data, flat files for embeddings, model weights, and chat transcripts.  
• Robust error handling – no silent fallbacks; explicit errors if a step fails.  
• Clean, modular codebase; avoid redundant logic, and prioritise performance & memory efficiency.

### Technical Stack
| Concern              | Technology |
|----------------------|------------|
| Language             | Python ≥ 3.9 |
| LLM                  | Gemma 3n (4-bit quantised) via 🤗 Transformers + bitsandbytes |
| Face recognition     | OpenCV, `face_recognition`/dlib |
| GUI                  | Tkinter (+ `ttkbootstrap` for modern theming, optional) |
| Database             | SQLite (via `sqlite3` or `SQLModel`) |
| Packaging            | PyInstaller or simple run-script; systemd/Desktop entry |

### Project Roadmap
| Stage | Deliverable | Status |
|-------|-------------|--------|
| **0** | Repo, virtual-env, `requirements.txt` | ✅ **COMPLETE** |
| **1** | Webcam authentication (register & login) | ✅ **COMPLETE** |
| **2** | SQLite schema + Student profile UI | ✅ **COMPLETE** |
| **3** | Curriculum generation (subject → topics → chapters) | 🔄 **NEXT** |
| **4** | Lesson chat interface with streaming tokens | 📋 **PLANNED** |
| **5** | MCQ quiz generation & grading | 📋 **PLANNED** |
| **6** | Packaging, performance tuning, acceptance test | 📋 **PLANNED** |
| *Future* | Encryption of biometrics, teacher/admin portal, update mechanism | 📋 **TBD** |

### Directory Structure (Proposed)
```
ai-tutor/
  app/
    auth/          # face registration & login
    curriculum/    # topic & syllabus generation
    chat/          # LLM inference & prompts
    quiz/          # quiz creation & grading
    ui/            # Tkinter widgets, windows & navigation
  data/            # SQLite DB, embeddings, backups
  models/          # Gemma weights & tokenizer
  tests/
  requirements.txt
  README.md
```

### Assumptions & Notes
* **Privacy/Encryption** of face embeddings is postponed for v1.  
* No automatic internet updates; deployment handled via offline installer.  
* Curriculum content is generated _de-novo_ by the LLM; no licensed textbooks required.

---
_This design spec supersedes earlier drafts and incorporates user clarifications dated **2025-07-17**._

