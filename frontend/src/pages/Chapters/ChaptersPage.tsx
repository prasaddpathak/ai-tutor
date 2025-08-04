import React from 'react'
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

  Grid,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
} from '@mui/material'
import { 
  ArrowBack, 
  MenuBook,
 
  CheckCircle, 
  Refresh,
  Quiz,
  Lock,
  EmojiEvents
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import ReactMarkdown from 'react-markdown'

import { subjectsAPI, QuizResultsHistory } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'

const ChaptersPage: React.FC = () => {
  const navigate = useNavigate()
  const { subjectId, topicTitle } = useParams<{ subjectId: string; topicTitle: string }>()
  const student = useAuthStore((state) => state.student)
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [selectedChapter, setSelectedChapter] = React.useState<any>(null)
  const [regenerateDialogOpen, setRegenerateDialogOpen] = React.useState(false)

  const { data: chaptersData, isLoading, error } = useQuery(
    ['chapters', subjectId, topicTitle, student?.id],
    () => subjectsAPI.getChapters(
      parseInt(subjectId!), 
      decodeURIComponent(topicTitle!), 
      student!.id,
      false
    ).then(res => res.data),
    {
      enabled: !!subjectId && !!topicTitle && !!student?.id,
      retry: 2,
    }
  )

  // Fetch quiz results if all chapters are completed
  const allChaptersCompleted = chaptersData?.chapters ? 
    chaptersData.chapters.every((chapter: any) => chapter.has_content_generated) : false

  // State to control when to fetch quiz results (only after user has taken quiz)
  const [shouldFetchResults, setShouldFetchResults] = React.useState(false)

  const { data: quizResults } = useQuery<QuizResultsHistory>(
    ['quiz-results', subjectId, topicTitle, student?.id],
    () => subjectsAPI.getQuizResults(
      parseInt(subjectId!),
      decodeURIComponent(topicTitle!),
      student!.id
    ).then(res => res.data),
    {
      enabled: !!subjectId && !!topicTitle && !!student?.id && allChaptersCompleted && shouldFetchResults,
      retry: 1,
      staleTime: 30000, // Consider data fresh for 30 seconds
      refetchOnWindowFocus: false,
      onError: (error) => {
        console.log('Quiz results not available yet:', error)
      }
    }
  )

  // Check if quiz was taken by attempting to fetch it (only when returning from quiz)
  React.useEffect(() => {
    if (allChaptersCompleted && window.location.hash === '#quiz-completed') {
      setShouldFetchResults(true)
      // Clean up the hash
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [allChaptersCompleted])

  const regenerateChaptersMutation = useMutation(
    () => subjectsAPI.getChapters(
      parseInt(subjectId!), 
      decodeURIComponent(topicTitle!), 
      student!.id,
      true
    ),
    {
      onSuccess: (response) => {
        queryClient.setQueryData(['chapters', subjectId, topicTitle, student?.id], response.data)
        setRegenerateDialogOpen(false)
        setSelectedChapter(null) // Reset selected chapter
      },
      onError: (error) => {
        console.error('Failed to regenerate chapters:', error)
      }
    }
  )

  const handleBack = () => {
    navigate(`/subjects/${subjectId}/topics`)
  }

  const handleChapterSelect = (chapter: any) => {
    setSelectedChapter(chapter)
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

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={handleBack}
          sx={{ mb: 3 }}
        >
          {t('chapters.backToTopics')}
        </Button>
        <Alert severity="error">
          {t('chapters.failedToLoad')}
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
          {t('chapters.backToTopics')}
        </Button>

        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h3" fontWeight="bold">
              {decodeURIComponent(topicTitle || '')}
            </Typography>
            {/* Only show regenerate button if content exists and not currently generating */}
            {chaptersData?.is_generated && !isCurrentlyGenerating() && (
              <Tooltip title={t('chapters.regenerateTooltip')}>
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
            {isLoading ? t('chapters.loadingChapters') : t('chapters.selectChapterToRead')}
          </Typography>
        </Box>
      </motion.div>

      {/* Difficulty Required */}
      {!isLoading && chaptersData?.difficulty_required && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card sx={{ mb: 3, p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom color="warning.main">
              {t('chapters.difficultyRequired')}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              {chaptersData.message}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/subjects')}
              sx={{ mt: 1 }}
            >
              {t('chapters.backToSubjects')}
            </Button>
          </Card>
        </motion.div>
      )}

      <Grid container spacing={3}>
        {/* Chapters Navigation */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 'fit-content', position: 'sticky', top: 24 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  {t('chapters.title')}
                </Typography>
                {chaptersData?.chapters && chaptersData.chapters.length > 0 && (
                  <Chip
                    label={t('chapters.chaptersGenerated', { count: chaptersData.chapters.length })}
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
                    {t('chapters.generatingChapters')}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {t('chapters.generatingMayTake')}
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
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  textTransform: 'none',
                                  textDecoration: chapter.is_completed ? 'line-through' : 'none',
                                  opacity: chapter.is_completed ? 0.7 : 1,
                                }}
                              >
                                {chapter.title}
                              </Typography>
                            </Box>
                            {chapter.has_content_generated && (
                              <CheckCircle 
                                fontSize="small" 
                                sx={{ color: 'success.main', mr: 0.5 }}
                              />
                            )}
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

              {/* Quiz Card */}
              {!isLoading && chaptersData?.chapters && chaptersData.chapters.length > 0 && (
                <QuizCard 
                  chapters={chaptersData.chapters}
                  subjectId={parseInt(subjectId!)}
                  topicTitle={decodeURIComponent(topicTitle!)}
                  quizResults={quizResults}
                  onCheckResults={() => setShouldFetchResults(true)}
                />
              )}

              {/* Empty State */}
              {!isLoading && (!chaptersData?.chapters || chaptersData.chapters.length === 0) && !isCurrentlyGenerating() && (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body2" color="textSecondary">
                    {t('chapters.noChapters')}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Chapter Content */}
        <Grid item xs={12} md={8}>
          <Card sx={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              {selectedChapter ? (
                <motion.div
                  key={selectedChapter.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                >
                  <Typography variant="h4" fontWeight="bold" color="primary" sx={{ mb: 3 }}>
                    {selectedChapter.title}
                  </Typography>
                  
                  <Box
                    sx={{ 
                      mb: 4,
                      flexGrow: 1,
                      '& h1, & h2, & h3, & h4, & h5, & h6': {
                        color: 'primary.main',
                        fontWeight: 'bold',
                        mt: 3,
                        mb: 2,
                      },
                      '& p': {
                        mb: 2,
                        lineHeight: 1.7,
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
                    <ReactMarkdown>{selectedChapter.content}</ReactMarkdown>
                  </Box>

                  {/* Read Chapter Button - Always at bottom */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 'auto', pt: 2 }}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<MenuBook />}
                      onClick={() => navigate(`/subjects/${subjectId}/topics/${topicTitle}/chapters/${encodeURIComponent(selectedChapter.title)}/read?page=1`)}
                      sx={{
                        backgroundColor: '#1976d2',
                        color: 'white',
                        fontWeight: 'bold',
                        px: 4,
                        py: 2,
                        borderRadius: 3,
                        fontSize: '1.1rem',
                        minWidth: 200,
                        '&:hover': {
                          backgroundColor: '#1565c0',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 25px rgba(25, 118, 210, 0.3)',
                        },
                        transition: 'all 0.3s ease-in-out',
                        boxShadow: '0 4px 15px rgba(25, 118, 210, 0.2)',
                      }}
                    >
                      {t('chapters.readFullChapter')}
                    </Button>
                  </Box>
                </motion.div>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <MenuBook sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h5" gutterBottom>
                    {t('chapters.selectAChapter')}
                  </Typography>
                  <Typography variant="body1" color="textSecondary">
                    {t('chapters.chooseChapterToView')}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Regenerate Confirmation Dialog */}
      <Dialog
        open={regenerateDialogOpen}
        onClose={() => setRegenerateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('chapters.regenerateDialog.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('chapters.regenerateDialog.description')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegenerateDialogOpen(false)}>
            {t('chapters.regenerateDialog.cancel')}
          </Button>
          <Button 
            onClick={confirmRegenerate} 
            variant="contained" 
            color="primary"
            disabled={regenerateChaptersMutation.isLoading}
          >
            {regenerateChaptersMutation.isLoading ? t('chapters.regenerateDialog.regenerating') : t('chapters.regenerateDialog.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

// Quiz Card Component
interface QuizCardProps {
  chapters: any[]
  subjectId: number
  topicTitle: string
  quizResults?: QuizResultsHistory
  onCheckResults: () => void
}

const QuizCard: React.FC<QuizCardProps> = ({ chapters, subjectId, topicTitle, quizResults, onCheckResults }) => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  
  // Check if all chapters are completed (have content generated)
  const allChaptersCompleted = chapters.every(chapter => chapter.has_content_generated)
  const completedCount = chapters.filter(chapter => chapter.has_content_generated).length
  const totalCount = chapters.length

  const handleTakeQuiz = () => {
    navigate(`/subjects/${subjectId}/topics/${encodeURIComponent(topicTitle)}/quiz`)
  }



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return '#4CAF50'
    if (percentage >= 60) return '#FF9800'
    return '#F44336'
  }

  // If quiz results exist, show results card
  if (quizResults && quizResults.total_attempts > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card sx={{ mt: 3 }}>
          <CardContent sx={{ p: 3 }}>
            {/* Quiz Results Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <EmojiEvents sx={{ fontSize: 32, color: getScoreColor(quizResults.best_percentage || 0) }} />
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {t('chapters.quizResults')}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {quizResults.total_attempts} {quizResults.total_attempts === 1 ? t('chapters.attempt') : t('chapters.attempts')} • {t('chapters.bestScore')}: {quizResults.best_percentage?.toFixed(1)}%
                </Typography>
              </Box>
            </Box>

            {/* Best Score Display */}
            <Box sx={{ 
              p: 2, 
              mb: 3, 
              borderRadius: 2, 
              background: `linear-gradient(135deg, ${getScoreColor(quizResults.best_percentage || 0)}15, ${getScoreColor(quizResults.best_percentage || 0)}25)`,
              border: `1px solid ${getScoreColor(quizResults.best_percentage || 0)}`,
            }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {t('chapters.bestPerformance')}
              </Typography>
              <Typography variant="h4" fontWeight="bold" sx={{ color: getScoreColor(quizResults.best_percentage || 0) }}>
                {quizResults.best_score}/10
              </Typography>
              <Typography variant="h6" sx={{ color: getScoreColor(quizResults.best_percentage || 0) }}>
                {quizResults.best_percentage?.toFixed(1)}%
              </Typography>
            </Box>

            {/* Quiz History */}
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              {t('chapters.attemptHistory')}
            </Typography>
            <Stack spacing={1} sx={{ mb: 3, maxHeight: 200, overflow: 'auto' }}>
              {quizResults.results_history.map((result, index) => (
                <Box
                  key={result.id}
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    backgroundColor: result.is_best ? 'success.light' : 'grey.50',
                    border: result.is_best ? '1px solid' : '1px solid transparent',
                    borderColor: result.is_best ? 'success.main' : 'transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="bold">
                        Attempt #{quizResults.results_history.length - index}
                      </Typography>
                      {result.is_best && (
                        <Chip
                          label={t('chapters.best')}
                          size="small"
                          color="success"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      {formatDate(result.submitted_at)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body1" fontWeight="bold">
                      {result.score}/10
                    </Typography>
                    <Typography variant="body2" sx={{ color: getScoreColor(result.percentage) }}>
                      {result.percentage.toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>

            {/* Action Buttons */}
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={handleTakeQuiz}
                startIcon={<Quiz />}
                sx={{ flex: 1 }}
              >
                {t('chapters.retakeQuiz')}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // Otherwise, show the original unlock card
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card 
        sx={{ 
          mt: 3,
          background: allChaptersCompleted 
            ? 'linear-gradient(135deg, #B8860B 0%, #DAA520 100%)' 
            : 'linear-gradient(135deg, #757575 0%, #BDBDBD 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: allChaptersCompleted ? 'none' : 'rgba(0,0,0,0.3)',
            zIndex: 1,
          }
        }}
      >
        <CardContent sx={{ position: 'relative', zIndex: 2, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            {allChaptersCompleted ? (
              <Quiz sx={{ fontSize: 32 }} />
            ) : (
              <Lock sx={{ fontSize: 32 }} />
            )}
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {t('chapters.topicQuiz')}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {allChaptersCompleted ? t('chapters.multipleChoiceQuestions') : t('chapters.completeAllChapters')}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>
              {t('chapters.progress', { completed: completedCount, total: totalCount })}
            </Typography>
            <Box
              sx={{
                width: '100%',
                height: 8,
                backgroundColor: 'rgba(255,255,255,0.3)',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${(completedCount / totalCount) * 100}%`,
                  height: '100%',
                  backgroundColor: allChaptersCompleted ? '#388E3C' : '#FFF',
                  transition: 'width 0.3s ease-in-out',
                }}
              />
            </Box>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              onClick={handleTakeQuiz}
              disabled={!allChaptersCompleted}
              startIcon={allChaptersCompleted ? <EmojiEvents /> : <Lock />}
              sx={{
                flex: 1,
                backgroundColor: allChaptersCompleted ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: allChaptersCompleted ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                },
                '&:disabled': {
                  color: 'rgba(255,255,255,0.7)',
                }
              }}
            >
              {allChaptersCompleted ? t('chapters.takeQuiz') : t('chapters.completeMoreChapters', { count: totalCount - completedCount })}
            </Button>
            {allChaptersCompleted && (
              <Button
                variant="outlined"
                onClick={onCheckResults}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.5)',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  }
                }}
              >
                {t('chapters.results')}
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default ChaptersPage 