import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Frown, Sparkles } from 'lucide-react';
import CustomParticleEffect from './CustomParticleEffect';
import { supabase } from '../../lib/supabase';

interface Reaction {
  id: string;
  type: 'sad' | 'romantic' | 'wow';
  userName: string;
  timestamp: number;
}

interface FloatingReaction extends Reaction {
  x: number;
  y: number;
}

interface MusicReactionsProps {
  roomId: string;
  currentUser: { id: string; name: string };
}

export const MusicReactions: React.FC<MusicReactionsProps> = ({ roomId, currentUser }) => {
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [particleEffect, setParticleEffect] = useState<{ type: string; show: boolean }>({ type: '', show: false });

  // Set up real-time subscription for music reactions
  useEffect(() => {
    const channel = supabase.channel(`music-reactions-${roomId}`);
    
    channel.on('broadcast', { event: 'music_reaction' }, (payload) => {
      const { type, userName, reactionId } = payload.payload;
      
      console.log(`🎵 Received reaction: ${type} from ${userName}`);
      
      // Skip if this is our own reaction (we already showed it locally)
      if (userName === currentUser.name) {
        console.log(`🔄 Skipping own reaction from ${userName}`);
        return;
      }
      
      // Add floating reaction for other users only
      const newReaction: FloatingReaction = {
        id: reactionId,
        type: type as 'sad' | 'romantic' | 'wow',
        userName,
        timestamp: Date.now(),
        x: Math.random() * 60 + 20, // Better positioning: 20-80% (more centered)
        y: 90
      };
      
      setFloatingReactions(prev => [...prev, newReaction]);
      
      // Show particle effect for all reactions
      setParticleEffect({ type, show: true });
      setTimeout(() => setParticleEffect(prev => ({ ...prev, show: false })), 2000);
      
      // Remove floating reaction after animation completes
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== reactionId));
      }, 8000); // Match the 8-second animation duration
    });
    
    channel.subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }, [roomId, currentUser.name]);

  // Handle reaction click
  const handleReaction = useCallback(async (reactionType: 'sad' | 'romantic' | 'wow') => {
    const reactionId = `${currentUser.id}-${Date.now()}`;
    
    // Show immediate local reaction for the sender (before broadcast)
    const localReaction: FloatingReaction = {
      id: reactionId,
      type: reactionType,
      userName: currentUser.name,
      timestamp: Date.now(),
      x: Math.random() * 60 + 20, // 20-80% positioning
      y: 90
    };
    
    setFloatingReactions(prev => [...prev, localReaction]);
    
    // Show particle effect immediately
    setParticleEffect({ type: reactionType, show: true });
    setTimeout(() => setParticleEffect(prev => ({ ...prev, show: false })), 2000);
    
    // Remove local reaction after animation completes (match animation duration)
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== reactionId));
    }, 8000); // 8 seconds to match animation duration
    
    // Broadcast the reaction to all users in the room
    const channel = supabase.channel(`music-reactions-${roomId}`);
    await channel.send({
      type: 'broadcast',
      event: 'music_reaction',
      payload: {
        type: reactionType,
        userName: currentUser.name,
        userId: currentUser.id,
        reactionId,
        timestamp: Date.now()
      }
    });
    
    console.log(`🎵 ${currentUser.name} reacted with ${reactionType}! Broadcasting to room ${roomId}`);
  }, [roomId, currentUser.id, currentUser.name]);

  // Get reaction emoji and color
  const getReactionDisplay = (type: string) => {
    switch (type) {
      case 'sad':
        return { emoji: '😢', color: '#60a5fa', label: 'Sad' };
      case 'romantic':
        return { emoji: '💕', color: '#f472b6', label: 'Romantic' };
      case 'wow':
        return { emoji: '🎉', color: '#fbbf24', label: 'Wow' };
      default:
        return { emoji: '😊', color: '#8b5cf6', label: 'React' };
    }
  };

  return (
    <div className="relative w-full">
      {/* This component is positioned below PlayerControls and above playlist in App.tsx */}
      {/* Particle Effects */}
      <AnimatePresence>
        {particleEffect.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-40"
          >
            <CustomParticleEffect
              type={particleEffect.type as 'sad' | 'romantic' | 'wow'}
              show={true}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Reactions */}
      <AnimatePresence>
        {floatingReactions.map((reaction) => {
          const { emoji, color } = getReactionDisplay(reaction.type);
          
          // All users get downward animation from above the screen
          // Everyone: come from way above header and go down through full screen
          const startY = -window.innerHeight * 0.3;  // Start from 30% above the screen (above all headers)
          const endY = window.innerHeight * 1.1;     // End slightly below the screen
          
          return (
            <motion.div
              key={reaction.id}
              initial={{ 
                y: startY,
                x: `${reaction.x}%`, 
                opacity: 0, 
                scale: 0.5,
                rotate: 20  // Consistent rotation for everyone
              }}
              animate={{ 
                y: endY,
                opacity: [0, 1, 1, 0], 
                scale: [0.5, 1.2, 1, 0.8],
                rotate: [-20, 10, -5, 0]  // Gentle swaying motion for everyone
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ 
                duration: 8, // Increased to 8 seconds for all users
                ease: "easeInOut", // Smooth easing for downward movement
                times: [0, 0.1, 0.9, 1] // Long visibility phase
              }}
              className="fixed pointer-events-none z-50"
              style={{ 
                left: 0,
                transform: `translateX(${reaction.x}%)`
              }}
            >
              <motion.div
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="glass-morphism p-4 rounded-2xl border shadow-2xl min-w-[120px]"
                style={{
                  borderColor: color + '50',
                  boxShadow: `0 0 30px ${color}60`
                }}
              >
                <div className="flex items-center gap-3 text-base md:text-sm font-bold text-white">
                  <motion.span
                    animate={{
                      scale: [1, 1.4, 1],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="text-3xl md:text-2xl"
                  >
                    {emoji}
                  </motion.span>
                  <span className="whitespace-nowrap text-base md:text-sm font-bold">
                    {reaction.userName}
                  </span>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Reaction Buttons */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex justify-center gap-4 p-4"
      >
        {/* Sad Reaction */}
        <motion.button
          whileHover={{ scale: 1.1, y: -5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleReaction('sad')}
          className="relative group p-4 bg-blue-500/20 border border-blue-400/50 rounded-2xl 
                   hover:bg-blue-500/30 transition-all duration-300 backdrop-blur-sm"
        >
          <motion.div
            animate={{
              rotate: [0, -10, 10, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Frown className="w-6 h-6 text-blue-400" />
          </motion.div>
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 
                        opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="glass-morphism px-2 py-1 rounded-lg text-xs text-blue-300 whitespace-nowrap">
              Sad 😢
            </div>
          </div>
        </motion.button>

        {/* Romantic Reaction */}
        <motion.button
          whileHover={{ scale: 1.1, y: -5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleReaction('romantic')}
          className="relative group p-4 bg-pink-500/20 border border-pink-400/50 rounded-2xl 
                   hover:bg-pink-500/30 transition-all duration-300 backdrop-blur-sm"
        >
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Heart className="w-6 h-6 text-pink-400 fill-current" />
          </motion.div>
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 
                        opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="glass-morphism px-2 py-1 rounded-lg text-xs text-pink-300 whitespace-nowrap">
              Romantic 💕
            </div>
          </div>
        </motion.button>

        {/* Wow/Confetti Reaction */}
        <motion.button
          whileHover={{ scale: 1.1, y: -5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleReaction('wow')}
          className="relative group p-4 bg-yellow-500/20 border border-yellow-400/50 rounded-2xl 
                   hover:bg-yellow-500/30 transition-all duration-300 backdrop-blur-sm"
        >
          <motion.div
            animate={{
              rotate: [0, 180, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Sparkles className="w-6 h-6 text-yellow-400" />
          </motion.div>
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 
                        opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="glass-morphism px-2 py-1 rounded-lg text-xs text-yellow-300 whitespace-nowrap">
              Wow 🎉
            </div>
          </div>
        </motion.button>
      </motion.div>
    </div>
  );
};

export default MusicReactions;
