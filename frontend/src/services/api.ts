import axios from 'axios'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000, // 10 minutes for LLM generation
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('ai-tutor-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'An error occurred'
    
    // Don't show toast for certain errors
    if (error.response?.status !== 401) {
      toast.error(message)
    }
    
    return Promise.reject(error)
  }
)

// API Types
export interface AuthResponse {
  success: boolean
  message: string
  student?: {
    id: number
    name: string
    created_at: string
    last_login: string
  }
  token?: string
}

export interface Subject {
  id: number
  name: string
  description: string
  difficulty_level?: string  // Optional because it's only present when fetched with student context
}

export interface Topic {
  title: string
  description?: string
}

export interface Chapter {
  title: string
  content: string
}

export interface ChapterContentPage {
  subject: any
  topic_title: string
  chapter_title: string
  total_pages: number
  pages: string[]  // Array of all page contents
  chapter_summary: string
  difficulty_level: string
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correct_answer: number
  explanation: string
}

export interface Quiz {
  quiz_id: string
  subject_name: string
  topic_title: string
  difficulty_level: string
  questions: QuizQuestion[]
  total_questions: number
  best_score: number | null
  best_percentage: number | null
  has_attempted: boolean
}

export interface QuizSubmission {
  quiz_id: string
  student_id: number
  answers: number[]
}

export interface QuizResult {
  id: string
  quiz_id: string
  student_id: number
  answers: number[]
  score: number
  percentage: number
  submitted_at: string
  questions: QuizQuestion[]
  is_best_score: boolean
}

export interface QuizResultsHistory {
  quiz_id: string
  topic_title: string
  total_attempts: number
  best_score: number | null
  best_percentage: number | null
  results_history: Array<{
    id: string
    score: number
    percentage: number
    submitted_at: string
    is_best: boolean
  }>
}

export interface CameraInfo {
  index: number
  name: string
  available: boolean
}

// Auth API
export const authAPI = {
  register: (data: { name: string; image_data: string }) => {
    const formData = new FormData()
    formData.append('name', data.name)
    formData.append('image_data', data.image_data)
    
    return api.post<AuthResponse>('/auth/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  login: (image_data: string) => {
    const formData = new FormData()
    formData.append('image_data', image_data)
    
    return api.post<AuthResponse>('/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  validate: (studentName: string) => 
    api.get(`/auth/validate/${studentName}`)
}

// Camera API
export const cameraAPI = {
  getAvailable: () => api.get<CameraInfo[]>('/camera/available'),
  test: (cameraIndex: number) => api.get(`/camera/test/${cameraIndex}`)
}

// Subjects API
export const subjectsAPI = {
  getAll: (studentId?: number) => api.get<Subject[]>('/subjects/', {
    params: studentId ? { student_id: studentId } : {}
  }),
  
  getTopics: (subjectId: number, studentId: number, forceRegenerate?: boolean) =>
    api.get(`/subjects/${subjectId}/topics`, {
      params: { 
        student_id: studentId,
        ...(forceRegenerate && { force_regenerate: forceRegenerate })
      }
    }),
  
  getChapters: (subjectId: number, topicTitle: string, studentId: number, forceRegenerate?: boolean) =>
    api.get(`/subjects/${subjectId}/topics/${encodeURIComponent(topicTitle)}/chapters`, {
      params: { 
        student_id: studentId,
        ...(forceRegenerate && { force_regenerate: forceRegenerate })
      }
    }),
  
  getChapterContent: (subjectId: number, topicTitle: string, chapterTitle: string, studentId: number, page: number = 1) =>
    api.get(`/subjects/${subjectId}/topics/${encodeURIComponent(topicTitle)}/chapters/${encodeURIComponent(chapterTitle)}/content`, {
      params: {
        student_id: studentId,
        page: page
      }
    }),

  completeChapter: (subjectId: number, topicTitle: string, chapterTitle: string, studentId: number) =>
    api.post(`/subjects/${subjectId}/topics/${encodeURIComponent(topicTitle)}/chapters/${encodeURIComponent(chapterTitle)}/complete`, {}, {
      params: {
        student_id: studentId
      }
    }),
  
  generateTopics: (subjectName: string, difficultyLevel: string) =>
    api.post('/subjects/generate-topics', {
      subject_name: subjectName,
      difficulty_level: difficultyLevel
    }),
  
  getGenerationStatus: (contentKey: string) =>
    api.get(`/subjects/generation-status/${contentKey}`),
  
  clearTopicsContent: (subjectId: number, studentId: number) =>
    api.delete(`/subjects/${subjectId}/topics/content`, {
      params: { 
        student_id: studentId
      }
    }),
  
  clearChaptersContent: (subjectId: number, topicTitle: string, studentId: number) =>
    api.delete(`/subjects/${subjectId}/topics/${encodeURIComponent(topicTitle)}/chapters/content`, {
      params: { 
        student_id: studentId
      }
    }),

  // Subject difficulty management
  setSubjectDifficulty: (studentId: number, subjectId: number, difficultyLevel: string) =>
    api.post('/subjects/difficulty', 
      { subject_id: subjectId, difficulty_level: difficultyLevel },
      { params: { student_id: studentId } }
    ),

  getSubjectDifficulty: (studentId: number, subjectId: number) =>
    api.get(`/subjects/difficulty/${subjectId}`, {
      params: { student_id: studentId }
    }),

  getDifficultyLevels: () => api.get('/subjects/difficulty-levels'),
  
  getUserGeneratedContent: (studentId: number) => 
    api.get(`/subjects/user/${studentId}/generated-content`),

  // AI subject recommendations
  getSubjectRecommendations: (studentId: number, userRequest: string) =>
    api.post('/subjects/recommend', 
      { user_request: userRequest },
      { params: { student_id: studentId } }
    ),

  createCustomSubject: (studentId: number, subjectName: string, subjectDescription: string, originalRequest: string, aiGeneratedDescription?: string) =>
    api.post('/subjects/create-custom', 
      {
        subject_name: subjectName,
        subject_description: subjectDescription,
        original_request: originalRequest,
        ...(aiGeneratedDescription && { ai_generated_description: aiGeneratedDescription })
      },
      { params: { student_id: studentId } }
    ),

  // Quiz API methods
  getQuiz: (subjectId: number, topicTitle: string, studentId: number) =>
    api.get(`/subjects/${subjectId}/topics/${encodeURIComponent(topicTitle)}/quiz`, {
      params: { student_id: studentId }
    }),

  submitQuiz: (subjectId: number, topicTitle: string, submission: QuizSubmission, studentId: number) =>
    api.post(`/subjects/${subjectId}/topics/${encodeURIComponent(topicTitle)}/quiz/submit`,
      submission,
      { params: { student_id: studentId } }
    ),

  getQuizResults: (subjectId: number, topicTitle: string, studentId: number) =>
    api.get(`/subjects/${subjectId}/topics/${encodeURIComponent(topicTitle)}/quiz/results`, {
      params: { student_id: studentId }
    })
}

// Students API
export const studentsAPI = {
  get: (studentId: number) => api.get(`/students/${studentId}`),
  getProgress: (studentId: number, subjectId?: number) =>
    api.get(`/students/${studentId}/progress`, {
      params: subjectId ? { subject_id: subjectId } : {}
    }),
  updateProgress: (studentId: number, subjectId: number, data: any) =>
    api.post(`/students/${studentId}/progress`, data, {
      params: { subject_id: subjectId }
    }),
  getDashboard: (studentId: number) => api.get(`/students/${studentId}/dashboard`)
}

// Health check
export const healthCheck = () => api.get('/health') 