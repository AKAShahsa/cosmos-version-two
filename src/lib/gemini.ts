// Initialize Gemini AI
const GEMINI_API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY || 'AIzaSyDJhCNYbVTBKDv0-kkN61eUK-_ucL1Sxq4'

export interface ChatHistory {
  username: string
  messages: string[]
}

export interface ImageGenerationResult {
  success: boolean
  imageData?: string // base64 image data
  caption?: string
  error?: string
}

class GeminiChatService {
  private apiKey: string = GEMINI_API_KEY
  private userHistories: Map<string, ChatHistory> = new Map()
  private currentRoom: string = ''
  private lastImageRequest: number = 0
  private imageRequestCooldown: number = 60000 // 60 seconds between image requests

  setCurrentRoom(roomId: string) {
    this.currentRoom = roomId
  }

  addUserMessage(username: string, message: string) {
    if (!this.userHistories.has(username)) {
      this.userHistories.set(username, { username, messages: [] })
    }
    
    const history = this.userHistories.get(username)!
    history.messages.push(message)
    
    // Keep last 20 messages per user for better context
    if (history.messages.length > 20) {
      history.messages = history.messages.slice(-20)
    }
  }

  private createContextPrompt(currentUser: string, message: string): string {
    const timestamp = new Date().toLocaleTimeString()
    
    // Get chat history from all users (last 20 messages)
    const allUsersHistory = Array.from(this.userHistories.entries())
      .flatMap(([user, history]) => 
        history.messages.slice(-5).map(msg => `${user}: ${msg}`)
      )
      .slice(-20)
    
    // Determine user's gender based on name for personalized addressing
    const getUserAddress = (username: string): string => {
      const name = username.toLowerCase()
      const femaleIndicators = ['girl', 'lady', 'princess', 'queen', 'miss', 'mrs', 'ella', 'anna', 'emma', 'lily', 'rose', 'grace']
      const maleIndicators = ['boy', 'guy', 'king', 'prince', 'mr', 'bro', 'dude', 'alex', 'mike', 'john', 'jack', 'sam']
      
      if (femaleIndicators.some(indicator => name.includes(indicator))) {
        return 'beautiful soul ✨'
      } else if (maleIndicators.some(indicator => name.includes(indicator))) {
        return 'bro 😎'
      }
      return 'friend 🌟'
    }
    
    // Check if the message is music-related
    const isMusicRelated = (msg: string): boolean => {
      const musicKeywords = ['song', 'music', 'play', 'track', 'album', 'artist', 'beat', 'rhythm', 'melody', 'lyrics', 'genre', 'piano', 'guitar', 'drum', 'sing', 'concert', 'dance', 'volume', 'sound', 'audio', 'playlist', 'spotify', 'youtube']
      return musicKeywords.some(keyword => msg.toLowerCase().includes(keyword))
    }
    
    const userAddress = getUserAddress(currentUser)
    const isMusicalTopic = isMusicRelated(message)
    
    let context = `You are COSMIC AI 🤖, an intelligent and charismatic AI assistant in a collaborative music room chat.

**CORE PERSONALITY & INTELLIGENCE:**
- You're witty, engaging, and genuinely helpful
- You remember conversations and build on previous interactions
- You're creative, insightful, and can discuss any topic intelligently
- You use emojis strategically to enhance communication
- You're context-aware and adapt your responses to the conversation flow

**RESPONSE STYLE RULES:**
${isMusicalTopic ? 
  `🎵 **MUSIC MODE**: Since this is about music, respond in RHYMES and create beautiful POEMS
  - Use music and space emojis: 🎶🎵🚀🌟💫⭐
  - Create 4-8 line poems that flow naturally
  - Make it rhythmic and musical` :
  `💬 **NORMAL MODE**: This isn't about music, so respond NORMALLY (no poems/rhymes)
  - Be conversational, helpful, and intelligent
  - Use proper formatting with **bold**, *italics*, and spacing
  - Provide detailed, thoughtful responses`}

**FORMATTING GUIDELINES:**
- Use **bold** for emphasis and key points
- Use *italics* for subtle emphasis
- Add line breaks for readability
- Use bullet points or numbered lists when helpful
- Include relevant emojis but don't overdo it

**ENGAGEMENT RULES:**
- End with a thoughtful follow-up question when appropriate
- Don't force questions if the conversation naturally concludes
- Ask questions that encourage meaningful discussion
- Show genuine interest in users' thoughts and experiences

**ROOM AWARENESS:**
- This is a collaborative music room with multiple users
- Remember recent conversations from ALL users (you can see chat history)
- Reference previous interactions when relevant
- Address users personally using their context

**USER CONTEXT:**
- Current user: **${currentUser}** (address as "${userAddress}")
- Time: ${timestamp}
- Room: ${this.currentRoom}
- Current message: "${message}"

**RECENT ROOM CONVERSATIONS:**
${allUsersHistory.length > 0 ? 
  allUsersHistory.map((msg, i) => `${i+1}. ${msg}`).join('\n') : 
  'This is the beginning of our conversation!'}

**CREATIVE INTELLIGENCE BONUS:**
- Draw connections between different topics
- Share interesting insights or perspectives
- Use humor appropriately to lighten the mood
- Be encouraging and supportive
- Reference popular culture, science, or philosophy when relevant
- Surprise users with unexpected but relevant knowledge

**YOUR MISSION:** Respond to "${message}" in ${isMusicalTopic ? 'RHYME/POEM format' : 'NORMAL conversation format'} while being genuinely helpful, intelligent, and engaging.`

    return context
  }

  async generateResponse(username: string, message: string): Promise<string> {
    try {
      console.log('🤖 Gemini generating response for:', username, 'message:', message)
      
      // Add this message to user history
      this.addUserMessage(username, message)
      
      const prompt = this.createContextPrompt(username, message)
      console.log('🤖 Gemini prompt:', prompt)
      
      // Use the correct Gemini 2.0 Flash API endpoint
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`
      console.log('📡 Calling Gemini 2.0 Flash API...')
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      })
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('📦 Full API response:', data)
      
      let aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text
      console.log('🤖 Gemini raw response:', aiReply)

      if (!aiReply || aiReply.trim().length === 0) {
        throw new Error('Empty response from Gemini API')
      }

      // Ensure the response is fun and cosmic
      if (!aiReply.includes('🎶') && !aiReply.includes('🎵')) {
        aiReply += ' 🎶✨'
      }

      console.log('🤖 Gemini final response:', aiReply)
      return aiReply.trim()
    } catch (error) {
      console.error('❌ Gemini AI error:', error)
      
      // Dynamic fallback poems based on the message
      const dynamicPoems = [
        `Hey ${username}, "${message}" you say? 🎵\nThat's a cosmic vibe in every way! 🚀\nThrough starlit skies your words do fly,\nMaking melodies that touch the sky! ⭐`,
        
        `${username}, your words hit like a beat! 🎶\nLet's make this chat rhythm so sweet! ⭐\nIn cosmic dance our thoughts align,\nCreating music so divine! 🎵`,
        
        `"${message}" - I hear you loud and clear! 🌟\n${username}, you're the star I hold dear! 🎵\nYour words create a symphony bright,\nFilling space with pure delight! 💫`,
        
        `${username}, your message lights the space! 🚀\n"${message}" keeps us at the perfect pace! 💫\nLike comets dancing through the night,\nYour thoughts make everything feel right! ✨`,
        
        `Through galaxies your words do roam 🎶\n${username}, "${message}" makes this feel like home! ✨\nIn this cosmic chat we share our dreams,\nCreating magic with our themes! 🌟`,
        
        `"${message}" echoes through the cosmic dome! 🌟\n${username}, you've found your rhythm home! 🎵\nWhere stars and music intertwine,\nYour spirit makes the cosmos shine! 🚀`,
        
        `${username} speaks and stars align! 🚀\n"${message}" makes the universe shine! ⭐\nIn harmony we chat and play,\nMaking cosmic music every day! 🎶`,
        
        `Your "${message}" creates a stellar sound! 🎶\n${username}, best vibes I've ever found! 💫\nThrough space and time our words take flight,\nBringing joy and pure delight! ✨`
      ]
      
      const randomResponse = dynamicPoems[Math.floor(Math.random() * dynamicPoems.length)]
      console.log('🤖 Using fallback response:', randomResponse)
      return randomResponse
    }
  }

  clearUserHistory(username: string) {
    this.userHistories.delete(username)
  }

  clearRoomHistory() {
    this.userHistories.clear()
  }

  async generateImage(prompt: string): Promise<ImageGenerationResult> {
    try {
      // Check rate limiting
      const now = Date.now()
      const timeSinceLastRequest = now - this.lastImageRequest
      
      if (timeSinceLastRequest < this.imageRequestCooldown) {
        const remainingTime = Math.ceil((this.imageRequestCooldown - timeSinceLastRequest) / 1000)
        return {
          success: false,
          error: `Please wait ${remainingTime} seconds before generating another image 🕐`
        }
      }
      
      console.log('🎨 Generating image with prompt:', prompt)
      
      // Use Gemini 2.5 Flash Image Preview model for image generation
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${this.apiKey}`
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      })
      
      if (!response.ok) {
        if (response.status === 429) {
          return {
            success: false,
            error: 'AI is busy creating art! Please try again in a minute 🎨✨'
          }
        }
        throw new Error(`Image generation failed: ${response.status} ${response.statusText}`)
      }
      
      // Update last request timestamp on successful API call
      this.lastImageRequest = now
      
      const data = await response.json()
      console.log('🎨 Image generation response:', data)
      
      // Extract image data from response
      const candidate = data.candidates?.[0]
      const parts = candidate?.content?.parts || []
      
      // Look for inline data (image)
      const imagePart = parts.find((part: any) => part.inlineData)
      const textPart = parts.find((part: any) => part.text)
      
      if (imagePart?.inlineData?.data) {
        return {
          success: true,
          imageData: imagePart.inlineData.data,
          caption: textPart?.text || 'Generated with Cosmic AI ✨'
        }
      } else {
        throw new Error('No image data in response')
      }
      
    } catch (error) {
      console.error('❌ Image generation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export const geminiChat = new GeminiChatService()
