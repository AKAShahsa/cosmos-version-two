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

  // Load messages function
  const loadMessages = useCallback(async () => {
    try {
      console.log('🔄 Loading messages for room:', roomId)
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100) // Load last 100 messages

      if (error) {
        console.error('❌ Error loading messages:', error)
        throw error
      }
      
      console.log('✅ Loaded messages:', data?.length || 0, 'messages')
      console.log('📋 Messages data:', data)
      setMessages(data || [])
      
    } catch (error) {
      console.error('❌ Error loading messages:', error)
      alert('Failed to load chat messages. Please check if Supabase database is set up correctly.')
    }
  }, [roomId])

  // Initialize chat and set room context
  useEffect(() => {
    console.log('🚀 ChatProvider initializing for room:', roomId, 'user:', currentUser.name)
    
    // First test the database connection and show what's in there
    testDatabaseConnection().then(result => {
      console.log('🧪 Database test result:', result)
      
      if (result.success) {
        console.log('✅ Database test passed, loading messages...')
        // Load messages immediately since database is working
        loadMessages()
        
        // Also initialize tables (this might be redundant but ensures they exist)
        initializeChatTables().then(success => {
          if (success) {
            console.log('✅ Database tables verified')
          }
        })
      } else {
        console.error('❌ Database test failed:', result.error)
        alert(`Database connection failed: ${result.error}`)
      }
    })
    
    geminiChat.setCurrentRoom(roomId)
    
    // Set up real-time subscription
    console.log('🔄 Setting up real-time subscription for room:', roomId)
    
    const subscription = supabase
      .channel(`chat-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('📨 Real-time update received:', payload.eventType, payload)
          
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as ChatMessage
            console.log('➕ Adding new message:', newMessage)
            setMessages(prev => {
              // Check if message already exists to avoid duplicates
              const exists = prev.some(msg => msg.id === newMessage.id)
              if (exists) {
                console.log('⚠️ Message already exists, skipping duplicate')
                return prev
              }
              return [...prev, newMessage]
            })
            
            // Increment unread count if not from current user
            if (newMessage.user_id !== currentUser.id) {
              setUnreadCount(prev => prev + 1)
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMessage = payload.new as ChatMessage
            console.log('✏️ Updating message:', updatedMessage)
            setMessages(prev => 
              prev.map(msg => 
                msg.id === updatedMessage.id ? updatedMessage : msg
              )
            )
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to real-time updates')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Subscription channel error')
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Subscription timed out')
        } else if (status === 'CLOSED') {
          console.log('🔒 Subscription closed')
        }
      })

    // Cleanup function
    return () => {
      console.log('🔌 Cleaning up subscription for room:', roomId)
      subscription.unsubscribe()
    }
  }, [roomId, currentUser.id, loadMessages])

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${roomId}/${Date.now()}-${Math.random()}.${fileExt}`
    
    const { error } = await supabase.storage
      .from('chat-images')
      .upload(fileName, file)

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName)

    return publicUrl
  }

  const sendMessage = useCallback(async (message: string, imageFile?: File) => {
    if (!message.trim() && !imageFile) return

    console.log('📤 Sending message:', { message, hasImage: !!imageFile, roomId, user: currentUser.name })
    
    setIsLoading(true)
    try {
      let imageUrl: string | undefined

      // Upload image if provided
      if (imageFile) {
        console.log('🖼️ Uploading image...')
        imageUrl = await uploadImage(imageFile)
        console.log('✅ Image uploaded:', imageUrl)
      }

      // Check if this is an AI mention
      const isAiMention = /@(ai|AI|Ai)\b/.test(message)
      
      if (isAiMention) {
        console.log('🤖 AI mention detected, sending user message first...')
        // Send user message first
        const userMessage: Omit<ChatMessage, 'id' | 'created_at' | 'updated_at'> = {
          room_id: roomId,
          user_id: currentUser.id,
          username: currentUser.name,
          message: message.trim(),
          image_url: imageUrl,
          is_ai: false,
          reactions: {}
        }

        const { data: userMessageData, error: userError } = await supabase
          .from('chat_messages')
          .insert([userMessage])
          .select()

        if (userError) {
          console.error('❌ Error sending user message:', userError)
          throw userError
        }
        
        console.log('✅ User message sent:', userMessageData)

        // Generate AI response
        console.log('🤖 Generating AI response...')
        const cleanMessage = message.replace(/@(ai|AI|Ai)\s*/g, '').trim()
        const aiResponse = await geminiChat.generateResponse(currentUser.name, cleanMessage)
        console.log('✅ AI response generated:', aiResponse)

        // Send AI message
        const aiMessage: Omit<ChatMessage, 'id' | 'created_at' | 'updated_at'> = {
          room_id: roomId,
          user_id: 'cosmic-ai',
          username: 'COSMIC AI 🤖',
          message: aiResponse,
          is_ai: true,
          reactions: {}
        }

        const { data: aiMessageData, error: aiError } = await supabase
          .from('chat_messages')
          .insert([aiMessage])
          .select()

        if (aiError) {
          console.error('❌ Error sending AI message:', aiError)
          throw aiError
        }
        
        console.log('✅ AI message sent:', aiMessageData)
      } else {
        console.log('💬 Sending regular user message...')
        // Regular user message
        const newMessage: Omit<ChatMessage, 'id' | 'created_at' | 'updated_at'> = {
          room_id: roomId,
          user_id: currentUser.id,
          username: currentUser.name,
          message: message.trim(),
          image_url: imageUrl,
          is_ai: false,
          reactions: {}
        }

        const { data: messageData, error } = await supabase
          .from('chat_messages')
          .insert([newMessage])
          .select()

        if (error) {
          console.error('❌ Error sending message:', error)
          throw error
        }
        
        console.log('✅ Message sent successfully:', messageData)

        // Add to Gemini context even if not mentioning AI
        geminiChat.addUserMessage(currentUser.name, message.trim())
      }
    } catch (error) {
      console.error('❌ Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [roomId, currentUser])

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      // Get current message
      const { data: message, error: fetchError } = await supabase
        .from('chat_messages')
        .select('reactions')
        .eq('id', messageId)
        .single()

      if (fetchError) throw fetchError

      const currentReactions = message.reactions || {}
      const emojiReactions = currentReactions[emoji] || []
      
      if (!emojiReactions.includes(currentUser.id)) {
        emojiReactions.push(currentUser.id)
        currentReactions[emoji] = emojiReactions

        const { error } = await supabase
          .from('chat_messages')
          .update({ reactions: currentReactions })
          .eq('id', messageId)

        if (error) throw error
      }
    } catch (error) {
      console.error('Error adding reaction:', error)
    }
  }, [currentUser.id])

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      // Get current message
      const { data: message, error: fetchError } = await supabase
        .from('chat_messages')
        .select('reactions')
        .eq('id', messageId)
        .single()

      if (fetchError) throw fetchError

      const currentReactions = message.reactions || {}
      const emojiReactions = currentReactions[emoji] || []
      
      const updatedReactions = emojiReactions.filter(userId => userId !== currentUser.id)
      
      if (updatedReactions.length === 0) {
        delete currentReactions[emoji]
      } else {
        currentReactions[emoji] = updatedReactions
      }

      const { error } = await supabase
        .from('chat_messages')
        .update({ reactions: currentReactions })
        .eq('id', messageId)

      if (error) throw error
    } catch (error) {
      console.error('Error removing reaction:', error)
    }
  }, [currentUser.id])

  const clearChat = useCallback(() => {
    setMessages([])
    setUnreadCount(0)
  }, [])

  const markAsRead = useCallback(() => {
    setUnreadCount(0)
  }, [])

  const value: ChatContextType = {
    messages,
    isLoading,
    sendMessage,
    addReaction,
    removeReaction,
    clearChat,
    unreadCount,
    markAsRead
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}
