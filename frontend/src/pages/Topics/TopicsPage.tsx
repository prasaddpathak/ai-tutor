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
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
} from '@mui/material'
import { 
  ArrowBack, 
  AutoAwesome, 
  CheckCircle, 
  Refresh,
  MenuBook,
  TrendingUp,
  EmojiEvents,
  PlayArrow
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'

import { subjectsAPI, progressAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

const TopicsPage: React.FC = () => {
  const navigate = useNavigate()
  const { subjectId } = useParams<{ subjectId: string }>()
  const student = useAuthStore((state) => state.student)
  const queryClient = useQueryClient()
  const [regenerateDialogOpen, setRegenerateDialogOpen] = React.useState(false)

  const { data: topicsData, isLoading, error, refetch } = useQuery(
    ['topics', subjectId, student?.difficulty_level, student?.id],
    () => subjectsAPI.getTopics(
      parseInt(subjectId!), 
      student?.difficulty_level || 'School', 
      false, 
      student?.id
    ).then(res => res.data),
    {
      enabled: !!subjectId && !!student,
      retry: 2,
    }
  )

  // Get user-specific generated content to check for chapter availability per topic
  const { data: userContent } = useQuery(
    ['user-generated-content', student?.id],
    () => subjectsAPI.getUserGeneratedContent(student!.id).then(res => res.data),
    {
      enabled: !!student?.id,
      retry: 1,
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: 30 * 1000, // Refresh every 30 seconds
    }
  )

  // Get topic progress summaries for all topics
  const { data: topicProgressData } = useQuery(
    ['all-topic-progress', subjectId, student?.id, topicsData?.topics],
    async () => {
      if (!student?.id || !topicsData?.topics) return {}
      
      const progressPromises = topicsData.topics.map(async (topic: any) => {
        try {
          const response = await progressAPI.getTopicProgressSummary(
            student.id,
            parseInt(subjectId!),
            topic.title
          )
          return { [topic.title]: response.data }
        } catch (error) {
          // If no progress exists yet, return empty progress
          return { 
            [topic.title]: {
              topic: topic.title,
              total_chapters: 0,
              completed_chapters: 0,
              total_pages: 0,
              completed_pages: 0,
              completion_percentage: 0,
              time_spent_minutes: 0
            }
          }
        }
      })
      
      const progressResults = await Promise.all(progressPromises)
      return progressResults.reduce((acc, curr) => ({ ...acc, ...curr }), {})
    },
    {
      enabled: !!student?.id && !!topicsData?.topics && topicsData.topics.length > 0,
      retry: 1,
    }
  )

  const regenerateTopicsMutation = useMutation(
    () => subjectsAPI.getTopics(
      parseInt(subjectId!), 
      student?.difficulty_level || 'School', 
      true, 
      student?.id
    ),
    {
      onSuccess: (response) => {
        queryClient.setQueryData(['topics', subjectId, student?.difficulty_level, student?.id], response.data)
        setRegenerateDialogOpen(false)
      },
      onError: (error) => {
        console.error('Failed to regenerate topics:', error)
      }
    }
  )

  const handleTopicClick = (topicTitle: string) => {
    navigate(`/subjects/${subjectId}/topics/${encodeURIComponent(topicTitle)}/chapters`)
  }

  const handleBack = () => {
    navigate('/subjects')
  }

  const handleRegenerate = () => {
    setRegenerateDialogOpen(true)
  }

  const confirmRegenerate = () => {
    regenerateTopicsMutation.mutate()
  }

  const checkTopicHasChapters = (topicTitle: string) => {
    if (!userContent || !student || !topicsData?.subject) return false
    
    // Check if chapters exist for this specific topic
    const chapterKey = `${student.id}_${topicsData.subject.name}_${topicTitle}_${student.difficulty_level}`
    return userContent.chapters_keys?.includes(chapterKey) || false
  }

  const getTopicProgress = (topicTitle: string) => {
    return topicProgressData?.[topicTitle] || {
      topic: topicTitle,
      total_chapters: 0,
      completed_chapters: 0,
      total_pages: 0,
      completed_pages: 0,
      completion_percentage: 0,
      time_spent_minutes: 0
    }
  }

  const getProgressIcon = (progress: any) => {
    if (progress.completion_percentage >= 100) return <EmojiEvents sx={{ color: 'gold' }} />
    if (progress.completion_percentage >= 75) return <CheckCircle sx={{ color: 'success.main' }} />
    if (progress.completion_percentage >= 25) return <TrendingUp sx={{ color: 'primary.main' }} />
    if (progress.total_chapters > 0) return <PlayArrow sx={{ color: 'info.main' }} />
    return <MenuBook sx={{ color: 'grey.400' }} />
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'success'
    if (percentage >= 60) return 'primary'
    if (percentage >= 40) return 'warning'
    return 'error'
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const isCurrentlyGenerating = () => {
    if (!topicsData) return false
    return topicsData.generating || false
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={handleBack}
          sx={{ mb: 3 }}
        >
          Back to Subjects
        </Button>
        <Alert severity="error">
          Failed to load topics. Please try again later.
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
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
          Back to Subjects
        </Button>

        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h3" fontWeight="bold">
              {topicsData?.subject?.name || 'Topics'}
            </Typography>
            {/* Only show regenerate button if content exists and not currently generating */}
            {topicsData?.is_generated && !isCurrentlyGenerating() && (
              <Tooltip title="Regenerate topics with fresh AI content">
                <IconButton
                  onClick={handleRegenerate}
                  color="primary"
                  disabled={regenerateTopicsMutation.isLoading}
                >
                  {regenerateTopicsMutation.isLoading ? (
                    <CircularProgress size={20} />
                  ) : (
                    <Refresh />
                  )}
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Typography variant="h6" color="textSecondary">
            {isLoading ? 'Loading topics...' : 'Choose a topic to explore detailed chapters'}
          </Typography>
        </Box>
      </motion.div>

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[...Array(6)].map((_, index) => (
            <Skeleton
              key={index}
              variant="rectangular"
              height={120}
              sx={{ borderRadius: 2 }}
            />
          ))}
        </Box>
      )}

      {/* Generation in Progress */}
      {isCurrentlyGenerating() && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card sx={{ mb: 3, p: 3, textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Generating Curriculum...
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Our AI is creating personalized topics for your level. This may take a moment.
            </Typography>
          </Card>
        </motion.div>
      )}

      {/* Topics List */}
      {!isLoading && topicsData?.topics && topicsData.topics.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {topicsData.topics.map((topic: any, index: number) => {
            const hasChapters = checkTopicHasChapters(topic.title)
            const progress = getTopicProgress(topic.title)
            const progressIcon = getProgressIcon(progress)
            const progressColor = getProgressColor(progress.completion_percentage) as any
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      boxShadow: 4,
                      borderColor: 'primary.main',
                    },
                    border: '1px solid',
                    borderColor: 'divider',
                    position: 'relative',
                  }}
                  onClick={() => handleTopicClick(topic.title)}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
                        {progressIcon}
                        <Typography variant="h5" fontWeight="bold" color="primary">
                          {topic.title}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {progress.completion_percentage > 0 && (
                          <Chip
                            label={`${Math.round(progress.completion_percentage)}%`}
                            size="small"
                            color={progressColor}
                            variant="filled"
                            sx={{ fontWeight: 'bold' }}
                          />
                        )}
                        <Chip
                          label={`#${index + 1}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ minWidth: 'auto' }}
                        />
                      </Box>
                    </Box>

                    {topic.description && (
                      <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                        {topic.description}
                      </Typography>
                    )}

                    {/* Progress Information */}
                    {progress.total_chapters > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2" color="textSecondary">
                            Progress: {progress.completed_pages} of {progress.total_pages} pages read
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {formatTime(progress.time_spent_minutes)} spent
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={progress.completion_percentage}
                          color={progressColor}
                          sx={{ 
                            height: 6, 
                            borderRadius: 3,
                            bgcolor: 'grey.200',
                            mb: 1
                          }}
                        />
                        <Box sx={{ display: 'flex', justify: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="textSecondary">
                            {progress.completed_chapters} of {progress.total_chapters} chapters started
                          </Typography>
                          {progress.completion_percentage >= 100 && (
                            <Chip
                              label="Complete!"
                              size="small"
                              color="success"
                              variant="filled"
                              icon={<EmojiEvents />}
                            />
                          )}
                        </Box>
                      </Box>
                    )}

                    {/* No progress yet */}
                    {progress.total_chapters === 0 && hasChapters && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
                        <Typography variant="body2" color="info.main">
                          📚 Chapters available - Click to start your learning journey!
                        </Typography>
                      </Box>
                    )}

                    {/* No chapters generated yet */}
                    {!hasChapters && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="body2" color="textSecondary">
                          💡 Click to generate chapters and start learning
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </Box>
      )}

      {/* Empty State */}
      {!isLoading && (!topicsData?.topics || topicsData.topics.length === 0) && !isCurrentlyGenerating() && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h5" gutterBottom>
              No topics available
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
              We couldn't generate topics for this subject. Please try again or contact support.
            </Typography>
            <Button variant="contained" onClick={handleBack}>
              Choose Another Subject
            </Button>
          </Box>
        </motion.div>
      )}

      {/* Regenerate Confirmation Dialog */}
      <Dialog
        open={regenerateDialogOpen}
        onClose={() => setRegenerateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Regenerate Topics?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will generate fresh AI content for all topics in this subject. 
            The current topics will be replaced. This process may take a few minutes.
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
            disabled={regenerateTopicsMutation.isLoading}
          >
            {regenerateTopicsMutation.isLoading ? 'Regenerating...' : 'Regenerate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default TopicsPage 