import React, { useState } from 'react'
import { ChatWindow } from '../chat/ChatWindow'
import { MessageCircle, X } from 'lucide-react'
import { useChat } from '../../contexts/ChatContext'

interface ChatSheetProps {
  isHost: boolean
  currentUser: { id: string; name: string }
  roomId: string
  children?: React.ReactNode
}

export const ChatSheet: React.FC<ChatSheetProps> = ({ 
  isHost, 
  currentUser, 
  roomId, 
  children 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const { unreadCount, markAsRead } = useChat()

  const handleOpen = () => {
    setIsOpen(true)
    markAsRead()
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={handleOpen}
        className="relative p-2 rounded-full bg-background border shadow-sm hover:bg-accent"
      >
        {children || <MessageCircle className="h-5 w-5" />}
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md h-[600px] max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Chat</h2>
              <button 
                onClick={handleClose}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Chat Window */}
            <div className="flex-1 overflow-hidden">
              <ChatWindow 
                isHost={isHost}
                currentUser={currentUser}
                roomId={roomId}
                onClose={handleClose}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
