import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(roomId: string, userId: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    // For development, we'll use a simple WebSocket simulation
    // In production, you'd connect to your actual Socket.IO server
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? 'wss://your-socket-server.com' 
      : 'ws://localhost:3001';

    console.log('🔌 Connecting to socket server...');
    
    this.socket = io(socketUrl, {
      transports: ['websocket'],
      query: { roomId, userId },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected!');
      this.reconnectAttempts = 0;
      this.socket?.emit('join-room', { roomId, userId });
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Movie sync events
  emitMoviePlay(roomId: string, timestamp: number) {
    this.socket?.emit('movie-play', { roomId, timestamp });
  }

  emitMoviePause(roomId: string, timestamp: number) {
    this.socket?.emit('movie-pause', { roomId, timestamp });
  }

  emitMovieSeek(roomId: string, timestamp: number) {
    this.socket?.emit('movie-seek', { roomId, timestamp });
  }

  emitMovieChange(roomId: string, movieData: any) {
    this.socket?.emit('movie-change', { roomId, movieData });
  }

  emitMovieEnd(roomId: string) {
    this.socket?.emit('movie-end', { roomId });
  }

  // Listen to movie sync events
  onMoviePlay(callback: (data: { timestamp: number }) => void) {
    this.socket?.on('movie-play', callback);
  }

  onMoviePause(callback: (data: { timestamp: number }) => void) {
    this.socket?.on('movie-pause', callback);
  }

  onMovieSeek(callback: (data: { timestamp: number }) => void) {
    this.socket?.on('movie-seek', callback);
  }

  onMovieChange(callback: (data: { movieData: any }) => void) {
    this.socket?.on('movie-change', callback);
  }

  onMovieEnd(callback: () => void) {
    this.socket?.on('movie-end', callback);
  }

  // Remove listeners
  offMovieEvents() {
    this.socket?.off('movie-play');
    this.socket?.off('movie-pause');
    this.socket?.off('movie-seek');
    this.socket?.off('movie-change');
    this.socket?.off('movie-end');
  }
}

export const socketManager = new SocketManager();
export default socketManager;
