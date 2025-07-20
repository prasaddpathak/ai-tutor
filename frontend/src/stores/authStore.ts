import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Student {
  id: number
  name: string
  difficulty_level: 'School' | 'High School' | 'Intermediate' | 'Advanced'
  created_at: string
  last_login: string
}

interface AuthState {
  isAuthenticated: boolean
  student: Student | null
  isLoading: boolean
  
  // Actions
  login: (student: Student) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  updateStudent: (student: Student) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      student: null,
      isLoading: false,
      
      login: (student: Student) => {
        set({
          isAuthenticated: true,
          student,
          isLoading: false,
        })
      },
      
      logout: () => {
        set({
          isAuthenticated: false,
          student: null,
          isLoading: false,
        })
      },
      
      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },
      
      updateStudent: (student: Student) => {
        set({ student })
      },
    }),
    {
      name: 'ai-tutor-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        student: state.student,
      }),
    }
  )
) 