import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Image, Smile, X, Crown, Bot, Reply, Users, Music, Heart, Frown, Sparkles, Plus, Mic, Square, Play, Pause } from 'lucide-react'
import { useChat } from '../../contexts/ChatContext'
import { MessageBubble } from './MessageBubble'
import { EmojiPicker } from './EmojiPicker'
import { TypingIndicator } from '../room/TypingIndicator'
import { supabase } from '../../lib/supabase'

interface ChatWindowProps {
  isHost: boolean
  currentUser: { id: string; name: string }
  roomId: string
  onClose: () => void
}

// Custom Voice Player Component
interface VoicePlayerProps {
  audioBlob: Blob
  duration: number
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({ audioBlob, duration }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [actualDuration, setActualDuration] = useState(duration)
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    const handleLoadedMetadata = () => {
      setActualDuration(audio.duration)
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    const progressBar = progressRef.current
    if (!audio || !progressBar) return

    const rect = progressBar.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const newTime = (clickX / rect.width) * actualDuration
    
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const progress = actualDuration > 0 ? (currentTime / actualDuration) * 100 : 0

  return (
    <div className="flex items-center gap-3">
      <motion.button
        onClick={togglePlay}
        className="flex items-center justify-center w-8 h-8 bg-green-500 hover:bg-green-400 
                   text-white rounded-full transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </motion.button>

      <div className="flex-1">
        <div 
          ref={progressRef}
          onClick={handleProgressClick}
          className="h-2 bg-gray-700 rounded-full cursor-pointer overflow-hidden"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full relative"
            style={{ width: `${progress}%` }}
            layout
          >
            <motion.div
              className="absolute right-0 top-0 w-3 h-3 bg-white rounded-full -mt-0.5 -mr-1.5 shadow-lg"
              animate={{ 
                boxShadow: isPlaying 
                  ? "0 0 0 0 rgba(34, 197, 94, 0.7), 0 0 0 10px rgba(34, 197, 94, 0)"
                  : "0 0 0 0 rgba(34, 197, 94, 0.7), 0 0 0 0 rgba(34, 197, 94, 0)"
              }}
              transition={{ duration: 1.5, repeat: isPlaying ? Infinity : 0 }}
            />
          </motion.div>
        </div>
        
        {/* Waveform Effect */}
        <div className="flex items-center gap-0.5 mt-1 h-3">
          {[...Array(20)].map((_, i) => {
            const isActive = (i / 20) * 100 < progress
            return (
              <motion.div
                key={i}
                className={`w-0.5 rounded-full transition-colors duration-200 ${
                  isActive ? 'bg-green-400' : 'bg-gray-600'
                }`}
                animate={{ 
                  height: isPlaying ? [8, 12, 6, 14, 10] : 8,
                  opacity: isActive ? 1 : 0.3
                }}
                transition={{ 
                  duration: 0.5,
                  delay: i * 0.05,
                  repeat: isPlaying ? Infinity : 0,
                  repeatType: "reverse"
                }}
              />
            )
          })}
        </div>
      </div>

      <div className="text-xs text-gray-400 min-w-[35px]">
        {Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}
      </div>

      <audio
        ref={audioRef}
        src={URL.createObjectURL(audioBlob)}
        preload="metadata"
      />
    </div>
  )
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  isHost, 
  currentUser, 
  roomId,
  onClose 
}) => {
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    refreshMessages, 
    typingUsers, 
    setTyping, 
    replyToMessage, 
    setReplyToMessage,
    activeUsers,
    setChatActive
  } = useChat()
  const [inputMessage, setInputMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const [showMusicReactions, setShowMusicReactions] = useState(false)
  const [showAttachments, setShowAttachments] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Detect if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  // Debug: Log messages when they change
  useEffect(() => {
    console.log('🔄 ChatWindow: Messages updated:', messages.length, messages)
  }, [messages])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-focus input when window opens and set chat as active
  useEffect(() => {
    inputRef.current?.focus()
    
    // Mark user as active in chat
    setChatActive(true)
    
    // Force immediate refresh when chat window opens
    console.log('🚀 ChatWindow opened, forcing immediate message refresh...')
    refreshMessages()
    
    // Another refresh after short delay to ensure messages appear
    setTimeout(() => {
      console.log('🔄 ChatWindow secondary refresh...')
      refreshMessages()
    }, 200)

    // Cleanup: Mark user as inactive when chat window closes
    return () => {
      setChatActive(false)
      
      // Cleanup voice recording
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [])

  // Mobile keyboard detection and adaptation
  useEffect(() => {
    if (!isMobile) return

    const handleViewportChange = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight
      const windowHeight = window.screen.height
      const threshold = windowHeight * 0.75 // Keyboard is likely open if viewport is less than 75% of screen height
      
      const keyboardOpen = viewportHeight < threshold
      setIsKeyboardOpen(keyboardOpen)
      
      // Smooth adaptation when keyboard opens/closes
      if (chatContainerRef.current) {
        if (keyboardOpen) {
          chatContainerRef.current.style.height = `${viewportHeight - 100}px` // Leave space for input
          chatContainerRef.current.style.transition = 'height 0.3s ease-out'
        } else {
          chatContainerRef.current.style.height = 'auto'
          chatContainerRef.current.style.transition = 'height 0.3s ease-out'
        }
      }
      
      // Auto-scroll to bottom when keyboard state changes
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }

    // Listen for viewport changes (keyboard open/close)
    window.visualViewport?.addEventListener('resize', handleViewportChange)
    window.addEventListener('resize', handleViewportChange)
    
    // Also listen for focus events on input
    const handleInputFocus = () => {
      setTimeout(handleViewportChange, 300) // Delay to let keyboard animate
    }
    
    const handleInputBlur = () => {
      setTimeout(handleViewportChange, 300)
    }
    
    inputRef.current?.addEventListener('focus', handleInputFocus)
    inputRef.current?.addEventListener('blur', handleInputBlur)
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('resize', handleViewportChange)
      inputRef.current?.removeEventListener('focus', handleInputFocus)
      inputRef.current?.removeEventListener('blur', handleInputBlur)
    }
  }, [isMobile])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // Close emoji picker if clicking outside
      if (showEmojiPicker && !target.closest('.emoji-picker') && !target.closest('[title="Add Emoji"]')) {
        setShowEmojiPicker(false)
      }
      
      // Close music reactions if clicking outside
      if (showMusicReactions && !target.closest('.music-reactions-dropdown') && !target.closest('[title="Music Reaction"]')) {
        setShowMusicReactions(false)
      }
      
      // Close attachments if clicking outside
      if (showAttachments && !target.closest('.attachments-dropdown') && !target.closest('[title="Attachments"]')) {
        setShowAttachments(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEmojiPicker, showMusicReactions, showAttachments])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !selectedImage) return

    try {
      // Stop typing indicator immediately
      setTyping(false)
      
      await sendMessage(inputMessage, selectedImage || undefined, replyToMessage || undefined)
      setInputMessage('')
      setSelectedImage(null)
      setShowImagePreview(false)
      setReplyToMessage(null) // Clear reply after sending
      inputRef.current?.focus()
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file)
      setShowImagePreview(true)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isMobile) {
        // On mobile: Enter = new line, only send button sends message
        // Allow default behavior (new line)
        return
      } else {
        // On desktop: Enter = send (unless Shift+Enter for new line)
        if (!e.shiftKey) {
          e.preventDefault()
          setTyping(false) // Stop typing when sending message
          handleSendMessage()
        }
        // Shift+Enter on desktop = new line (default behavior)
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInputMessage(value)
    
    // Start typing indicator when user types
    if (value.trim().length > 0) {
      setTyping(true)
    } else {
      setTyping(false)
    }
  }

  const addEmoji = (emoji: string) => {
    setInputMessage(prev => prev + emoji)
    setShowEmojiPicker(false)
    inputRef.current?.focus()
  }

  // Music reaction handler
  const handleMusicReaction = async (reactionType: 'sad' | 'romantic' | 'wow') => {
    try {
      const reactionId = `${currentUser.id}-${Date.now()}`
      
      const reactionData = {
        type: reactionType,
        userName: currentUser.name,
        reactionId: reactionId
      }

      // Broadcast the music reaction via Supabase realtime (same as MusicReactions component)
      const channel = supabase.channel(`music-reactions-${roomId}`)
      await channel.send({
        type: 'broadcast',
        event: 'music_reaction',
        payload: reactionData
      })

      console.log(`🎵 ${currentUser.name} reacted with ${reactionType} from chat!`)
      setShowMusicReactions(false)
    } catch (error) {
      console.error('Error sending music reaction:', error)
    }
  }

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      
      const chunks: BlobPart[] = []
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data)
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setRecordedBlob(blob)
        stream.getTracks().forEach(track => track.stop()) // Stop microphone access
      }
      
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingDuration(0)
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)
      
      console.log('🎤 Recording started')
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      
      console.log('🎤 Recording stopped')
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setRecordedBlob(null)
      setRecordingDuration(0)
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      
      console.log('🎤 Recording cancelled')
    }
  }

  const sendVoiceMessage = async () => {
    if (recordedBlob) {
      try {
        // Convert blob to file with proper audio type
        const voiceFile = new File([recordedBlob], `voice-${Date.now()}.webm`, { 
          type: 'audio/webm' 
        })
        
        // Send voice message with no text (player will show duration)
        await sendMessage('', voiceFile, replyToMessage || undefined)
        
        // Clear voice message state
        setRecordedBlob(null)
        setRecordingDuration(0)
        setReplyToMessage(null)
        inputRef.current?.focus()
        
        console.log('🎤 Voice message sent successfully')
      } catch (error) {
        console.error('Error sending voice message:', error)
        alert('Failed to send voice message. Please try again.')
      }
    }
  }

  // Format recording duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <motion.div
      className="bg-gray-900/95 backdrop-blur-xl border border-purple-500/30 
                 rounded-2xl md:rounded-2xl rounded-none md:shadow-2xl 
                 overflow-y-hidden overflow-x-visible flex flex-col w-full
                 md:h-full h-screen md:mb-0 mb-0 md:mx-0 mx-0"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{
        // Dynamic height for mobile keyboard - keep header fixed
        height: isMobile ? '100vh' : '100%'
      }}
    >
      {/* Header - Fixed position on mobile */}
      <div className={`bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-2 md:p-4 border-b border-purple-500/30
                      ${isMobile ? 'sticky top-0 z-50' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="text-purple-400 text-sm md:text-base"
            >
              💫
            </motion.div>
            <h3 className="hidden md:block text-base md:text-lg font-bold text-white">Cosmic Chat</h3>
            {isHost && <Crown className="h-3 w-3 md:h-4 md:w-4 text-yellow-400" />}
          </div>
          
          <button
            onClick={onClose}
            className="p-1 md:p-2 text-gray-400 hover:text-white transition-colors rounded-full
                       hover:bg-purple-500/20"
          >
            <X className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        </div>
        
        {/* Online Users Display - Compact on mobile */}
        <div className="mt-1 md:mt-2 flex items-center gap-1 md:gap-2">
          <div className="flex items-center gap-1 text-xs text-green-400">
            <Users className="h-3 w-3" />
            <span className="hidden md:inline">{activeUsers.length} online</span>
            <span className="md:hidden">{activeUsers.length}</span>
          </div>
          <div className="flex items-center gap-1 overflow-hidden">
            {activeUsers.slice(0, isMobile ? 2 : 3).map((user) => (
              <motion.div
                key={user}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 bg-purple-900/30 rounded-full text-xs text-purple-200"
              >
                <div className="w-1.5 md:w-2 h-1.5 md:h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="truncate max-w-[40px] md:max-w-[60px]">{user}</span>
              </motion.div>
            ))}
            {activeUsers.length > (isMobile ? 2 : 3) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs text-gray-400 px-1.5 md:px-2 py-0.5 md:py-1 bg-gray-800/50 rounded-full"
              >
                +{activeUsers.length - (isMobile ? 2 : 3)}
              </motion.div>
            )}
          </div>
        </div>
        
        {/* AI Helper Info - Hidden on mobile when keyboard is open */}
        {(!isMobile || !isKeyboardOpen) && (
          <div className="mt-1 text-xs text-purple-300 flex items-center gap-1">
            <Bot className="h-2 md:h-3 w-2 md:w-3" />
            <span className="hidden md:inline">Type @AI to chat with Cosmic AI! 🤖✨</span>
            <span className="md:hidden">@AI 🤖</span>
          </div>
        )}
      </div>

      {/* Messages Container - Adjust for fixed header on mobile */}
      <div 
        ref={chatContainerRef}
        className={`flex-1 overflow-y-auto overflow-x-visible p-2 md:p-4 space-y-2 md:space-y-3 min-h-0`}
        style={{
          // Account for keyboard and fixed header on mobile
          height: isMobile && isKeyboardOpen ? 'calc(100vh - 200px)' : undefined,
          transition: isMobile ? 'height 0.3s ease-out' : undefined
        }}
      >
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-gray-400 mt-8"
            >
              <div className="text-4xl mb-2">🌌</div>
              <p>Welcome to Cosmic Chat!</p>
              <p className="text-sm mt-1">Start a conversation with the universe! ✨</p>
            </motion.div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                currentUserId={currentUser.id}
              />
            ))
          )}
        </AnimatePresence>
        
        {/* Spacer to ensure messages are visible */}
        <div className="h-4"></div>
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator - Fixed position between messages and input */}
      {typingUsers.length > 0 && (
        <TypingIndicator typingUsers={typingUsers} />
      )}

      {/* Image Preview */}
      <AnimatePresence>
        {showImagePreview && selectedImage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 border-t border-purple-500/30"
          >
            <div className="bg-gray-800 rounded-lg p-2 flex items-center gap-2">
              <img
                src={URL.createObjectURL(selectedImage)}
                alt="Preview"
                className="h-12 w-12 object-cover rounded"
              />
              <div className="flex-1">
                <p className="text-sm text-white">{selectedImage.name}</p>
                <p className="text-xs text-gray-400">
                  {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedImage(null)
                  setShowImagePreview(false)
                }}
                className="text-red-400 hover:text-red-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area - More compact on mobile */}
      <div className="p-1.5 md:p-4 border-t border-purple-500/30 bg-gray-900/50">
        {/* Reply Preview */}
        <AnimatePresence>
          {replyToMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-1.5 md:mb-2 p-2 md:p-3 bg-gray-800/50 border border-purple-500/30 rounded-lg"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Reply className="h-3 w-3 text-purple-400" />
                    <span className="text-xs font-medium text-purple-400">
                      Replying to {replyToMessage.username}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300 truncate">
                    {replyToMessage.message}
                  </div>
                </div>
                <button
                  onClick={() => setReplyToMessage(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Voice Recording UI */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-1.5 md:mb-2 p-3 md:p-4 bg-gradient-to-r from-red-900/30 to-rose-900/30 
                         border border-red-500/40 rounded-xl backdrop-blur-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, 360]
                    }}
                    transition={{ 
                      scale: { repeat: Infinity, duration: 1 },
                      rotate: { repeat: Infinity, duration: 2, ease: "linear" }
                    }}
                    className="relative"
                  >
                    <motion.div
                      className="absolute inset-0 bg-red-500/30 rounded-full"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                    <motion.div
                      className="w-4 h-4 bg-red-500 rounded-full relative z-10"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                    />
                  </motion.div>
                  
                  <Mic className="h-5 w-5 text-red-400" />
                  
                  <div className="flex-1">
                    <motion.span 
                      className="text-sm text-red-400 font-medium"
                      animate={{ opacity: [1, 0.6, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      Recording {formatDuration(recordingDuration)}
                    </motion.span>
                    
                    {/* Live Waveform */}
                    <div className="flex items-center gap-0.5 mt-1 h-3">
                      {[...Array(15)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-0.5 bg-red-400 rounded-full"
                          animate={{ 
                            height: [4, 16, 8, 20, 6, 14, 10],
                            opacity: [0.3, 1, 0.6, 1, 0.4, 0.8, 0.5]
                          }}
                          transition={{ 
                            repeat: Infinity, 
                            duration: 1,
                            delay: i * 0.1
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={cancelRecording}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 
                               transition-colors rounded-lg"
                    title="Cancel Recording"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                  <motion.button
                    onClick={stopRecording}
                    className="p-2 bg-red-600 text-white hover:bg-red-500 
                               transition-colors rounded-lg shadow-lg shadow-red-500/25"
                    title="Stop Recording"
                    whileHover={{ scale: 1.1, boxShadow: "0 8px 25px rgba(239, 68, 68, 0.4)" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Square className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice Preview */}
        <AnimatePresence>
          {recordedBlob && !isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-1.5 md:mb-2 p-3 md:p-4 bg-gradient-to-r from-green-900/30 to-emerald-900/30 
                         border border-green-500/40 rounded-xl backdrop-blur-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 2,
                      ease: "easeInOut"
                    }}
                    className="relative"
                  >
                    <div className="absolute inset-0 bg-green-400/20 rounded-full animate-pulse" />
                    <Mic className="h-5 w-5 text-green-400 relative z-10" />
                  </motion.div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-green-400 font-medium">
                        {formatDuration(recordingDuration)}
                      </span>
                      <motion.div 
                        className="flex gap-1"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        {[...Array(5)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="w-1 bg-green-400 rounded-full"
                            animate={{ 
                              height: [4, 12, 8, 16, 6],
                              opacity: [0.3, 1, 0.6, 1, 0.4]
                            }}
                            transition={{ 
                              repeat: Infinity, 
                              duration: 1.2,
                              delay: i * 0.1
                            }}
                          />
                        ))}
                      </motion.div>
                    </div>
                    
                    {/* Custom Audio Player with Progress Bar */}
                    <VoicePlayer 
                      audioBlob={recordedBlob}
                      duration={recordingDuration}
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={() => setRecordedBlob(null)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 
                               transition-colors rounded-lg"
                    title="Delete Recording"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                  <motion.button
                    onClick={sendVoiceMessage}
                    className="px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 
                               text-white hover:from-green-500 hover:to-emerald-500 
                               transition-all rounded-lg font-medium text-sm
                               shadow-lg shadow-green-500/25"
                    title="Send Voice Message"
                    whileHover={{ scale: 1.05, boxShadow: "0 8px 25px rgba(34, 197, 94, 0.4)" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Send className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex items-end gap-1 md:gap-2">
          {/* Attachments Button (WhatsApp-style + dropdown) */}
          <div className="relative">
            <button
              onClick={() => setShowAttachments(!showAttachments)}
              className="p-1 md:p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 
                         rounded-lg transition-colors"
              title="Attachments"
            >
              <Plus className="h-4 w-4 md:h-5 md:w-5" />
            </button>

            {/* Attachments Dropdown */}
            <AnimatePresence>
              {showAttachments && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="attachments-dropdown absolute bottom-full mb-2 left-0 bg-gray-800 rounded-lg shadow-lg 
                             border border-purple-500/30 p-2 flex gap-1 z-50"
                >
                  <button
                    onClick={() => {
                      fileInputRef.current?.click()
                      setShowAttachments(false)
                    }}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1
                               text-xs whitespace-nowrap"
                    title="Upload Image"
                  >
                    <Image className="w-4 h-4 text-green-400" />
                    <span className="text-gray-300 hidden md:inline">Image</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowEmojiPicker(!showEmojiPicker)
                      setShowAttachments(false)
                    }}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1
                               text-xs whitespace-nowrap"
                    title="Add Emoji"
                  >
                    <Smile className="w-4 h-4 text-yellow-400" />
                    <span className="text-gray-300 hidden md:inline">Emoji</span>
                  </button>
                  <button
                    onClick={() => {
                      startRecording()
                      setShowAttachments(false)
                    }}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1
                               text-xs whitespace-nowrap"
                    title="Voice Message"
                  >
                    <Mic className="w-4 h-4 text-red-400" />
                    <span className="text-gray-300 hidden md:inline">Voice</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Music Reaction Button */}
          <div className="relative">
            <button
              onClick={() => setShowMusicReactions(!showMusicReactions)}
              className="p-1 md:p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 
                         rounded-lg transition-colors"
              title="Music Reaction"
            >
              <Music className="h-4 w-4 md:h-5 md:w-5" />
            </button>

            {/* Music Reactions Dropdown */}
            <AnimatePresence>
              {showMusicReactions && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="music-reactions-dropdown absolute bottom-full mb-2 left-0 bg-gray-800 rounded-lg shadow-lg 
                             border border-purple-500/30 p-2 flex gap-1 z-50"
                >
                  <button
                    onClick={() => handleMusicReaction('sad')}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1
                               text-xs whitespace-nowrap"
                    title="Sad"
                  >
                    <Frown className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-300 hidden md:inline">Sad</span>
                  </button>
                  <button
                    onClick={() => handleMusicReaction('romantic')}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1
                               text-xs whitespace-nowrap"
                    title="Romantic"
                  >
                    <Heart className="w-4 h-4 text-pink-400" />
                    <span className="text-gray-300 hidden md:inline">Romantic</span>
                  </button>
                  <button
                    onClick={() => handleMusicReaction('wow')}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1
                               text-xs whitespace-nowrap"
                    title="Wow"
                  >
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="text-gray-300 hidden md:inline">Wow</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder={isMobile 
                ? "Type a message... (Tap Send to send)" 
                : "Type a message... (Enter to send, Shift+Enter for new line)"}
              className="w-full p-1.5 md:p-3 bg-gray-800/50 border border-purple-500/30 rounded-xl
                         text-white text-sm md:text-base placeholder-gray-400 resize-none focus:outline-none
                         focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30
                         max-h-16 md:max-h-24 min-h-[36px] md:min-h-[48px]
                         transition-all duration-300"
              rows={1}
              // Mobile-specific attributes
              autoComplete="off"
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck="true"
              inputMode="text"
              enterKeyHint={isMobile ? "enter" : "send"}
              style={{ 
                height: 'auto',
                minHeight: isMobile ? '36px' : '48px',
                // Better mobile keyboard experience
                ...(isMobile && {
                  fontSize: '16px', // Prevents zoom on iOS
                  WebkitAppearance: 'none',
                  borderRadius: '12px'
                })
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, isMobile ? 64 : 96) + 'px'
              }}
              onFocus={() => {
                // Smooth scroll to input when focused on mobile
                if (isMobile) {
                  setTimeout(() => {
                    inputRef.current?.scrollIntoView({ 
                      behavior: 'smooth', 
                      block: 'center' 
                    })
                  }, 300)
                }
              }}
            />

            {/* Emoji Picker */}
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full mb-2 right-0"
                >
                  <EmojiPicker onEmojiSelect={addEmoji} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Send Button */}
          <motion.button
            onClick={handleSendMessage}
            disabled={isLoading || (!inputMessage.trim() && !selectedImage)}
            className={`p-1.5 md:p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl
                       text-white disabled:opacity-50 disabled:cursor-not-allowed
                       hover:from-purple-500 hover:to-blue-500 transition-all
                       ${isMobile ? 'min-w-[40px] min-h-[40px] touch-manipulation' : ''}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={isMobile ? "Send message" : "Send (Enter)"}
            style={{
              // Ensure touch targets are large enough on mobile
              ...(isMobile && {
                minWidth: '40px',
                minHeight: '40px'
              })
            }}
          >
            <Send className="h-4 w-4 md:h-5 md:w-5" />
          </motion.button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
      </div>
    </motion.div>
  )
}
