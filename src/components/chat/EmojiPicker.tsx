import React from 'react'
import { motion } from 'framer-motion'

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
}

const emojiCategories = {
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋'],
  'Gestures': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐', '✋', '🖖', '👏'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  'Activities': ['🎵', '🎶', '🎤', '🎧', '🎸', '🥁', '🎹', '🎺', '🎷', '📻', '🎮', '🕹️', '🎯', '🎲', '♠️', '♥️', '♦️', '♣️', '🃏'],
  'Space': ['🌌', '🌟', '⭐', '✨', '💫', '☄️', '🌙', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '🚀', '🛸'],
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-gray-800/95 backdrop-blur-xl border border-purple-500/30 rounded-xl 
                 shadow-2xl p-4 w-80 max-h-64 overflow-y-auto"
    >
      <div className="space-y-3">
        {Object.entries(emojiCategories).map(([category, emojis]) => (
          <div key={category}>
            <h4 className="text-xs font-medium text-purple-300 mb-2 uppercase tracking-wide">
              {category}
            </h4>
            <div className="grid grid-cols-8 gap-1">
              {emojis.map((emoji) => (
                <motion.button
                  key={emoji}
                  onClick={() => onEmojiSelect(emoji)}
                  className="p-2 rounded-lg hover:bg-purple-500/20 transition-colors
                           text-lg flex items-center justify-center"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
