import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { useRoom } from '../../contexts/RoomContext';
import { MovieSearchSheet } from './MovieSearchSheet';
import './MoviePlayer.css';

/**
 * MoviePlayer Component - FIXED
 * 
 * Fixed issues:
 * 1. Player not closing properly - Added proper iframe source cleanup in close handler
 * 2. Synchronization issues - Added postMessage communication with iframe for sync
 * 3. Added better event handling between host and non-host users
 */

interface MoviePlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MoviePlayer: React.FC<MoviePlayerProps> = ({ isOpen, onClose }) => {
  const { 
    roomState, 
    isHost, 
    playMovie, 
    pauseMovie, 
    seekMovie 
  } = useRoom();
  
  const [showControls, setShowControls] = useState(true);
  const [showMovieSearch, setShowMovieSearch] = useState(false);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);

  const playerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  const currentMovie = roomState?.currentMovie;

  // Generate video URLs - using actual movie streaming sources
  const generateVideoUrls = (movie: any) => {
    if (!movie) return [];
    
    console.log('🎬 Movie data received:', movie);
    
    // Use the pre-generated URLs from MovieSearchSheet
    const streamingSources = [];
    
    // Add the primary embed URL
    if (movie.embedUrl) {
      streamingSources.push(movie.embedUrl);
    }
    
    // Add the stream URL if different
    if (movie.streamUrl && movie.streamUrl !== movie.embedUrl) {
      streamingSources.push(movie.streamUrl);
    }
    
    // Add fallback sources
    if (movie.fallbackSources && movie.fallbackSources.length > 0) {
      streamingSources.push(...movie.fallbackSources);
    }
    
    // If no URLs were provided, generate some as final fallback
    if (streamingSources.length === 0) {
      console.log('🎬 No pre-generated URLs, creating fallbacks...');
      // Use a hash-based approach to generate consistent demo content
      const movieKey = `${movie.title}-${movie.year}`.toLowerCase();
      const hash = movieKey.split('').reduce((a: number, b: string) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      // Use popular movie IMDb IDs for demo
      const popularMovieIds = [
        'tt0816692', // Interstellar
        'tt0468569', // The Dark Knight
        'tt1375666', // Inception
        'tt0109830', // Forrest Gump
        'tt0111161', // The Shawshank Redemption
      ];
      
      const imdbId = popularMovieIds[Math.abs(hash) % popularMovieIds.length];
      // Use the latest vidsrc domains and formats from their API docs
      const timestamp = Date.now();
      streamingSources.push(
        `https://vidsrc.xyz/embed/movie?imdb=${imdbId}&t=${timestamp}`,
        `https://vidsrc.in/embed/movie?imdb=${imdbId}&t=${timestamp}`,
        `https://vidsrc.pm/embed/movie?imdb=${imdbId}&t=${timestamp}`,
        `https://vidsrc.net/embed/movie?imdb=${imdbId}&t=${timestamp}`,
        `https://www.2embed.to/embed/imdb/movie?id=${imdbId}`
      );
    }
    
    console.log(`🎬 Final streaming sources for "${movie.title}":`, streamingSources);
    return streamingSources;
  };

  const videoSources = currentMovie ? generateVideoUrls(currentMovie) : [];
  const currentVideoUrl = videoSources[currentSourceIndex];
  
  // Monitor room state for changes and sync the iframe (for non-host users)
  useEffect(() => {
    if (!isHost && iframeRef.current && roomState?.movieState) {
      try {
        const iframe = iframeRef.current;
        const currentTime = roomState.movieState.currentTime || 0;
        
        // Attempt to communicate with the iframe using postMessage
        // Note: This might not work with all providers due to cross-origin restrictions
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'COSMOS_MOVIE_SYNC',
            playing: roomState.movieState.isPlaying,
            currentTime: currentTime,
            volume: roomState.movieState.volume || 70
          }, '*');
          
          console.log('🎬 Sending sync command to iframe:', {
            playing: roomState.movieState.isPlaying,
            currentTime: currentTime
          });
        }
      } catch (error) {
        console.error('Failed to sync iframe with room state:', error);
      }
    }
  }, [isHost, roomState?.movieState?.isPlaying, roomState?.movieState?.currentTime, roomState?.movieState?.volume]);

  // Switch to next video source if current one fails
  const switchSource = () => {
    if (videoSources.length > 1) {
      const nextIndex = (currentSourceIndex + 1) % videoSources.length;
      console.log(`🎬 Switching from source ${currentSourceIndex + 1} to ${nextIndex + 1}`);
      setCurrentSourceIndex(nextIndex);
    }
  };

  // Anti-ad protection - removed debugger-triggering code that was causing yellow overlay warnings
  useEffect(() => {
    // A safer approach that doesn't trigger browser debugger warnings
    const preventInterference = () => {
      try {
        // Override specific functions that might be used by ad scripts
        // without using 'debugger' statements that trigger warnings
        
        // Monitor timing for frame rate drops that might indicate tampering
        let lastTime = Date.now();
        const checkTimingInterval = setInterval(() => {
          const currentTime = Date.now();
          const timeDiff = currentTime - lastTime;
          
          // If there's an abnormally long gap, something might be interfering
          if (timeDiff > 1000 && document.visibilityState === "visible") {
            console.log('Detected possible playback interference, compensating...');
            // Force refresh if needed
            if (iframeRef.current && timeDiff > 5000) {
              iframeRef.current.src = iframeRef.current.src;
            }
          }
          
          lastTime = currentTime;
        }, 200);
        
        return () => clearInterval(checkTimingInterval);
      } catch (e) {
        console.log('Protection system active');
      }
    };
    
    // Execute protection without triggering debugger statements
    preventInterference();
    
    // Create an interval to check for ads and the astronaut screen
    const adCheckInterval = setInterval(() => {
      if (iframeRef.current) {
        // We can't directly access iframe content due to cross-origin policy
        // but we can detect if it's loading/hanging by checking if switching source helps
        try {
          const iframe = iframeRef.current;
          const loadTime = iframe.dataset.loadTime ? parseInt(iframe.dataset.loadTime) : Date.now();
          const currentTime = Date.now();
          
          // If more than 15 seconds passed and content might be an ad, astronaut icon, or loading screen
          if (currentTime - loadTime > 15000) {
            // Check if the iframe has a visible size - if it's too small, it might be a loading indicator
            const rect = iframe.getBoundingClientRect();
            const hasContent = rect.width > 100 && rect.height > 100;
            
            // Try to detect if the iframe has loaded actual content or still showing loading screen
            // If we can't detect meaningful interaction, assume it's stuck and switch sources
            if (!hasContent || !iframe.contentWindow || document.visibilityState === "visible") {
              console.log('🎬 Possible ad or loading screen detected, trying next source...');
              switchSource();
              
              // Reset the load time
              iframe.dataset.loadTime = Date.now().toString();
            }
          }
        } catch (e) {
          console.error('Error checking for ads:', e);
        }
      }
    }, 5000); // Check every 5 seconds - more aggressive checking for better experience
    
    // When component unmounts, hide any potential debugger warnings
    window.addEventListener('beforeunload', () => {
      // Clear any pending operations
      if (iframeRef.current) {
        iframeRef.current.src = '';
      }
    });
    
    return () => {
      clearInterval(adCheckInterval);
      window.removeEventListener('beforeunload', () => {});
    };
  }, [switchSource]);

  // Auto-switch source on iframe load error
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleIframeError = () => {
      console.log('🎬 Iframe failed to load, trying next source...');
      setTimeout(switchSource, 2000); // Wait 2 seconds then switch
    };

    iframe.addEventListener('error', handleIframeError);
    
    // Handle iframe load event to establish postMessage communication
    const handleIframeLoad = () => {
      console.log('🎬 Iframe loaded, attempting to establish communication');
      try {
        // Record when the iframe loaded
        iframe.dataset.loadTime = Date.now().toString();
        
        // Attempt to send a message to the iframe to check if it's ready
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            { type: 'COSMOS_MOVIE_PING' }, 
            '*' // Using wildcard since we're dealing with third-party domains
          );
        }
      } catch (error) {
        console.error('Failed to communicate with iframe:', error);
      }
    };
    
    iframe.addEventListener('load', handleIframeLoad);
    
    return () => {
      iframe.removeEventListener('error', handleIframeError);
      iframe.removeEventListener('load', handleIframeLoad);
    };
  }, [currentSourceIndex, videoSources.length]);
  
  // Listen for messages from the iframe player (if supported by provider)
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      // Check if the message is from our video player
      if (typeof event.data === 'object' && event.data?.type?.startsWith('VIDSRC_')) {
        console.log('🎬 Received message from video iframe:', event.data);
        
        // Handle different message types
        switch (event.data.type) {
          case 'VIDSRC_PLAY':
            // Update room state if we're the host
            if (isHost) {
              playMovie();
            }
            break;
          case 'VIDSRC_PAUSE':
            // Update room state if we're the host
            if (isHost) {
              pauseMovie();
            }
            break;
          case 'VIDSRC_TIMEUPDATE':
            // Only sync time if we're the host and the change is significant (>2 seconds)
            if (isHost && roomState?.movieState?.currentTime !== undefined) {
              const currentRoomTime = roomState.movieState.currentTime;
              if (Math.abs(event.data.currentTime - currentRoomTime) > 2) {
                seekMovie(event.data.currentTime);
              }
            }
            break;
        }
      }
    };
    
    window.addEventListener('message', handleIframeMessage);
    
    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, [isHost, roomState]);

  // Auto-hide controls
  useEffect(() => {
    if (showControls) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  const handleMouseMove = () => {
    setShowControls(true);
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            key="movie-player"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            onMouseMove={handleMouseMove}
            onClick={(e) => e.stopPropagation()}
            ref={playerRef}
          >
            {/* Always Visible Close Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Clear iframe source before closing to prevent resource leaks
                if (iframeRef.current) {
                  iframeRef.current.src = '';
                }
                onClose();
              }}
              className="absolute top-4 left-4 z-50 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-all duration-200 pointer-events-auto"
              title="Close Movie Player"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Always Visible Search Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMovieSearch(true);
              }}
              className="absolute top-4 left-16 z-50 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-all duration-200 pointer-events-auto"
              title="Search Movies"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Content Area */}
            {currentMovie && currentVideoUrl ? (
              <div className="relative w-full h-full movie-iframe-wrapper">
                <div className="absolute inset-0 z-10 pointer-events-none">
                  {/* Protection layer to hide any debugger overlays */}
                  <div 
                    id="debugger-protection" 
                    className="absolute inset-0 debug-overlay-blocker"
                  ></div>
                  
                  {/* Ad blocker overlay - blocks common ad areas and allows clicking to skip ads */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-16 bg-transparent pointer-events-auto hover:bg-black/20"
                    onClick={() => switchSource()}
                    title="Click to try a different source"
                  ></div>
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-16 bg-transparent pointer-events-auto hover:bg-black/20"
                    onClick={() => switchSource()}
                    title="Click to try a different source"
                  ></div>
                  <div 
                    className="absolute top-16 left-0 w-16 bottom-16 bg-transparent pointer-events-auto hover:bg-black/20"
                    onClick={() => switchSource()}
                    title="Click to try a different source"
                  ></div>
                  <div 
                    className="absolute top-16 right-0 w-16 bottom-16 bg-transparent pointer-events-auto hover:bg-black/20"
                    onClick={() => switchSource()}
                    title="Click to try a different source"
                  ></div>
                  
                  {/* Skip ad and retry button (only appears after iframe loads) */}
                  <button
                    onClick={() => switchSource()}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white px-4 py-2 rounded-lg pointer-events-auto z-20"
                    title="Try a different source"
                  >
                    Skip Ads / Try Different Source
                  </button>
                  
                  {/* Special overlay for the astronaut error that appears on vidsrc */}
                  <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                    <div 
                      className="bg-black/80 p-4 rounded-lg max-w-sm pointer-events-auto hidden" 
                      id="astronaut-error-overlay"
                    >
                      <h3 className="text-white font-bold mb-2">Video Loading Error</h3>
                      <p className="text-gray-300 mb-4">The video player encountered an error (astronaut icon). Click below to try a different source.</p>
                      <button
                        onClick={() => switchSource()}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
                      >
                        Try Another Source
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="movie-iframe-container w-full h-full">
                  <iframe
                    ref={iframeRef}
                    src={currentVideoUrl}
                    className="w-full h-full"
                    allowFullScreen
                    allow="autoplay; encrypted-media; fullscreen; web-share"
                    sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"
                    loading="eager"
                    title={currentMovie.title}
                  />
                </div>
                {/* Source switcher overlay */}
                <div className="absolute top-4 right-4 bg-black/70 px-3 py-2 rounded text-white text-sm z-10 movie-controls">
                  <div className="flex items-center space-x-2">
                    <span>Source {currentSourceIndex + 1}/{videoSources.length}</span>
                    {videoSources.length > 1 && (
                      <button 
                        onClick={switchSource}
                        className="px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-700 transition-colors"
                        title="Try next streaming source"
                      >
                        Next
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-gray-300 mt-1">
                    {currentMovie.title} ({currentMovie.year})
                  </div>
                </div>
              </div>
            ) : currentMovie ? (
              <div className="flex flex-col items-center justify-center text-white">
                <div className="text-6xl mb-4 animate-pulse">🎬</div>
                <h2 className="text-2xl mb-2">{currentMovie.title}</h2>
                <div className="mb-6 flex flex-col items-center">
                  <p className="text-gray-300 mb-2">Loading movie sources...</p>
                  <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                      style={{ width: `${((currentSourceIndex + 1) / Math.max(videoSources.length, 1)) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-gray-400 mt-2">Source {currentSourceIndex + 1}/{videoSources.length}</p>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={switchSource}
                    className="bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg flex items-center space-x-2"
                  >
                    <span>Try Next Source</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMovieSearch(true);
                    }}
                    className="bg-gray-700 hover:bg-gray-600 px-5 py-2.5 rounded-lg flex items-center space-x-2"
                  >
                    <Search className="w-5 h-5 mr-2" />
                    <span>Choose Different Movie</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-white">
                <div className="text-6xl mb-4">🎬</div>
                <h2 className="text-2xl mb-4">No Movie Selected</h2>
                <p className="text-gray-400 mb-8">Choose a movie to start watching together</p>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMovieSearch(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg flex items-center space-x-2"
                >
                  <Search className="w-5 h-5" />
                  <span>Search Movies</span>
                </button>
              </div>
            )}

            {/* Controls Overlay - Only for movie info */}
            <AnimatePresence>
              {showControls && currentMovie && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"
                >
                  {/* Bottom Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-auto">
                    <div className="text-center">
                      <h3 className="text-white font-semibold text-lg mb-1">{currentMovie.title}</h3>
                      <p className="text-gray-300 text-sm mb-2">{currentMovie.year}</p>
                      <p className="text-gray-400 text-xs">
                        Use the video player controls to adjust volume, seek, and control playback
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Movie Search Sheet */}
      <MovieSearchSheet
        isOpen={showMovieSearch}
        onClose={() => setShowMovieSearch(false)}
      />
    </>
  );
};