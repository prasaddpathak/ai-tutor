import React, { useState } from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Stack,
  Paper,
} from '@mui/material'
import {
  ArrowBack,
  NavigateBefore,
  NavigateNext,
  Article,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from 'react-query'

import { subjectsAPI, ChapterContentPage } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

const ChapterReaderPage: React.FC = () => {
  const navigate = useNavigate()
  const { subjectId, topicTitle, chapterTitle } = useParams<{
    subjectId: string
    topicTitle: string
    chapterTitle: string
  }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const student = useAuthStore((state) => state.student)
  
  const currentPage = parseInt(searchParams.get('page') || '1')

  const { data: chapterData, isLoading, error } = useQuery<ChapterContentPage>(
    ['chapter-content', subjectId, topicTitle, chapterTitle, student?.id],
    () => subjectsAPI.getChapterContent(
      parseInt(subjectId!),
      decodeURIComponent(topicTitle!),
      decodeURIComponent(chapterTitle!),
      student!.id,
      1 // Always fetch page 1 initially - backend should return ALL pages
    ).then(res => res.data),
    {
      enabled: !!subjectId && !!topicTitle && !!chapterTitle && !!student?.id,
      retry: 2,
    }
  )

  const handleBack = () => {
    navigate(`/subjects/${subjectId}/topics/${topicTitle}/chapters`)
  }

  const handlePageChange = (newPage: number) => {
    if (chapterData && newPage >= 1 && newPage <= chapterData.total_pages) {
      setSearchParams({ page: newPage.toString() })
    }
  }

  const handlePrevious = () => {
    handlePageChange(currentPage - 1)
  }

  const handleNext = () => {
    handlePageChange(currentPage + 1)
  }

  const progressPercentage = chapterData 
    ? Math.round((currentPage / chapterData.total_pages) * 100)
    : 0

  // Get current page content from the pages array
  const currentPageContent = chapterData && chapterData.pages 
    ? chapterData.pages[currentPage - 1] 
    : ''

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={handleBack}
          sx={{ mb: 3 }}
        >
          Back to Chapters
        </Button>
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            Failed to load chapter content
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Please try again later or go back to chapters list
          </Typography>
        </Card>
      </Container>
    )
  }

  if (isLoading || !chapterData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={handleBack}
          sx={{ mb: 3 }}
        >
          Back to Chapters
        </Button>
        <Card sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <LinearProgress sx={{ width: 200, mb: 2 }} />
            <Typography variant="body2" color="textSecondary">
              Loading chapter content...
            </Typography>
          </Box>
        </Card>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Button
          startIcon={<ArrowBack />}
          onClick={handleBack}
          variant="outlined"
          sx={{ mb: 3 }}
        >
          Back to Chapters
        </Button>

        {/* Chapter Info */}
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #0A5130 0%, #3B854E 100%)', color: 'white' }}>
          <CardContent sx={{ p: 4 }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
              <Article sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {chapterData.chapter_title}
                </Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                  {chapterData.topic_title} • {chapterData.subject?.name || 'Subject'}
                </Typography>
              </Box>
            </Stack>
            
            <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 3 }}>
              <Chip
                label={chapterData.difficulty_level}
                sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
              <Chip
                label={`Page ${currentPage} of ${chapterData.total_pages}`}
                sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
            </Stack>

            {/* Progress Bar */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>
                Reading Progress: {progressPercentage}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progressPercentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#D3B651',
                    borderRadius: 4,
                  },
                }}
              />
            </Box>

            {/* Chapter Summary */}
            <Typography variant="body2" sx={{ opacity: 0.9, fontStyle: 'italic' }}>
              {chapterData.chapter_summary}
            </Typography>
          </CardContent>
        </Card>
      </motion.div>

      {/* Page Content */}
      <motion.div
        key={currentPage}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Paper 
          elevation={2} 
          sx={{ 
            p: 5, 
            minHeight: '60vh',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            backgroundColor: 'background.paper',
          }}
        >
          <Box
            sx={{
              maxWidth: '800px',
              mx: 'auto',
              lineHeight: 1.8,
              fontSize: '1.1rem',
              color: 'text.primary',
              textAlign: 'justify',
              '& p': {
                mb: 3,
                textIndent: '2em',
              },
              '& p:first-of-type': {
                textIndent: 0,
                fontSize: '1.15rem',
                fontWeight: 500,
              },
            }}
          >
            <Typography component="div" sx={{ whiteSpace: 'pre-line' }}>
              {currentPageContent}
            </Typography>
          </Box>
        </Paper>
      </motion.div>

      {/* Navigation Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card sx={{ mt: 4, p: 3 }}>
          <Stack 
            direction="row" 
            alignItems="center" 
            justifyContent="space-between"
            spacing={2}
          >
            <Button
              startIcon={<NavigateBefore />}
              onClick={handlePrevious}
              disabled={currentPage <= 1}
              variant="outlined"
              size="large"
            >
              Previous
            </Button>

            {/* Page Indicator */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" fontWeight="bold" color="primary">
                Page {currentPage} of {chapterData.total_pages}
              </Typography>
            </Box>

            <Button
              endIcon={<NavigateNext />}
              onClick={handleNext}
              disabled={currentPage >= chapterData.total_pages}
              variant="contained"
              size="large"
            >
              Next
            </Button>
          </Stack>
        </Card>
      </motion.div>
    </Container>
  )
}

export default ChapterReaderPage