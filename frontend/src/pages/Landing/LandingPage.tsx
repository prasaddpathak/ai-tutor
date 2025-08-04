import React from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Stack,
  alpha,
} from '@mui/material'
import { motion } from 'framer-motion'
import {
  SchoolOutlined,
  CameraAltOutlined,
  PersonalVideoOutlined,
  AutoAwesomeOutlined,
  NatureOutlined,
  ViewInArOutlined,
  QuizOutlined,
  PsychologyOutlined,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleGetStarted = () => {
    navigate('/auth')
  }

  const features = [
    {
      icon: <CameraAltOutlined sx={{ fontSize: 40 }} />,
      title: t('landing.features.hassleFreLogin.title'),
      description: t('landing.features.hassleFreLogin.description'),
    },
    {
      icon: <PsychologyOutlined sx={{ fontSize: 40 }} />,
      title: t('landing.features.aiPowered.title'),
      description: t('landing.features.aiPowered.description'),
    },
    {
      icon: <PersonalVideoOutlined sx={{ fontSize: 40 }} />,
      title: t('landing.features.offlineFirst.title'),
      description: t('landing.features.offlineFirst.description'),
    },
    {
      icon: <QuizOutlined sx={{ fontSize: 40 }} />,
      title: t('landing.features.interactiveQuizzes.title'),
      description: t('landing.features.interactiveQuizzes.description'),
    },
    {
      icon: <ViewInArOutlined sx={{ fontSize: 40 }} />,
      title: t('landing.features.adaptiveContent.title'),
      description: t('landing.features.adaptiveContent.description'),
    },
    {
      icon: <AutoAwesomeOutlined sx={{ fontSize: 40 }} />,
      title: t('landing.features.smartTutoring.title'),
      description: t('landing.features.smartTutoring.description'),
    },
  ]


  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#F8FAF5' }}>
      {/* Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          backgroundColor: alpha('#0A5130', 0.95),
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid',
          borderColor: alpha('#3B854E', 0.2),
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <img
                src="/terrateach.svg"
                alt="TerraTeach"
                style={{ height: 40, width: 40 }}
              />
              <Typography
                variant="h5"
                fontWeight="bold"
                sx={{ color: '#D3B651' }}
              >
                TerraTeach
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={handleGetStarted}
              sx={{
                backgroundColor: '#D3B651',
                color: '#0A5130',
                fontWeight: 'bold',
                px: 3,
                py: 1,
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: alpha('#D3B651', 0.8),
                },
              }}
            >
              {t('landing.getStarted')}
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${alpha('#0A5130', 0.9)} 0%, ${alpha('#3B854E', 0.8)} 100%)`,
          color: 'white',
          py: 12,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <NatureOutlined sx={{ color: '#D3B651' }} />
                  <Chip
                    label="Gemma Challenge Submission"
                    size="small"
                    component="a"
                    href="https://www.kaggle.com/competitions/google-gemma-3n-hackathon"
                    target="_blank"
                    clickable
                    sx={{
                      backgroundColor: alpha('#D3B651', 0.2),
                      color: '#D3B651',
                      fontWeight: 'bold',
                      '&:hover': {
                        backgroundColor: alpha('#D3B651', 0.3),
                      },
                    }}
                  />
                </Box>
                <Typography
                  variant="h2"
                  fontWeight="bold"
                  gutterBottom
                  sx={{
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                    lineHeight: 1.2,
                  }}
                >
                  {t('landing.title')}
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    mb: 4,
                    opacity: 0.9,
                    fontWeight: 300,
                    fontSize: { xs: '1.2rem', md: '1.5rem' },
                  }}
                >
                  {t('landing.description')}
                </Typography>
                <Stack direction="row" spacing={3}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleGetStarted}
                    sx={{
                      backgroundColor: '#D3B651',
                      color: '#0A5130',
                      fontWeight: 'bold',
                      px: 4,
                      py: 1.5,
                      borderRadius: 3,
                      fontSize: '1.1rem',
                      '&:hover': {
                        backgroundColor: alpha('#D3B651', 0.8),
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    {t('landing.getStarted')}
                  </Button>
                </Stack>
              </motion.div>
            </Grid>
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: 400,
                  }}
                >
                  <img
                    src="/terrateach.svg"
                    alt="TerraTeach Logo"
                    style={{
                      height: '100%',
                      width: 'auto',
                      filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))',
                    }}
                  />
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
        
        {/* Background decoration */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha('#D3B651', 0.1)} 0%, transparent 70%)`,
          }}
        />
      </Box>


      {/* Features Section */}
      <Box sx={{ py: 12, backgroundColor: '#F8FAF5' }}>
        <Container maxWidth="lg">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography
                variant="h3"
                fontWeight="bold"
                gutterBottom
                sx={{ color: '#0A5130' }}
              >
                {t('landing.whyChoose.title')}
              </Typography>
              <Typography
                variant="h6"
                sx={{ color: '#3B854E', maxWidth: 600, mx: 'auto' }}
              >
                {t('landing.whyChoose.subtitle')}
              </Typography>
            </Box>
          </motion.div>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: alpha('#3B854E', 0.1),
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: `0 20px 40px ${alpha('#0A5130', 0.1)}`,
                        borderColor: alpha('#D3B651', 0.3),
                      },
                    }}
                  >
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <Box
                        sx={{
                          color: '#D3B651',
                          mb: 3,
                          display: 'flex',
                          justifyContent: 'center',
                        }}
                      >
                        {feature.icon}
                      </Box>
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        gutterBottom
                        sx={{ color: '#0A5130' }}
                      >
                        {feature.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: '#3B854E', lineHeight: 1.6 }}
                      >
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Powered By Section */}
      <Box sx={{ py: 8, backgroundColor: 'white' }}>
        <Container maxWidth="lg">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="h4"
                fontWeight="bold"
                gutterBottom
                sx={{ color: '#0A5130' }}
              >
                {t('landing.poweredBy.title')}
              </Typography>
              <Typography
                variant="h6"
                sx={{ color: '#3B854E', maxWidth: 700, mx: 'auto', mb: 6 }}
              >
                {t('landing.poweredBy.description')}
              </Typography>
              
              {/* Technology Badges */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <img
                    src="/gemma.jpg"
                    alt="Google Gemma 3n"
                    style={{
                      height: 100,
                      width: 'auto',
                      borderRadius: 12,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    }}
                  />
                  <Typography variant="h6" sx={{ display: 'block', mt: 2, color: '#0A5130', fontWeight: 'bold' }}>
                    Google Gemma 3n
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#3B854E', mt: 1 }}>
                    {t('landing.poweredBy.gemma')}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <img
                    src="/nvidiajetson.png"
                    alt="NVIDIA Jetson Nano"
                    style={{
                      height: 100,
                      width: 'auto',
                      borderRadius: 12,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    }}
                  />
                  <Typography variant="h6" sx={{ display: 'block', mt: 2, color: '#0A5130', fontWeight: 'bold' }}>
                    NVIDIA Jetson Nano
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#3B854E', mt: 1 }}>
                    {t('landing.poweredBy.jetson')}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          py: 12,
          background: `linear-gradient(135deg, ${alpha('#0A5130', 0.95)} 0%, ${alpha('#3B854E', 0.9)} 100%)`,
          color: 'white',
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <SchoolOutlined sx={{ fontSize: 60, color: '#D3B651' }} />
            </Box>
            <Typography
              variant="h3"
              fontWeight="bold"
              gutterBottom
              sx={{ mb: 3 }}
            >
              {t('landing.cta.title')}
            </Typography>
            <Typography
              variant="h6"
              sx={{ mb: 6, opacity: 0.9, maxWidth: 500, mx: 'auto' }}
            >
              {t('landing.cta.description')}
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleGetStarted}
              sx={{
                backgroundColor: '#D3B651',
                color: '#0A5130',
                fontWeight: 'bold',
                px: 6,
                py: 2,
                borderRadius: 3,
                fontSize: '1.2rem',
                '&:hover': {
                  backgroundColor: alpha('#D3B651', 0.8),
                  transform: 'translateY(-3px)',
                },
              }}
            >
              {t('landing.cta.button')}
            </Button>
          </motion.div>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 6, backgroundColor: '#0A5130', color: 'white' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <img
                  src="/terrateach.svg"
                  alt="TerraTeach"
                  style={{ height: 30, width: 30 }}
                />
                <Typography variant="h6" fontWeight="bold" sx={{ color: '#D3B651' }}>
                  TerraTeach
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {t('landing.footer.description')}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                <Chip
                  icon={<NatureOutlined />}
                  label="Google Gemma 3n Hackathon"
                  component="a"
                  href="https://www.kaggle.com/competitions/google-gemma-3n-hackathon"
                  target="_blank"
                  clickable
                  sx={{
                    backgroundColor: alpha('#D3B651', 0.2),
                    color: '#D3B651',
                    fontWeight: 'bold',
                    '&:hover': {
                      backgroundColor: alpha('#D3B651', 0.3),
                    },
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{ opacity: 0.6, mt: 2 }}
                >
                  {t('landing.footer.copyright')}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  )
}

export default LandingPage