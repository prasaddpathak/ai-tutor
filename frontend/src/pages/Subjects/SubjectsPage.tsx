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
} from '@mui/material'
import { AutoAwesome, CheckCircle } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'

import { subjectsAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

const SubjectsPage: React.FC = () => {
  const navigate = useNavigate()
  const student = useAuthStore((state) => state.student)

  const { data: subjects, isLoading, error } = useQuery(
    'subjects',
    () => subjectsAPI.getAll().then(res => res.data),
    {
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

  const handleSubjectClick = (subjectId: number) => {
    navigate(`/subjects/${subjectId}/topics`)
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
          Failed to load subjects. Please try again later.
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            Choose Your Subject
          </Typography>
          <Typography variant="h6" color="textSecondary" sx={{ mb: 2 }}>
            Select a subject to explore AI-generated curriculum tailored to your level
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Chip
              label={`Difficulty: ${student?.difficulty_level}`}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            {userContent && (
              <Chip
                icon={<CheckCircle />}
                label={`${userContent.generated_topics_count + userContent.generated_chapters_count} items generated`}
                color="success"
                variant="outlined"
                size="small"
              />
            )}
          </Box>
        </Box>
      </motion.div>

      {/* Subjects Grid */}
      <Grid container spacing={3}>
        {subjects?.map((subject, index) => {
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
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-4px)',
                    },
                    position: 'relative',
                  }}
                  onClick={() => handleSubjectClick(subject.id)}
                >
                  <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Generation Status Indicator */}
                    {generationStatus && (
                      <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
                        <Tooltip title={generationStatus.tooltip}>
                          <Chip
                            icon={generationStatus.icon}
                            label={generationStatus.label}
                            color={generationStatus.color}
                            variant="outlined"
                            size="small"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        </Tooltip>
                      </Box>
                    )}

                    {/* Subject Icon */}
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                        fontSize: '2.5rem',
                        background: `linear-gradient(135deg, ${subjectColors[subject.name] || '#1976d2'}22, ${subjectColors[subject.name] || '#1976d2'}11)`,
                        border: `2px solid ${subjectColors[subject.name] || '#1976d2'}33`,
                      }}
                    >
                      {subjectIcons[subject.name] || '📖'}
                    </Box>

                    {/* Subject Title */}
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                      {subject.name}
                    </Typography>

                    {/* Subject Description */}
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{ flexGrow: 1, mb: 3 }}
                    >
                      {subject.description}
                    </Typography>

                    {/* Action Button */}
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
                        handleSubjectClick(subject.id)
                      }}
                    >
                      Explore Topics
                    </Button>
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
              No subjects available
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Subjects will be loaded from the database. Please check your backend connection.
            </Typography>
          </Box>
        </motion.div>
      )}
    </Container>
  )
}

export default SubjectsPage 