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
} from '@mui/material'
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

  const handleSubjectClick = (subjectId: number) => {
    navigate(`/subjects/${subjectId}/topics`)
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
          <Chip
            label={`Difficulty: ${student?.difficulty_level}`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Box>
      </motion.div>

      {/* Subjects Grid */}
      <Grid container spacing={3}>
        {subjects?.map((subject, index) => (
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
                }}
                onClick={() => handleSubjectClick(subject.id)}
              >
                <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
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
        ))}
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