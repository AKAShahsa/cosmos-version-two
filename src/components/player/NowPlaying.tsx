import { motion } from 'framer-motion';
import { useRoom } from '../../contexts/RoomContext';

export function NowPlaying() {
  const { roomState } = useRoom();

  if (!roomState?.currentTrack) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4"
    >
      <div className="glass-morphism p-4 rounded-2xl">
        <div className="flex items-center gap-4">
          <motion.img
            animate={{ rotate: roomState.isPlaying ? 360 : 0 }}
            transition={{ 
              duration: 10, 
              repeat: roomState.isPlaying ? Infinity : 0, 
              ease: "linear" 
            }}
            src={roomState.currentTrack.thumbnail}
            alt={roomState.currentTrack.title}
            className="w-16 h-16 rounded-xl object-cover shadow-lg"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white truncate text-lg">
              {roomState.currentTrack.title}
            </h3>
            <p className="text-gray-400 truncate text-sm">
              {roomState.currentTrack.artist}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${
                roomState.isPlaying ? 'bg-green-400' : 'bg-gray-400'
              }`} />
              <span className="text-xs text-gray-500">
                {roomState.isPlaying ? 'Playing' : 'Paused'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
