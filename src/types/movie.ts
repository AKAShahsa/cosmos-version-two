// Movie types and interfaces
export interface Movie {
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
}

export interface MovieState {
  currentMovie: Movie | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  isFullscreen: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface MovieRoomState {
  roomId: string;
  movieState: MovieState;
  hostId: string;
  members: { [userId: string]: { name: string; isReady: boolean } };
  isMovieMode: boolean;
  createdAt: number;
  lastActivity: number;
}

export interface VidCloudResponse {
  title: string;
  year: string;
  poster: string;
  plot: string;
  sources: Array<{
    quality: string;
    url: string;
    type: string;
  }>;
  embedUrl: string;
}

export interface SearchResult {
  id: string;
  title: string;
  year: string;
  poster: string;
  plot: string;
  type: 'movie' | 'series';
  imdbRating?: string;
}
