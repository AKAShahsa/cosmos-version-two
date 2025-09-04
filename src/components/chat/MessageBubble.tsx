import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { Smile, Crown, Bot, Heart, ThumbsUp, Laugh, Angry, Frown, Reply, Play, Pause, Mic } from 'lucide-react'
import { useChat } from '../../contexts/ChatContext'
import { ChatMessage } from '../../lib/supabase'

interface MessageBubbleProps {
  message: ChatMessage
  currentUserId: string
}

const reactionEmojis = [
  { emoji: '❤️', icon: Heart, color: 'text-red-400' },
  { emoji: '👍', icon: ThumbsUp, color: 'text-blue-400' },
  { emoji: '😂', icon: Laugh, color: 'text-yellow-400' },
  { emoji: '😢', icon: Frown, color: 'text-blue-300' },
  { emoji: '😡', icon: Angry, color: 'text-red-500' },
]

// Voice Message Player Component for MessageBubble
interface VoiceMessagePlayerProps {
  voiceUrl: string
  duration?: number
}

const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({ voiceUrl, duration = 0 }) => {
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-purple-500/20 mb-2">
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
        <div className="absolute inset-0 bg-purple-400/20 rounded-full animate-pulse" />
        <Mic className="h-4 w-4 text-purple-400 relative z-10" />
      </motion.div>

      <motion.button
        onClick={togglePlay}
        className="flex items-center justify-center w-8 h-8 bg-purple-500 hover:bg-purple-400 
                   text-white rounded-full transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3 ml-0.5" />
        )}
      </motion.button>

      <div className="flex-1">
        <div 
          ref={progressRef}
          onClick={handleProgressClick}
          className="h-2 bg-gray-700 rounded-full cursor-pointer overflow-hidden mb-1"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-purple-400 to-blue-400 rounded-full relative"
            style={{ width: `${progress}%` }}
            layout
          >
            <motion.div
              className="absolute right-0 top-0 w-3 h-3 bg-white rounded-full -mt-0.5 -mr-1.5 shadow-lg"
              animate={{ 
                boxShadow: isPlaying 
                  ? "0 0 0 0 rgba(168, 85, 247, 0.7), 0 0 0 10px rgba(168, 85, 247, 0)"
                  : "0 0 0 0 rgba(168, 85, 247, 0.7), 0 0 0 0 rgba(168, 85, 247, 0)"
              }}
              transition={{ duration: 1.5, repeat: isPlaying ? Infinity : 0 }}
            />
          </motion.div>
        </div>
        
        {/* Waveform Effect */}
        <div className="flex items-center gap-0.5 h-3">
          {[...Array(15)].map((_, i) => {
            const isActive = (i / 15) * 100 < progress
            return (
              <motion.div
                key={i}
                className={`w-0.5 rounded-full transition-colors duration-200 ${
                  isActive ? 'bg-purple-400' : 'bg-gray-600'
                }`}
                animate={{ 
                  height: isPlaying ? [6, 10, 4, 12, 8] : 6,
                  opacity: isActive ? 1 : 0.3
                }}
                transition={{ 
                  duration: 0.4,
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
        {formatTime(currentTime)} / {formatTime(actualDuration)}
      </div>

      <audio
        ref={audioRef}
        src={voiceUrl}
        preload="metadata"
      />
    </div>
  )
}

export const MessageBubble = React.forwardRef<HTMLDivElement, MessageBubbleProps>(({ 
  message, 
  currentUserId
}, ref) => {
  const { addReaction, removeReaction, activeReactionPickerId, setActiveReactionPickerId, setReplyToMessage } = useChat()
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [swipeX, setSwipeX] = useState(0)
  const [showReplyIcon, setShowReplyIcon] = useState(false)
  
  const isOwn = message.user_id === currentUserId
  const isAI = message.is_ai

  // Check if this message's reactions are showing
  const showReactions = activeReactionPickerId === message.id

  // Detect if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  const handleReaction = async (emoji: string) => {
    const existingReactions = message.reactions[emoji] || []
    const hasReacted = existingReactions.includes(currentUserId)
    
    if (hasReacted) {
      await removeReaction(message.id, emoji)
    } else {
      await addReaction(message.id, emoji)
    }
    // Always close reactions after selection on mobile
    if (isMobile) {
      setActiveReactionPickerId(null)
    }
  }

  // Long press handlers for mobile
  const handleTouchStart = () => {
    if (!isMobile) return
    
    const timer = setTimeout(() => {
      setActiveReactionPickerId(message.id)
    }, 800) // Reduced to 0.8 seconds for better UX
    
    setLongPressTimer(timer)
  }

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  // Swipe handlers for reply
  const handlePan = (event: any, info: { offset: { x: number } }) => {
    const maxSwipe = 60
    const clampedX = Math.max(0, Math.min(maxSwipe, info.offset.x))
    setSwipeX(clampedX)
    setShowReplyIcon(clampedX > 20)
  }

  const handlePanEnd = (event: any, info: { offset: { x: number } }) => {
    if (info.offset.x > 40) {
      // Trigger reply
      setReplyToMessage(message)
      setShowReplyIcon(false)
    }
    // Reset swipe position
    setSwipeX(0)
    setShowReplyIcon(false)
  }

  // Close reactions when clicking outside on mobile
  React.useEffect(() => {
    if (!isMobile || !showReactions) return

    const handleClickOutside = (event: TouchEvent) => {
      const target = event.target as Element
      // Don't close if clicking on a reaction button
      if (target.closest('.reaction-picker') || target.closest('.reaction-button')) {
        return
      }
      setActiveReactionPickerId(null)
    }

    // Small delay to avoid immediate closing
    const timer = setTimeout(() => {
      document.addEventListener('touchstart', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isMobile, showReactions])

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`relative flex ${isOwn ? 'justify-end' : 'justify-start'} group z-10`}
    >
      <div className={`max-w-[85%] md:max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* Message Header */}
        {!isOwn && (
          <div className="flex items-center gap-1 mb-1 px-1">
            {isAI && <Bot className="h-3 w-3 text-purple-400" />}
            <span className={`text-xs font-medium ${
              isAI ? 'text-purple-400' : 'text-gray-400'
            }`}>
              {message.username}
            </span>
            {message.username !== 'COSMIC AI 🤖' && message.user_id !== currentUserId && (
              <Crown className="h-3 w-3 text-yellow-400" />
            )}
          </div>
        )}

        {/* Swipe Container */}
        <motion.div
          className="relative"
          drag="x"
          dragConstraints={{ left: 0, right: 60 }}
          dragElastic={0.2}
          onPan={handlePan}
          onPanEnd={handlePanEnd}
          animate={{ x: swipeX }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Reply Icon */}
          <AnimatePresence>
            {showReplyIcon && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute left-[-40px] top-1/2 transform -translate-y-1/2 z-10"
              >
                <div className="bg-purple-600 rounded-full p-2">
                  <Reply className="h-4 w-4 text-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reply To Display */}
          {message.reply_to_message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-2 p-2 rounded-lg border-l-4 ${
                isOwn ? 'border-purple-300 bg-purple-900/30' : 'border-gray-400 bg-gray-700/50'
              }`}
            >
              <div className="text-xs text-gray-400 font-medium mb-1">
                {message.reply_to_username}
              </div>
              <div className="text-xs text-gray-300 truncate">
                {message.reply_to_message}
              </div>
            </motion.div>
          )}

          {/* Message Bubble */}
          <motion.div
            className={`relative rounded-2xl p-2 md:p-3 max-w-full break-words ${
              isOwn
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                : isAI
                ? 'bg-gradient-to-r from-purple-900/60 to-blue-900/60 border border-purple-500/30'
                : 'bg-gray-800/80 text-white'
            } ${
              isOwn
                ? 'rounded-br-sm'
                : 'rounded-bl-sm'
            }`}
            whileHover={{ scale: 1.02 }}
            // Desktop: show on hover
            onHoverStart={() => !isMobile && setActiveReactionPickerId(message.id)}
            onHoverEnd={() => !isMobile && setActiveReactionPickerId(null)}
            // Mobile: long press
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
          {/* Message Content */}
          {message.image_url && (
            <motion.img
              src={message.image_url}
              alt="Shared image"
              className="rounded-lg mb-2 max-w-full h-auto cursor-pointer"
              whileHover={{ scale: 1.05 }}
              onClick={() => window.open(message.image_url, '_blank')}
            />
          )}

          {/* Voice Message */}
          {message.voice_url && (
            <VoiceMessagePlayer 
              voiceUrl={message.voice_url}
              duration={message.voice_duration}
            />
          )}
          
          {message.message && (
            <p className={`text-sm md:text-base leading-relaxed ${
              isAI ? 'text-white font-medium' : ''
            }`}>
              {message.message}
            </p>
          )}

          {/* AI Badge */}
          {isAI && (
            <motion.div
              className="absolute -top-2 -left-2 bg-purple-600 rounded-full p-1"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Bot className="h-3 w-3 text-white" />
            </motion.div>
          )}

          {/* Timestamp */}
          <div className={`text-xs mt-1 ${
            isOwn ? 'text-purple-200' : 'text-gray-400'
          }`}>
            {formatTime(message.created_at)}
          </div>
        </motion.div>

        {/* Reactions Display */}
        <AnimatePresence>
          {Object.keys(message.reactions).length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                transition: {
                  type: "spring",
                  stiffness: 300,
                  damping: 25
                }
              }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              className="flex flex-wrap gap-2 mt-3 px-1 relative z-20"
            >
              {Object.entries(message.reactions).map(([emoji, userIds], index) => (
                userIds.length > 0 && (
                  <motion.button
                    key={emoji}
                    initial={{ 
                      opacity: 0, 
                      scale: 0.3,
                      x: -20
                    }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      x: 0,
                      transition: {
                        delay: index * 0.1,
                        type: "spring",
                        stiffness: 400,
                        damping: 25
                      }
                    }}
                    exit={{ 
                      opacity: 0, 
                      scale: 0.3,
                      x: -20,
                      transition: { duration: 0.2 }
                    }}
                    onClick={() => handleReaction(emoji)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium
                               transition-all duration-300 hover:scale-110 group relative overflow-hidden
                               ${userIds.includes(currentUserId)
                        ? 'bg-gradient-to-r from-purple-600/60 to-blue-600/60 text-purple-100 border border-purple-400/60 shadow-lg shadow-purple-500/25'
                        : 'bg-gradient-to-r from-gray-700/60 to-gray-800/60 text-gray-300 border border-gray-600/40 hover:from-gray-600/60 hover:to-gray-700/60'
                    }`}
                    whileHover={{ 
                      scale: 1.15,
                      y: -2,
                      transition: { duration: 0.2 }
                    }}
                    whileTap={{ 
                      scale: 0.95,
                      transition: { duration: 0.1 }
                    }}
                  >
                    {/* Shimmer effect for active reactions */}
                    {userIds.includes(currentUserId) && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{
                          x: ['-100%', '100%']
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      />
                    )}
                    
                    <span className="text-sm relative z-10">{emoji}</span>
                    <span className="relative z-10 font-bold">{userIds.length}</span>
                  </motion.button>
                )
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reaction Picker */}
        <AnimatePresence>
          {showReactions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.3, y: 20, rotateX: -15 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0, 
                rotateX: 0,
                transition: {
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  mass: 0.8
                }
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.3, 
                y: 20, 
                rotateX: -15,
                transition: {
                  duration: 0.2,
                  ease: "easeInOut"
                }
              }}
              className={`reaction-picker absolute z-50 flex gap-2 p-3 
                         bg-gradient-to-br from-gray-800/95 via-gray-900/95 to-black/95 
                         backdrop-blur-xl border border-purple-400/40 rounded-2xl 
                         shadow-2xl shadow-purple-500/20 ${
                isOwn ? 'right-0' : 'left-0'
              }`}
              style={{
                bottom: '100%',
                marginBottom: '12px',
                background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.1), rgba(67, 56, 202, 0.1), rgba(0, 0, 0, 0.8))',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(147, 51, 234, 0.3)',
                boxShadow: '0 20px 40px rgba(147, 51, 234, 0.2), 0 0 60px rgba(147, 51, 234, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}
            >
              {reactionEmojis.map(({ emoji, icon: Icon, color }, index) => (
                <motion.button
                  key={emoji}
                  initial={{ 
                    opacity: 0, 
                    scale: 0.3, 
                    y: 10,
                    rotateZ: -180
                  }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    y: 0,
                    rotateZ: 0,
                    transition: {
                      delay: index * 0.1,
                      type: "spring",
                      stiffness: 500,
                      damping: 20
                    }
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.3,
                    y: 10,
                    rotateZ: 180,
                    transition: {
                      delay: (reactionEmojis.length - index - 1) * 0.05,
                      duration: 0.15
                    }
                  }}
                  onClick={() => handleReaction(emoji)}
                  className={`reaction-button relative p-3 rounded-xl 
                             bg-gradient-to-br from-gray-700/50 to-gray-800/50
                             hover:from-purple-600/30 hover:to-blue-600/30
                             border border-gray-600/30 hover:border-purple-400/50
                             transition-all duration-300 group overflow-hidden ${color}`}
                  whileHover={{ 
                    scale: 1.3,
                    y: -5,
                    rotateZ: [0, -5, 5, 0],
                    transition: {
                      scale: { duration: 0.2 },
                      y: { duration: 0.2 },
                      rotateZ: { duration: 0.6, repeat: Infinity }
                    }
                  }}
                  whileTap={{ 
                    scale: 0.9,
                    y: 2,
                    transition: { duration: 0.1 }
                  }}
                  title={`React with ${emoji}`}
                >
                  {/* Magical glow effect */}
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-400/20 to-blue-400/20 opacity-0 group-hover:opacity-100"
                    animate={{
                      background: [
                        'radial-gradient(circle at 0% 0%, rgba(147, 51, 234, 0.2), transparent)',
                        'radial-gradient(circle at 100% 100%, rgba(59, 130, 246, 0.2), transparent)',
                        'radial-gradient(circle at 0% 100%, rgba(147, 51, 234, 0.2), transparent)',
                        'radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.2), transparent)',
                      ]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                  
                  {/* Icon with micro animations */}
                  <motion.div
                    whileHover={{
                      rotateY: 360,
                      transition: { duration: 0.6 }
                    }}
                  >
                    <Icon className="h-5 w-5 relative z-10 drop-shadow-lg" />
                  </motion.div>
                  
                  {/* Sparkle effects */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                  >
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full"
                        style={{
                          left: `${20 + i * 25}%`,
                          top: `${15 + i * 10}%`,
                        }}
                        animate={{
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </motion.div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        </motion.div>
      </div>

      {/* Quick Reaction Button - Hidden on mobile */}
      {!isMobile && (
        <motion.button
          className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full
                     hover:bg-purple-500/20 ${isOwn ? 'order-1 mr-2' : 'order-2 ml-2'}`}
          onClick={() => setActiveReactionPickerId(showReactions ? null : message.id)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Smile className="h-4 w-4 text-purple-400" />
        </motion.button>
      )}
    </motion.div>
  )
})

MessageBubble.displayName = 'MessageBubble'
