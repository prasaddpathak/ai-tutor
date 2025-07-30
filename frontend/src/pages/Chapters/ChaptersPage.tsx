import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Skeleton,
  Paper,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  Divider,
} from '@mui/material'
import { 
  ArrowBack, 
  MenuBook,
  Refresh,
  NavigateNext,
  NavigateBefore,
  Schedule,
  RadioButtonUnchecked,
  CheckCircleOutline,
  PlayArrow,
  Analytics,
  CheckCircle
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import ReactMarkdown from 'react-markdown'

import { subjectsAPI } from '../../services/api'
import { progressAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

interface Page {
  page_number: number;
  title: string;
  content: string;
  estimated_read_time: number;
  progress: {
    completed: boolean;
    time_spent_minutes: number;
    last_accessed?: string;
  };
}

interface ChapterData {
  title: string;
  content: string;
  total_pages: number;
  estimated_read_time: number;
}

interface NavigationData {
  has_previous: boolean;
  has_next: boolean;
  previous_page?: number;
  next_page?: number;
  current_page: number;
  total_pages: number;
}

// Different modes for the chapter viewer
type ViewMode = 'overview' | 'reading' | 'generating'

const ChaptersPage: React.FC = () => {
  const navigate = useNavigate()
  const { subjectId, topicTitle } = useParams<{ subjectId: string; topicTitle: string }>()
  const student = useAuthStore((state) => state.student)
  const queryClient = useQueryClient()
  
  const [selectedChapter, setSelectedChapter] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageStartTime, setPageStartTime] = useState<Date>(new Date())
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('overview')

  // Fetch chapters list (simple overview)
  const { data: chaptersData, isLoading, error } = useQuery(
    ['chapters', subjectId, topicTitle, student?.difficulty_level, student?.id],
    () => subjectsAPI.getChapters(
      parseInt(subjectId!), 
      decodeURIComponent(topicTitle!), 
      student?.difficulty_level || 'School',
      false,
      student?.id
    ).then(res => res.data),
    {
      enabled: !!subjectId && !!topicTitle && !!student,
      retry: 2,
    }
  )

  // Generate chapter content mutation
  const generateContentMutation = useMutation(
    (chapterTitle: string) => {
      if (!student?.id) throw new Error('Student not found')
      return subjectsAPI.generateChapterContent(
        parseInt(subjectId!),
        decodeURIComponent(topicTitle!),
        chapterTitle,
        student.id,
        student.difficulty_level || 'School',
        false
      )
    },
    {
      onSuccess: (response) => {
        setViewMode('reading')
        setCurrentPage(1)
        // Invalidate related queries
        queryClient.invalidateQueries(['chapterPages'])
        queryClient.invalidateQueries(['page'])
      },
      onError: (error) => {
        console.error('Failed to generate chapter content:', error)
        setViewMode('overview')
      }
    }
  )

  // Fetch specific page when in reading mode
  const { data: pageData, isLoading: pageLoading } = useQuery(
    ['page', subjectId, topicTitle, selectedChapter?.title, currentPage, student?.id],
    () => {
      if (!student?.id) throw new Error('Student not found')
      return subjectsAPI.getSpecificPage(
        parseInt(subjectId!),
        decodeURIComponent(topicTitle!),
        selectedChapter.title,
        currentPage,
        student.id,
        student.difficulty_level || 'School'
      ).then(res => res.data)
    },
    {
      enabled: !!selectedChapter && !!currentPage && !!student && viewMode === 'reading',
    }
  )

  // Check if paginated content already exists for the selected chapter
  const { data: hasExistingContent } = useQuery(
    ['check-chapter-content', subjectId, topicTitle, selectedChapter?.title, student?.id],
    async () => {
      if (!student?.id || !selectedChapter?.title) return false
      try {
        await subjectsAPI.getSpecificPage(
          parseInt(subjectId!),
          decodeURIComponent(topicTitle!),
          selectedChapter.title,
          1,
          student.id,
          student.difficulty_level || 'School'
        )
        return true
      } catch (error) {
        return false
      }
    },
    {
      enabled: !!selectedChapter && !!student && viewMode === 'overview',
      retry: 1,
    }
  )

  // Fetch chapter pages overview when in reading mode
  const { data: chapterPagesData } = useQuery(
    ['chapterPages', subjectId, topicTitle, selectedChapter?.title, student?.id],
    () => {
      if (!student?.id) throw new Error('Student not found')
      return subjectsAPI.getChapterPages(
        parseInt(subjectId!),
        decodeURIComponent(topicTitle!),
        selectedChapter.title,
        student.id,
        student.difficulty_level || 'School'
      ).then(res => res.data)
    },
    {
      enabled: !!selectedChapter && !!student && viewMode === 'reading',
    }
  )

  // Save progress mutation
  const saveProgressMutation = useMutation(
    (progressData: {
      topic: string;
      chapter: string;
      page_number: number;
      completed?: boolean;
      time_spent_minutes?: number;
    }) => {
      if (!student?.id) throw new Error('Student not found')
      return progressAPI.updateProgress(
        student.id,
        parseInt(subjectId!),
        progressData
      )
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['chapterPages', subjectId, topicTitle, selectedChapter?.title])
        queryClient.invalidateQueries(['page', subjectId, topicTitle, selectedChapter?.title, currentPage])
        // Invalidate topic-level progress queries to update parent pages
        queryClient.invalidateQueries(['all-topic-progress', subjectId, student?.id])
        queryClient.invalidateQueries(['topic-progress', student?.id, subjectId, topicTitle])
      }
    }
  )

  // Regenerate chapters mutation
  const regenerateChaptersMutation = useMutation(
    () => {
      if (!student?.id) throw new Error('Student not found')
      return subjectsAPI.getChapters(
        parseInt(subjectId!), 
        decodeURIComponent(topicTitle!), 
        student.difficulty_level || 'School',
        true,
        student.id
      )
    },
    {
      onSuccess: (response) => {
        queryClient.setQueryData(['chapters', subjectId, topicTitle, student?.difficulty_level, student?.id], response.data)
        setRegenerateDialogOpen(false)
        setSelectedChapter(null)
        setViewMode('overview')
        setCurrentPage(1)
      },
      onError: (error) => {
        console.error('Failed to regenerate chapters:', error)
      }
    }
  )

  // Track time spent on page
  useEffect(() => {
    if (viewMode === 'reading') {
      setPageStartTime(new Date())
    }
  }, [currentPage, selectedChapter, viewMode])

  // Auto-save progress when leaving page
  useEffect(() => {
    const saveProgress = () => {
      if (selectedChapter && currentPage && pageStartTime && viewMode === 'reading') {
        const timeSpent = Math.round((new Date().getTime() - pageStartTime.getTime()) / 60000) // minutes
        if (timeSpent > 0) {
          saveProgressMutation.mutate({
            topic: decodeURIComponent(topicTitle!),
            chapter: selectedChapter.title,
            page_number: currentPage,
            time_spent_minutes: timeSpent
          })
        }
      }
    }

    const handleBeforeUnload = () => saveProgress()
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      saveProgress()
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [selectedChapter, currentPage, pageStartTime, viewMode])

  const handleBack = () => {
    if (viewMode === 'reading') {
      setViewMode('overview')
      setSelectedChapter(null)
      setCurrentPage(1)
    } else {
      navigate(`/subjects/${subjectId}/topics`)
    }
  }

  const handleChapterSelect = (chapter: any) => {
    setSelectedChapter(chapter)
    setViewMode('overview')
  }

  const handleStartReading = () => {
    if (selectedChapter) {
      setViewMode('generating')
      generateContentMutation.mutate(selectedChapter.title)
    }
  }

  const handlePageNavigation = (newPage: number) => {
    if (newPage >= 1 && pageData?.navigation && newPage <= pageData.navigation.total_pages) {
      setCurrentPage(newPage)
    }
  }

  const handleMarkPageComplete = () => {
    if (selectedChapter && currentPage) {
      saveProgressMutation.mutate({
        topic: decodeURIComponent(topicTitle!),
        chapter: selectedChapter.title,
        page_number: currentPage,
        completed: true
      })
    }
  }

  const handleRegenerate = () => {
    setRegenerateDialogOpen(true)
  }

  const confirmRegenerate = () => {
    regenerateChaptersMutation.mutate()
  }

  const isCurrentlyGenerating = () => {
    if (!chaptersData) return false
    return chaptersData.generating || false
  }

  const getPageProgress = (pageNumber: number): boolean => {
    if (!chapterPagesData?.pages) return false
    const page = chapterPagesData.pages.find((p: any) => p.page_number === pageNumber)
    return page?.progress?.completed || false
  }

  const getChapterProgress = () => {
    if (!chapterPagesData?.progress_summary) return 0
    return chapterPagesData.progress_summary.completion_percentage || 0
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={handleBack}
          sx={{ mb: 3 }}
        >
          Back to Topics
        </Button>
        <Alert severity="error">
          Failed to load chapters. Please try again later.
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header with Back Button */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Button
          startIcon={<ArrowBack />}
          onClick={handleBack}
          sx={{ mb: 3 }}
        >
          {viewMode === 'reading' ? 'Back to Chapter Overview' : 'Back to Topics'}
        </Button>

        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h3" fontWeight="bold">
              {decodeURIComponent(topicTitle || '')}
            </Typography>
            {chaptersData?.is_generated && !isCurrentlyGenerating() && viewMode === 'overview' && (
              <Tooltip title="Regenerate chapters with fresh AI content">
                <IconButton
                  onClick={handleRegenerate}
                  color="primary"
                  disabled={regenerateChaptersMutation.isLoading}
                >
                  {regenerateChaptersMutation.isLoading ? (
                    <CircularProgress size={20} />
                  ) : (
                    <Refresh />
                  )}
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Typography variant="h6" color="textSecondary">
            {viewMode === 'reading' && selectedChapter
              ? `Reading: ${selectedChapter.title}` 
              : viewMode === 'generating'
                ? 'Generating chapter content...'
                : selectedChapter
                  ? `Selected: ${selectedChapter.title}`
                  : isLoading 
                    ? 'Loading chapters...' 
                    : 'Select a chapter to start reading'
            }
          </Typography>
        </Box>
      </motion.div>

      {/* Chapter Overview Mode */}
      {viewMode === 'overview' && (
        <Grid container spacing={3}>
          {/* Chapters Navigation */}
          <Grid item xs={12} md={selectedChapter ? 6 : 12}>
            <Card sx={{ height: 'fit-content' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">
                    Chapters
                  </Typography>
                  {chaptersData?.chapters && chaptersData.chapters.length > 0 && (
                    <Chip
                      label={`${chaptersData.chapters.length} chapters`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Box>

                {/* Loading State */}
                {isLoading && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {[...Array(5)].map((_, index) => (
                      <Skeleton
                        key={index}
                        variant="rectangular"
                        height={60}
                        sx={{ borderRadius: 1 }}
                      />
                    ))}
                  </Box>
                )}

                {/* Generation in Progress */}
                {isCurrentlyGenerating() && (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <CircularProgress size={32} sx={{ mb: 2 }} />
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      Generating chapters with AI...
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      This may take up to 5-10 minutes
                    </Typography>
                  </Box>
                )}

                {/* Chapters List */}
                {!isLoading && chaptersData?.chapters && chaptersData.chapters.length > 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {chaptersData.chapters.map((chapter: any, index: number) => {
                      const isSelected = selectedChapter?.title === chapter.title
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                          <Button
                            variant={isSelected ? "contained" : "outlined"}
                            fullWidth
                            onClick={() => handleChapterSelect(chapter)}
                            sx={{
                              justifyContent: 'flex-start',
                              textAlign: 'left',
                              py: 1.5,
                              px: 2,
                              '&:hover': {
                                transform: 'translateX(4px)',
                              },
                              transition: 'all 0.2s ease-in-out',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                              <MenuBook fontSize="small" />
                              <Box sx={{ textAlign: 'left', flex: 1 }}>
                                <Typography variant="body2" sx={{ textTransform: 'none' }}>
                                  {chapter.title}
                                </Typography>
                              </Box>
                              <Chip
                                label={`#${index + 1}`}
                                size="small"
                                color={isSelected ? "default" : "primary"}
                                variant="outlined"
                                sx={{ minWidth: 'auto', fontSize: '0.7rem' }}
                              />
                            </Box>
                          </Button>
                        </motion.div>
                      )
                    })}
                  </Box>
                )}

                {/* Empty State */}
                {!isLoading && (!chaptersData?.chapters || chaptersData.chapters.length === 0) && !isCurrentlyGenerating() && (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body2" color="textSecondary">
                      No chapters available
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Chapter Details and CTA */}
          {selectedChapter && (
            <Grid item xs={12} md={6}>
              <Card sx={{ height: 'fit-content' }}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" gutterBottom color="primary">
                    {selectedChapter.title}
                  </Typography>
                  
                  <Box
                    sx={{ 
                      mb: 3,
                      '& p': {
                        mb: 2,
                        lineHeight: 1.7,
                      },
                    }}
                  >
                    <ReactMarkdown>{selectedChapter.content}</ReactMarkdown>
                  </Box>

                  <Divider sx={{ mb: 3 }} />

                  <Box sx={{ textAlign: 'center' }}>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleStartReading}
                      disabled={generateContentMutation.isLoading}
                      sx={{ px: 4, py: 2 }}
                    >
                      {generateContentMutation.isLoading ? (
                        <>
                          <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                          Generating Content...
                        </>
                      ) : (
                        hasExistingContent ? 'Continue Reading' : 'Read Chapter'
                      )}
                    </Button>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                      {hasExistingContent 
                        ? 'Pick up where you left off' 
                        : 'Generate detailed, paginated content for this chapter'
                      }
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Generating Mode */}
      {viewMode === 'generating' && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h5" gutterBottom>
            Generating Chapter Content
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
            Creating detailed, paginated content for "{selectedChapter?.title}"
          </Typography>
          <Typography variant="caption" color="textSecondary">
            This may take up to 2-3 minutes...
          </Typography>
        </Box>
      )}

      {/* Reading Mode */}
      {viewMode === 'reading' && selectedChapter && (
        <Grid container spacing={3}>
          {/* Chapter Progress Overview */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: 'fit-content', position: 'sticky', top: 24 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {selectedChapter.title}
                </Typography>

                {chapterPagesData && (
                  <>
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Analytics fontSize="small" sx={{ mr: 1 }} />
                        <Typography variant="body2">
                          {getChapterProgress().toFixed(1)}% Complete
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={getChapterProgress()} 
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="caption" color="textSecondary">
                        {chapterPagesData.progress_summary?.completed_pages || 0} of {chapterPagesData.progress_summary?.total_pages || 0} pages read
                      </Typography>
                    </Box>

                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Pages
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {chapterPagesData.pages?.map((page: any, index: number) => (
                        <Button
                          key={page.page_number}
                          variant={page.page_number === currentPage ? "contained" : "outlined"}
                          size="small"
                          onClick={() => handlePageNavigation(page.page_number)}
                          startIcon={page.progress.completed ? <CheckCircle /> : <RadioButtonUnchecked />}
                          sx={{ justifyContent: 'flex-start' }}
                        >
                          Page {page.page_number}: {page.title}
                        </Button>
                      ))}
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Page Content */}
          <Grid item xs={12} md={8}>
            <Card sx={{ minHeight: '70vh' }}>
              <CardContent sx={{ p: 4 }}>
                {pageData ? (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${selectedChapter.title}-${currentPage}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Page Header */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                            {pageData.page.title}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Chip 
                              label={`Page ${pageData.navigation.current_page} of ${pageData.navigation.total_pages}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            {pageData.page.estimated_read_time && (
                              <Chip
                                icon={<Schedule />}
                                label={`${pageData.page.estimated_read_time} min read`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                            <Chip
                              icon={pageData.page.progress.completed ? <CheckCircle /> : <RadioButtonUnchecked />}
                              label={pageData.page.progress.completed ? "Completed" : "Not completed"}
                              size="small"
                              color={pageData.page.progress.completed ? "success" : "default"}
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                        <Box>
                          {!pageData.page.progress.completed && (
                            <Button
                              variant="contained"
                              color="success"
                              startIcon={<CheckCircleOutline />}
                              onClick={handleMarkPageComplete}
                              disabled={saveProgressMutation.isLoading}
                            >
                              Mark Complete
                            </Button>
                          )}
                        </Box>
                      </Box>

                      {/* Page Content */}
                      <Box
                        sx={{ 
                          mb: 4,
                          '& h1, & h2, & h3, & h4, & h5, & h6': {
                            color: 'primary.main',
                            fontWeight: 'bold',
                            mt: 3,
                            mb: 2,
                          },
                          '& p': {
                            mb: 2,
                            lineHeight: 1.7,
                            fontSize: '1.1rem',
                          },
                          '& ul, & ol': {
                            pl: 3,
                            mb: 2,
                          },
                          '& li': {
                            mb: 1,
                          },
                          '& pre': {
                            bgcolor: 'grey.100',
                            p: 2,
                            borderRadius: 2,
                            overflow: 'auto',
                          },
                          '& code': {
                            bgcolor: 'grey.100',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            fontFamily: 'monospace',
                          },
                          '& blockquote': {
                            borderLeft: '4px solid',
                            borderColor: 'primary.main',
                            pl: 2,
                            ml: 0,
                            fontStyle: 'italic',
                            bgcolor: 'rgba(25, 118, 210, 0.04)',
                          },
                        }}
                      >
                        <ReactMarkdown>{pageData.page.content}</ReactMarkdown>
                      </Box>

                      <Divider sx={{ mb: 3 }} />

                      {/* Navigation Controls */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Button
                          variant="outlined"
                          startIcon={<NavigateBefore />}
                          onClick={() => handlePageNavigation(pageData.navigation.current_page - 1)}
                          disabled={!pageData.navigation.has_previous}
                        >
                          Previous Page
                        </Button>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {Array.from({ length: pageData.navigation.total_pages }, (_, i) => i + 1).map((pageNum) => (
                            <IconButton
                              key={pageNum}
                              size="medium"
                              onClick={() => handlePageNavigation(pageNum)}
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                border: '2px solid',
                                borderColor: pageNum === pageData.navigation.current_page ? 'primary.main' : 'grey.300',
                                bgcolor: pageNum === pageData.navigation.current_page ? 'primary.main' : 'transparent',
                                color: pageNum === pageData.navigation.current_page ? 'white' : 'text.primary',
                                mx: 0.5,
                                '&:hover': {
                                  bgcolor: pageNum === pageData.navigation.current_page ? 'primary.dark' : 'grey.100',
                                  borderColor: pageNum === pageData.navigation.current_page ? 'primary.dark' : 'grey.400',
                                },
                                transition: 'all 0.2s ease-in-out'
                              }}
                            >
                              {getPageProgress(pageNum) ? (
                                <CheckCircle fontSize="small" sx={{ color: pageNum === pageData.navigation.current_page ? 'white' : 'success.main' }} />
                              ) : (
                                <Typography variant="body2" fontWeight="bold">
                                  {pageNum}
                                </Typography>
                              )}
                            </IconButton>
                          ))}
                        </Box>

                        <Button
                          variant="contained"
                          endIcon={<NavigateNext />}
                          onClick={() => handlePageNavigation(pageData.navigation.current_page + 1)}
                          disabled={!pageData.navigation.has_next}
                        >
                          Next Page
                        </Button>
                      </Box>
                    </motion.div>
                  </AnimatePresence>
                ) : pageLoading ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <CircularProgress size={48} sx={{ mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Loading Page Content...
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <MenuBook sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>
                      Content Loading Error
                    </Typography>
                    <Typography variant="body1" color="textSecondary">
                      Failed to load page content. Please try again.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Regenerate Confirmation Dialog */}
      <Dialog
        open={regenerateDialogOpen}
        onClose={() => setRegenerateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Regenerate Chapters?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will generate fresh AI content for all chapters in this topic. 
            The current chapters will be replaced. This process may take several minutes.
            Are you sure you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegenerateDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={confirmRegenerate} 
            variant="contained" 
            color="primary"
            disabled={regenerateChaptersMutation.isLoading}
          >
            {regenerateChaptersMutation.isLoading ? 'Regenerating...' : 'Regenerate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default ChaptersPage 