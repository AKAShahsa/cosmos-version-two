import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ParticleProps {
  type: 'sad' | 'romantic' | 'wow';
  show: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  delay: number;
  size: number;
  color: string;
  emoji?: string;
}

export const CustomParticleEffect: React.FC<ParticleProps> = ({ type, show }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (show) {
      const newParticles: Particle[] = [];
      const particleCount = type === 'wow' ? 60 : 40; // Doubled particle count for density

      for (let i = 0; i < particleCount; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 120 - 10, // Wider spread: -10% to 110% (goes beyond screen edges)
          y: Math.random() * 120 - 10, // Taller spread: -10% to 110% (full screen + beyond)
          delay: Math.random() * 1, // Faster, more immediate start
          size: Math.random() * 14 + 8, // Larger particles (8-22px)
          color: getParticleColor(type),
          emoji: getParticleEmoji(type)
        });
      }
      
      setParticles(newParticles);
    } else {
      setParticles([]);
    }
  }, [show, type]);

  const getParticleColor = (particleType: string) => {
    switch (particleType) {
      case 'sad': return '#60a5fa';
      case 'romantic': return '#f472b6';
      case 'wow': return '#fbbf24';
      default: return '#8b5cf6';
    }
  };

  const getParticleEmoji = (particleType: string) => {
    switch (particleType) {
      case 'sad': return Math.random() > 0.7 ? '💧' : '';
      case 'romantic': return Math.random() > 0.6 ? '💕' : '';
      case 'wow': return Math.random() > 0.5 ? '✨' : '';
      default: return '';
    }
  };

  const getParticleMotion = (particleType: string) => {
    switch (particleType) {
      case 'sad':
        return {
          y: [0, 150, 300], // More dramatic downward movement
          x: [0, Math.random() * 60 - 30], // Side-to-side drift
          opacity: [0, 1, 0.3, 0],
          scale: [0.3, 1.2, 0.8, 0.3],
          rotate: [0, 180, 360]
        };
      case 'romantic':
        return {
          y: [-80, -150, -250], // Higher upward movement
          x: [0, Math.random() * 80 - 40, Math.random() * 120 - 60], // More horizontal drift
          opacity: [0, 1, 0.7, 0],
          scale: [0.3, 1.5, 1, 0.5],
          rotate: [0, 360, 720]
        };
      case 'wow':
        return {
          y: [-60, -120, -200, Math.random() * 400 - 200], // Explosive movement in all directions
          x: [0, Math.random() * 100 - 50, Math.random() * 200 - 100, Math.random() * 300 - 150],
          opacity: [0, 1, 0.8, 0],
          scale: [0.2, 2, 1.2, 0.3],
          rotate: [0, 720, 1440, 2160]
        };
      default:
        return {
          y: [-50, -100, -150],
          x: [0, Math.random() * 50 - 25],
          opacity: [0, 1, 0],
          scale: [0.5, 1, 0.5],
          rotate: [0, 360, 720]
        };
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ 
              x: `${particle.x}%`, 
              y: `${particle.y}%`,
              opacity: 0,
              scale: 0.5
            }}
            animate={getParticleMotion(type)}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              duration: 4, // Increased duration for more dramatic effect
              delay: particle.delay,
              ease: "easeInOut" // Smoother easing for vast movement
            }}
            className="absolute"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`
            }}
          >
            {particle.emoji ? (
              <span className="text-3xl">{particle.emoji}</span> 
            ) : (
              <div
                className="rounded-full"
                style={{
                  width: particle.size,
                  height: particle.size,
                  backgroundColor: particle.color,
                  boxShadow: `0 0 ${particle.size * 2}px ${particle.color}50`
                }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default CustomParticleEffect;
