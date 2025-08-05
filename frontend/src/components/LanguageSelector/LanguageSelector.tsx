import React, { useState } from 'react'
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
} from '@mui/material'
import {
  Language as LanguageIcon,
  Check as CheckIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

import { languages, type LanguageCode } from '../../i18n'
import { useAuthStore } from '../../stores/authStore'
import { languageService } from '../../services/languageService'

interface LanguageSelectorProps {
  variant?: 'button' | 'menu'
  size?: 'small' | 'medium' | 'large'
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  variant = 'button', 
  size = 'medium' 
}) => {
  const { i18n, t } = useTranslation()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const student = useAuthStore((state) => state.student)

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0]

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLanguageChange = async (languageCode: LanguageCode) => {
    try {
      // Use the language service to update preference and trigger content refresh
      await languageService.updateLanguagePreference(languageCode, student?.id)
      handleMenuClose()
    } catch (error) {
      console.error('Failed to change language:', error)
      handleMenuClose()
    }
  }

  // Flag emoji mapping for languages
  const getFlagEmoji = (languageCode: LanguageCode): string => {
    const flagMap = {
      en: '🇺🇸',
      es: '🇪🇸',
    } as const
    return flagMap[languageCode] || '🌐'
  }

  return (
    <Box>
      <motion.div whileHover={{ scale: 1.02 }}>
        <Button
          onClick={handleMenuOpen}
          startIcon={<LanguageIcon />}
          endIcon={<ExpandMoreIcon />}
          size={size}
          sx={{
            textTransform: 'none',
            color: 'text.primary',
            '&:hover': {
              bgcolor: 'action.hover',
            },
            borderRadius: 2,
            px: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography component="span" sx={{ fontSize: '1.2em' }}>
              {getFlagEmoji(currentLanguage.code)}
            </Typography>
            {variant === 'button' && (
              <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'left' }}>
                {currentLanguage.nativeName}
              </Typography>
            )}
          </Box>
        </Button>
      </motion.div>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          },
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" color="text.secondary">
            {t('navigation.language')}
          </Typography>
        </Box>

        {languages.map((language) => {
          const isSelected = language.code === i18n.language
          
          return (
            <MenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              selected={isSelected}
              sx={{ 
                py: 1.5,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.12)',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Typography component="span" sx={{ fontSize: '1.3em' }}>
                  {getFlagEmoji(language.code)}
                </Typography>
              </ListItemIcon>
              
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                      {language.nativeName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {language.name}
                    </Typography>
                  </Box>
                }
              />
              
              {isSelected && (
                <CheckIcon 
                  sx={{ 
                    ml: 1, 
                    color: 'primary.main',
                    fontSize: 20,
                  }} 
                />
              )}
            </MenuItem>
          )
        })}
      </Menu>
    </Box>
  )
}

export default LanguageSelector