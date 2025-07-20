import React from 'react'
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Avatar,
  Paper,
} from '@mui/material'
import {
  School,
  TrendingUp,
  Assignment,
  Timer,
  StarBorder,
  ArrowForward,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '../../stores/authStore'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const student = useAuthStore((state) => state.student)

  const mockStats = {
    totalSubjects: 6,
    completedChapters: 12,
    totalChapters: 45,
    currentStreak: 5,
    averageScore: 87,
    hoursLearned: 24,
  }

  const recentActivity = [
    {
      subject: 'Computer Science',
      topic: 'Data Structures',
      chapter: 'Binary Trees',
      progress: 75,
      lastAccessed: '2 hours ago',
    },
    {
      subject: 'Physics',
      topic: 'Quantum Mechanics',
      chapter: 'Wave Functions',
      progress: 45,
      lastAccessed: '1 day ago',
    },
    {
      subject: 'Programming',
      topic: 'Python Basics',
      chapter: 'Object-Oriented Programming',
      progress: 90,
      lastAccessed: '3 days ago',
    },
  ]

  const subjects = [
    { name: 'Computer Science', icon: '💻', progress: 65, color: '#1976d2' },
    { name: 'Programming', icon: '🚀', progress: 80, color: '#388e3c' },
    { name: 'Data Science', icon: '📊', progress: 35, color: '#f57c00' },
    { name: 'Physics', icon: '⚛️', progress: 50, color: '#7b1fa2' },
    { name: 'Geography', icon: '🌍', progress: 20, color: '#0288d1' },
    { name: 'History', icon: '📚', progress: 15, color: '#d32f2f' },
  ]

  const handleSubjectClick = () => {
    navigate('/subjects')
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            Welcome back, {student?.name}! 👋
          </Typography>
          <Typography variant="h6" color="textSecondary">
            Ready to continue your learning journey?
          </Typography>
        </Box>
      </motion.div>

      <Grid container spacing={3}>
        {/* Stats Overview */}
        <Grid item xs={12}>
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <School sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h4" fontWeight="bold">{mockStats.totalSubjects}</Typography>
                    <Typography variant="body2">Subjects Available</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Assignment sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h4" fontWeight="bold">{mockStats.completedChapters}/{mockStats.totalChapters}</Typography>
                    <Typography variant="body2">Chapters Completed</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <TrendingUp sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h4" fontWeight="bold">{mockStats.averageScore}%</Typography>
                    <Typography variant="body2">Average Score</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <StarBorder sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h4" fontWeight="bold">{mockStats.currentStreak}</Typography>
                    <Typography variant="body2">Day Streak</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </motion.div>
        </Grid>

        {/* Continue Learning */}
        <Grid item xs={12} md={8}>
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5" fontWeight="bold">
                    Continue Learning
                  </Typography>
                  <Button
                    variant="contained"
                    endIcon={<ArrowForward />}
                    onClick={handleSubjectClick}
                  >
                    View All Subjects
                  </Button>
                </Box>

                {recentActivity.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {recentActivity.map((activity, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Paper
                          sx={{
                            p: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            cursor: 'pointer',
                            '&:hover': {
                              borderColor: 'primary.main',
                              boxShadow: 2,
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {activity.subject}
                            </Typography>
                            <Chip label={activity.lastAccessed} size="small" />
                          </Box>
                          <Typography variant="body2" color="textSecondary" gutterBottom>
                            {activity.topic} • {activity.chapter}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <LinearProgress
                              variant="determinate"
                              value={activity.progress}
                              sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="body2" fontWeight="bold">
                              {activity.progress}%
                            </Typography>
                          </Box>
                        </Paper>
                      </motion.div>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <School sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Start Your Learning Journey
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                      Choose a subject to begin your personalized learning experience
                    </Typography>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleSubjectClick}
                      startIcon={<School />}
                    >
                      Explore Subjects
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Quick Actions & Profile */}
        <Grid item xs={12} md={4}>
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar
                    sx={{
                      width: 60,
                      height: 60,
                      bgcolor: 'primary.main',
                      fontSize: '1.5rem',
                      mr: 2,
                    }}
                  >
                    {student?.name?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {student?.name}
                    </Typography>
                    <Chip
                      label={student?.difficulty_level}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Learning at {student?.difficulty_level} level since{' '}
                  {student?.created_at ? new Date(student.created_at).toLocaleDateString() : 'recently'}
                </Typography>
              </CardContent>
            </Card>

            {/* Subject Progress Overview */}
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Subject Progress
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {subjects.slice(0, 4).map((subject, index) => (
                    <Box key={index}>
                      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span style={{ fontSize: '1.2rem' }}>{subject.icon}</span>
                          <Typography variant="body2">{subject.name}</Typography>
                        </Box>
                        <Typography variant="body2" fontWeight="bold">
                          {subject.progress}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={subject.progress}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: subject.color,
                          },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
                <Button
                  fullWidth
                  variant="outlined"
                  sx={{ mt: 2 }}
                  onClick={handleSubjectClick}
                >
                  View All Subjects
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
    </Container>
  )
}

export default Dashboard 