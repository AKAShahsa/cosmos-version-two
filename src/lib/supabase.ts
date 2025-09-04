import { createClient } from '@supabase/supabase-js'

// Access environment variables properly for Vite
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://mrkkrwapoyskgazdlunm.supabase.co'
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ya2tyd2Fwb3lza2dhemRsdW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MTQzMDUsImV4cCI6MjA3MTA5MDMwNX0.l1UjmkWwom6eyjivpyiKCk3lYKl4QfZzkp8p4iJVcOI'

console.log('🔧 Supabase URL:', supabaseUrl)
console.log('🔧 Supabase Key:', supabaseAnonKey ? 'Present' : 'Missing')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database schema types
export interface ChatMessage {
  id: string
  room_id: string
  user_id: string
  username: string
  message: string
  image_url?: string
  voice_url?: string
  voice_duration?: number // Duration in seconds
  is_ai: boolean
  reactions: Record<string, string[]> // { emoji: [user_ids] }
  reply_to_id?: string // ID of the message being replied to
  reply_to_message?: string // Content of the message being replied to
  reply_to_username?: string // Username of the original message author
  created_at: string
  updated_at: string
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

// Test database connection and structure
export const testDatabaseConnection = async () => {
  try {
    console.log('🧪 Testing database connection...')
    
    // Test 1: Check if we can connect to Supabase
    const { error: dbError } = await supabase
      .from('chat_messages')
      .select('*')
      .limit(1)
    
    if (dbError) {
      console.error('❌ Database connection failed:', dbError)
      return { success: false, error: dbError.message }
    }
    
    console.log('✅ Database connection successful')
    
    // Test 2: Check all messages in database
    const { data: allMessages, error: allError } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (allError) {
      console.error('❌ Error fetching all messages:', allError)
      return { success: false, error: allError.message }
    }
    
    console.log('📊 Total messages in database:', allMessages?.length || 0)
    console.log('📋 All messages:', allMessages)
    
    return { 
      success: true, 
      totalMessages: allMessages?.length || 0,
      messages: allMessages 
    }
  } catch (error) {
    console.error('❌ Database test failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

// Initialize chat tables if they don't exist
export const initializeChatTables = async () => {
  try {
    console.log('🔄 Testing Supabase connection...')
    console.log('Supabase URL:', supabaseUrl)
    console.log('Supabase Key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...')
    
    // Test connection by trying to read from a system table
    const { error: testError } = await supabase
      .from('chat_messages')
      .select('count', { count: 'exact', head: true })
      .limit(1)

    if (testError) {
      console.error('❌ Supabase connection test failed:', testError)
      if (testError.message.includes('relation "chat_messages" does not exist')) {
        console.log('💡 Tables not created yet. Please run the SQL schema in Supabase dashboard.')
        
        // Provide the complete SQL schema for user to run
        const sqlSchema = `
-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  is_ai BOOLEAN DEFAULT FALSE,
  reactions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message Reactions Table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_messages
CREATE POLICY "Allow read access to chat_messages" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Allow insert access to chat_messages" ON chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to chat_messages" ON chat_messages FOR UPDATE USING (true);
CREATE POLICY "Allow delete access to chat_messages" ON chat_messages FOR DELETE USING (true);

-- Create policies for message_reactions
CREATE POLICY "Allow read access to message_reactions" ON message_reactions FOR SELECT USING (true);
CREATE POLICY "Allow insert access to message_reactions" ON message_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update access to message_reactions" ON message_reactions FOR UPDATE USING (true);
CREATE POLICY "Allow delete access to message_reactions" ON message_reactions FOR DELETE USING (true);

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', true) ON CONFLICT DO NOTHING;

-- Create storage policy
CREATE POLICY "Allow public access to chat images" ON storage.objects FOR SELECT USING (bucket_id = 'chat-images');
CREATE POLICY "Allow authenticated uploads to chat images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-images');
`
        
        console.log('📋 Please run this SQL schema in your Supabase SQL editor:')
        console.log(sqlSchema)
        
        alert(`Database tables not found! Please go to your Supabase dashboard > SQL Editor and run the schema.\n\nTable should have a 'message' column for storing chat messages.`)
      }
      return false
    }

    console.log('✅ Supabase connection successful')
    console.log('✅ Chat database initialized')
    return true
  } catch (error) {
    console.error('❌ Chat initialization error:', error)
    alert('Failed to connect to Supabase. Please check your connection and database setup.')
    return false
  }
}
