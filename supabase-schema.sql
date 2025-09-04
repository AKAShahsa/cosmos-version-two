-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  message TEXT,
  image_url TEXT,
  voice_url TEXT,
  voice_duration INTEGER, -- Duration in seconds
  is_ai BOOLEAN DEFAULT FALSE,
  reactions JSONB DEFAULT '{}',
  reply_to_id UUID,
  reply_to_message TEXT,
  reply_to_username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- Message Reactions Table (for detailed reaction tracking)
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Storage bucket for chat images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket for voice messages
INSERT INTO storage.buckets (id, name, public) 
VALUES ('voice-messages', 'voice-messages', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat images
CREATE POLICY "Anyone can view chat images" ON storage.objects
FOR SELECT USING (bucket_id = 'chat-images');

CREATE POLICY "Anyone can upload chat images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'chat-images');

CREATE POLICY "Users can update their own chat images" ON storage.objects
FOR UPDATE USING (bucket_id = 'chat-images');

CREATE POLICY "Users can delete their own chat images" ON storage.objects
FOR DELETE USING (bucket_id = 'chat-images');

-- Storage policies for voice messages
CREATE POLICY "Anyone can view voice messages" ON storage.objects
FOR SELECT USING (bucket_id = 'voice-messages');

CREATE POLICY "Anyone can upload voice messages" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'voice-messages');

CREATE POLICY "Users can update their own voice messages" ON storage.objects
FOR UPDATE USING (bucket_id = 'voice-messages');

CREATE POLICY "Users can delete their own voice messages" ON storage.objects
FOR DELETE USING (bucket_id = 'voice-messages');

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Policies for chat_messages (allow all operations for now - can be restricted later)
CREATE POLICY "Enable read access for all users" ON chat_messages
FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON chat_messages
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON chat_messages
FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON chat_messages
FOR DELETE USING (true);

-- Policies for message_reactions
CREATE POLICY "Enable read access for all users" ON message_reactions
FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON message_reactions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON message_reactions
FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON message_reactions
FOR DELETE USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on chat_messages
CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old messages (optional - can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS void AS $$
BEGIN
    DELETE FROM chat_messages 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ language 'plpgsql';
