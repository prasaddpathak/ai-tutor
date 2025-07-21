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
} from '@mui/material'
import { 
  ArrowBack, 
  MenuBook,
  AutoAwesome, 
  CheckCircle, 
  Refresh
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import ReactMarkdown from 'react-markdown'

import { subjectsAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

const ChaptersPage: React.FC = () => {
  const navigate = useNavigate()
  const { subjectId, topicTitle } = useParams<{ subjectId: string; topicTitle: string }>()
  const student = useAuthStore((state) => state.student)
  const queryClient = useQueryClient()
  const [selectedChapter, setSelectedChapter] = React.useState<any>(null)
  const [regenerateDialogOpen, setRegenerateDialogOpen] = React.useState(false)

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

  const regenerateChaptersMutation = useMutation(
    () => subjectsAPI.getChapters(
      parseInt(subjectId!), 
      decodeURIComponent(topicTitle!), 
      student?.difficulty_level || 'School',
      true,
      student?.id
    ),
    {
      onSuccess: (response) => {
        queryClient.setQueryData(['chapters', subjectId, topicTitle, student?.difficulty_level, student?.id], response.data)
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
          Back to Topics
        </Button>

        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h3" fontWeight="bold">
              {decodeURIComponent(topicTitle || '')}
            </Typography>
            {/* Only show regenerate button if content exists and not currently generating */}
            {chaptersData?.is_generated && !isCurrentlyGenerating() && (
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
            {isLoading ? 'Loading chapters...' : 'Select a chapter to read the content'}
          </Typography>
        </Box>
      </motion.div>

      <Grid container spacing={3}>
        {/* Chapters Navigation */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 'fit-content', position: 'sticky', top: 24 }}>
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

        {/* Chapter Content */}
        <Grid item xs={12} md={8}>
          <Card sx={{ minHeight: '60vh' }}>
            <CardContent sx={{ p: 4 }}>
              {selectedChapter ? (
                <motion.div
                  key={selectedChapter.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
                    {selectedChapter.title}
                  </Typography>
                  
                  <Box
                    sx={{ 
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
                </motion.div>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <MenuBook sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h5" gutterBottom>
                    Select a Chapter
                  </Typography>
                  <Typography variant="body1" color="textSecondary">
                    Choose a chapter from the list to view its detailed content
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