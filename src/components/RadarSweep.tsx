import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio } from 'lucide-react';

interface RadarSweepProps {
  isActive: boolean;
  secondsRemaining?: number;
}

export const RadarSweep: React.FC<RadarSweepProps> = ({
  isActive,
  secondsRemaining = 0,
}) => {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="radar-overlay"
        >
          {/* Rotating radar sweep beam */}
          <div className="radar-sweep-beam" />

          {/* Pulsing concentric rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[300px] h-[300px] rounded-full border border-primary/30 animate-ping-slow" />
            <div className="absolute w-[500px] h-[500px] rounded-full border border-primary/20 animate-ping-slow [animation-delay:0.8s]" />
          </div>

          {/* Radar Scan Alert Pill */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40">
            <motion.div
              initial={{ y: -20, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.9 }}
              className="bg-primary/90 text-primary-foreground font-display px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-white/20 backdrop-blur-md"
            >
              <Radio className="w-4 h-4 animate-spin text-black" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Radar Sweep Active • {secondsRemaining}s
              </span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
