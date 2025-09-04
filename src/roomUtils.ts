import { database } from './firebase';
import { ref, push, set, onValue, off, remove, update } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';

export interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  videoId: string;
}

export interface RoomState {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  playlist: Track[];
  members: { [userId: string]: { name: string; joinedAt: number } };
  createdAt: number;
  lastActivity: number;
  // Movie fields - seamlessly integrated
  isMovieMode?: boolean;
  currentMovie?: {
    id: string;
    title: string;
    year: string;
    poster: string;
    plot: string;
    runtime: string;
    genre: string;
    imdbRating: string;
    director: string;
    actors: string;
    embedUrl?: string;
    streamUrl?: string;
    fallbackSources?: string[];
  } | null;
  movieState?: {
    isPlaying: boolean;
    currentTime: number;
    volume: number;
    isFullscreen: boolean;
    isLoading: boolean;
  };
}

export interface User {
  id: string;
  name: string;
}

// Generate unique user ID
export const generateUserId = (): string => {
  return uuidv4();
};

// Generate room code
export const generateRoomCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Create a new room
export const createRoom = async (hostName: string): Promise<string> => {
  const roomId = generateRoomCode();
  const hostId = generateUserId();
  
  const roomData: RoomState = {
    id: roomId,
    name: `${hostName}'s Room`,
    hostId,
    hostName,
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    volume: 70,
    playlist: [],
    members: {
      [hostId]: {
        name: hostName,
        joinedAt: Date.now()
      }
    },
    createdAt: Date.now(),
    lastActivity: Date.now()
  };

  await set(ref(database, `rooms/${roomId}`), roomData);
  
  // Store user info locally
  localStorage.setItem('userId', hostId);
  localStorage.setItem('userName', hostName);
  
  return roomId;
};

// Join an existing room
export const joinRoom = async (roomId: string, userName: string): Promise<boolean> => {
  const userId = generateUserId();
  
  try {
    console.log('🔍 Checking room:', roomId);
    
    // Check if room exists
    const roomRef = ref(database, `rooms/${roomId}`);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('⏰ Room check timeout');
        off(roomRef);
        reject(new Error('Connection timeout'));
      }, 10000); // 10 second timeout for mobile connections
      
      onValue(roomRef, (snapshot) => {
        clearTimeout(timeout);
        
        if (snapshot.exists()) {
          console.log('✅ Room found, adding user:', userName);
          
          // Add user to room members
          const memberRef = ref(database, `rooms/${roomId}/members/${userId}`);
          set(memberRef, {
            name: userName,
            joinedAt: Date.now()
          }).then(() => {
            // Update last activity
            return update(ref(database, `rooms/${roomId}`), {
              lastActivity: Date.now()
            });
          }).then(() => {
            // Store user info locally
            localStorage.setItem('userId', userId);
            localStorage.setItem('userName', userName);
            localStorage.setItem('roomId', roomId);
            
            console.log('✅ Successfully joined room');
            resolve(true);
          }).catch((error) => {
            console.error('❌ Error adding user to room:', error);
            resolve(false);
          });
        } else {
          console.log('❌ Room not found:', roomId);
          resolve(false);
        }
        off(roomRef);
      }, (error) => {
        clearTimeout(timeout);
        console.error('❌ Firebase error:', error);
        resolve(false);
      });
    });
  } catch (error) {
    console.error('❌ Join room error:', error);
    return false;
  }
};

// Leave room
export const leaveRoom = async (roomId: string, userId: string): Promise<void> => {
  try {
    await remove(ref(database, `rooms/${roomId}/members/${userId}`));
    
    // Clean up local storage
    localStorage.removeItem('roomId');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
  } catch (error) {
    console.error('Error leaving room:', error);
  }
};

// Update room state (host only)
export const updateRoomState = async (
  roomId: string, 
  updates: Partial<Pick<RoomState, 'currentTrack' | 'isPlaying' | 'currentTime' | 'volume' | 'playlist' | 'hostId' | 'isMovieMode' | 'currentMovie' | 'movieState'>>
): Promise<void> => {
  try {
    await update(ref(database, `rooms/${roomId}`), {
      ...updates,
      lastActivity: Date.now()
    });
  } catch (error) {
    console.error('Error updating room state:', error);
  }
};

// Listen to room changes
export const subscribeToRoom = (
  roomId: string, 
  callback: (roomState: RoomState | null) => void
): (() => void) => {
  const roomRef = ref(database, `rooms/${roomId}`);
  
  const unsubscribe = onValue(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as RoomState);
    } else {
      callback(null);
    }
  });
  
  // Return proper unsubscribe function
  return unsubscribe;
};

// Get current user info
export const getCurrentUser = (): User | null => {
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName');
  
  if (userId && userName) {
    return { id: userId, name: userName };
  }
  
  return null;
};

// Check if user is host
export const isHost = (roomState: RoomState | null, userId: string): boolean => {
  return roomState?.hostId === userId;
};
