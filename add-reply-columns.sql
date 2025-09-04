-- Migration script to add reply functionality to chat_messages table
-- Run this in your Supabase SQL Editor

-- Add reply columns to existing chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID,
ADD COLUMN IF NOT EXISTS reply_to_message TEXT,
ADD COLUMN IF NOT EXISTS reply_to_username TEXT;

-- Add index for reply_to_id for better performance when loading replied messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to_id ON chat_messages(reply_to_id);

-- Optional: Add foreign key constraint to ensure reply_to_id references valid message
-- ALTER TABLE chat_messages 
-- ADD CONSTRAINT fk_chat_messages_reply_to_id 
-- FOREIGN KEY (reply_to_id) REFERENCES chat_messages(id) ON DELETE SET NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
ORDER BY ordinal_position;
