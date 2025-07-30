import React from 'react'
import {
  Box,
  Typography,
  LinearProgress
} from '@mui/material'
import { motion } from 'framer-motion'

interface UnifiedProgress {
  subject_id: number
  topic: string
  chapter: string
  page: number
  completed: boolean
  time_spent: number
}

interface UnifiedProgressBarProps {
  progressList: UnifiedProgress[]
  size?: 'small' | 'medium' | 'large'
  label?: string
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  animateOnMount?: boolean
}

export const ProgressIndicator: React.FC<UnifiedProgressBarProps> = ({
  progressList,
  size = 'medium',
  label = 'Progress',
  color = 'primary',
  animateOnMount = true
}) => {
  const totalPages = progressList.length;
  const completedPages = progressList.filter(p => p.completed).length;
  const percentage = totalPages > 0 ? Math.round((completedPages / totalPages) * 100) : 0;

  const sizeConfig = {
    small: { height: 6 },
    medium: { height: 8 },
    large: { height: 12 }
  };

  const config = sizeConfig[size];

  return (
    <Box sx={{ width: '100%' }}>
      {label && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {percentage}%
          </Typography>
        </Box>
      )}
      <motion.div
        initial={animateOnMount ? { scaleX: 0 } : undefined}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        style={{ transformOrigin: 'left' }}
      >
        <LinearProgress
          variant="determinate"
          value={percentage}
          color={color}
          sx={{
            height: config.height,
            borderRadius: config.height / 2,
            bgcolor: 'grey.200'
          }}
        />
      </motion.div>
    </Box>
  );
};

export default ProgressIndicator;
