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
    difficulty_level: string
    created_at: string
    last_login: string
  }
  token?: string
}

export interface Subject {
  id: number
  name: string
  description: string
}

export interface Topic {
  title: string
  description?: string
}

export interface Chapter {
  title: string
  content: string
}

export interface CameraInfo {
  index: number
  name: string
  available: boolean
}

// Auth API
export const authAPI = {
  register: (data: { name: string; difficulty_level: string; image_data: string }) => {
    const formData = new FormData()
    formData.append('name', data.name)
    formData.append('difficulty_level', data.difficulty_level)
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
  getAll: () => api.get<Subject[]>('/subjects/'),
  
  getTopics: (subjectId: number, difficultyLevel: string) =>
    api.get(`/subjects/${subjectId}/topics`, {
      params: { difficulty_level: difficultyLevel }
    }),
  
  getChapters: (subjectId: number, topicTitle: string, difficultyLevel: string) =>
    api.get(`/subjects/${subjectId}/topics/${encodeURIComponent(topicTitle)}/chapters`, {
      params: { difficulty_level: difficultyLevel }
    }),
  
  generateTopics: (subjectName: string, difficultyLevel: string) =>
    api.post('/subjects/generate-topics', {
      subject_name: subjectName,
      difficulty_level: difficultyLevel
    }),
  
  getGenerationStatus: (cacheKey: string) =>
    api.get(`/subjects/generation-status/${cacheKey}`)
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