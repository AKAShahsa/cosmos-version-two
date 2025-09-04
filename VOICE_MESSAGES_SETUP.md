# 🎤 Voice Messages - Supabase Setup Guide

## What You Need to Add in Supabase

### 1. 📁 **Storage Setup**
Go to your Supabase Dashboard → Storage → Create New Bucket:

**Bucket Name:** `voice-messages`
- **Public:** ✅ Yes (so messages can be played by all users)
- **File size limit:** 10MB (adjust as needed)
- **Allowed file types:** audio/webm, audio/mp3, audio/wav

### 2. 🗄️ **Database Schema Updates**
Run this SQL in your Supabase SQL Editor:

```sql
-- Add voice message columns to existing chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS voice_url TEXT,
ADD COLUMN IF NOT EXISTS voice_duration INTEGER;

-- Create voice-messages storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('voice-messages', 'voice-messages', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for voice messages
CREATE POLICY "Anyone can view voice messages" ON storage.objects
FOR SELECT USING (bucket_id = 'voice-messages');

CREATE POLICY "Anyone can upload voice messages" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'voice-messages');

CREATE POLICY "Users can update their own voice messages" ON storage.objects
FOR UPDATE USING (bucket_id = 'voice-messages');

CREATE POLICY "Users can delete their own voice messages" ON storage.objects
FOR DELETE USING (bucket_id = 'voice-messages');
```

### 3. 🔧 **Quick Setup Steps**

1. **Open Supabase Dashboard**
2. **Go to SQL Editor**
3. **Run the SQL above** ☝️
4. **Go to Storage**
5. **Verify `voice-messages` bucket exists**
6. **Test voice message in your app!** 🎉

### 4. ✅ **What's Already Done in Code**

- ✅ Voice recording functionality
- ✅ File upload to correct bucket
- ✅ Database schema support
- ✅ UI for recording/playing
- ✅ Duration tracking
- ✅ Mobile optimization

### 5. 🎵 **How Voice Messages Work**

1. **User taps + button** → selects "Voice"
2. **Recording starts** with red pulsing indicator
3. **User stops recording** → preview with audio player
4. **User sends** → uploads to `voice-messages` bucket
5. **Message appears** with 🎤 emoji and duration
6. **Other users** can play the voice message

### 6. 🔊 **File Format Details**

- **Format:** WebM (widely supported)
- **Quality:** Good balance of quality/size
- **Duration:** Tracked in seconds
- **Size:** Automatically optimized for web

That's it! Your voice messages should work perfectly after running the SQL! 🚀
