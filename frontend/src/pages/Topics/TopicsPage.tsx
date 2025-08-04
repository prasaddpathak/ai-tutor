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
} from '@mui/material'
import { 
  ArrowBack, 
  AutoAwesome, 
  CheckCircle, 
  Refresh
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'

import { subjectsAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'

const TopicsPage: React.FC = () => {
  const navigate = useNavigate()
  const { subjectId } = useParams<{ subjectId: string }>()
  const student = useAuthStore((state) => state.student)
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [regenerateDialogOpen, setRegenerateDialogOpen] = React.useState(false)

  const { data: topicsData, isLoading, error, refetch } = useQuery(
    ['topics', subjectId, student?.id],
    () => subjectsAPI.getTopics(
      parseInt(subjectId!), 
      student!.id,
      false
    ).then(res => res.data),
    {
      enabled: !!subjectId && !!student?.id,
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

  const regenerateTopicsMutation = useMutation(
    () => subjectsAPI.getTopics(
      parseInt(subjectId!), 
      student!.id,
      true
    ),
    {
      onSuccess: (response) => {
        queryClient.setQueryData(['topics', subjectId, student?.id], response.data)
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
    
    // Check if chapters exist for this specific topic by looking for any key that contains
    // the student_id, subject_name, and topic_title pattern
    const keyPattern = `${student.id}_${topicsData.subject.name}_${topicTitle}_`
    return userContent.chapters_keys?.some((key: string) => key.startsWith(keyPattern)) || false
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
          {t('topics.backToSubjects')}
        </Button>
        <Alert severity="error">
          {t('topics.failedToLoad')}
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
          {t('topics.backToSubjects')}
        </Button>

        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h3" fontWeight="bold">
              {topicsData?.subject?.name || t('topics.title')}
            </Typography>
            {/* Difficulty Level Display */}
            {topicsData?.subject?.difficulty_level && (
              <Chip
                label={topicsData.subject.difficulty_level}
                sx={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  px: 1,
                  bgcolor: topicsData.subject.difficulty_level === 'Foundation' ? '#4caf50' :
                          topicsData.subject.difficulty_level === 'Intermediate' ? '#ff9800' :
                          topicsData.subject.difficulty_level === 'Advanced' ? '#f44336' :
                          topicsData.subject.difficulty_level === 'Expert' ? '#9c27b0' : 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: topicsData.subject.difficulty_level === 'Foundation' ? '#43a047' :
                            topicsData.subject.difficulty_level === 'Intermediate' ? '#f57c00' :
                            topicsData.subject.difficulty_level === 'Advanced' ? '#d32f2f' :
                            topicsData.subject.difficulty_level === 'Expert' ? '#7b1fa2' : 'primary.dark',
                  }
                }}
              />
            )}
            {/* Only show regenerate button if content exists and not currently generating */}
            {topicsData?.is_generated && !isCurrentlyGenerating() && (
              <Tooltip title={t('topics.regenerateTooltip')}>
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
            {isLoading ? t('topics.loadingTopics') : t('topics.chooseTopicToExplore')}
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
              {t('topics.generatingCurriculum')}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {t('topics.aiCreatingTopics')}
            </Typography>
          </Card>
        </motion.div>
      )}

      {/* Difficulty Required */}
      {!isLoading && topicsData?.difficulty_required && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card sx={{ mb: 3, p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom color="warning.main">
              {t('topics.difficultyRequired')}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              {topicsData.message}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/subjects')}
              sx={{ mt: 1 }}
            >
              {t('topics.backToSubjects')}
            </Button>
          </Card>
        </motion.div>
      )}

      {/* Topics List */}
      {!isLoading && !topicsData?.difficulty_required && topicsData?.topics && topicsData.topics.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {topicsData.topics.map((topic: any, index: number) => {
            const hasChapters = checkTopicHasChapters(topic.title)
            
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
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
                        <Typography variant="h5" fontWeight="bold" color="primary">
                          {topic.title}
                        </Typography>
                        {hasChapters && (
                          <Tooltip title={t('topics.hasChaptersTooltip')}>
                            <CheckCircle sx={{ color: 'green', fontSize: '1.2rem' }} />
                          </Tooltip>
                        )}
                      </Box>
                      <Chip
                        label={`#${index + 1}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ ml: 2, minWidth: 'auto' }}
                      />
                    </Box>
                    {topic.description && (
                      <Typography variant="body1" color="textSecondary">
                        {topic.description}
                      </Typography>
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
              {t('topics.noTopics')}
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
              {t('topics.noTopicsDescription')}
            </Typography>
            <Button variant="contained" onClick={handleBack}>
              {t('topics.chooseAnotherSubject')}
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
        <DialogTitle>{t('topics.regenerateDialog.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('topics.regenerateDialog.description')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegenerateDialogOpen(false)}>
            {t('topics.regenerateDialog.cancel')}
          </Button>
          <Button 
            onClick={confirmRegenerate} 
            variant="contained" 
            color="primary"
            disabled={regenerateTopicsMutation.isLoading}
          >
            {regenerateTopicsMutation.isLoading ? t('topics.regenerateDialog.regenerating') : t('topics.regenerateDialog.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default TopicsPage 