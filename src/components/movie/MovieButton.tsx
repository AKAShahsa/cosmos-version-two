import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Film } from 'lucide-react';
import { useRoom } from '../../contexts/RoomContext';
import { MovieRoom } from './MovieRoom';

export const MovieButton: React.FC = () => {
  const { roomState, isConnected } = useRoom();
  const [showMovieRoom, setShowMovieRoom] = useState(false);

  // Only show if user is in a room
  if (!isConnected || !roomState) return null;

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowMovieRoom(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-lg hover:shadow-xl hover:shadow-purple-500/30 flex items-center justify-center text-white transition-all duration-300 z-30"
        title="Watch Movies Together"
      >
        <Film size={24} />
      </motion.button>

      {/* Movie Room Modal */}
      <MovieRoom 
        isOpen={showMovieRoom} 
        onClose={() => setShowMovieRoom(false)} 
      />
    </>
  );
};
