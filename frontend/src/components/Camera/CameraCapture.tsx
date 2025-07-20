import React, { useRef, useCallback, useState, useEffect } from 'react'
import Webcam from 'react-webcam'
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  CameraAlt,
  Cameraswitch,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'

interface CameraCaptureProps {
  onCapture: (imageData: string) => void
  onCameraReady?: () => void
  isLoading?: boolean
  error?: string | null
  disabled?: boolean
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onCameraReady,
  isLoading = false,
  error = null,
  disabled = false,
}) => {
  const webcamRef = useRef<Webcam>(null)
  const [deviceId, setDeviceId] = useState<string>('')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const handleDevices = useCallback(
    (mediaDevices: MediaDeviceInfo[]) => {
      const videoDevices = mediaDevices.filter(({ kind }) => kind === 'videoinput')
      setDevices(videoDevices)
      if (videoDevices.length > 0 && !deviceId) {
        setDeviceId(videoDevices[0].deviceId)
      }
    },
    [deviceId]
  )

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(handleDevices)
  }, [handleDevices])

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      setCapturedImage(imageSrc)
      onCapture(imageSrc)
    }
  }, [onCapture])

  const retake = useCallback(() => {
    setCapturedImage(null)
  }, [])

  const handleCameraReady = useCallback(() => {
    setIsCameraReady(true)
    onCameraReady?.()
  }, [onCameraReady])

  const switchCamera = useCallback(() => {
    const currentIndex = devices.findIndex(device => device.deviceId === deviceId)
    const nextIndex = (currentIndex + 1) % devices.length
    setDeviceId(devices[nextIndex]?.deviceId || devices[0]?.deviceId)
  }, [devices, deviceId])

  const videoConstraints = {
    width: 640,
    height: 480,
    deviceId: deviceId ? { exact: deviceId } : undefined,
    facingMode: 'user',
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 640, mx: 'auto' }}>
      <Paper
        elevation={3}
        sx={{
          p: 2,
          borderRadius: 3,
          background: 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)',
        }}
      >
        {/* Camera Preview */}
        <Box
          sx={{
            position: 'relative',
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: '#000',
            aspectRatio: '4/3',
            mb: 2,
          }}
        >
          <AnimatePresence mode="wait">
            {capturedImage ? (
              <motion.img
                key="captured"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                src={capturedImage}
                alt="Captured"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <motion.div
                key="webcam"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={videoConstraints}
                  onUserMedia={handleCameraReady}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Camera Switch Button */}
          {devices.length > 1 && !capturedImage && (
            <Tooltip title="Switch Camera">
              <IconButton
                onClick={switchCamera}
                disabled={disabled || isLoading}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 1)',
                  },
                }}
              >
                <Cameraswitch />
              </IconButton>
            </Tooltip>
          )}

          {/* Loading Overlay */}
          {isLoading && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <Box sx={{ textAlign: 'center', color: 'white' }}>
                <CircularProgress color="inherit" size={48} sx={{ mb: 2 }} />
                <Typography variant="body1">Processing...</Typography>
              </Box>
            </Box>
          )}

          {/* Camera Status Indicator */}
          {isCameraReady && !capturedImage && (
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                left: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: 'rgba(76, 175, 80, 0.9)',
                color: 'white',
                px: 2,
                py: 1,
                borderRadius: 2,
                fontSize: '0.875rem',
              }}
            >
              <CheckCircle fontSize="small" />
              <Typography variant="body2">Camera Ready</Typography>
            </Box>
          )}
        </Box>

        {/* Error Display */}
        {error && (
          <Alert
            severity="error"
            icon={<ErrorIcon />}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        {/* Instructions */}
        <Typography
          variant="body2"
          color="textSecondary"
          textAlign="center"
          sx={{ mb: 3 }}
        >
          {capturedImage
            ? 'Review your photo and confirm, or retake if needed'
            : 'Position your face in the center of the frame and ensure good lighting'}
        </Typography>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          {capturedImage ? (
            <>
              <Button
                variant="outlined"
                onClick={retake}
                disabled={disabled || isLoading}
                size="large"
              >
                Retake
              </Button>
              <Button
                variant="contained"
                onClick={() => onCapture(capturedImage)}
                disabled={disabled || isLoading}
                startIcon={isLoading ? <CircularProgress size={20} /> : <CheckCircle />}
                size="large"
              >
                {isLoading ? 'Processing...' : 'Confirm'}
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              onClick={capture}
              disabled={disabled || !isCameraReady || isLoading}
              startIcon={<CameraAlt />}
              size="large"
              sx={{ minWidth: 140 }}
            >
              Capture Photo
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  )
}

export default CameraCapture 