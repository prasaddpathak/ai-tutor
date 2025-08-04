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
  CircularProgress,
} from '@mui/material'
import {
  ArrowBack,
  NavigateBefore,
  NavigateNext,
  Article,
  CheckCircle,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { subjectsAPI, ChapterContentPage } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import ChapterChatPanel from '../../components/Chat/ChapterChatPanel'
import { useTranslation } from 'react-i18next'

const ChapterReaderPage: React.FC = () => {
  const navigate = useNavigate()
  const { subjectId, topicTitle, chapterTitle } = useParams<{
    subjectId: string
    topicTitle: string
    chapterTitle: string
  }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const student = useAuthStore((state) => state.student)
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [isChatOpen, setIsChatOpen] = useState(false)
  
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

  const completeChapterMutation = useMutation(
    () => subjectsAPI.completeChapter(
      parseInt(subjectId!),
      decodeURIComponent(topicTitle!),
      decodeURIComponent(chapterTitle!),
      student!.id
    ),
    {
      onSuccess: () => {
        // Invalidate chapters query to update the UI with completion status
        queryClient.invalidateQueries(['chapters', subjectId, topicTitle, student?.id])
        // Navigate back to chapters list
        navigate(`/subjects/${subjectId}/topics/${topicTitle}/chapters`)
      },
      onError: (error) => {
        console.error('Failed to complete chapter:', error)
      }
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

  const handleCompleteChapter = () => {
    completeChapterMutation.mutate()
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
          {t('chapterReader.backToChapters')}
        </Button>
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            {t('chapterReader.failedToLoad')}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {t('chapterReader.failedToLoadDescription')}
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
          {t('chapterReader.backToChapters')}
        </Button>
        <Card sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <LinearProgress sx={{ width: 200, mb: 2 }} />
            <Typography variant="body2" color="textSecondary">
              {t('chapterReader.loadingContent')}
            </Typography>
          </Box>
        </Card>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
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
          {t('chapterReader.backToChapters')}
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
                  {chapterData.topic_title} • {chapterData.subject?.name || t('chapterReader.subject')}
                </Typography>
              </Box>
            </Stack>
            
            <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 3 }}>
              <Chip
                label={chapterData.difficulty_level}
                sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
              <Chip
                label={t('chapterReader.page', { current: currentPage, total: chapterData.total_pages })}
                sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
            </Stack>

            {/* Progress Bar */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>
                {t('chapterReader.progress', { percent: progressPercentage })}
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
            <Box sx={{ opacity: 0.9, fontStyle: 'italic', '& p': { mb: 1 }, '& p:last-child': { mb: 0 } }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {chapterData.chapter_summary}
              </ReactMarkdown>
            </Box>
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
            height: '60vh',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            backgroundColor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              maxWidth: '95%',
              pl: 3,
              pr: 3,
              mx: 'auto',
              lineHeight: 1.8,
              fontSize: '1.1rem',
              color: 'text.primary',
              textAlign: 'justify',
              overflowY: 'auto',
              height: '100%',
              '& p': {
                mb: 3,
                textIndent: '2em',
              },
              '& p:first-of-type': {
                textIndent: 0,
                fontSize: '1.15rem',
                fontWeight: 500,
              },
              '& h1, & h2, & h3, & h4, & h5, & h6': {
                textIndent: 0,
                mb: 2,
                mt: 3,
                fontWeight: 'bold',
              },
              '& ul, & ol': {
                textIndent: 0,
                mb: 2,
                pl: 3,
              },
              '& li': {
                mb: 1,
              },
              '& blockquote': {
                borderLeft: '4px solid #0A5130',
                pl: 2,
                ml: 0,
                fontStyle: 'italic',
                backgroundColor: 'rgba(10, 81, 48, 0.05)',
                py: 1,
                textIndent: 0,
              },
              '& code': {
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                padding: '2px 4px',
                borderRadius: '3px',
                fontFamily: 'monospace',
              },
              '& pre': {
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                padding: '12px',
                borderRadius: '6px',
                overflow: 'auto',
                textIndent: 0,
              },
              '& strong, & b': {
                fontWeight: 'bold',
              },
              '& em, & i': {
                fontStyle: 'italic',
              },
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {currentPageContent}
            </ReactMarkdown>
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
              {t('chapterReader.previous')}
            </Button>

            {/* Page Indicator */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" fontWeight="bold" color="primary">
                {t('chapterReader.page', { current: currentPage, total: chapterData.total_pages })}
              </Typography>
            </Box>

            {currentPage >= chapterData.total_pages ? (
              <Button
                endIcon={completeChapterMutation.isLoading ? <CircularProgress size={20} /> : <CheckCircle />}
                onClick={handleCompleteChapter}
                disabled={completeChapterMutation.isLoading}
                variant="contained"
                size="large"
                color="success"
                sx={{
                  backgroundColor: 'success.main',
                  '&:hover': {
                    backgroundColor: 'success.dark',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 20px rgba(76, 175, 80, 0.3)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                {completeChapterMutation.isLoading ? t('chapterReader.completing') : t('chapterReader.completeChapter')}
              </Button>
            ) : (
              <Button
                endIcon={<NavigateNext />}
                onClick={handleNext}
                variant="contained"
                size="large"
              >
                {t('chapterReader.next')}
              </Button>
            )}
          </Stack>
        </Card>
      </motion.div>

      {/* Chat Panel */}
      {chapterData && student && (
        <ChapterChatPanel
          subjectId={parseInt(subjectId!)}
          topicTitle={decodeURIComponent(topicTitle!)}
          chapterTitle={decodeURIComponent(chapterTitle!)}
          studentId={student.id}
          currentPage={currentPage}
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen(!isChatOpen)}
        />
      )}
    </Container>
  )
}

export default ChapterReaderPage
