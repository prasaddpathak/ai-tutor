import React from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import { motion } from 'framer-motion'
import { School } from '@mui/icons-material'

const LoadingScreen: React.FC = () => {
  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center' }}
      >
        {/* Animated Logo */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{ marginBottom: '2rem' }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              border: '2px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            <School sx={{ fontSize: 40, color: 'white' }} />
          </Box>
        </motion.div>

        {/* Title */}
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          AI Tutor
        </Typography>

        {/* Loading Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <CircularProgress
            size={48}
            thickness={4}
            sx={{
              color: 'white',
              mb: 2,
            }}
          />
          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Loading your learning experience...
          </Typography>
        </motion.div>
      </motion.div>
    </Box>
  )
}

export default LoadingScreen 