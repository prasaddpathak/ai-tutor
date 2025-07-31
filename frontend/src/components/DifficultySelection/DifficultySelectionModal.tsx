import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  CircularProgress,
} from '@mui/material'
import { 
  School, 
  TrendingUp, 
  WorkspacePremium, 
  Psychology 
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'

import { subjectsAPI } from '../../services/api'

interface DifficultySelectionModalProps {
  open: boolean
  onClose: () => void
  subjectId: number
  subjectName: string
  studentId: number
  onDifficultySet: (difficulty: string) => void
}

const DifficultySelectionModal: React.FC<DifficultySelectionModalProps> = ({
  open,
  onClose,
  subjectId,
  subjectName,
  studentId,
  onDifficultySet,
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Get available difficulty levels
  const { data: difficultyData } = useQuery(
    'difficulty-levels',
    () => subjectsAPI.getDifficultyLevels().then(res => res.data),
    {
      enabled: open,
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  )

  // Set difficulty mutation
  const setDifficultyMutation = useMutation(
    (difficulty: string) => subjectsAPI.setSubjectDifficulty(studentId, subjectId, difficulty),
    {
      onSuccess: (response, difficulty) => {
        toast.success(`Difficulty set to ${difficulty}!`)
        onDifficultySet(difficulty)
        onClose()
        // Invalidate queries to refresh data
        queryClient.invalidateQueries(['subjects', studentId])
        queryClient.invalidateQueries(['topics', subjectId.toString(), studentId])
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || 'Failed to set difficulty')
      }
    }
  )

  const handleDifficultySelect = (difficulty: string) => {
    setSelectedDifficulty(difficulty)
  }

  const handleConfirm = () => {
    if (selectedDifficulty) {
      setDifficultyMutation.mutate(selectedDifficulty)
    }
  }

  const difficultyIcons = {
    Foundation: <School sx={{ fontSize: '2rem' }} />,
    Intermediate: <TrendingUp sx={{ fontSize: '2rem' }} />,
    Advanced: <WorkspacePremium sx={{ fontSize: '2rem' }} />,
    Expert: <Psychology sx={{ fontSize: '2rem' }} />
  }

  const difficultyColors = {
    Foundation: '#4caf50',
    Intermediate: '#ff9800', 
    Advanced: '#f44336',
    Expert: '#9c27b0'
  }

  const difficultyDescriptions = {
    Foundation: 'Perfect for beginners with little to no prior knowledge',
    Intermediate: 'Suitable for those with basic understanding and some experience',
    Advanced: 'Designed for experienced learners seeking deeper knowledge',
    Expert: 'Challenging content for professionals and advanced practitioners'
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        textAlign: 'center', 
        pb: 1,
        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
        color: 'white'
      }}>
        <Box component="div">
          <Typography variant="h5" fontWeight="bold" component="div">
            Choose Difficulty Level
          </Typography>
          <Typography variant="subtitle1" sx={{ opacity: 0.9, mt: 0.5 }} component="div">
            for {subjectName}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 4 }}>
        <Typography variant="body1" color="textSecondary" textAlign="center" sx={{ mb: 4, lineHeight: 1.6 }}>
          Select the difficulty level that matches your current knowledge in this subject.
          <br />
          <Box component="span" sx={{ fontSize: '0.9rem', opacity: 0.8 }}>
            You can always change this later in your settings.
          </Box>
        </Typography>

        <Grid container spacing={3}>
          {difficultyData?.levels?.map((level: string) => (
            <Grid item xs={12} sm={6} key={level}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: 2,
                    borderColor: selectedDifficulty === level 
                      ? difficultyColors[level as keyof typeof difficultyColors] 
                      : 'transparent',
                    backgroundColor: selectedDifficulty === level 
                      ? `${difficultyColors[level as keyof typeof difficultyColors]}08`
                      : 'background.paper',
                    boxShadow: selectedDifficulty === level 
                      ? `0 8px 32px ${difficultyColors[level as keyof typeof difficultyColors]}20`
                      : '0 2px 8px rgba(0,0,0,0.08)',
                    '&:hover': {
                      boxShadow: `0 12px 40px ${difficultyColors[level as keyof typeof difficultyColors]}25`,
                      borderColor: difficultyColors[level as keyof typeof difficultyColors],
                      backgroundColor: `${difficultyColors[level as keyof typeof difficultyColors]}05`,
                      transform: 'translateY(-2px)',
                    },
                    height: 180,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 3,
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                  onClick={() => handleDifficultySelect(level)}
                >
                  {/* Selection indicator */}
                  {selectedDifficulty === level && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: `linear-gradient(90deg, ${difficultyColors[level as keyof typeof difficultyColors]}, ${difficultyColors[level as keyof typeof difficultyColors]}CC)`,
                        zIndex: 1
                      }}
                    />
                  )}
                  
                  <CardContent sx={{ 
                    flexGrow: 1, 
                    textAlign: 'center', 
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    {/* Icon and Title */}
                    <Box>
                      <Box sx={{ 
                        color: difficultyColors[level as keyof typeof difficultyColors],
                        mb: 2,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        '& svg': {
                          fontSize: '2.5rem',
                          filter: selectedDifficulty === level ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.2))' : 'none'
                        }
                      }}>
                        {difficultyIcons[level as keyof typeof difficultyIcons]}
                      </Box>
                      
                      <Typography 
                        variant="h6" 
                        fontWeight="bold" 
                        gutterBottom
                        sx={{ 
                          color: selectedDifficulty === level 
                            ? difficultyColors[level as keyof typeof difficultyColors]
                            : 'text.primary',
                          mb: 1
                        }}
                      >
                        {level}
                      </Typography>
                    </Box>
                    
                    {/* Description */}
                    <Typography 
                      variant="body2" 
                      color="textSecondary"
                      sx={{ 
                        lineHeight: 1.4,
                        fontSize: '0.85rem',
                        opacity: selectedDifficulty === level ? 0.8 : 0.7
                      }}
                    >
                      {difficultyDescriptions[level as keyof typeof difficultyDescriptions]}
                    </Typography>
                  </CardContent>
                  
                  {/* Selected badge */}
                  {selectedDifficulty === level && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        bgcolor: difficultyColors[level as keyof typeof difficultyColors],
                        color: 'white',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                      }}
                    >
                      ✓
                    </Box>
                  )}
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 4, pb: 4, pt: 2, justifyContent: 'space-between' }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          disabled={setDifficultyMutation.isLoading}
          sx={{ 
            minWidth: 100,
            py: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Cancel
        </Button>
        
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedDifficulty || setDifficultyMutation.isLoading}
          startIcon={setDifficultyMutation.isLoading ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{
            minWidth: 120,
            py: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            background: selectedDifficulty 
              ? `linear-gradient(135deg, ${difficultyColors[selectedDifficulty as keyof typeof difficultyColors]}, ${difficultyColors[selectedDifficulty as keyof typeof difficultyColors]}CC)`
              : 'linear-gradient(135deg, #1976d2, #42a5f5)',
            '&:hover': {
              background: selectedDifficulty 
                ? `linear-gradient(135deg, ${difficultyColors[selectedDifficulty as keyof typeof difficultyColors]}DD, ${difficultyColors[selectedDifficulty as keyof typeof difficultyColors]}BB)`
                : 'linear-gradient(135deg, #1565c0, #1976d2)',
            },
            '&:disabled': {
              background: 'rgba(0, 0, 0, 0.12)',
              color: 'rgba(0, 0, 0, 0.26)'
            }
          }}
        >
          {setDifficultyMutation.isLoading ? 'Setting...' : 'Continue Learning'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DifficultySelectionModal