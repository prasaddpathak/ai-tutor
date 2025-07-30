import React from 'react'
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Button,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  LinearProgress,
  CircularProgress
} from '@mui/material'
import {
  Person,
  School,
  TrendingUp,
  MenuBook,
  Schedule,
  CheckCircle,
  PlayArrow,
  Analytics,
  EmojiEvents,
  LocalFireDepartment
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useQuery } from 'react-query'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '../../stores/authStore'
import { studentsAPI, subjectsAPI, progressAPI } from '../../services/api'
import { ProgressIndicator, DetailedProgress } from '../../components/Progress/ProgressIndicator'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const student = useAuthStore((state) => state.student)

  // Fetch enhanced dashboard data
  const { data: dashboardData, isLoading } = useQuery(
    ['dashboard', student?.id],
    () => studentsAPI.getDashboard(student?.id!).then(res => res.data),
    {
      enabled: !!student?.id,
    }
  )

  // Fetch subjects for navigation
  const { data: subjects } = useQuery(
    ['subjects'],
    () => subjectsAPI.getAll().then(res => res.data),
    {
      enabled: !!student?.id,
    }
  )

  // Fetch overall progress summary
  const { data: overallProgress } = useQuery(
    ['overallProgress', student?.id],
    () => progressAPI.getOverallProgressSummary(student?.id!).then(res => res.data),
    {
      enabled: !!student?.id,
    }
  )

  if (!student) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4">Please log in to view your dashboard</Typography>
      </Container>
    )
  }

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    )
  }

  const getWelcomeMessage = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'success'
    if (percentage >= 60) return 'primary'
    if (percentage >= 40) return 'warning'
    return 'error'
  }

  const getMilestoneIcon = (percentage: number) => {
    if (percentage >= 80) return <EmojiEvents />
    if (percentage >= 60) return <LocalFireDepartment />
    if (percentage >= 40) return <TrendingUp />
    return <PlayArrow />
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            {getWelcomeMessage()}, {student.name}! 👋
          </Typography>
          <Typography variant="h6" color="textSecondary">
            Ready to continue your learning journey?
          </Typography>
        </Box>
      </motion.div>

      <Grid container spacing={3}>
        {/* Student Info Card */}
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    mx: 'auto',
                    mb: 2,
                    bgcolor: 'primary.main',
                    fontSize: '2rem'
                  }}
                >
                  {student.name.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {student.name}
                </Typography>
                <Chip
                  icon={<School />}
                  label={student.difficulty_level}
                  color="primary"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="textSecondary">
                  Member since {new Date(student.created_at).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Overall Progress Summary */}
        <Grid item xs={12} md={8}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {overallProgress && (
              <DetailedProgress
                title="Overall Learning Progress"
                description="Your journey across all subjects"
                completedPages={overallProgress.completed_pages || 0}
                totalPages={overallProgress.total_pages || 0}
                completedChapters={overallProgress.total_chapters || 0}
                totalChapters={overallProgress.total_chapters || 0}
                timeSpentMinutes={overallProgress.time_spent_minutes || 0}
                level={student.difficulty_level}
                achievements={['First Chapter Complete', 'Page Master', 'Consistent Learner']}
              />
            )}
          </motion.div>
        </Grid>

        {/* Subject Progress Cards */}
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
              Subject Progress
            </Typography>
            <Grid container spacing={2}>
              {dashboardData?.subject_progress?.map((subject: any, index: number) => (
                <Grid item xs={12} sm={6} md={4} key={subject.subject_id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  >
                    <Card 
                      sx={{ 
                        height: '100%',
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: (theme) => theme.shadows[8],
                        },
                        transition: 'all 0.2s ease-in-out'
                      }}
                      onClick={() => navigate(`/subjects/${subject.subject_id}/topics`)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="h6" fontWeight="bold">
                            {subject.subject_name}
                          </Typography>
                          {getMilestoneIcon(subject.completion_percentage)}
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <ProgressIndicator
                            type="linear"
                            value={subject.completed_pages}
                            total={subject.total_pages}
                            label="Pages"
                            color={getProgressColor(subject.completion_percentage) as any}
                            size="small"
                          />
                        </Box>
                        
                        <Grid container spacing={1} sx={{ mb: 2 }}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">
                              Chapters
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {subject.completed_chapters}/{subject.total_chapters}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="textSecondary">
                              Time
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {formatTime(subject.time_spent_minutes)}
                            </Typography>
                          </Grid>
                        </Grid>
                        
                        <Button
                          variant="outlined"
                          fullWidth
                          size="small"
                          startIcon={<PlayArrow />}
                        >
                          Continue Learning
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Recent Activity
                </Typography>
                <List>
                  {dashboardData?.recent_activity?.slice(0, 5).map((activity: any, index: number) => (
                    <React.Fragment key={activity.id}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon>
                          {activity.completed ? (
                            <CheckCircle color="success" />
                          ) : (
                            <MenuBook color="primary" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={`${activity.chapter} - Page ${activity.page_number}`}
                          secondary={`${activity.subject_name} • ${activity.topic} • ${formatTime(activity.time_spent_minutes)}`}
                        />
                      </ListItem>
                      {index < dashboardData.recent_activity.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                  {(!dashboardData?.recent_activity || dashboardData.recent_activity.length === 0) && (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary="No recent activity"
                        secondary="Start reading to see your progress here!"
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Learning Stats
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
                      <Typography variant="h4" fontWeight="bold">
                        {overallProgress?.total_subjects || 0}
                      </Typography>
                      <Typography variant="caption">
                        Subjects Started
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.main', color: 'white' }}>
                      <Typography variant="h4" fontWeight="bold">
                        {overallProgress?.completed_pages || 0}
                      </Typography>
                      <Typography variant="caption">
                        Pages Completed
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.main', color: 'white' }}>
                      <Typography variant="h4" fontWeight="bold">
                        {formatTime(overallProgress?.time_spent_minutes || 0)}
                      </Typography>
                      <Typography variant="caption">
                        Time Invested
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.main', color: 'white' }}>
                      <Typography variant="h4" fontWeight="bold">
                        {Math.round(overallProgress?.completion_percentage || 0)}%
                      </Typography>
                      <Typography variant="caption">
                        Overall Progress
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Quick Actions
                </Typography>
                <Grid container spacing={2}>
                  {subjects?.slice(0, 6).map((subject: any) => (
                    <Grid item xs={12} sm={6} md={4} key={subject.id}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<MenuBook />}
                        onClick={() => navigate(`/subjects/${subject.id}/topics`)}
                        sx={{ py: 1.5 }}
                      >
                        {subject.name}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
    </Container>
  )
}

export default Dashboard 