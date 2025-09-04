import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase, ChatMessage, initializeChatTables, testDatabaseConnection } from '../lib/supabase'
import { geminiChat } from '../lib/gemini'

interface ChatContextType {
  messages: ChatMessage[]
  isLoading: boolean
  sendMessage: (message: string, imageFile?: File) => Promise<void>
  addReaction: (messageId: string, emoji: string) => Promise<void>
  removeReaction: (messageId: string, emoji: string) => Promise<void>
  clearChat: () => void
  unreadCount: number
  markAsRead: () => void
  refreshMessages: () => Promise<void>
  // Typing indicator functionality
  typingUsers: string[]
  setTyping: (isTyping: boolean) => void
  // DEBUG: Test function
  testIncrementUnread: () => void
}

const ChatContext = createContext<ChatContextType | null>(null)

export const useChat = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}

interface ChatProviderProps {
  children: React.ReactNode
  roomId: string
  currentUser: { id: string; name: string }
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ 
  children, 
  roomId, 
  currentUser 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)

  // Load messages function
  const loadMessages = useCallback(async () => {
    try {
      console.log('🔄 Loading messages for room:', roomId)
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      console.log('✅ Loaded messages:', data?.length || 0, 'messages')
      setMessages(data || [])
      
    } catch (error) {
      console.error('❌ Error loading messages:', error)
    }
  }, [roomId])

  // Send message function
  const sendMessage = useCallback(async (message: string, imageFile?: File) => {
    if (!message.trim() && !imageFile) return

    try {
      console.log('📤 Sending message:', message)
      setIsLoading(true)

      let imageUrl = null
      if (imageFile) {
        const fileName = `${Date.now()}-${imageFile.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-images')
          .upload(fileName, imageFile)
        
        if (uploadError) throw uploadError
        
        const { data: { publicUrl } } = supabase.storage
          .from('chat-images')
          .getPublicUrl(fileName)
        
        imageUrl = publicUrl
      }

      // Check for AI mention
      const isAIMessage = message.toLowerCase().includes('@ai')
      
      if (isAIMessage) {
        // Send user message first
        const { error: messageError } = await supabase
          .from('chat_messages')
          .insert({
            content: message,
            user_id: currentUser.id,
            username: currentUser.name,
            room_id: roomId,
            image_url: imageUrl,
            is_ai: false,
            reactions: {}
          })

        if (messageError) throw messageError

        // Generate AI response
        try {
          const aiResponse = await geminiChat.generateResponse(currentUser.name, message, roomId)
          
          // Send AI response
          await supabase
            .from('chat_messages')
            .insert({
              content: aiResponse,
              user_id: 'ai',
              username: 'COSMIC AI 🤖',
              room_id: roomId,
              image_url: null,
              is_ai: true,
              reactions: {}
            })
        } catch (aiError) {
          console.error('AI response error:', aiError)
        }
      } else {
        // Send regular message
        const { error } = await supabase
          .from('chat_messages')
          .insert({
            content: message,
            user_id: currentUser.id,
            username: currentUser.name,
            room_id: roomId,
            image_url: imageUrl,
            is_ai: false,
            reactions: {}
          })

        if (error) throw error
      }

      // Refresh messages to show the new ones
      await loadMessages()
      
    } catch (error) {
      console.error('❌ Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, roomId, loadMessages])

  // Reaction functions
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      const message = messages.find(m => m.id === messageId)
      if (!message) return

      const currentReactions = message.reactions[emoji] || []
      if (currentReactions.includes(currentUser.id)) return

      const updatedReactions = {
        ...message.reactions,
        [emoji]: [...currentReactions, currentUser.id]
      }

      const { error } = await supabase
        .from('chat_messages')
        .update({ reactions: updatedReactions })
        .eq('id', messageId)

      if (error) throw error
      await loadMessages()
    } catch (error) {
      console.error('Error adding reaction:', error)
    }
  }, [messages, currentUser.id, loadMessages])

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      const message = messages.find(m => m.id === messageId)
      if (!message) return

      const currentReactions = message.reactions[emoji] || []
      const updatedReactions = {
        ...message.reactions,
        [emoji]: currentReactions.filter(id => id !== currentUser.id)
      }

      if (updatedReactions[emoji].length === 0) {
        delete updatedReactions[emoji]
      }

      const { error } = await supabase
        .from('chat_messages')
        .update({ reactions: updatedReactions })
        .eq('id', messageId)

      if (error) throw error
      await loadMessages()
    } catch (error) {
      console.error('Error removing reaction:', error)
    }
  }, [messages, currentUser.id, loadMessages])

  const clearChat = useCallback(() => {
    setMessages([])
    setUnreadCount(0)
  }, [])

  const markAsRead = useCallback(() => {
    console.log('📖 markAsRead called - clearing unread count')
    setUnreadCount(0)
  }, [])

  // Typing indicator functionality
  const setTyping = useCallback((isTyping: boolean) => {
    if (isTyping) {
      if (typingTimeout) {
        clearTimeout(typingTimeout)
      }
      
      const channel = supabase.channel(`typing-${roomId}`)
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { 
          user: currentUser.name, 
          isTyping: true,
          timestamp: Date.now()
        }
      })
      
      const timeout = setTimeout(() => {
        channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: { 
            user: currentUser.name, 
            isTyping: false,
            timestamp: Date.now()
          }
        })
      }, 3000)
      
      setTypingTimeout(timeout)
    } else {
      if (typingTimeout) {
        clearTimeout(typingTimeout)
        setTypingTimeout(null)
      }
      
      const channel = supabase.channel(`typing-${roomId}`)
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { 
          user: currentUser.name, 
          isTyping: false,
          timestamp: Date.now()
        }
      })
    }
  }, [roomId, currentUser.name, typingTimeout])

  // DEBUG: Test function to manually increment unread count
  const testIncrementUnread = useCallback(() => {
    console.log('🧪 TEST: Manually incrementing unread count')
    setUnreadCount(prev => {
      const newCount = prev + 1
      console.log('🧪 TEST: Unread count changed from', prev, 'to', newCount)
      return newCount
    })
  }, [])

  // Initialize chat and set room context
  useEffect(() => {
    console.log('🚀 ChatProvider initializing for room:', roomId, 'user:', currentUser.name)
    
    testDatabaseConnection().then(result => {
      console.log('🧪 Database test result:', result)
      
      if (result.success) {
        console.log('✅ Database connection successful')
        loadMessages()
      } else {
        console.error('❌ Database connection failed')
        initializeChatTables().then(() => {
          console.log('🔧 Tables initialized, loading messages...')
          loadMessages()
        })
      }
    })
    
    geminiChat.setCurrentRoom(roomId)
    
    // Set up real-time subscription
    console.log('🔄 Setting up real-time subscription for room:', roomId)
    
    const subscription = supabase
      .channel(`chat-room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          console.log('🚨 REAL-TIME EVENT RECEIVED! 🚨')
          console.log('📨 Event type:', payload.eventType)
          console.log('📨 Payload:', payload)
          
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as ChatMessage
            console.log('➕ New message room_id:', newMessage.room_id, 'current room:', roomId)
            console.log('➕ Message user_id:', newMessage.user_id, 'current user:', currentUser.id)
            
            // Check if message is for this room and from another user
            if (newMessage.room_id === roomId && newMessage.user_id !== currentUser.id) {
              console.log('🔔 Message from other user - incrementing unread count!')
              setUnreadCount(prev => {
                const newCount = prev + 1
                console.log('🔔 Unread count:', prev, '->', newCount)
                return newCount
              })
              // Refresh messages to show the new message
              loadMessages()
            } else {
              console.log('⏭️ Skipping notification (own message or different room)')
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to real-time updates')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Subscription error')
        }
      })

    // Set up typing indicator subscription
    const typingChannel = supabase.channel(`typing-${roomId}`)
    
    typingChannel.on('broadcast', { event: 'typing' }, (payload) => {
      const { user, isTyping } = payload.payload
      
      if (user === currentUser.name) return
      
      setTypingUsers(prev => {
        if (isTyping) {
          return prev.includes(user) ? prev : [...prev, user]
        } else {
          return prev.filter(u => u !== user)
        }
      })
    })
    
    typingChannel.subscribe()

    return () => {
      console.log('🧹 Cleaning up subscriptions for room:', roomId)
      subscription.unsubscribe()
      typingChannel.unsubscribe()
    }
  }, [roomId, currentUser.id, currentUser.name, loadMessages])

  const value: ChatContextType = {
    messages,
    isLoading,
    sendMessage,
    addReaction,
    removeReaction,
    clearChat,
    unreadCount,
    markAsRead,
    refreshMessages: loadMessages,
    typingUsers,
    setTyping,
    testIncrementUnread
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}
