import React, { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Breadcrumbs,
  Link,
  Button,
} from '@mui/material'
import {
  AccountCircle,
  Logout,
  Dashboard,
  School,
  NavigateNext,
} from '@mui/icons-material'
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom'
import { motion } from 'framer-motion'

import { useAuthStore } from '../../stores/authStore'

const Navbar: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  
  const { student, logout } = useAuthStore()

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    logout()
    handleMenuClose()
    navigate('/auth')
  }

  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const breadcrumbs = [
      { label: 'Dashboard', path: '/dashboard', icon: <Dashboard fontSize="small" /> }
    ]

    if (pathSegments.includes('subjects')) {
      if (pathSegments.length === 1) {
        breadcrumbs.push({ label: 'Subjects', path: '/subjects', icon: <School fontSize="small" /> })
      } else {
        // Extract subject info from URL
        const subjectId = pathSegments[1]
        breadcrumbs.push({ label: 'Subjects', path: '/subjects', icon: <School fontSize="small" /> })
        
        if (pathSegments.includes('topics')) {
          breadcrumbs.push({ label: 'Topics', path: `/subjects/${subjectId}/topics` })
          
          if (pathSegments.includes('chapters')) {
            const topicTitle = decodeURIComponent(pathSegments[3])
            breadcrumbs.push({ label: 'Chapters', path: location.pathname })
          }
        }
      }
    }

    return breadcrumbs.slice(0, -1) // Remove current page from breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'School': return 'success'
      case 'High School': return 'info'
      case 'Intermediate': return 'warning'
      case 'Advanced': return 'error'
      default: return 'default'
    }
  }

  return (
    <AppBar
      position="sticky"
      elevation={1}
      sx={{
        bgcolor: 'white',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ minHeight: 70 }}>
        {/* Logo and Title */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          style={{ display: 'flex', alignItems: 'center', marginRight: '2rem' }}
        >
          <Box
            component={RouterLink}
            to="/dashboard"
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #1976d2, #1565c0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
              }}
            >
              <School sx={{ color: 'white', fontSize: 24 }} />
            </Box>
            <Typography variant="h6" fontWeight="bold" color="primary">
              AI Tutor
            </Typography>
          </Box>
        </motion.div>

        {/* Breadcrumbs */}
        <Box sx={{ flexGrow: 1 }}>
          {breadcrumbs.length > 0 && (
            <Breadcrumbs
              separator={<NavigateNext fontSize="small" />}
              sx={{ 
                '& .MuiBreadcrumbs-separator': { 
                  color: 'text.secondary' 
                }
              }}
            >
              {breadcrumbs.map((crumb, index) => (
                <Link
                  key={index}
                  component={RouterLink}
                  to={crumb.path}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    textDecoration: 'none',
                    color: 'text.secondary',
                    '&:hover': {
                      color: 'primary.main',
                    },
                  }}
                >
                  {crumb.icon}
                  {crumb.label}
                </Link>
              ))}
            </Breadcrumbs>
          )}
        </Box>

        {/* User Profile Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Difficulty Level Chip */}
          <Chip
            label={student?.difficulty_level}
            size="small"
            color={getDifficultyColor(student?.difficulty_level || '')}
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />

          {/* User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="textSecondary">
              Welcome,
            </Typography>
            <Button
              onClick={handleMenuOpen}
              startIcon={
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: 'primary.main',
                    fontSize: '0.875rem',
                  }}
                >
                  {student?.name?.charAt(0).toUpperCase()}
                </Avatar>
              }
              sx={{
                textTransform: 'none',
                color: 'text.primary',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              {student?.name}
            </Button>
          </Box>

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
            <MenuItem onClick={handleMenuClose} sx={{ py: 1.5 }}>
              <AccountCircle sx={{ mr: 2 }} />
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main' }}>
              <Logout sx={{ mr: 2 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default Navbar 