import React from 'react'
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  Paper,
  Avatar,
} from '@mui/material'
import { AutoAwesome, CheckCircle, School, TrendingUp } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { useTranslation } from 'react-i18next'

import { subjectsAPI, studentsAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import DifficultySelectionModal from '../../components/DifficultySelection/DifficultySelectionModal'
import AddSubjectModal from '../../components/SubjectCreation/AddSubjectModal'

const SubjectsPage: React.FC = () => {
  const navigate = useNavigate()
  const student = useAuthStore((state) => state.student)
  const { t } = useTranslation()
  const [difficultyModalOpen, setDifficultyModalOpen] = React.useState(false)
  const [selectedSubject, setSelectedSubject] = React.useState<{id: number, name: string} | null>(null)
  const [addSubjectModalOpen, setAddSubjectModalOpen] = React.useState(false)

  const { data: subjects, isLoading, error } = useQuery(
    ['subjects', student?.id],
    () => subjectsAPI.getAll(student?.id).then(res => res.data),
    {
      enabled: !!student?.id,
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )

  // Get user-specific generated content to show checkmarks
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

  // Get student dashboard data for progress overview
  const { data: dashboardData } = useQuery(
    ['student-dashboard', student?.id],
    () => studentsAPI.getDashboard(student!.id).then(res => res.data),
    {
      enabled: !!student?.id,
      retry: 1,
      staleTime: 60 * 1000, // 1 minute
    }
  )

  const handleSubjectClick = (subject: any) => {
    // Check if difficulty is already set for this subject
    if (subject.difficulty_level) {
      // Difficulty already set, navigate directly
      navigate(`/subjects/${subject.id}/topics`)
    } else {
      // Need to set difficulty first
      setSelectedSubject({ id: subject.id, name: subject.name })
      setDifficultyModalOpen(true)
    }
  }

  const handleDifficultySet = (difficulty: string) => {
    if (selectedSubject) {
      // Navigate to topics after difficulty is set
      navigate(`/subjects/${selectedSubject.id}/topics`)
    }
  }

  const handleCloseModal = () => {
    setDifficultyModalOpen(false)
    setSelectedSubject(null)
  }

  const getSubjectGenerationStatus = (subjectName: string) => {
    if (!userContent || !student) return null

    const difficultyLevel = student.difficulty_level
    
    // Check if any topics are generated for this subject
    const hasTopicsGenerated = userContent.topics_keys?.some((key: string) => 
      key.includes(`${student.id}_${subjectName}_${difficultyLevel}`)
    )
    
    // Check if any chapters are generated for this subject
    const hasChaptersGenerated = userContent.chapters_keys?.some((key: string) => 
      key.includes(`${student.id}_${subjectName}_`)
    )
    
    // Check if generation is in progress
    const isGenerating = Object.keys(userContent.generation_status || {}).some(
      (key: string) => key.includes(`${student.id}_${subjectName}_`) && userContent.generation_status[key] === 'generating'
    )

    if (isGenerating) {
      return {
        icon: <AutoAwesome sx={{ color: 'orange', fontSize: '1rem' }} />,
        label: 'Generating',
        color: 'warning' as const,
        tooltip: 'AI content is being generated for this subject'
      }
    }

    if (hasTopicsGenerated || hasChaptersGenerated) {
      const contentType = hasChaptersGenerated ? 'Topics & Chapters' : 'Topics Generated'
      return {
        icon: <CheckCircle sx={{ color: 'green', fontSize: '1rem' }} />,
        label: contentType,
        color: 'success' as const,
        tooltip: hasChaptersGenerated 
          ? 'This subject has generated topics and chapters available'
          : 'This subject has generated topics available'
      }
    }

    return null
  }

  const subjectIcons: { [key: string]: string } = {
    'Computer Science': '💻',
    'Programming': '🚀',
    'Data Science': '📊',
    'Physics': '⚛️',
    'Geography': '🌍',
    'History': '📚',
  }

  const subjectColors: { [key: string]: string } = {
    'Computer Science': '#1976d2',
    'Programming': '#388e3c',
    'Data Science': '#f57c00',
    'Physics': '#7b1fa2',
    'Geography': '#0288d1',
    'History': '#d32f2f',
  }

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress size={48} />
        </Box>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {t('errors.generic')}
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Welcome Header with Student Info */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Paper
          elevation={2}
          sx={{
            p: 3,
            mb: 4,
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            color: 'white',
            borderRadius: 3,
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  fontSize: '1.5rem',
                }}
              >
                <School />
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                {t('subjects.welcomeBack', { name: student?.name })}
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9, mb: 1 }}>
                {t('subjects.readyToContinue')}
              </Typography>
              {dashboardData?.stats?.subjects_started > 0 && (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<TrendingUp sx={{ color: 'white !important' }} />}
                    label={t('subjects.subjectsStarted', { count: dashboardData.stats.subjects_started })}
                    sx={{ 
                      bgcolor: 'rgba(255, 255, 255, 0.2)', 
                      color: 'white' 
                    }}
                  />
                </Box>
              )}
            </Grid>
          </Grid>
        </Paper>
      </motion.div>

      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {t('subjects.title')}
          </Typography>
          <Typography variant="h6" color="textSecondary" sx={{ mb: 3 }}>
            {t('subjects.subtitle')}
          </Typography>
          
          <Button
            variant="contained"
            startIcon={<AutoAwesome />}
            onClick={() => setAddSubjectModalOpen(true)}
            sx={{
              background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
              color: 'white',
              fontWeight: 600,
              px: 3,
              py: 1.5,
              borderRadius: 3,
              textTransform: 'none',
              boxShadow: '0 4px 16px rgba(76, 175, 80, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #43a047 0%, #5cb85c 100%)',
                boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            {t('subjects.addNewSubject')}
          </Button>
        </Box>
      </motion.div>

      {/* Subjects Grid */}
      <Grid container spacing={3}>
        {subjects?.sort((a, b) => b.id - a.id).map((subject, index) => {
          const generationStatus = getSubjectGenerationStatus(subject.name)
          
          return (
            <Grid item xs={12} sm={6} md={4} key={subject.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  sx={{
                    height: 320, // Fixed height for all cards
                    cursor: 'pointer',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-4px)',
                    },
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onClick={() => handleSubjectClick(subject)}
                >
                  <CardContent sx={{ 
                    p: 3, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    height: '100%',
                    justifyContent: 'space-between'
                  }}>
                    {/* Top Section - Status and Icon */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                      {/* Generation Status and Difficulty Level Indicators */}
                      <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {/* Difficulty Level Indicator */}
                        {subject.difficulty_level && (
                          <Chip
                            label={subject.difficulty_level}
                            size="small"
                            sx={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              bgcolor: subject.difficulty_level === 'Foundation' ? '#4caf50' :
                                      subject.difficulty_level === 'Intermediate' ? '#ff9800' :
                                      subject.difficulty_level === 'Advanced' ? '#f44336' :
                                      subject.difficulty_level === 'Expert' ? '#9c27b0' : 'primary.main',
                              color: 'white'
                            }}
                          />
                        )}
                        
                        {/* Generation Status Indicator */}
                        {generationStatus && (
                          <Chip
                            icon={generationStatus.icon}
                            label={generationStatus.label}
                            color={generationStatus.color}
                            variant="outlined"
                            size="small"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>

                      {/* Subject Icon */}
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: 3,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '2.5rem',
                          background: `linear-gradient(135deg, ${subjectColors[subject.name] || '#1976d2'}22, ${subjectColors[subject.name] || '#1976d2'}11)`,
                          border: `2px solid ${subjectColors[subject.name] || '#1976d2'}33`,
                        }}
                      >
                        {subjectIcons[subject.name] || '📖'}
                      </Box>
                    </Box>

                    {/* Middle Section - Title and Description */}
                    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
                      {/* Subject Title */}
                      <Typography variant="h5" fontWeight="bold" gutterBottom>
                        {subject.name}
                      </Typography>

                      {/* Subject Description */}
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{ 
                          flexGrow: 1,
                          mb: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.4
                        }}
                      >
                        {subject.description}
                      </Typography>
                    </Box>

                    {/* Bottom Section - Action Button */}
                    <Box>
                      <Button
                        variant="contained"
                        fullWidth
                        sx={{
                          bgcolor: subjectColors[subject.name] || 'primary.main',
                          '&:hover': {
                            bgcolor: subjectColors[subject.name] || 'primary.dark',
                          },
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSubjectClick(subject)
                        }}
                      >
                        {subject.difficulty_level ? t('subjects.explore') : t('subjects.selectDifficulty')}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          )
        })}
      </Grid>

      {/* Empty State */}
      {subjects?.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h5" gutterBottom>
              {t('subjects.noSubjects')}
            </Typography>
            <Typography variant="body1" color="textSecondary">
              {t('subjects.noSubjectsDescription')}
            </Typography>
          </Box>
        </motion.div>
      )}

      {/* Difficulty Selection Modal */}
      {selectedSubject && (
        <DifficultySelectionModal
          open={difficultyModalOpen}
          onClose={handleCloseModal}
          subjectId={selectedSubject.id}
          subjectName={selectedSubject.name}
          studentId={student!.id}
          onDifficultySet={handleDifficultySet}
        />
      )}

      {/* Add Subject Modal */}
      <AddSubjectModal
        open={addSubjectModalOpen}
        onClose={() => setAddSubjectModalOpen(false)}
      />
    </Container>
  )
}

export default SubjectsPage 