import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X } from 'lucide-react'
import { ChatWindow } from './ChatWindow'
import { useChat } from '../../contexts/ChatContext'

interface FloatingChatProps {
  isHost: boolean
  currentUser: { id: string; name: string }
  roomId: string
}

export const FloatingChat: React.FC<FloatingChatProps> = ({ 
  isHost, 
  currentUser, 
  roomId 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const { unreadCount, markAsRead, isChatActive, setChatActive } = useChat()

  const handleToggle = () => {
    const newIsOpen = !isOpen
    setIsOpen(newIsOpen)
    setChatActive(newIsOpen) // Update global chat activity state
    
    if (newIsOpen) {
      markAsRead()
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setChatActive(false) // Important: Update global state when closing
  }

  return (
    <>
      {/* Floating Chat Button - Hidden when chat is open */}
      {!isOpen && (
        <motion.button
          onClick={handleToggle}
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg hover:shadow-xl 
                     transition-all duration-300 border backdrop-blur-sm
                     ${isChatActive 
                       ? 'bg-green-500 border-green-400 shadow-green-500/50' 
                       : 'bg-gradient-to-r from-purple-600 to-blue-600 border-purple-400/30'}`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          initial={{ scale: 0 }}
          animate={{ 
            scale: 1,
            boxShadow: isChatActive 
              ? "0 0 20px rgba(34, 197, 94, 0.5)" 
              : "0 10px 25px rgba(0, 0, 0, 0.3)"
          }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          style={{
            backgroundColor: isChatActive ? '#22c55e' : undefined,
            borderColor: isChatActive ? '#4ade80' : undefined
          }}
        >
        <div className="relative">
          {isOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <MessageCircle className="h-6 w-6 text-white" />
          )}
          
          {/* Unread Count Badge */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 bg-red-500 text-white text-xs 
                           rounded-full h-6 w-6 flex items-center justify-center font-bold
                           border-2 border-white shadow-lg z-10"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pulsing Ring Animation - Green when new messages */}
        <motion.div
          className={`absolute inset-0 rounded-full border-2 
                     ${unreadCount > 0 && !isOpen ? 'border-green-400' : 'border-purple-400'}`}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.7, 0, 0.7],
          }}
          transition={{
            duration: unreadCount > 0 && !isOpen ? 1.5 : 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-4 md:bottom-24 md:right-6 md:inset-auto z-40 
                       w-auto h-auto md:w-96 md:h-[500px] 
                       md:max-w-md md:max-h-[600px]"
          >
            <ChatWindow
              isHost={isHost}
              currentUser={currentUser}
              roomId={roomId}
              onClose={handleClose}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
