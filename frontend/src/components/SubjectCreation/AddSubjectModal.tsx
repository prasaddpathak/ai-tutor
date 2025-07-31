import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Card,
  CardContent,
  CardActions,
  Grid,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Chip,
  IconButton,
  Divider,
} from '@mui/material'
import {
  AutoAwesome,
  Add,
  CheckCircle,
  ArrowBack,
  Close,
  Lightbulb,
  Psychology,
  TrendingUp,
  School,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'

import { subjectsAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

interface SubjectRecommendation {
  name: string
  description: string
  relevance_explanation: string
}

interface AddSubjectModalProps {
  open: boolean
  onClose: () => void
}

const AddSubjectModal: React.FC<AddSubjectModalProps> = ({ open, onClose }) => {
  const [activeStep, setActiveStep] = useState(0)
  const [userRequest, setUserRequest] = useState('')
  const [recommendations, setRecommendations] = useState<SubjectRecommendation[]>([])
  const [selectedRecommendation, setSelectedRecommendation] = useState<SubjectRecommendation | null>(null)
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  
  const student = useAuthStore((state) => state.student)
  const queryClient = useQueryClient()

  const steps = ['Describe Your Interest', 'AI Recommendations', 'Confirm Subject']

  // Get AI recommendations mutation
  const getRecommendationsMutation = useMutation(
    (request: string) => subjectsAPI.getSubjectRecommendations(student!.id, request),
    {
      onSuccess: (response) => {
        // Limit to first 4 recommendations for even card layout
        setRecommendations(response.data.recommendations.slice(0, 4))
        setActiveStep(1)
        setIsLoadingRecommendations(false)
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || 'Failed to get AI recommendations')
        setIsLoadingRecommendations(false)
      }
    }
  )

  // Create custom subject mutation
  const createSubjectMutation = useMutation(
    (data: { name: string; description: string; originalRequest: string; aiDescription?: string }) =>
      subjectsAPI.createCustomSubject(
        student!.id, 
        data.name, 
        data.description, 
        data.originalRequest, 
        data.aiDescription
      ),
    {
      onSuccess: (response) => {
        toast.success(`Subject "${selectedRecommendation?.name}" created successfully!`)
        queryClient.invalidateQueries(['subjects', student!.id])
        onClose()
        resetModal()
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || 'Failed to create subject')
      }
    }
  )

  const resetModal = () => {
    setActiveStep(0)
    setUserRequest('')
    setRecommendations([])
    setSelectedRecommendation(null)
    setIsLoadingRecommendations(false)
  }

  const handleClose = () => {
    if (!isLoadingRecommendations && !createSubjectMutation.isLoading) {
      onClose()
      resetModal()
    }
  }

  const handleGetRecommendations = () => {
    if (userRequest.trim().length < 5) {
      toast.error('Please provide a more detailed description (at least 5 characters)')
      return
    }
    
    setIsLoadingRecommendations(true)
    getRecommendationsMutation.mutate(userRequest.trim())
  }

  const handleSelectRecommendation = (recommendation: SubjectRecommendation) => {
    setSelectedRecommendation(recommendation)
    setActiveStep(2)
  }

  const handleCreateSubject = () => {
    if (!selectedRecommendation) return
    
    createSubjectMutation.mutate({
      name: selectedRecommendation.name,
      description: selectedRecommendation.description,
      originalRequest: userRequest.trim(),
      aiDescription: selectedRecommendation.relevance_explanation
    })
  }

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          height: '75vh',
          maxHeight: '75vh',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.15)'
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 2,
        pt: 2,
        px: 3,
        background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
        color: 'white',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}>
        <IconButton
          onClick={handleClose}
          disabled={isLoadingRecommendations || createSubjectMutation.isLoading}
          sx={{ 
            position: 'absolute', 
            right: 16, 
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'white',
            bgcolor: 'rgba(255,255,255,0.1)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.2)',
            }
          }}
        >
          <Close />
        </IconButton>
        
        <AutoAwesome sx={{ fontSize: 36, opacity: 0.9 }} />
        <Box>
          <Typography variant="h5" fontWeight="bold" component="div">
            Create Your Subject
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9 }} component="div">
            AI-powered personalized learning experience
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: 'grey.50' }}>
        {/* Stepper */}
        <Box sx={{ 
          bgcolor: 'white', 
          borderRadius: 3, 
          p: 3, 
          mt: 3,
          mb: 4,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
        }}>
          <Stepper 
            activeStep={activeStep} 
            sx={{ 
              '& .MuiStepLabel-root .Mui-completed': {
                color: '#4caf50',
              },
              '& .MuiStepLabel-root .Mui-active': {
                color: '#4caf50',
              }
            }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel sx={{ 
                  '& .MuiStepLabel-label': { 
                    fontWeight: 600,
                    fontSize: '0.95rem'
                  }
                }}>
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Content Section with proper spacing */}
        <Box sx={{ mt: 4 }}>
          <AnimatePresence mode="wait">
            {/* Step 1: User Input or Loading */}
            {activeStep === 0 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Box sx={{ 
                  bgcolor: 'white', 
                  borderRadius: 4, 
                  p: 4,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  textAlign: 'center'
                }}>
                  {!isLoadingRecommendations ? (
                    // Input form
                    <>
                      <Box sx={{ mb: 4 }}>
                        <Box sx={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          bgcolor: 'success.light',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 3
                        }}>
                          <Lightbulb sx={{ fontSize: 32, color: 'white' }} />
                        </Box>
                        <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
                          What would you like to learn?
                        </Typography>
                        <Typography variant="body1" color="textSecondary" sx={{ maxWidth: 700, mx: 'auto', lineHeight: 1.5 }}>
                          Describe your learning interests in natural language. Our AI will recommend personalized subjects for you.
                        </Typography>
                      </Box>

                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        value={userRequest}
                        onChange={(e) => setUserRequest(e.target.value)}
                        placeholder="For example: 'I want to learn about building websites and web applications' or 'I'm interested in understanding how the human brain works'..."
                        variant="outlined"
                        sx={{ 
                          mb: 4,
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 3,
                            fontSize: '1rem',
                            '&:hover fieldset': {
                              borderColor: 'success.main',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: 'success.main',
                            }
                          }
                        }}
                      />

                      <Box sx={{ textAlign: 'left' }}>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2, fontWeight: 600 }}>
                          💡 Need inspiration? Try these examples:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                          {[
                            'Data analysis and visualization',
                            'Mobile app development', 
                            'Psychology and human behavior',
                            'Renewable energy systems',
                            'Digital marketing strategies',
                            'Artificial intelligence basics'
                          ].map((example) => (
                            <Chip
                              key={example}
                              label={example}
                              variant="outlined"
                              onClick={() => setUserRequest(example)}
                              sx={{ 
                                cursor: 'pointer',
                                borderRadius: 3,
                                '&:hover': {
                                  bgcolor: 'success.light',
                                  color: 'white',
                                  borderColor: 'success.main'
                                }
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    </>
                  ) : (
                    // Loading state with user input reference
                    <Box sx={{ py: 2 }}>
                      <Box sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        bgcolor: 'success.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 3,
                        position: 'relative'
                      }}>
                        <AutoAwesome sx={{ fontSize: 32, color: 'white' }} />
                        <CircularProgress 
                          size={72} 
                          sx={{ 
                            position: 'absolute',
                            color: 'success.main',
                            opacity: 0.3
                          }} 
                        />
                      </Box>
                      <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
                        AI is working its magic...
                      </Typography>
                      <Typography variant="body1" color="textSecondary" sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.5, mb: 3 }}>
                        Analyzing your request and generating personalized subject recommendations.
                      </Typography>
                      
                      {/* Show user's input for reference */}
                      <Box sx={{ 
                        bgcolor: 'grey.50', 
                        p: 3, 
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'grey.200',
                        maxWidth: 600,
                        mx: 'auto'
                      }}>
                        <Typography variant="body2" fontWeight="600" color="textSecondary" sx={{ mb: 1 }}>
                          📝 Your Request:
                        </Typography>
                        <Typography variant="body1" sx={{ fontStyle: 'italic', lineHeight: 1.5 }}>
                          "{userRequest}"
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              </motion.div>
            )}

            {/* Step 2: AI Recommendations */}
            {activeStep === 1 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Box sx={{ 
                  bgcolor: 'white', 
                  borderRadius: 4, 
                  p: 4,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                }}>
                  <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Box sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      bgcolor: 'success.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3
                    }}>
                      <AutoAwesome sx={{ fontSize: 32, color: 'white' }} />
                    </Box>
                    <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
                      AI-Recommended Subjects
                    </Typography>
                    <Typography variant="body1" color="textSecondary" sx={{ maxWidth: 700, mx: 'auto' }}>
                      Based on your interest: <em>"{userRequest}"</em>
                    </Typography>
                  </Box>

                  <Grid container spacing={4}>
                    {recommendations.map((recommendation, index) => (
                      <Grid item xs={12} md={6} key={index}>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Card
                            sx={{
                              cursor: 'pointer',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              border: 2,
                              borderColor: 'transparent',
                              height: 380, // Increased height for better spacing
                              display: 'flex',
                              flexDirection: 'column',
                              '&:hover': {
                                boxShadow: '0 12px 40px rgba(76, 175, 80, 0.25)',
                                borderColor: 'success.main',
                                backgroundColor: 'rgba(76, 175, 80, 0.02)',
                                transform: 'translateY(-4px)',
                              },
                            }}
                            onClick={() => handleSelectRecommendation(recommendation)}
                          >
                            {/* Card Header with Icon and Title */}
                            <Box sx={{ p: 3, pb: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                <Box sx={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 3,
                                  bgcolor: 'success.light',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  mr: 3
                                }}>
                                  <School sx={{ color: 'white', fontSize: 24 }} />
                                </Box>
                                <Typography 
                                  variant="h6" 
                                  fontWeight="bold" 
                                  sx={{ 
                                    flexGrow: 1,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    lineHeight: 1.3
                                  }}
                                >
                                  {recommendation.name}
                                </Typography>
                              </Box>
                              
                              {/* Main Description */}
                              <Typography 
                                variant="body2" 
                                color="textSecondary" 
                                sx={{ 
                                  lineHeight: 1.6, 
                                  mb: 3,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  minHeight: '4.5rem' // Consistent space for 3 lines
                                }}
                              >
                                {recommendation.description}
                              </Typography>
                            </Box>
                            
                            {/* Relevance Section */}
                            <CardContent sx={{ flexGrow: 1, pt: 0, pb: 2, px: 3 }}>
                              <Box sx={{ 
                                bgcolor: 'success.light', 
                                color: 'white', 
                                p: 3, 
                                borderRadius: 3,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column'
                              }}>
                                <Typography variant="body2" fontWeight="600" sx={{ mb: 2 }}>
                                  🎯 Perfect for you because:
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    lineHeight: 1.5, 
                                    fontSize: '0.9rem',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    flexGrow: 1
                                  }}
                                >
                                  {recommendation.relevance_explanation}
                                </Typography>
                              </Box>
                            </CardContent>
                            
                            {/* Action Button */}
                            <CardActions sx={{ p: 3, pt: 2 }}>
                              <Button
                                variant="contained"
                                fullWidth
                                startIcon={<CheckCircle />}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSelectRecommendation(recommendation)
                                }}
                                sx={{
                                  bgcolor: 'success.main',
                                  py: 1.5,
                                  borderRadius: 3,
                                  fontWeight: 600,
                                  textTransform: 'none',
                                  fontSize: '1rem',
                                  boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                                  '&:hover': {
                                    bgcolor: 'success.dark',
                                    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)',
                                  }
                                }}
                              >
                                Choose This Subject
                              </Button>
                            </CardActions>
                          </Card>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </motion.div>
            )}

            {/* Step 3: Confirmation */}
            {activeStep === 2 && selectedRecommendation && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Box sx={{ 
                  bgcolor: 'white', 
                  borderRadius: 4, 
                  p: 4,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  textAlign: 'center'
                }}>
                  <Box sx={{ mb: 4 }}>
                    <Box sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      bgcolor: 'success.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 3,
                      boxShadow: '0 8px 32px rgba(76, 175, 80, 0.3)'
                    }}>
                      <CheckCircle sx={{ fontSize: 40, color: 'white' }} />
                    </Box>
                    <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
                      Ready to Create Subject
                    </Typography>
                    <Typography variant="body1" color="textSecondary" sx={{ maxWidth: 700, mx: 'auto', lineHeight: 1.5 }}>
                      Review your selection and create your personalized learning journey
                    </Typography>
                  </Box>

                  <Card 
                    variant="outlined" 
                    sx={{ 
                      border: 2,
                      borderColor: 'success.main',
                      borderRadius: 4,
                      overflow: 'hidden',
                      boxShadow: '0 4px 20px rgba(76, 175, 80, 0.1)'
                    }}
                  >
                    {/* Subject Header */}
                    <Box sx={{ 
                      bgcolor: 'success.light', 
                      color: 'white', 
                      p: 3,
                      textAlign: 'center'
                    }}>
                      <Typography variant="h6" fontWeight="bold">
                        {selectedRecommendation.name}
                      </Typography>
                    </Box>
                    
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="body2" color="textSecondary" paragraph sx={{ lineHeight: 1.6, mb: 3 }}>
                        {selectedRecommendation.description}
                      </Typography>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Box sx={{ 
                        bgcolor: 'grey.50', 
                        p: 3, 
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'grey.200',
                        mb: 2
                      }}>
                        <Typography variant="body2" fontWeight="600" color="textSecondary" sx={{ mb: 1 }}>
                          📝 Your Original Request:
                        </Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', lineHeight: 1.5 }}>
                          "{userRequest}"
                        </Typography>
                      </Box>
                      
                      <Box sx={{ 
                        bgcolor: 'success.light', 
                        color: 'white', 
                        p: 3, 
                        borderRadius: 2
                      }}>
                        <Typography variant="body2" fontWeight="600" sx={{ mb: 1 }}>
                          🎯 Why this subject is perfect for you:
                        </Typography>
                        <Typography variant="body2" sx={{ lineHeight: 1.5, fontSize: '0.9rem' }}>
                          {selectedRecommendation.relevance_explanation}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>

      </DialogContent>

      <DialogActions sx={{ 
        px: 4, 
        pb: 3, 
        pt: 3, 
        justifyContent: 'space-between',
        bgcolor: 'grey.50',
        borderTop: '1px solid',
        borderColor: 'grey.200'
      }}>
        <Button
          onClick={activeStep === 0 ? handleClose : handleBack}
          disabled={isLoadingRecommendations || createSubjectMutation.isLoading}
          startIcon={activeStep > 0 ? <ArrowBack /> : undefined}
          sx={{ 
            minWidth: 100,
            py: 1.2,
            borderRadius: 3,
            textTransform: 'none',
            fontWeight: 600,
            color: 'text.secondary',
            '&:hover': {
              bgcolor: 'grey.100'
            }
          }}
        >
          {activeStep === 0 ? 'Cancel' : 'Back'}
        </Button>

        <Box sx={{ display: 'flex', gap: 2 }}>
          {activeStep === 0 && (
            <Button
              onClick={handleGetRecommendations}
              variant="contained"
              disabled={userRequest.trim().length < 5 || isLoadingRecommendations}
              startIcon={isLoadingRecommendations ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
              sx={{ 
                minWidth: 180,
                py: 1.2,
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                background: 'linear-gradient(135deg, #4caf50, #66bb6a)',
                boxShadow: '0 4px 16px rgba(76, 175, 80, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #43a047, #5cb85c)',
                  boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4)',
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  background: 'rgba(0, 0, 0, 0.12)',
                  color: 'rgba(0, 0, 0, 0.26)',
                  boxShadow: 'none'
                }
              }}
            >
              {isLoadingRecommendations ? 'Generating...' : 'Get AI Recommendations'}
            </Button>
          )}

          {activeStep === 2 && (
            <Button
              onClick={handleCreateSubject}
              variant="contained"
              disabled={!selectedRecommendation || createSubjectMutation.isLoading}
              startIcon={createSubjectMutation.isLoading ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
              sx={{ 
                minWidth: 150,
                py: 1.2,
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                background: 'linear-gradient(135deg, #4caf50, #66bb6a)',
                boxShadow: '0 4px 16px rgba(76, 175, 80, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #43a047, #5cb85c)',
                  boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4)',
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  background: 'rgba(0, 0, 0, 0.12)',
                  color: 'rgba(0, 0, 0, 0.26)',
                  boxShadow: 'none'
                }
              }}
            >
              {createSubjectMutation.isLoading ? 'Creating...' : 'Create Subject'}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  )
}

export default AddSubjectModal