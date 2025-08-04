import React, { useState, useRef, useEffect } from 'react'
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Stack,
  Chip,
  Collapse,
  Fab,
  Divider,
  CircularProgress,
} from '@mui/material'
import {
  Send,
  Chat,
  Close,
  SmartToy,
  Person,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChapterChatPanelProps {
  subjectId: number
  topicTitle: string
  chapterTitle: string
  studentId: number
  currentPage: number
  isOpen: boolean
  onToggle: () => void
}

const ChapterChatPanel: React.FC<ChapterChatPanelProps> = ({
  subjectId,
  topicTitle,
  chapterTitle,
  studentId,
  currentPage,
  isOpen,
  onToggle,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load chat history when component mounts or chapter changes
  useEffect(() => {
    if (isOpen) {
      loadChatHistory()
    }
  }, [subjectId, topicTitle, chapterTitle, studentId]) // Removed isOpen dependency

  // Also load on mount if chat is already open
  useEffect(() => {
    if (isOpen) {
      loadChatHistory()
    }
  }, [isOpen])

  const loadChatHistory = async () => {
    try {
      const response = await fetch(
        `/api/subjects/${subjectId}/topics/${encodeURIComponent(topicTitle)}/chapters/${encodeURIComponent(chapterTitle)}/chat/history?student_id=${studentId}`
      )
      
      if (response.ok) {
        const data = await response.json()
        console.log('Loaded chat history:', data) // Debug log
        
        if (data.chat_history && data.chat_history.length > 0) {
          const historyMessages: ChatMessage[] = data.chat_history.map((msg: any, index: number) => [
            {
              id: `${index}-user`,
              type: 'user' as const,
              content: msg.user_message,
              timestamp: msg.timestamp,
            },
            {
              id: `${index}-assistant`,
              type: 'assistant' as const,
              content: msg.assistant_message,
              timestamp: msg.timestamp,
            }
          ]).flat()
          
          setMessages(historyMessages)
        } else {
          // No history, start fresh
          setMessages([])
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
      setMessages([]) // Fallback to empty messages
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/subjects/${subjectId}/topics/${encodeURIComponent(topicTitle)}/chapters/${encodeURIComponent(chapterTitle)}/chat?student_id=${studentId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage.content,
            current_page: currentPage,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success && data.response) {
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: data.response,
          timestamp: data.timestamp || new Date().toISOString(),
        }
        
        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error('Invalid response format')
      }

    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1000,
            }}
          >
            <Fab
              color="primary"
              onClick={onToggle}
              sx={{
                background: 'linear-gradient(135deg, #0A5130 0%, #3B854E 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #0A5130 0%, #2A4A3A 100%)',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <Chat />
            </Fab>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel with Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(4px)',
                zIndex: 1100,
              }}
              onClick={onToggle}
            />

            {/* Chat Panel */}
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ 
                duration: 0.3, 
                ease: "easeOut",
                opacity: { duration: 0.2 }
              }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                zIndex: 1200,
                width: '60%',
                minWidth: '500px',
                maxWidth: '800px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Paper
                sx={{
                  width: '100%',
                  height: '100vh',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 0,
                  borderLeft: '1px solid',
                  borderColor: 'divider',
                  boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
                }}
              >
            {/* Header */}
            <Box
              sx={{
                p: 2,
                background: 'linear-gradient(135deg, #0A5130 0%, #3B854E 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SmartToy />
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    AI Tutor
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    {chapterTitle}
                  </Typography>
                </Box>
              </Box>
              <IconButton onClick={onToggle} sx={{ color: 'white' }}>
                <Close />
              </IconButton>
            </Box>

            {/* Current Page Indicator */}
            <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Chip
                label={`Page ${currentPage}`}
                size="small"
                sx={{
                  backgroundColor: 'rgba(10, 81, 48, 0.1)',
                  color: '#0A5130',
                }}
              />
            </Box>

            {/* Messages */}
            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                p: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              {messages.length === 0 && (
                <Box
                  sx={{
                    textAlign: 'center',
                    color: 'text.secondary',
                    py: 4,
                  }}
                >
                  <SmartToy sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                  <Typography variant="body2">
                    Ask me anything about this chapter!
                  </Typography>
                  <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                    I have context about the content you're reading.
                  </Typography>
                </Box>
              )}

              {messages.map((message) => (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                    mb: 1,
                    mx: 2,
                  }}
                >
                  <Paper
                    sx={{
                      p: 2,
                      maxWidth: '85%',
                      backgroundColor:
                        message.type === 'user'
                          ? 'primary.main'
                          : 'grey.100',
                      color: message.type === 'user' ? 'white' : 'text.primary',
                      borderRadius: 2,
                      ...(message.type === 'user'
                        ? {
                            borderBottomRightRadius: 4,
                          }
                        : {
                            borderBottomLeftRadius: 4,
                          }),
                    }}
                  >
                    <Stack direction="row" alignItems="flex-start" spacing={1}>
                      {message.type === 'assistant' && (
                        <SmartToy sx={{ fontSize: 16, mt: 0.5, opacity: 0.7 }} />
                      )}
                      {message.type === 'user' && (
                        <Person sx={{ fontSize: 16, mt: 0.5, opacity: 0.7 }} />
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {message.content}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </Box>

            {/* Input */}
            <Box
              sx={{
                p: 2,
                borderTop: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'background.paper',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="flex-end">
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Ask about this chapter..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  multiline
                  maxRows={3}
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                    },
                  }}
                />
                <IconButton
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  sx={{
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '&:disabled': {
                      backgroundColor: 'grey.300',
                    },
                  }}
                >
                  {isLoading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <Send />
                  )}
                </IconButton>
              </Stack>
            </Box>
              </Paper>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default ChapterChatPanel