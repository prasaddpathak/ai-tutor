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
} from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from 'react-query'

import { subjectsAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

const TopicsPage: React.FC = () => {
  const navigate = useNavigate()
  const { subjectId } = useParams<{ subjectId: string }>()
  const student = useAuthStore((state) => state.student)

  const { data: topicsData, isLoading, error } = useQuery(
    ['topics', subjectId, student?.difficulty_level],
    () => subjectsAPI.getTopics(parseInt(subjectId!), student?.difficulty_level || 'School').then(res => res.data),
    {
      enabled: !!subjectId && !!student,
      retry: 2,
    }
  )

  const handleTopicClick = (topicTitle: string) => {
    navigate(`/subjects/${subjectId}/topics/${encodeURIComponent(topicTitle)}/chapters`)
  }

  const handleBack = () => {
    navigate('/subjects')
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
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            {topicsData?.subject?.name || 'Topics'}
          </Typography>
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
      {topicsData?.generating && (
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
      {topicsData?.topics && topicsData.topics.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {topicsData.topics.map((topic: any, index: number) => (
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
                }}
                onClick={() => handleTopicClick(topic.title)}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h5" fontWeight="bold" gutterBottom color="primary">
                    {topic.title}
                  </Typography>
                  {topic.description && (
                    <Typography variant="body1" color="textSecondary">
                      {topic.description}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </Box>
      )}

      {/* Empty State */}
      {topicsData?.topics && topicsData.topics.length === 0 && !isLoading && !topicsData.generating && (
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
    </Container>
  )
}

export default TopicsPage 