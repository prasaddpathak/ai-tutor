import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@mui/material'
import { motion } from 'framer-motion'

import { useAuthStore } from './stores/authStore'
import Navbar from './components/Navigation/Navbar'
import LandingPage from './pages/Landing/LandingPage'
import AuthPage from './pages/Auth/AuthPage'
import SubjectsPage from './pages/Subjects/SubjectsPage'
import TopicsPage from './pages/Topics/TopicsPage'
import ChaptersPage from './pages/Chapters/ChaptersPage'
import ChapterReaderPage from './pages/Chapters/ChapterReaderPage'
import QuizPage from './pages/Quiz/QuizPage'
import NotFoundPage from './pages/NotFound/NotFoundPage'
import LoadingScreen from './components/Loading/LoadingScreen'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }
  
  return <>{children}</>
}

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  
  if (isAuthenticated) {
    return <Navigate to="/subjects" replace />
  }
  
  return <>{children}</>
}

function App() {
  const isLoading = useAuthStore((state) => state.isLoading)
  
  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/auth" 
          element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          } 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/subjects" 
          element={
            <ProtectedRoute>
              <Navbar />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <SubjectsPage />
              </motion.div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/subjects/:subjectId/topics" 
          element={
            <ProtectedRoute>
              <Navbar />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <TopicsPage />
              </motion.div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/subjects/:subjectId/topics/:topicTitle/chapters" 
          element={
            <ProtectedRoute>
              <Navbar />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChaptersPage />
              </motion.div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/subjects/:subjectId/topics/:topicTitle/chapters/:chapterTitle/read" 
          element={
            <ProtectedRoute>
              <Navbar />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChapterReaderPage />
              </motion.div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/subjects/:subjectId/topics/:topicTitle/quiz" 
          element={
            <ProtectedRoute>
              <Navbar />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <QuizPage />
              </motion.div>
            </ProtectedRoute>
          } 
        />
        
        {/* 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Box>
  )
}

export default App 