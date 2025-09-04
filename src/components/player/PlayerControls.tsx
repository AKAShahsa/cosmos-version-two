import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Trash2, Crown, UserCheck, SkipForward, SkipBack } from 'lucide-react';
import { useRoom } from '../../contexts/RoomContext';
import { animate, svg } from 'animejs';
import MusicReactions from '../room/MusicReactions';
import './PlayerControls.css';

interface PlayerControlsProps {
  player: any;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTimeUpdate: (time: number) => void;
}

export function PlayerControls({ 
  player, 
  isPlaying, 
  currentTime, 
  duration, 
  onTimeUpdate 
}: PlayerControlsProps) {
  const { 
    roomState, 
    isHost, 
    currentUser,
    pauseTrack, 
    resumeTrack, 
    removeFromPlaylist, 
    transferHost,
    setVolume,
    updateCurrentTime
  } = useRoom();
  
  const [volume, setLocalVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const morphingPatternRef = useRef<SVGPolygonElement>(null);
  const animationRef = useRef<any>(null);

  // Generate random points for morphing patterns
  const generatePatternPoints = (type: 'wave' | 'star' | 'burst' | 'spiral' | 'lotus' | 'diamond') => {
    const centerX = 50;
    const centerY = 50;
    let points = '';
    
    if (type === 'wave') {
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 25 + Math.sin(angle * 3) * 10 + Math.random() * 8;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        points += `${x},${y} `;
      }
    } else if (type === 'star') {
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const radius = i % 2 === 0 ? 30 + Math.random() * 10 : 15 + Math.random() * 5;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        points += `${x},${y} `;
      }
    } else if (type === 'burst') {
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const radius = 20 + Math.sin(angle * 4) * 15 + Math.random() * 10;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        points += `${x},${y} `;
      }
    } else if (type === 'spiral') {
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 4;
        const radius = 15 + (i / 20) * 20 + Math.random() * 8;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        points += `${x},${y} `;
      }
    } else if (type === 'lotus') {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 25 + Math.sin(angle * 4) * 12 + Math.random() * 6;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        points += `${x},${y} `;
      }
    } else if (type === 'diamond') {
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const radius = i % 2 === 0 ? 35 + Math.random() * 8 : 20 + Math.random() * 5;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        points += `${x},${y} `;
      }
    }
    
    return points.trim();
  };

  // Morphing animation logic
  const startMorphingAnimation = () => {
    if (!morphingPatternRef.current) return;
    
    const patterns = ['wave', 'star', 'burst', 'spiral', 'lotus', 'diamond'] as const;
    let currentPatternIndex = 0;
    
    const morphToNext = () => {
      if (!morphingPatternRef.current || !isPlaying) return;
      
      const nextPattern = patterns[currentPatternIndex % patterns.length];
      const newPoints = generatePatternPoints(nextPattern);
      
      // Update the polygon points directly and animate with anime.js
      morphingPatternRef.current.setAttribute('points', newPoints);
      
      // Create more complex animation with multiple properties
      animationRef.current = animate(morphingPatternRef.current, {
        scale: [0.8, 1.3, 1.0],
        rotate: [0, 180, 360],
        duration: 3000 + Math.random() * 2000, // Variable duration for organic feel
        ease: 'inOutQuart',
        onComplete: () => {
          currentPatternIndex++;
          if (isPlaying) {
            setTimeout(morphToNext, 500); // Small delay between morphs
          }
        }
      });
    };
    
    morphToNext();
  };

  const stopMorphingAnimation = () => {
    if (animationRef.current) {
      animationRef.current.pause();
    }
  };

  // Control morphing based on play state
  useEffect(() => {
    if (isPlaying) {
      startMorphingAnimation();
    } else {
      stopMorphingAnimation();
    }
    
    return () => {
      if (animationRef.current) {
        animationRef.current.pause();
      }
    };
  }, [isPlaying]);

  // Format time to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle play/pause
  const handlePlayPause = () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      resumeTrack();
    }
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseInt(e.target.value);
    setLocalVolume(vol);
    setVolume(vol);
    if (player) {
      try {
        player.setVolume(vol);
        console.log('🔊 Volume set to:', vol);
      } catch (error) {
        console.log('⚠️ Volume change failed on mobile:', error);
      }
    }
    setIsMuted(vol === 0);
  };

  // Handle mute toggle
  const handleMuteToggle = () => {
    if (isMuted) {
      setLocalVolume(50);
      setVolume(50);
      if (player) {
        try {
          player.setVolume(50);
        } catch (error) {
          console.log('⚠️ Unmute failed on mobile:', error);
        }
      }
      setIsMuted(false);
    } else {
      setLocalVolume(0);
      setVolume(0);
      if (player) {
        try {
          player.setVolume(0);
        } catch (error) {
          console.log('⚠️ Mute failed on mobile:', error);
        }
      }
      setIsMuted(true);
    }
  };

  // Handle progress bar change
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseInt(e.target.value);
    onTimeUpdate(time);
    if (player && isHost) {
      player.seekTo(time, true);
      // Update database immediately
      updateCurrentTime(time);
      
      // Force immediate sync for all users after a small delay
      setTimeout(() => {
        updateCurrentTime(time);
      }, 100);
      
      console.log(`🎯 Host seeked to: ${time}s - Broadcasting to all users`);
    }
  };

  // Skip forward 10 seconds
  const handleSkipForward = () => {
    if (player && isHost) {
      const newTime = Math.min(currentTime + 10, duration);
      player.seekTo(newTime, true);
      updateCurrentTime(newTime);
      onTimeUpdate(newTime);
      
      // Force immediate sync
      setTimeout(() => {
        updateCurrentTime(newTime);
      }, 100);
      
      console.log(`⏩ Host skipped forward to: ${newTime}s`);
    }
  };

  // Skip backward 10 seconds  
  const handleSkipBackward = () => {
    if (player && isHost) {
      const newTime = Math.max(currentTime - 10, 0);
      player.seekTo(newTime, true);
      updateCurrentTime(newTime);
      onTimeUpdate(newTime);
      
      // Force immediate sync
      setTimeout(() => {
        updateCurrentTime(newTime);
      }, 100);
      
      console.log(`⏪ Host skipped backward to: ${newTime}s`);
    }
  };

  // Remove track from playlist
  const handleRemoveTrack = (trackId: string) => {
    if (isHost) {
      removeFromPlaylist(trackId);
    }
  };

  // Transfer host to member
  const handleTransferHost = (memberId: string) => {
    if (isHost) {
      transferHost(memberId);
    }
  };

  if (!roomState) return null;

  const membersList = Object.entries(roomState.members || {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 p-4"
    >
      {/* Main Player Controls */}
      <div className="p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg relative overflow-hidden">
        {/* Animated Morphing Background Pattern */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <svg width="100%" height="100%" viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="morphGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <polygon
              ref={morphingPatternRef}
              points="50,25 60,40 50,35 40,40"
              fill="url(#morphGradient)"
              filter="url(#glow)"
              style={{
                opacity: isPlaying ? 0.6 : 0.2,
                transition: 'opacity 0.5s ease'
              }}
            />
            {/* Additional animated circles for enhanced effect */}
            {isPlaying && (
              <>
                <circle
                  cx="20"
                  cy="20"
                  r="3"
                  fill="#8b5cf6"
                  opacity="0.4"
                >
                  <animate attributeName="cy" values="20;80;20" dur="3s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.4;0.8;0.4" dur="3s" repeatCount="indefinite"/>
                </circle>
                <circle
                  cx="80"
                  cy="80"
                  r="2"
                  fill="#a855f7"
                  opacity="0.3"
                >
                  <animate attributeName="cx" values="80;20;80" dur="4s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.3;0.7;0.3" dur="4s" repeatCount="indefinite"/>
                </circle>
                <circle
                  cx="50"
                  cy="50"
                  r="1"
                  fill="#c084fc"
                  opacity="0.5"
                >
                  <animate attributeName="r" values="1;6;1" dur="2.5s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.5s" repeatCount="indefinite"/>
                </circle>
              </>
            )}
          </svg>
        </div>
        
        <div className="space-y-4 relative z-10">
          {/* Play/Pause and Time Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {isHost && (
                <div className="flex items-center space-x-2">
                  {/* Skip Backward Button */}
                  <motion.button
                    onClick={handleSkipBackward}
                    whileHover={{ scale: 1.05, x: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 bg-purple-600/10 border border-purple-500/30 hover:bg-purple-500/20 rounded-lg transition-all duration-200"
                    title="Skip back 10 seconds"
                  >
                    <SkipBack className="h-4 w-4 text-purple-400" />
                  </motion.button>
                  
                  {/* Play/Pause Button with Enhanced Visual Effects */}
                  <motion.button
                    onClick={handlePlayPause}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative p-3 bg-purple-600/20 border border-purple-500/50 hover:bg-purple-500/30 rounded-lg transition-all duration-300 overflow-hidden"
                  >
                    {/* Button background glow effect */}
                    <div className={`absolute inset-0 rounded-lg transition-all duration-500 ${
                      isPlaying 
                        ? 'bg-gradient-to-r from-green-500/20 to-purple-500/20 shadow-lg shadow-green-500/20' 
                        : 'bg-gradient-to-r from-purple-500/20 to-blue-500/20'
                    }`} />
                    
                    {/* Animated pulse rings when playing */}
                    {isPlaying && (
                      <>
                        <motion.div
                          className="absolute inset-0 border-2 border-green-400/40 rounded-lg"
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.6, 0, 0.6]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                        <motion.div
                          className="absolute inset-0 border border-purple-400/30 rounded-lg"
                          animate={{
                            scale: [1, 1.4, 1],
                            opacity: [0.4, 0, 0.4]
                          }}
                          transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.5
                          }}
                        />
                      </>
                    )}
                    
                    {/* Icon with enhanced animations */}
                    <div className="relative z-10">
                      <motion.div
                        animate={{
                          rotate: isPlaying ? [0, 5, -5, 0] : 0
                        }}
                        transition={{
                          duration: isPlaying ? 4 : 0,
                          repeat: isPlaying ? Infinity : 0,
                          ease: "easeInOut"
                        }}
                      >
                        {isPlaying ? (
                          <Pause className="h-6 w-6 text-green-400 drop-shadow-lg" />
                        ) : (
                          <Play className="h-6 w-6 text-purple-400 ml-1 drop-shadow-lg" />
                        )}
                      </motion.div>
                    </div>
                    
                    {/* Sparkle effects when playing */}
                    {isPlaying && (
                      <div className="absolute inset-0 pointer-events-none">
                        {[...Array(3)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-yellow-300 rounded-full"
                            style={{
                              left: `${20 + i * 20}%`,
                              top: `${15 + i * 10}%`
                            }}
                            animate={{
                              scale: [0, 1, 0],
                              opacity: [0, 1, 0],
                              rotate: [0, 180, 360]
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              delay: i * 0.5,
                              ease: "easeInOut"
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </motion.button>
                  
                  {/* Skip Forward Button */}
                  <motion.button
                    onClick={handleSkipForward}
                    whileHover={{ scale: 1.05, x: 2 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 bg-purple-600/10 border border-purple-500/30 hover:bg-purple-500/20 rounded-lg transition-all duration-200"
                    title="Skip forward 10 seconds"
                  >
                    <SkipForward className="h-4 w-4 text-purple-400" />
                  </motion.button>
                </div>
              )}
              <div className="text-sm text-gray-400">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center space-x-2">
              <motion.button
                onClick={handleMuteToggle}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 text-gray-400 hover:text-white transition-all duration-200"
              >
                <motion.div
                  animate={{
                    scale: isMuted ? [1, 1.2, 1] : 1
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: isMuted ? Infinity : 0,
                    repeatDelay: 1
                  }}
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4 text-red-400" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </motion.div>
              </motion.button>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-xs text-gray-500 w-8">{volume}%</span>
            </div>
          </div>

          {/* Progress Bar - Visible for all users */}
          <div className="space-y-2 relative">
            {/* Animated sound waves when playing */}
            {isPlaying && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-gradient-to-t from-purple-500 to-pink-400 rounded-full"
                    animate={{
                      height: [4, 16, 4],
                      opacity: [0.4, 1, 0.4]
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between text-xs text-gray-400">
              <motion.span
                animate={{
                  color: isPlaying ? ['#9ca3af', '#8b5cf6', '#9ca3af'] : '#9ca3af'
                }}
                transition={{
                  duration: 2,
                  repeat: isPlaying ? Infinity : 0
                }}
              >
                {formatTime(currentTime)}
              </motion.span>
              <span className="text-purple-400 flex items-center gap-1">
                {isHost ? (
                  <>
                    🎵 <span className="text-xs">Host Controls</span>
                  </>
                ) : (
                  <>
                    🔄 <span className="text-xs">Synced with Host</span>
                  </>
                )}
              </span>
              <motion.span
                animate={{
                  color: isPlaying ? ['#9ca3af', '#8b5cf6', '#9ca3af'] : '#9ca3af'
                }}
                transition={{
                  duration: 2,
                  repeat: isPlaying ? Infinity : 0,
                  delay: 1
                }}
              >
                {formatTime(duration)}
              </motion.span>
            </div>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={isHost ? handleProgressChange : undefined}
              disabled={!isHost}
              className={`w-full h-2 rounded-lg appearance-none cursor-pointer slider ${
                isHost 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-gray-800 opacity-75'
              }`}
              title={isHost ? "Drag to seek" : "Progress bar (Host controls only)"}
            />
          </div>
        </div>
      </div>

      {/* Music Reactions */}
      {currentUser && (
        <MusicReactions 
          roomId={roomState?.id || ''}
          currentUser={currentUser}
        />
      )}

      {/* Playlist Management */}
      {roomState.playlist.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Playlist</h3>
              <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-sm rounded">
                {roomState.playlist.length} tracks
              </span>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {roomState.playlist.map((track, index) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    roomState.currentTrack?.id === track.id
                      ? 'bg-purple-600/20 border-purple-500/50'
                      : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-sm text-gray-400">#{index + 1}</div>
                    <div>
                      <div className="text-white font-medium">{track.title}</div>
                      <div className="text-gray-400 text-sm">{track.artist}</div>
                    </div>
                  </div>
                  
                  {isHost && roomState.currentTrack?.id !== track.id && (
                    <button
                      onClick={() => handleRemoveTrack(track.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Member Management */}
      {membersList.length > 1 && isHost && (
        <div className="p-4 bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-lg">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Room Members</h3>
              <span className="px-2 py-1 bg-green-600/20 text-green-400 text-sm rounded">
                {membersList.length} members
              </span>
            </div>
            
            <div className="space-y-2">
              {membersList.map(([memberId, member]) => (
                <div
                  key={memberId}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700/50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-white font-medium">{member.name}</div>
                    {memberId === roomState.hostId && (
                      <Crown className="h-4 w-4 text-yellow-400" />
                    )}
                  </div>
                  
                  {memberId !== roomState.hostId && (
                    <button
                      onClick={() => handleTransferHost(memberId)}
                      className="px-3 py-1 bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 rounded transition-colors text-sm flex items-center space-x-1"
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>Make Host</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
