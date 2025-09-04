import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  RoomState,
  Track,
  User,
  createRoom,
  joinRoom,
  leaveRoom,
  subscribeToRoom,
  updateRoomState
} from '../roomUtils';

interface RoomContextType {
  roomState: RoomState | null;
  currentUser: User | null;
  isHost: boolean;
  isConnected: boolean;
  showCreateRoom: boolean;
  showJoinRoom: boolean;
  setShowCreateRoom: (show: boolean) => void;
  setShowJoinRoom: (show: boolean) => void;
  createNewRoom: (hostName: string) => Promise<string>;
  joinExistingRoom: (roomId: string, userName: string) => Promise<boolean>;
  leaveCurrentRoom: () => void;
  playTrack: (track: Track) => Promise<void>;
  pauseTrack: () => Promise<void>;
  resumeTrack: () => Promise<void>;
  addToPlaylist: (track: Track) => Promise<void>;
  removeFromPlaylist: (trackId: string) => Promise<void>;
  transferHost: (newHostId: string) => Promise<void>;
  updateCurrentTime: (time: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  // Movie functions - seamlessly integrated with music room
  startMovieMode: () => Promise<void>;
  exitMovieMode: () => Promise<void>;
  selectMovie: (movie: any) => Promise<void>;
  playMovie: () => Promise<void>;
  pauseMovie: () => Promise<void>;
  seekMovie: (timestamp: number) => Promise<void>;
  setMovieVolume: (volume: number) => Promise<void>;
}

const RoomContext = createContext<RoomContextType | null>(null);

// Separate the hook from the provider to avoid Fast Refresh issues
function useRoom(): RoomContextType {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
}

interface RoomProviderProps {
  children: React.ReactNode;
}

function RoomProvider({ children }: RoomProviderProps) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinRoom, setShowJoinRoom] = useState(false);

  const isConnected = roomState !== null;
  const isHost = currentUser?.id === roomState?.hostId;

  // Subscribe to room updates - removed this to prevent loops
  // Room subscriptions are now handled in individual create/join functions

  const createNewRoom = useCallback(async (hostName: string): Promise<string> => {
    try {
      const roomId = await createRoom(hostName);
      
      // Get the hostId that was generated and stored by createRoom
      const hostId = localStorage.getItem('userId');
      if (hostId) {
        setCurrentUser({ id: hostId, name: hostName });
        
        // Set up room subscription after a short delay to ensure Firebase has the data
        setTimeout(() => {
          // Clean up any existing subscription first
          if ((window as any).roomUnsubscribe) {
            console.log('🧹 Cleaning up existing room subscription before creating new one');
            (window as any).roomUnsubscribe();
            (window as any).roomUnsubscribe = null;
          }
          
          const unsubscribe = subscribeToRoom(roomId, (updatedRoom) => {
            if (updatedRoom) {
              setRoomState(updatedRoom);
            } else {
              setRoomState(null);
              setCurrentUser(null);
            }
          });
          
          // Store unsubscribe function for cleanup
          (window as any).roomUnsubscribe = unsubscribe;
        }, 100);
      }
      
      setShowCreateRoom(false);
      return roomId;
    } catch (error) {
      console.error('Failed to create room:', error);
      throw error;
    }
  }, []);

  const joinExistingRoom = useCallback(async (roomId: string, userName: string): Promise<boolean> => {
    try {
      const success = await joinRoom(roomId, userName);
      
      if (success) {
        // Get the userId that was generated and stored by joinRoom
        const userId = localStorage.getItem('userId');
        if (userId) {
          setCurrentUser({ id: userId, name: userName });
          
          // Set up room subscription after a short delay
          setTimeout(() => {
            // Clean up any existing subscription first
            if ((window as any).roomUnsubscribe) {
              console.log('🧹 Cleaning up existing room subscription before joining');
              (window as any).roomUnsubscribe();
              (window as any).roomUnsubscribe = null;
            }
            
            const unsubscribe = subscribeToRoom(roomId, (updatedRoom) => {
              if (updatedRoom) {
                setRoomState(updatedRoom);
              } else {
                setRoomState(null);
                setCurrentUser(null);
              }
            });
            
            // Store unsubscribe function for cleanup
            (window as any).roomUnsubscribe = unsubscribe;
          }, 100);
        }
        
        setShowJoinRoom(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to join room:', error);
      return false;
    }
  }, []);

  const leaveCurrentRoom = useCallback(() => {
    if (roomState && currentUser) {
      leaveRoom(roomState.id, currentUser.id);
      
      // Clean up subscription
      if ((window as any).roomUnsubscribe) {
        (window as any).roomUnsubscribe();
        (window as any).roomUnsubscribe = null;
      }
      
      setRoomState(null);
      setCurrentUser(null);
    }
  }, [roomState, currentUser]);

  const playTrack = useCallback(async (track: Track) => {
    if (!roomState || !isHost) return;
    
    try {
      await updateRoomState(roomState.id, {
        currentTrack: track,
        isPlaying: true,
        currentTime: 0,
      });
    } catch (error) {
      console.error('Failed to play track:', error);
    }
  }, [roomState, isHost]);

  const pauseTrack = useCallback(async () => {
    if (!roomState || !isHost) return;
    
    try {
      // Save current time when pausing so we can resume from the same position
      const currentTime = roomState.currentTime;
      await updateRoomState(roomState.id, {
        isPlaying: false,
        currentTime: currentTime, // Preserve current time
      });
    } catch (error) {
      console.error('Failed to pause track:', error);
    }
  }, [roomState, isHost]);

  const resumeTrack = useCallback(async () => {
    if (!roomState || !isHost) return;
    
    try {
      // Resume with current time preserved
      await updateRoomState(roomState.id, {
        isPlaying: true,
        // Don't reset currentTime - keep it as is
      });
    } catch (error) {
      console.error('Failed to resume track:', error);
    }
  }, [roomState, isHost]);

  const addToPlaylist = useCallback(async (track: Track) => {
    if (!roomState || !isHost) return;
    
    try {
      const updatedPlaylist = [...(roomState.playlist || []), track];
      await updateRoomState(roomState.id, {
        playlist: updatedPlaylist,
      });
    } catch (error) {
      console.error('Failed to add track to playlist:', error);
    }
  }, [roomState, isHost]);

  const removeFromPlaylist = useCallback(async (trackId: string) => {
    if (!roomState || !isHost) return;
    
    try {
      const updatedPlaylist = roomState.playlist.filter(track => track.id !== trackId);
      await updateRoomState(roomState.id, {
        playlist: updatedPlaylist,
      });
    } catch (error) {
      console.error('Failed to remove track from playlist:', error);
    }
  }, [roomState, isHost]);

  const transferHost = useCallback(async (newHostId: string) => {
    if (!roomState || !isHost) return;
    
    try {
      await updateRoomState(roomState.id, {
        hostId: newHostId,
      });
    } catch (error) {
      console.error('Failed to transfer host:', error);
    }
  }, [roomState, isHost]);

  const updateCurrentTime = useCallback(async (time: number) => {
    if (!roomState || !isHost) return;
    
    try {
      await updateRoomState(roomState.id, {
        currentTime: time,
      });
    } catch (error) {
      console.error('Failed to update current time:', error);
    }
  }, [roomState, isHost]);

  const setVolume = useCallback(async (volume: number) => {
    if (!roomState || !isHost) return;
    
    try {
      await updateRoomState(roomState.id, {
        volume: volume,
      });
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  }, [roomState, isHost]);

  // Movie functions - seamlessly integrated with the same room
  const startMovieMode = useCallback(async () => {
    if (!roomState || !isHost) return;
    
    try {
      await updateRoomState(roomState.id, {
        isMovieMode: true,
        movieState: {
          isPlaying: false,
          currentTime: 0,
          volume: 70,
          isFullscreen: false,
          isLoading: false,
        }
      });
    } catch (error) {
      console.error('Failed to start movie mode:', error);
    }
  }, [roomState, isHost]);

  const exitMovieMode = useCallback(async () => {
    if (!roomState || !isHost) return;
    
    try {
      await updateRoomState(roomState.id, {
        isMovieMode: false,
        currentMovie: null,
        movieState: {
          isPlaying: false,
          currentTime: 0,
          volume: 70,
          isFullscreen: false,
          isLoading: false,
        }
      });
    } catch (error) {
      console.error('Failed to exit movie mode:', error);
    }
  }, [roomState, isHost]);

  const selectMovie = useCallback(async (movie: any) => {
    if (!roomState || !isHost) return;
    
    try {
      await updateRoomState(roomState.id, {
        currentMovie: movie,
        movieState: {
          isPlaying: false,
          currentTime: 0,
          volume: 70,
          isFullscreen: false,
          isLoading: false,
        }
      });
    } catch (error) {
      console.error('Failed to select movie:', error);
    }
  }, [roomState, isHost]);

  const playMovie = useCallback(async () => {
    if (!roomState || !isHost) return;
    
    try {
      await updateRoomState(roomState.id, {
        movieState: {
          ...roomState.movieState,
          isPlaying: true,
          isLoading: false,
        }
      });
    } catch (error) {
      console.error('Failed to play movie:', error);
    }
  }, [roomState, isHost]);

  const pauseMovie = useCallback(async () => {
    if (!roomState || !isHost) return;
    
    try {
      await updateRoomState(roomState.id, {
        movieState: {
          ...roomState.movieState,
          isPlaying: false,
        }
      });
    } catch (error) {
      console.error('Failed to pause movie:', error);
    }
  }, [roomState, isHost]);

  const seekMovie = useCallback(async (timestamp: number) => {
    if (!roomState || !isHost) return;
    
    try {
      await updateRoomState(roomState.id, {
        movieState: {
          ...roomState.movieState,
          currentTime: timestamp,
        }
      });
    } catch (error) {
      console.error('Failed to seek movie:', error);
    }
  }, [roomState, isHost]);

  const setMovieVolume = useCallback(async (volume: number) => {
    if (!roomState) return;
    
    try {
      await updateRoomState(roomState.id, {
        movieState: {
          ...roomState.movieState,
          volume: volume,
        }
      });
    } catch (error) {
      console.error('Failed to set movie volume:', error);
    }
  }, [roomState]);

  const value: RoomContextType = useMemo(() => ({
    roomState,
    currentUser,
    isHost,
    isConnected,
    showCreateRoom,
    showJoinRoom,
    setShowCreateRoom,
    setShowJoinRoom,
    createNewRoom,
    joinExistingRoom,
    leaveCurrentRoom,
    playTrack,
    pauseTrack,
    resumeTrack,
    addToPlaylist,
    removeFromPlaylist,
    transferHost,
    updateCurrentTime,
    setVolume,
    // Movie functions
    startMovieMode,
    exitMovieMode,
    selectMovie,
    playMovie,
    pauseMovie,
    seekMovie,
    setMovieVolume,
  }), [
    roomState,
    currentUser,
    isHost,
    isConnected,
    showCreateRoom,
    showJoinRoom,
    createNewRoom,
    joinExistingRoom,
    leaveCurrentRoom,
    playTrack,
    pauseTrack,
    resumeTrack,
    addToPlaylist,
    removeFromPlaylist,
    transferHost,
    updateCurrentTime,
    setVolume,
    // Movie functions
    startMovieMode,
    exitMovieMode,
    selectMovie,
    playMovie,
    pauseMovie,
    seekMovie,
    setMovieVolume,
  ]);

  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  );
}

// Export with proper naming for Fast Refresh compatibility
export { useRoom, RoomProvider };