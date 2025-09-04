import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Users, Play, Search, X, Crown } from 'lucide-react';
import { useRoom } from '../../contexts/RoomContext'; // Use RoomContext instead
import { MovieSearchSheet } from './MovieSearchSheet';
import { MoviePlayer } from './MoviePlayer';

interface MovieRoomProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MovieRoom: React.FC<MovieRoomProps> = ({ 
  isOpen, 
  onClose
}) => {
  const { 
    roomState,
    isHost,
    startMovieMode, 
    exitMovieMode
  } = useRoom(); // Use existing room context

  const [showSearch, setShowSearch] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  const currentMovie = roomState?.currentMovie;
  const members = roomState?.members || {};
  const membersList = Object.entries(members);
  const isMovieMode = roomState?.isMovieMode || false;

  // Auto-open player when movie mode starts and there's a current movie
  // But respect when the user has manually closed the player
  const [userClosedPlayer, setUserClosedPlayer] = useState(false);
  
  useEffect(() => {
    console.log('MovieRoom useEffect triggered:', { isMovieMode, currentMovie: !!currentMovie, showPlayer, userClosedPlayer });
    
    // Reset the userClosedPlayer state when movie mode changes or movie changes
    if (!isMovieMode || !currentMovie) {
      setUserClosedPlayer(false);
    }
    
    // Only auto-open if the user hasn't manually closed it
    if (isMovieMode && currentMovie && !showPlayer && !userClosedPlayer) {
      console.log('Auto-opening movie player because movie mode is active');
      setShowPlayer(true);
    }
  }, [isMovieMode, currentMovie, showPlayer, userClosedPlayer]);

  const handleStartMovie = async () => {
    if (!isHost) return;
    console.log('Starting movie mode with currentMovie:', currentMovie);
    await startMovieMode();
    console.log('Movie mode started, useEffect should auto-open player');
  };

  const handleExitMovie = async () => {
    if (!isHost) return;
    await exitMovieMode();
    setShowPlayer(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence mode="wait">
        {isOpen && (
          <div 
            key="movie-room-backdrop"
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-40 flex items-center justify-center p-4"
          >
            <motion.div
              key="movie-room-main"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-morphism w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden"
            >
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Film className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold gradient-text">Movie Theater</h2>
                  <p className="text-gray-400 text-sm">Watch movies together in sync</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="p-6">
            {!isMovieMode ? (
              /* Movie Selection Mode */
              <div className="space-y-6">
                {/* Current Movie Display */}
                {currentMovie ? (
                  <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-6">
                    <div className="flex items-start space-x-6">
                      <img
                        src={currentMovie.poster}
                        alt={currentMovie.title}
                        className="w-32 h-48 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white mb-2">{currentMovie.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mb-4">
                          <span>📅 {currentMovie.year}</span>
                          <span>⏱️ {currentMovie.runtime}</span>
                          <span>⭐ {currentMovie.imdbRating}</span>
                        </div>
                        <p className="text-gray-300 mb-4 line-clamp-3">{currentMovie.plot}</p>
                        <div className="text-sm text-neon-blue">{currentMovie.genre}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-gray-600 rounded-xl">
                    <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Movie Selected</h3>
                    <p className="text-gray-400 mb-6">
                      {isHost ? 'Search and select a movie to watch together' : 'Waiting for host to select a movie'}
                    </p>
                    {isHost && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowSearch(true)}
                        className="px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple rounded-xl font-semibold hover:shadow-lg hover:shadow-neon-blue/30 transition-all"
                      >
                        <Search className="w-5 h-5 inline mr-2" />
                        Search Movies
                      </motion.button>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {isHost && (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowSearch(true)}
                        className="flex-1 p-4 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors"
                      >
                        <Search className="w-5 h-5 mx-auto mb-2" />
                        <div className="font-medium">Change Movie</div>
                        <div className="text-sm text-gray-400">Browse and select different movie</div>
                      </motion.button>
                      
                      {currentMovie && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleStartMovie}
                          className="flex-1 p-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all"
                        >
                          <Play className="w-5 h-5 mx-auto mb-2" />
                          <div className="font-medium">Start Movie</div>
                          <div className="text-sm opacity-90">Begin watching together</div>
                        </motion.button>
                      )}
                    </>
                  )}
                </div>

                {/* Members List */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-white flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Room Members ({membersList.length})
                    </h4>
                  </div>
                  
                  <div className="space-y-3">
                    {membersList.map(([userId, member]) => (
                      <div
                        key={userId}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-white font-medium">{member.name}</div>
                            {userId === roomState?.hostId && (
                              <div className="text-xs text-yellow-400 flex items-center">
                                <Crown className="w-3 h-3 mr-1" />
                                Host
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Movie Playing Mode */
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Play className="w-12 h-12 text-white ml-1" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Movie is Playing!</h3>
                <p className="text-gray-400 mb-6">
                  {currentMovie?.title} is now playing for all room members
                </p>
                
                <div className="space-y-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowPlayer(true)}
                    className="px-8 py-4 bg-gradient-to-r from-neon-blue to-neon-purple rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-neon-blue/30 transition-all"
                  >
                    🎬 Open Movie Player
                  </motion.button>
                  
                  {isHost && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleExitMovie}
                      className="block mx-auto px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-colors"
                    >
                      Stop Movie
                    </motion.button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Movie Search Sheet */}
    <MovieSearchSheet isOpen={showSearch} onClose={() => setShowSearch(false)} />
    
    {/* Movie Player */}
    <MoviePlayer 
      isOpen={showPlayer} 
      onClose={() => {
        setShowPlayer(false);
        setUserClosedPlayer(true); // Mark that user has manually closed the player
      }} 
    />
  </>
  );
};
