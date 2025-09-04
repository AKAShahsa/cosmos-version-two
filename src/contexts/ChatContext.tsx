import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase, ChatMessage, initializeChatTables, testDatabaseConnection } from '../lib/supabase'
import { geminiChat } from '../lib/gemini'

interface ChatContextType {
  messages: ChatMessage[]
  isLoading: boolean
  sendMessage: (message: string, file?: File, replyToMessage?: ChatMessage) => Promise<void>
  addReaction: (messageId: string, emoji: string) => Promise<void>
  removeReaction: (messageId: string, emoji: string) => Promise<void>
  clearChat: () => void
  unreadCount: number
  markAsRead: () => void
  refreshMessages: () => Promise<void>
  forceRefresh: () => Promise<void>
  // Typing indicator functionality
  typingUsers: string[]
  setTyping: (isTyping: boolean) => void
  // Chat activity tracking
  isChatActive: boolean
  setChatActive: (isActive: boolean) => void
  // Active users tracking
  activeUsers: string[]
  // Reaction picker state
  activeReactionPickerId: string | null
  setActiveReactionPickerId: (id: string | null) => void
  // Reply functionality
  replyToMessage: ChatMessage | null
  setReplyToMessage: (message: ChatMessage | null) => void
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
  const [isChatActive, setIsChatActiveState] = useState(false)
  const [activeChatUsers, setActiveChatUsers] = useState<string[]>([])
  const [currentUserChatOpen, setCurrentUserChatOpen] = useState(false)
  const [activeReactionPickerId, setActiveReactionPickerId] = useState<string | null>(null)
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null)

  // Cleanup effect to remove any old user IDs from active users list
  useEffect(() => {
    setActiveChatUsers(prev => prev.filter(user => 
      // Remove any UUIDs (old user IDs) and keep only actual usernames
      typeof user === 'string' && 
      !user.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    ))
  }, [])

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
  const sendMessage = useCallback(async (message: string, file?: File, replyToMessage?: ChatMessage) => {
    if (!message.trim() && !file) return

    try {
      console.log('📤 Sending message:', message)
      setIsLoading(true)

      let imageUrl = null
      let voiceUrl = null
      let voiceDuration = null

      if (file) {
        const isVoiceMessage = file.type.startsWith('audio/')
        const bucketName = isVoiceMessage ? 'voice-messages' : 'chat-images'
        const fileName = `${Date.now()}-${file.name}`
        
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, file)
        
        if (uploadError) throw uploadError
        
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName)
        
        if (isVoiceMessage) {
          voiceUrl = publicUrl
          // Extract duration from message if it's a voice message
          const durationMatch = message.match(/\((\d+:\d+)\)/)
          if (durationMatch) {
            const [minutes, seconds] = durationMatch[1].split(':').map(Number)
            voiceDuration = minutes * 60 + seconds
          }
        } else {
          imageUrl = publicUrl
        }
      }

      // Helper function to create message object with optional reply fields
      const createMessageObject = (baseMessage: any) => {
        const messageObj = { ...baseMessage }
        
        // Only add reply fields if they exist and database supports them
        if (replyToMessage) {
          try {
            messageObj.reply_to_id = replyToMessage.id
            messageObj.reply_to_message = replyToMessage.message
            messageObj.reply_to_username = replyToMessage.username
          } catch (error) {
            console.log('Reply fields not supported in database, sending without reply data')
          }
        }
        
        return messageObj
      }

      // Check for AI mention or image generation
      const isAIMessage = message.toLowerCase().includes('@ai')
      const isImageGeneration = message.toLowerCase().startsWith('@image')
      
      if (isImageGeneration) {
        // Extract the image prompt (everything after @image)
        const imagePrompt = message.substring(6).trim() // Remove '@image' and trim
        
        if (!imagePrompt) {
          // Send error message if no prompt provided
          const { error: messageError } = await supabase
            .from('chat_messages')
            .insert({
              message: "Please provide a prompt for image generation. Example: @image a cosmic cat playing guitar in space ✨",
              user_id: 'ai',
              username: 'COSMIC AI 🤖',
              room_id: roomId,
              image_url: null,
              voice_url: null,
              voice_duration: null,
              is_ai: true,
              reactions: {}
            })
          if (messageError) throw messageError
          return
        }

        // Send user's image request first
        const userMessage = createMessageObject({
          message: message,
          user_id: currentUser.id,
          username: currentUser.name,
          room_id: roomId,
          image_url: imageUrl,
          voice_url: voiceUrl,
          voice_duration: voiceDuration,
          is_ai: false,
          reactions: {}
        })

        const { error: messageError } = await supabase
          .from('chat_messages')
          .insert(userMessage)

        if (messageError) throw messageError

        // Generate image using Gemini
        try {
          console.log('🎨 Generating image with prompt:', imagePrompt)
          const imageResult = await geminiChat.generateImage(imagePrompt)
          
          if (imageResult.success && imageResult.imageData) {
            // Convert base64 to data URL for display
            const imageDataUrl = `data:image/png;base64,${imageResult.imageData}`
            
            // Send AI response with generated image
            await supabase
              .from('chat_messages')
              .insert({
                message: imageResult.caption || `Here's your cosmic creation: "${imagePrompt}" ✨🎨`,
                user_id: 'ai',
                username: 'COSMIC AI 🤖',
                room_id: roomId,
                image_url: imageDataUrl,
                voice_url: null,
                voice_duration: null,
                is_ai: true,
                reactions: {}
              })
          } else {
            // Send error message
            await supabase
              .from('chat_messages')
              .insert({
                message: `Sorry, I couldn't generate that image. ${imageResult.error || 'Please try a different prompt!'} 🎨💫`,
                user_id: 'ai',
                username: 'COSMIC AI 🤖',
                room_id: roomId,
                image_url: null,
                voice_url: null,
                voice_duration: null,
                is_ai: true,
                reactions: {}
              })
          }
        } catch (imageError) {
          console.error('Image generation error:', imageError)
          await supabase
            .from('chat_messages')
            .insert({
              message: "Oops! My cosmic paintbrush seems to be having issues. Try again in a moment! 🎨✨",
              user_id: 'ai',
              username: 'COSMIC AI 🤖',
              room_id: roomId,
              image_url: null,
              voice_url: null,
              voice_duration: null,
              is_ai: true,
              reactions: {}
            })
        }
      } else if (isAIMessage) {
        // Send user message first
        const userMessage = createMessageObject({
          message: message,
          user_id: currentUser.id,
          username: currentUser.name,
          room_id: roomId,
          image_url: imageUrl,
          is_ai: false,
          reactions: {}
        })

        const { error: messageError } = await supabase
          .from('chat_messages')
          .insert(userMessage)

        if (messageError) throw messageError

        // Generate AI response
        try {
          const aiResponse = await geminiChat.generateResponse(currentUser.name, message)
          
          // Send AI response (AI responses don't typically carry reply context)
          await supabase
            .from('chat_messages')
            .insert({
              message: aiResponse,
              user_id: 'ai',
              username: 'COSMIC AI 🤖',
              room_id: roomId,
              image_url: null,
              voice_url: null,
              voice_duration: null,
              is_ai: true,
              reactions: {}
            })
        } catch (aiError) {
          console.error('AI response error:', aiError)
        }
      } else {
        // Send regular message
        const regularMessage = createMessageObject({
          message: message,
          user_id: currentUser.id,
          username: currentUser.name,
          room_id: roomId,
          image_url: imageUrl,
          voice_url: voiceUrl,
          voice_duration: voiceDuration,
          is_ai: false,
          reactions: {}
        })

        const { error } = await supabase
          .from('chat_messages')
          .insert(regularMessage)

        if (error) throw error
      }

      // Messages will be updated via real-time subscription
      console.log('✅ Message sent successfully, waiting for real-time update...')
      
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

  // Force refresh function for manual message reload
  const forceRefresh = useCallback(async () => {
    console.log('🔄 Force refresh triggered')
    await loadMessages()
  }, [loadMessages])

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

  // Calculate global chat activity whenever local state changes
  useEffect(() => {
    const shouldBeActive = currentUserChatOpen || activeChatUsers.length > 0
    console.log(`🎯 Calculating global state: currentUser=${currentUserChatOpen}, otherUsers=${activeChatUsers.length}, result=${shouldBeActive}`)
    console.log(`📋 Active users list:`, activeChatUsers)
    setIsChatActiveState(shouldBeActive)
  }, [currentUserChatOpen, activeChatUsers])

  // Chat activity tracking function
  const setChatActive = useCallback((isActive: boolean) => {
    console.log(`🔄 setChatActive called: ${isActive} for user ${currentUser.name}`)
    
    // Track current user's chat state
    setCurrentUserChatOpen(isActive)
    
    // Broadcast chat activity to other users in real-time
    const channel = supabase.channel(`chat-activity-${roomId}`)
    channel.send({
      type: 'broadcast',
      event: 'chat_activity',
      payload: { 
        user_id: currentUser.id,
        user_name: currentUser.name,
        is_active: isActive,
        timestamp: Date.now()
      }
    })
    
    console.log(`📡 Broadcasted chat activity: ${isActive} for ${currentUser.name}`)
  }, [roomId, currentUser.id, currentUser.name])

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
            
            // Check if message is for this room
            if (newMessage.room_id === roomId) {
              // Add message immediately to local state for real-time display
              setMessages(prevMessages => {
                // Check if message already exists to avoid duplicates
                const exists = prevMessages.some(msg => msg.id === newMessage.id)
                if (exists) {
                  console.log('📝 Message already exists, skipping duplicate')
                  return prevMessages
                }
                console.log('➕ Adding new message to local state')
                // Add message and sort by created_at to maintain order
                const updatedMessages = [...prevMessages, newMessage]
                return updatedMessages.sort((a, b) => 
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                )
              })
              
              // If message is from another user, increment unread count
              if (newMessage.user_id !== currentUser.id) {
                console.log('🔔 Message from other user - incrementing unread count!')
                setUnreadCount(prev => {
                  const newCount = prev + 1
                  console.log('🔔 Unread count:', prev, '->', newCount)
                  return newCount
                })
              } else {
                console.log('✍️ Own message received via real-time')
              }
            } else {
              console.log('⏭️ Skipping message (different room)')
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
        } else if (status === 'CLOSED') {
          console.log('🔴 Subscription closed')
        }
      })

    // Fallback: If real-time isn't working, refresh messages periodically
    console.log('⚡ Setting up fallback message refresh...')
    const fallbackInterval = setInterval(() => {
      console.log('🔄 Fallback: Refreshing messages...')
      loadMessages()
    }, 3000) // Refresh every 3 seconds as fallback

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

    // Set up chat activity subscription
    const activityChannel = supabase.channel(`chat-activity-${roomId}`)
    
    activityChannel.on('broadcast', { event: 'chat_activity' }, (payload) => {
      const { user_id, user_name, is_active } = payload.payload
      
      console.log(`📡 Received chat activity from ${user_name}: ${is_active}`)
      
      // Don't process our own activity updates
      if (user_id === currentUser.id) {
        console.log(`⏭️ Ignoring own activity update`)
        return
      }
      
      // Update the list of active users (other users only)
      setActiveChatUsers(prev => {
        let newList
        if (is_active) {
          // Add user name to active list (not user_id)
          newList = prev.includes(user_name) ? prev : [...prev, user_name]
          console.log(`➕ Added ${user_name} to active list:`, newList)
        } else {
          // Remove user name from active list
          newList = prev.filter(name => name !== user_name)
          console.log(`➖ Removed ${user_name} from active list:`, newList)
        }
        return newList
      })
    })
    
    activityChannel.subscribe()

    return () => {
      console.log('🧹 Cleaning up subscriptions for room:', roomId)
      subscription.unsubscribe()
      typingChannel.unsubscribe()
      activityChannel.unsubscribe()
      clearInterval(fallbackInterval)
      console.log('🧹 Fallback interval cleared')
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
    forceRefresh,
    typingUsers,
    setTyping,
    isChatActive,
    setChatActive,
    activeUsers: [...activeChatUsers.filter(user => 
      // Filter out UUIDs (user IDs) and only keep actual usernames
      typeof user === 'string' && 
      !user.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) &&
      user !== currentUser.name // Don't duplicate current user
    ), currentUser.name], // Include current user and active chat users
    activeReactionPickerId,
    setActiveReactionPickerId,
    replyToMessage,
    setReplyToMessage
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}
