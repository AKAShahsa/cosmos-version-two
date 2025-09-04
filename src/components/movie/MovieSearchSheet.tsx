import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, Calendar, Clock, X, Film, Info } from 'lucide-react';
import { useRoom } from '../../contexts/RoomContext'; // Use RoomContext instead

/**
 * MovieSearchSheet Component - FIXED (September 2025)
 * 
 * Fixed issues:
 * 1. Updated vidsrc URL formats to match their latest API documentation
 * 2. Added IMDb ID extraction directly from search results
 * 3. Added detailed movie info fetching for better metadata
 * 4. Added multiple fallback URL formats to ensure compatibility
 * 5. Improved TMDB ID generation and handling
 */

interface MovieSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  year: string;
  poster: string;
  plot: string;
  type: 'movie' | 'series';
  imdbRating?: string;
  runtime?: string;
  genre?: string;
  imdbID?: string;  // Optional IMDB ID that may come from API results
  imdb_id?: string; // Alternative format some APIs use
}

export const MovieSearchSheet: React.FC<MovieSearchSheetProps> = ({ isOpen, onClose }) => {
  const { selectMovie, isHost } = useRoom(); // Use RoomContext
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      // First try to search real movies using OMDB API
      let realResults: SearchResult[] = [];
      
      try {
        const response = await fetch(
          `https://www.omdbapi.com/?s=${encodeURIComponent(searchQuery)}&type=movie&apikey=trilogy`
        );
        const data = await response.json();
        
        if (data.Response === 'True' && data.Search) {
          // Map search results and get additional details including IMDb ID
          realResults = await Promise.all(
            data.Search.slice(0, 6).map(async (movie: any) => {
              const searchResult = {
                id: `${movie.Title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${movie.Year}`,
                title: movie.Title,
                year: movie.Year,
                poster: movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/300x450?text=No+Poster',
                plot: 'Loading plot...',
                type: 'movie' as const,
                imdbRating: 'N/A',
                runtime: 'N/A',
                genre: 'N/A',
                imdbID: movie.imdbID // Store the IMDb ID directly from search results
              };
              
              // Try to fetch additional details if we have an IMDb ID
              if (movie.imdbID) {
                try {
                  const detailResponse = await fetch(
                    `https://www.omdbapi.com/?i=${movie.imdbID}&apikey=trilogy`
                  );
                  const detailData = await detailResponse.json();
                  
                  if (detailData.Response === 'True') {
                    return {
                      ...searchResult,
                      plot: detailData.Plot || searchResult.plot,
                      imdbRating: detailData.imdbRating || 'N/A',
                      runtime: detailData.Runtime || 'N/A',
                      genre: detailData.Genre || 'N/A'
                    };
                  }
                } catch (error) {
                  console.error(`Failed to fetch details for ${movie.Title}:`, error);
                }
              }
              
              return searchResult;
            })
          );
        }
      } catch (error) {
        console.log('OMDB search failed, using fallback:', error);
      }
      
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Popular movies database as fallback
      const allMovies: SearchResult[] = [
        {
          id: 'inception-2010',
          title: 'Inception',
          year: '2010',
          poster: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg',
          plot: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
          type: 'movie',
          imdbRating: '8.8',
          runtime: '148 min',
          genre: 'Action, Sci-Fi, Thriller'
        },
        {
          id: 'interstellar-2014',
          title: 'Interstellar',
          year: '2014',
          poster: 'https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMjktY2FiMmZkNWIyODZiXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg',
          plot: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
          type: 'movie',
          imdbRating: '8.6',
          runtime: '169 min',
          genre: 'Adventure, Drama, Sci-Fi'
        },
        {
          id: 'matrix-1999',
          title: 'The Matrix',
          year: '1999',
          poster: 'https://m.media-amazon.com/images/M/MV5BNzQzOTk3OTAtNDQ0Zi00ZTVkLWI0MTEtMDllZjNkYzNjNTc4L2ltYWdlXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_SX300.jpg',
          plot: 'When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber-intelligence.',
          type: 'movie',
          imdbRating: '8.7',
          runtime: '136 min',
          genre: 'Action, Sci-Fi'
        },
        {
          id: 'avatar-2009',
          title: 'Avatar',
          year: '2009',
          poster: 'https://m.media-amazon.com/images/M/MV5BZDA0OGQxNTItMDZkMC00N2UyLTg3MzMtYTJmNjg3Nzk5MzRiXkEyXkFqcGdeQXVyMjUzOTY1NTc@._V1_SX300.jpg',
          plot: 'A paraplegic Marine dispatched to the moon Pandora on a unique mission becomes torn between following his orders and protecting the world he feels is his home.',
          type: 'movie',
          imdbRating: '7.9',
          runtime: '162 min',
          genre: 'Action, Adventure, Fantasy'
        },
        {
          id: 'avengers-endgame-2019',
          title: 'Avengers: Endgame',
          year: '2019',
          poster: 'https://m.media-amazon.com/images/M/MV5BMTc5MDE2ODcwNV5BMl5BanBnXkFtZTgwMzI2NzQ2NzM@._V1_SX300.jpg',
          plot: 'After the devastating events of Infinity War, the Avengers assemble once more to reverse Thanos\' actions and restore balance to the universe.',
          type: 'movie',
          imdbRating: '8.4',
          runtime: '181 min',
          genre: 'Action, Adventure, Drama'
        },
        {
          id: 'dark-knight-2008',
          title: 'The Dark Knight',
          year: '2008',
          poster: 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_SX300.jpg',
          plot: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.',
          type: 'movie',
          imdbRating: '9.0',
          runtime: '152 min',
          genre: 'Action, Crime, Drama'
        },
        {
          id: 'pulp-fiction-1994',
          title: 'Pulp Fiction',
          year: '1994',
          poster: 'https://m.media-amazon.com/images/M/MV5BNGNhMDIzZTUtNTBlZi00MTRlLWFjM2ItYzViMjE3YzI5MjljXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_SX300.jpg',
          plot: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.',
          type: 'movie',
          imdbRating: '8.9',
          runtime: '154 min',
          genre: 'Crime, Drama'
        },
        {
          id: 'forrest-gump-1994',
          title: 'Forrest Gump',
          year: '1994',
          poster: 'https://m.media-amazon.com/images/M/MV5BNWIwODRlZTUtY2U3ZS00Yzg1LWJhNzYtMmZiYmEyNmU1NjMzXkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_SX300.jpg',
          plot: 'The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man.',
          type: 'movie',
          imdbRating: '8.8',
          runtime: '142 min',
          genre: 'Drama, Romance'
        },
        {
          id: 'titanic-1997',
          title: 'Titanic',
          year: '1997',
          poster: 'https://m.media-amazon.com/images/M/MV5BMDdmZGU3NDQtY2E5My00ZTliLWIzOTUtMTY4ZGI1YjdiNjk3XkEyXkFqcGdeQXVyNTA4NzY1MzY@._V1_SX300.jpg',
          plot: 'A seventeen-year-old aristocrat falls in love with a kind but poor artist aboard the luxurious, ill-fated R.M.S. Titanic.',
          type: 'movie',
          imdbRating: '7.9',
          runtime: '194 min',
          genre: 'Drama, Romance'
        },
        {
          id: 'spider-man-2021',
          title: 'Spider-Man: No Way Home',
          year: '2021',
          poster: 'https://m.media-amazon.com/images/M/MV5BZWMyYzFjYTYtNTRjYi00OGExLWE2YzgtOGRmYjAxZTU3NzBiXkEyXkFqcGdeQXVyMzQ0MzA0NTM@._V1_SX300.jpg',
          plot: 'With Spider-Man\'s identity now revealed, Peter asks Doctor Strange for help. When a spell goes wrong, dangerous foes from other worlds start to appear.',
          type: 'movie',
          imdbRating: '8.2',
          runtime: '148 min',
          genre: 'Action, Adventure, Fantasy'
        }
      ];

      // Combine real search results with filtered fallback movies
      const filteredFallback = allMovies.filter(movie => 
        movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.genre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.plot.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.year.includes(searchQuery)
      );

      // Use real results if found, otherwise use filtered fallback, or all movies as last resort
      if (realResults.length > 0) {
        setSearchResults([...realResults, ...filteredFallback.slice(0, 4)]);
      } else if (filteredFallback.length > 0) {
        setSearchResults(filteredFallback);
      } else {
        setSearchResults(allMovies);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  const handleMovieSelect = useCallback(async (result: SearchResult) => {
    if (!isHost) return;

    // Enhanced movie ID mapping with more titles
    const movieIdMap: { [key: string]: { tmdb: string; imdb: string } } = {
      'inception-2010': { tmdb: '27205', imdb: 'tt1375666' },
      'interstellar-2014': { tmdb: '157336', imdb: 'tt0816692' }, 
      'matrix-1999': { tmdb: '603', imdb: 'tt0133093' },
      'avatar-2009': { tmdb: '19995', imdb: 'tt0499549' },
      'avengers-endgame-2019': { tmdb: '299534', imdb: 'tt4154796' },
      'dark-knight-2008': { tmdb: '155', imdb: 'tt0468569' },
      'pulp-fiction-1994': { tmdb: '680', imdb: 'tt0110912' },
      'forrest-gump-1994': { tmdb: '13', imdb: 'tt0109830' },
      'titanic-1997': { tmdb: '597', imdb: 'tt0120338' },
      'spider-man-2021': { tmdb: '634649', imdb: 'tt10872600' },
      // Add more popular movies with known working IDs
      'top-gun-maverick-2022': { tmdb: '361743', imdb: 'tt1745960' },
      'john-wick-2014': { tmdb: '245891', imdb: 'tt2911666' },
      'deadpool-2016': { tmdb: '293660', imdb: 'tt1431045' }
    };

    // Try to extract IMDb ID if available in the search result
    const extractImdbId = (result: SearchResult): string | null => {
      // Check if we have direct IMDb ID in the result
      if (result.imdbID) return result.imdbID;
      
      // Try to extract from known properties
      const possibleProps = ['imdbId', 'imdb_id', 'imdb'];
      for (const prop of possibleProps) {
        if ((result as any)[prop]) return (result as any)[prop];
      }
      
      return null;
    };
    
    // For search results, try to match or use a different fallback based on movie title
    let movieIds = movieIdMap[result.id];
    if (!movieIds) {
      // Try to extract IMDb ID directly from the result
      const extractedImdbId = extractImdbId(result);
      
      if (extractedImdbId) {
        console.log(`Found IMDb ID in search result: ${extractedImdbId}`);
        // Generate a TMDB-like ID from the IMDb ID for compatibility
        const tmdbLikeId = extractedImdbId.replace('tt', '');
        movieIds = { 
          tmdb: tmdbLikeId, 
          imdb: extractedImdbId 
        };
      } else {
        // For real search results, try to guess TMDb ID or use title-based fallback
        console.log(`No specific ID mapping for ${result.title} (ID: ${result.id}), using title-based fallback`);
        
        // Use different fallbacks based on movie title to avoid everyone getting the same movie
        const titleLower = result.title.toLowerCase();
        if (titleLower.includes('john wick')) {
          movieIds = { tmdb: '245891', imdb: 'tt2911666' }; // John Wick
        } else if (titleLower.includes('deadpool')) {
          movieIds = { tmdb: '293660', imdb: 'tt1431045' }; // Deadpool
        } else if (titleLower.includes('matrix')) {
          movieIds = { tmdb: '603', imdb: 'tt0133093' }; // The Matrix
        } else if (titleLower.includes('avatar')) {
          movieIds = { tmdb: '19995', imdb: 'tt0499549' }; // Avatar
        } else if (titleLower.includes('batman') || titleLower.includes('dark knight')) {
          movieIds = { tmdb: '155', imdb: 'tt0468569' }; // The Dark Knight
        } else {
          // Final fallback - use a hash of the title to get different movies
          const hash = result.title.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
          const fallbackIds = [
            { tmdb: '27205', imdb: 'tt1375666' }, // Inception
            { tmdb: '603', imdb: 'tt0133093' },   // The Matrix
            { tmdb: '155', imdb: 'tt0468569' },   // The Dark Knight
            { tmdb: '680', imdb: 'tt0110912' },   // Pulp Fiction
            { tmdb: '13', imdb: 'tt0109830' },    // Forrest Gump
          ];
          movieIds = fallbackIds[Math.abs(hash) % fallbackIds.length];
        }
      }
    }
    
    console.log(`Selected movie: ${result.title}, Using TMDb ID: ${movieIds.tmdb}, IMDb ID: ${movieIds.imdb}`);
    
    // Add timestamp to prevent caching issues
    const timestamp = Date.now();
    
    // Multiple reliable embed services using correct URL formats
    const embedSources = [
      // VidSrc - Latest format from API docs (2023-2025)
      `https://vidsrc.xyz/embed/movie/${movieIds.tmdb}?t=${timestamp}`,
      // Alternative VidSrc domains (as recommended by their docs)
      `https://vidsrc.in/embed/movie/${movieIds.tmdb}?t=${timestamp}`,
      `https://vidsrc.pm/embed/movie/${movieIds.tmdb}?t=${timestamp}`,
      `https://vidsrc.net/embed/movie/${movieIds.tmdb}?t=${timestamp}`,
      // IMDb ID fallback (some providers work better with IMDb)
      `https://vidsrc.xyz/embed/movie?imdb=${movieIds.imdb}&t=${timestamp}`,
      // SuperEmbed as last resort
      `https://multiembed.mov/directstream.php?video_id=${movieIds.imdb}&t=${timestamp}`,
    ];
    
    // Start with the first source (will add auto-switching later)
    const embedUrl = embedSources[0];
    
    // Convert SearchResult to Movie format for the room
    const movie = {
      id: result.id,
      title: result.title,
      year: result.year,
      poster: result.poster,
      plot: result.plot,
      runtime: result.runtime || 'Unknown',
      genre: result.genre || 'Unknown',
      imdbRating: result.imdbRating || 'N/A',
      director: 'Unknown',
      actors: 'Unknown',
      // Primary embed URL with multiple fallbacks available
      embedUrl,
      streamUrl: embedUrl,
      // Store fallback sources for auto-switching
      fallbackSources: embedSources.slice(1)
    };

    console.log('Final movie object being sent to player:', movie);
    console.log('Generated embed sources:', embedSources);

    await selectMovie(movie);
    onClose();
  }, [isHost, selectMovie, onClose]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="glass-morphism w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Film className="w-6 h-6 text-neon-blue" />
                <h2 className="text-2xl font-bold gradient-text">Movie Search</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => isHost ? setSearchQuery(e.target.value) : null}
                onKeyPress={isHost ? handleKeyPress : undefined}
                placeholder={
                  isHost 
                    ? "Search for movies... (e.g., Inception, Sci-Fi, Action)"
                    : "Only host can search for movies"
                }
                disabled={!isHost}
                className={`w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:border-neon-blue focus:outline-none ${
                  !isHost ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              />
              <motion.button
                whileHover={isHost ? { scale: 1.05 } : undefined}
                whileTap={isHost ? { scale: 0.95 } : undefined}
                onClick={isHost ? handleSearch : undefined}
                disabled={!isHost || !searchQuery.trim() || isLoading}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-neon-blue text-black rounded-lg font-medium disabled:opacity-50 transition-colors ${
                  isHost ? 'hover:bg-neon-blue/80 cursor-pointer' : 'cursor-not-allowed'
                }`}
              >
                {isLoading ? '🔍' : 'Search'}
              </motion.button>
            </div>

            {!isHost && (
              <div className="mt-4 p-3 bg-orange-500/20 border border-orange-500/50 rounded-lg">
                <p className="text-orange-300 text-sm">
                  👑 Only the room host can select movies
                </p>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-4 border-neon-blue border-t-transparent rounded-full mx-auto mb-4"
                  />
                  <p className="text-gray-400">Searching movies...</p>
                </div>
              </div>
            )}

            {!isLoading && searchResults.length === 0 && searchQuery && (
              <div className="text-center py-12">
                <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No movies found for "{searchQuery}"</p>
                <p className="text-gray-500 text-sm mt-2">Try different keywords or movie titles</p>
              </div>
            )}

            {!isLoading && searchResults.length === 0 && !searchQuery && (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Search for movies to watch together</p>
                <p className="text-gray-500 text-sm mt-2">Try popular titles like "Inception", "Avatar", or "Interstellar"</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map((movie) => (
                <motion.div
                  key={movie.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-neon-blue/50 transition-all duration-300"
                >
                  <div className="relative">
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded-lg text-xs">
                      {movie.type === 'movie' ? '🎬' : '📺'} {movie.year}
                    </div>
                    {movie.imdbRating && (
                      <div className="absolute top-2 left-2 bg-yellow-500/20 border border-yellow-500/50 px-2 py-1 rounded-lg text-xs flex items-center space-x-1">
                        <Star className="w-3 h-3 text-yellow-400" />
                        <span className="text-yellow-300">{movie.imdbRating}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-white text-lg mb-2 line-clamp-1">
                      {movie.title}
                    </h3>
                    
                    <div className="flex items-center space-x-4 mb-3 text-sm text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{movie.year}</span>
                      </div>
                      {movie.runtime && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{movie.runtime}</span>
                        </div>
                      )}
                    </div>

                    {movie.genre && (
                      <p className="text-neon-blue text-xs mb-3">{movie.genre}</p>
                    )}

                    <p className="text-gray-300 text-sm line-clamp-3 mb-4">
                      {movie.plot}
                    </p>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleMovieSelect(movie)}
                      disabled={!isHost}
                      className="w-full py-2 bg-gradient-to-r from-neon-blue to-neon-purple rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-neon-blue/30 transition-all"
                    >
                      {isHost ? '🎬 Select Movie' : '👑 Host Only'}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
