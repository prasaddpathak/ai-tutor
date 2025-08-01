import React, { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Breadcrumbs,
  Link,
  Button,
} from '@mui/material'
import {
  AccountCircle,
  Logout,
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
      { label: 'Subjects', path: '/subjects', icon: <School fontSize="small" /> }
    ]

    if (pathSegments.includes('subjects')) {
      if (pathSegments.length > 1) {
        // Extract subject info from URL
        const subjectId = pathSegments[1]
        
        if (pathSegments.includes('topics')) {
          breadcrumbs.push({ label: 'Topics', path: `/subjects/${subjectId}/topics`, icon: <School fontSize="small" /> })
          
          if (pathSegments.includes('chapters')) {
            breadcrumbs.push({ label: 'Chapters', path: location.pathname, icon: <School fontSize="small" /> })
          }
        }
      }
    }

    return breadcrumbs.slice(0, -1) // Remove current page from breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()


  return (
    <AppBar
      position="sticky"
      elevation={1}
      sx={{
        bgcolor: 'white',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
        '& .MuiToolbar-root': {
          background: 'linear-gradient(135deg, rgba(10, 81, 48, 0.05) 0%, rgba(59, 133, 78, 0.05) 100%)',
        },
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
            to="/subjects"
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <img
              src="/terrateach.svg"
              alt="TerraTeach"
              style={{ height: 40, width: 40, marginRight: 16 }}
            />
            <Typography variant="h6" fontWeight="bold" sx={{ color: '#0A5130' }}>
              TerraTeach
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
                      color: '#0A5130',
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
          {/* User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              onClick={handleMenuOpen}
              startIcon={
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: '#0A5130',
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