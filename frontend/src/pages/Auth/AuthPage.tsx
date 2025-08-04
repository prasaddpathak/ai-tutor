import React, { useState } from 'react'
import {
  Box,
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Alert,
  Fade,
} from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import { LoginOutlined, PersonAddOutlined } from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import CameraCapture from '../../components/Camera/CameraCapture'
import { authAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

const AuthPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  
  const login = useAuthStore((state) => state.login)
  const { t } = useTranslation()

  const registerSchema = z.object({
    name: z.string().min(1, t('auth.nameRequired')).max(100, t('auth.nameTooLong')),
  })

  type RegisterForm = z.infer<typeof registerSchema>

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
    },
  })

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
    setError(null)
    setCapturedImage(null)
    reset()
  }

  const handleImageCapture = (imageData: string) => {
    setCapturedImage(imageData)
    setError(null)
  }

  const handleLogin = async () => {
    if (!capturedImage) {
      setError(t('auth.photoRequired'))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await authAPI.login(capturedImage)
      
      if (response.data.success && response.data.student) {
        login(response.data.student)
        toast.success(response.data.message)
      } else {
        setError(response.data.message || t('auth.authError'))
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || t('auth.authError')
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (data: RegisterForm) => {
    if (!capturedImage) {
      setError(t('auth.photoRequired'))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await authAPI.register({
        name: data.name,
        image_data: capturedImage,
      })

      if (response.data.success && response.data.student) {
        login(response.data.student)
        toast.success(response.data.message)
      } else {
        setError(response.data.message || t('auth.authError'))
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || t('auth.authError')
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0A5130 0%, #3B854E 100%)',
        display: 'flex',
        alignItems: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Paper
            elevation={24}
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Header */}
            <Box
              sx={{
                p: 4,
                textAlign: 'center',
                background: 'linear-gradient(135deg, #0A5130 0%, #3B854E 100%)',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <img
                src="/terrateach.svg"
                alt="TerraTeach"
                style={{ height: 60, width: 60 }}
              />
              <Typography variant="h3" fontWeight="bold" gutterBottom sx={{ color: '#D3B651' }}>
                TerraTeach
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                {t('landing.subtitle')}
              </Typography>
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                centered
                sx={{
                  '& .MuiTab-root': {
                    minHeight: 64,
                    fontSize: '1rem',
                    fontWeight: 600,
                  },
                }}
              >
                <Tab
                  icon={<LoginOutlined />}
                  label={t('auth.login')}
                  iconPosition="start"
                />
                <Tab
                  icon={<PersonAddOutlined />}
                  label={t('auth.register')}
                  iconPosition="start"
                />
              </Tabs>
            </Box>

            {/* Content */}
            <Box sx={{ p: 4 }}>
              <AnimatePresence mode="wait">
                {activeTab === 0 ? (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Typography variant="h5" textAlign="center" gutterBottom>
                      {t('auth.welcome')}
                    </Typography>
                    <Typography variant="body1" textAlign="center" color="textSecondary" sx={{ mb: 4 }}>
                      {t('auth.loginDescription')}
                    </Typography>
                    
                    <CameraCapture
                      onCapture={handleImageCapture}
                      isLoading={isLoading}
                      error={error}
                      disabled={isLoading}
                    />

                    {capturedImage && (
                      <Fade in>
                        <Box sx={{ mt: 3, textAlign: 'center' }}>
                          <Button
                            variant="contained"
                            size="large"
                            onClick={handleLogin}
                            disabled={isLoading}
                            sx={{ minWidth: 200 }}
                          >
                            {isLoading ? t('auth.loggingIn') : t('auth.login')}
                          </Button>
                        </Box>
                      </Fade>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Typography variant="h5" textAlign="center" gutterBottom>
                      {t('auth.getStarted')}
                    </Typography>
                    <Typography variant="body1" textAlign="center" color="textSecondary" sx={{ mb: 4 }}>
                      {t('auth.registerDescription')}
                    </Typography>

                    <form onSubmit={handleSubmit(handleRegister)}>
                      <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Controller
                          name="name"
                          control={control}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label={t('auth.nameLabel')}
                              placeholder={t('auth.namePlaceholder')}
                              fullWidth
                              error={!!errors.name}
                              helperText={errors.name?.message}
                              disabled={isLoading}
                            />
                          )}
                        />

                      </Box>

                      <CameraCapture
                        onCapture={handleImageCapture}
                        isLoading={isLoading}
                        error={error}
                        disabled={isLoading}
                      />

                      {capturedImage && (
                        <Fade in>
                          <Box sx={{ mt: 3, textAlign: 'center' }}>
                            <Button
                              type="submit"
                              variant="contained"
                              size="large"
                              disabled={isLoading}
                              sx={{ minWidth: 200 }}
                            >
                              {isLoading ? t('auth.registering') : t('auth.register')}
                            </Button>
                          </Box>
                        </Fade>
                      )}
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <Fade in>
                  <Alert severity="error" sx={{ mt: 3 }}>
                    {error}
                  </Alert>
                </Fade>
              )}
            </Box>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  )
}

export default AuthPage 