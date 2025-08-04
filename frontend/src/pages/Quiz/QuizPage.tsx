import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Alert,
  Chip,
  Stack,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
} from '@mui/material'
import {
  ArrowBack,
  Quiz,
  CheckCircle,
  Timer,
  NavigateBefore,
  NavigateNext,
  Send,
  EmojiEvents,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from 'react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { subjectsAPI, Quiz as QuizType, QuizResult, QuizSubmission } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'

const QuizPage: React.FC = () => {
  const navigate = useNavigate()
  const { subjectId, topicTitle } = useParams<{ subjectId: string; topicTitle: string }>()
  const student = useAuthStore((state) => state.student)
  const { t } = useTranslation()
  
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null)
  const [showResults, setShowResults] = useState(false)

  // Fetch quiz data
  const { data: quizData, isLoading, error } = useQuery<QuizType>(
    ['quiz', subjectId, topicTitle, student?.id],
    () => subjectsAPI.getQuiz(
      parseInt(subjectId!),
      decodeURIComponent(topicTitle!),
      student!.id
    ).then(res => res.data),
    {
      enabled: !!subjectId && !!topicTitle && !!student?.id,
      retry: 2,
    }
  )

  // Initialize answers array when quiz loads
  useEffect(() => {
    if (quizData && answers.length === 0) {
      setAnswers(new Array(quizData.questions.length).fill(null))
    }
  }, [quizData])

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Submit quiz mutation
  const submitQuizMutation = useMutation(
    (submission: QuizSubmission) => subjectsAPI.submitQuiz(
      parseInt(subjectId!),
      decodeURIComponent(topicTitle!),
      submission,
      student!.id
    ),
    {
      onSuccess: (response) => {
        setQuizResult(response.data)
        setShowResults(true)
        setShowSubmitDialog(false)
      },
      onError: (error) => {
        console.error('Failed to submit quiz:', error)
      }
    }
  )

  const handleBack = () => {
    navigate(`/subjects/${subjectId}/topics/${topicTitle}/chapters`)
  }

  const handleBackWithResults = () => {
    navigate(`/subjects/${subjectId}/topics/${topicTitle}/chapters#quiz-completed`)
  }

  const handleAnswerChange = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...answers]
    newAnswers[questionIndex] = answerIndex
    setAnswers(newAnswers)
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleNext = () => {
    if (currentQuestion < (quizData?.questions.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handleSubmit = () => {
    setShowSubmitDialog(true)
  }

  const confirmSubmit = () => {
    if (!quizData || !student) return

    const submission: QuizSubmission = {
      quiz_id: quizData.quiz_id,
      student_id: student.id,
      answers: answers.map(a => a ?? -1) // Replace null with -1 for unanswered
    }

    submitQuizMutation.mutate(submission)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getAnsweredCount = () => {
    return answers.filter(a => a !== null).length
  }

  const getProgressPercentage = () => {
    if (!quizData) return 0
    return (getAnsweredCount() / quizData.questions.length) * 100
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button startIcon={<ArrowBack />} onClick={handleBack} sx={{ mb: 3 }}>
          {t('quiz.backToChapters')}
        </Button>
        <Alert severity="error">
          {t('quiz.failedToLoad')}
        </Alert>
      </Container>
    )
  }

  if (isLoading || !quizData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button startIcon={<ArrowBack />} onClick={handleBack} sx={{ mb: 3 }}>
          {t('quiz.backToChapters')}
        </Button>
        <Card sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="body1" color="textSecondary">
              {t('quiz.loadingQuiz')}
            </Typography>
          </Box>
        </Card>
      </Container>
    )
  }

  if (showResults && quizResult) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <QuizResults 
          result={quizResult}
          onBack={handleBackWithResults}
          onRetake={() => {
            setShowResults(false)
            setCurrentQuestion(0)
            setAnswers(new Array(quizData.questions.length).fill(null))
            setTimeElapsed(0)
            setQuizResult(null)
          }}
        />
      </Container>
    )
  }

  const currentQuestionData = quizData.questions[currentQuestion]
  const isLastQuestion = currentQuestion === quizData.questions.length - 1
  const allQuestionsAnswered = getAnsweredCount() === quizData.questions.length

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Button startIcon={<ArrowBack />} onClick={handleBack} sx={{ mb: 3 }}>
          {t('quiz.backToChapters')}
        </Button>

        {/* Quiz Info Header */}
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #B8860B 0%, #DAA520 100%)', color: 'white' }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
              <Quiz sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {decodeURIComponent(topicTitle || '')} {t('quiz.quiz')}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {quizData.difficulty_level} • {quizData.total_questions} {t('quiz.questions')}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={3} alignItems="center">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timer />
                <Typography variant="body2">
                  {t('quiz.timeElapsed', { time: formatTime(timeElapsed) })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle />
                <Typography variant="body2">
                  {t('quiz.progress', { answered: getAnsweredCount(), total: quizData.total_questions })}
                </Typography>
              </Box>
              {quizData.best_score !== null && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmojiEvents />
                  <Typography variant="body2">
                    {t('quiz.bestScore', { score: quizData.best_percentage?.toFixed(1) })}
                  </Typography>
                </Box>
              )}
            </Stack>

            <Box sx={{ mt: 2 }}>
              <LinearProgress
                variant="determinate"
                value={getProgressPercentage()}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: '#4CAF50',
                    borderRadius: 4,
                  },
                }}
              />
            </Box>
          </CardContent>
        </Card>
      </motion.div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 4 }}>
              {/* Question Header */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" color="primary" gutterBottom>
                  {t('quiz.question', { current: currentQuestion + 1, total: quizData.questions.length })}
                </Typography>
                <Divider />
              </Box>

              {/* Question Text */}
              <Box sx={{ mb: 4 }}>
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => (
                      <Typography variant="h6" sx={{ mb: 2, lineHeight: 1.6 }}>
                        {children}
                      </Typography>
                    ),
                  }}
                >
                  {currentQuestionData.question}
                </ReactMarkdown>
              </Box>

              {/* Answer Options */}
              <FormControl component="fieldset" fullWidth>
                <RadioGroup
                  value={answers[currentQuestion] ?? ''}
                  onChange={(e) => handleAnswerChange(currentQuestion, parseInt(e.target.value))}
                >
                  {currentQuestionData.options.map((option, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.1 }}
                    >
                      <FormControlLabel
                        value={index}
                        control={<Radio />}
                        label={
                          <Typography variant="body1" sx={{ py: 1 }}>
                            {String.fromCharCode(65 + index)}. {option}
                          </Typography>
                        }
                        sx={{
                          width: '100%',
                          m: 0,
                          mb: 1,
                          p: 2,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: answers[currentQuestion] === index ? 'primary.main' : 'divider',
                          backgroundColor: answers[currentQuestion] === index ? 'primary.light' : 'transparent',
                          '&:hover': {
                            backgroundColor: answers[currentQuestion] === index ? 'primary.light' : 'action.hover',
                          },
                          transition: 'all 0.2s ease-in-out',
                        }}
                      />
                    </motion.div>
                  ))}
                </RadioGroup>
              </FormControl>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={3}>
            <Box sx={{ minWidth: 120 }}>
              <Button
                startIcon={<NavigateBefore />}
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
                variant="outlined"
                size="large"
                sx={{ px: 3, py: 1.5 }}
              >
                {t('quiz.previous')}
              </Button>
            </Box>

            <Stack direction="row" spacing={1.5} sx={{ flex: 1, justifyContent: 'center' }}>
              {quizData.questions.map((_, index) => (
                <Chip
                  key={index}
                  label={index + 1}
                  onClick={() => setCurrentQuestion(index)}
                  color={answers[index] !== null ? 'success' : index === currentQuestion ? 'primary' : 'default'}
                  variant={index === currentQuestion ? 'filled' : 'outlined'}
                  sx={{ 
                    cursor: 'pointer', 
                    minWidth: 45,
                    height: 36,
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                />
              ))}
            </Stack>

            <Box sx={{ minWidth: 120, display: 'flex', justifyContent: 'flex-end' }}>
              {isLastQuestion ? (
                <Button
                  endIcon={<Send />}
                  onClick={handleSubmit}
                  variant="contained"
                  color="success"
                  size="large"
                  disabled={!allQuestionsAnswered}
                  sx={{
                    px: 3,
                    py: 1.5,
                    backgroundColor: allQuestionsAnswered ? 'success.main' : undefined,
                    '&:hover': {
                      backgroundColor: allQuestionsAnswered ? 'success.dark' : undefined,
                      transform: allQuestionsAnswered ? 'translateY(-1px)' : undefined,
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  {t('quiz.submitQuiz')}
                </Button>
              ) : (
                <Button
                  endIcon={<NavigateNext />}
                  onClick={handleNext}
                  variant="contained"
                  size="large"
                  sx={{ 
                    px: 3, 
                    py: 1.5,
                    '&:hover': {
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  {t('quiz.next')}
                </Button>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onClose={() => setShowSubmitDialog(false)}>
        <DialogTitle>{t('quiz.submitConfirm')}</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            {t('quiz.submitMessage')}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {t('quiz.unansweredWarning', { answered: getAnsweredCount(), total: quizData.questions.length })}
            {getAnsweredCount() < quizData.questions.length && ' ' + t('quiz.unansweredWarning').split('. ')[1]}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSubmitDialog(false)}>{t('quiz.cancel')}</Button>
          <Button 
            onClick={confirmSubmit} 
            variant="contained" 
            disabled={submitQuizMutation.isLoading}
          >
            {submitQuizMutation.isLoading ? t('quiz.submitting') : t('quiz.submit')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

// Quiz Results Component
interface QuizResultsProps {
  result: QuizResult
  onBack: () => void
  onRetake: () => void
}

const QuizResults: React.FC<QuizResultsProps> = ({ result, onBack, onRetake }) => {
  const { t } = useTranslation()
  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'success'
    if (percentage >= 60) return 'warning'
    return 'error'
  }

  const getScoreMessage = (percentage: number) => {
    if (percentage >= 90) return t('quiz.results.excellent')
    if (percentage >= 80) return t('quiz.results.great')
    if (percentage >= 70) return t('quiz.results.good')
    if (percentage >= 60) return t('quiz.results.needsWork')
    return t('quiz.results.keepStudying')
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Results Header */}
      <Card sx={{ mb: 3, background: `linear-gradient(135deg, ${getScoreColor(result.percentage) === 'success' ? '#4CAF50' : getScoreColor(result.percentage) === 'warning' ? '#FF9800' : '#F44336'} 0%, ${getScoreColor(result.percentage) === 'success' ? '#66BB6A' : getScoreColor(result.percentage) === 'warning' ? '#FFB74D' : '#EF5350'} 100%)`, color: 'white' }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <EmojiEvents sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {t('quiz.results.title')}
          </Typography>
          <Typography variant="h2" fontWeight="bold" sx={{ mb: 1 }}>
            {result.score}/{result.questions.length}
          </Typography>
          <Typography variant="h5" sx={{ mb: 2 }}>
            {result.percentage.toFixed(1)}%
          </Typography>
          <Typography variant="h6">
            {getScoreMessage(result.percentage)}
          </Typography>
          {result.is_best_score && (
            <Chip
              label={t('quiz.results.newBestScore')}
              sx={{ mt: 2, backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
            />
          )}
        </CardContent>
      </Card>

      {/* Answer Review */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom>
            {t('quiz.results.answerReview')}
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {result.questions.map((question, index) => {
            const userAnswer = result.answers[index]
            const isCorrect = userAnswer === question.correct_answer
            const wasAnswered = userAnswer !== -1

            return (
              <Box key={question.id} sx={{ mb: 4 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  {t('quiz.question', { current: index + 1, total: result.questions.length })}
                </Typography>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {question.question}
                </ReactMarkdown>

                <Box sx={{ mt: 2 }}>
                  {question.options.map((option, optionIndex) => {
                    const isUserAnswer = userAnswer === optionIndex
                    const isCorrectAnswer = question.correct_answer === optionIndex

                    return (
                      <Box
                        key={optionIndex}
                        sx={{
                          p: 1.5,
                          mb: 1,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: isCorrectAnswer ? 'success.main' : isUserAnswer && !isCorrect ? 'error.main' : 'divider',
                          backgroundColor: isCorrectAnswer ? 'success.light' : isUserAnswer && !isCorrect ? 'error.light' : 'transparent',
                        }}
                      >
                        <Typography variant="body2">
                          <strong>{String.fromCharCode(65 + optionIndex)}.</strong> {option}
                          {isCorrectAnswer && ' ✓'}
                          {isUserAnswer && !isCorrect && ' ✗'}
                        </Typography>
                      </Box>
                    )
                  })}
                </Box>

                {!wasAnswered && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {t('quiz.results.noAnswer')}
                  </Alert>
                )}

                <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" color="textSecondary">
                    <strong>{t('quiz.results.explanation')}</strong> {question.explanation}
                  </Typography>
                </Box>
              </Box>
            )
          })}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Stack direction="row" spacing={2} justifyContent="center">
        <Button variant="outlined" onClick={onBack} size="large">
          {t('quiz.backToChapters')}
        </Button>
        <Button variant="contained" onClick={onRetake} size="large">
          {t('quiz.results.retakeQuiz')}
        </Button>
      </Stack>
    </motion.div>
  )
}

export default QuizPage