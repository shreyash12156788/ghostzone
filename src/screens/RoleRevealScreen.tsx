import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Shield, Radio, FastForward } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { soundEffects } from '../lib/audio';
import { vibrate, HapticPatterns } from '../lib/vibration';
import { gameService } from '../services';

interface RoleRevealScreenProps {
  onAdvance?: () => void;
}

export const RoleRevealScreen: React.FC<RoleRevealScreenProps> = ({ onAdvance }) => {
  const room = useGameStore((state) => state.room);
  const playerId = useGameStore((state) => state.playerId);
  const t = useGameStore((state) => state.t);

  const [countdown, setCountdown] = useState(5);

  const currentPlayer = playerId && room ? room.players[playerId] : null;
  const isSeeker = currentPlayer?.role === 'SEEKER';

  useEffect(() => {
    soundEffects.playRoleReveal();
    vibrate(HapticPatterns.roleReveal);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onAdvance) onAdvance();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onAdvance]);

  const handleSkip = () => {
    if (room) {
      gameService.advancePhase(room.id);
    }
    if (onAdvance) onAdvance();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between items-center p-6 text-white overflow-hidden select-none ${
        isSeeker
          ? 'bg-gradient-to-b from-red-950 via-slate-950 to-black'
          : 'bg-gradient-to-b from-emerald-950 via-slate-950 to-black'
      }`}
    >
      {/* Background radial glow */}
      <div
        className={`absolute inset-0 pointer-events-none opacity-30 ${
          isSeeker
            ? 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-500/40 via-transparent to-transparent'
            : 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/40 via-transparent to-transparent'
        }`}
      />

      {/* Header */}
      <div className="relative z-10 pt-safe text-center">
        <span className="text-xs font-mono font-bold tracking-widest uppercase text-muted-foreground">
          {t('roleRevealTitle')}
        </span>
      </div>

      {/* Center Dramatic Card */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 260 }}
        className="relative z-10 flex flex-col items-center text-center my-auto max-w-xs"
      >
        {/* Animated Icon Avatar */}
        <div
          className={`w-32 h-32 rounded-3xl p-6 mb-6 shadow-2xl flex items-center justify-center border-4 relative ${
            isSeeker
              ? 'bg-red-600/30 border-red-500 text-red-400'
              : 'bg-emerald-600/30 border-emerald-400 text-emerald-400'
          }`}
        >
          <div
            className={`absolute -inset-3 rounded-3xl border-2 animate-ping opacity-30 ${
              isSeeker ? 'border-red-500' : 'border-emerald-400'
            }`}
          />
          {isSeeker ? (
            <Eye className="w-16 h-16 drop-shadow-lg" />
          ) : (
            <Shield className="w-16 h-16 drop-shadow-lg" />
          )}
        </div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`text-3xl font-display font-extrabold tracking-tight ${
            isSeeker ? 'text-red-400' : 'text-emerald-400'
          }`}
        >
          {isSeeker ? t('youAreSeeker') : t('youAreHider')}
        </motion.h1>

        <p className="mt-3 text-xs text-slate-300 leading-relaxed">
          {isSeeker ? t('seekerSubtitle') : t('hiderSubtitle')}
        </p>
      </motion.div>

      {/* Bottom Countdown & Skip */}
      <div className="relative z-10 w-full max-w-xs flex flex-col items-center pb-safe">
        <div className="flex items-center gap-2 mb-3">
          <Radio className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-xs font-mono font-bold text-slate-400">
            Hiding phase starts in {countdown}s
          </span>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="text-[11px] text-muted-foreground hover:text-white flex items-center gap-1 transition-colors py-1"
        >
          <FastForward className="w-3.5 h-3.5" />
          <span>Skip Animation</span>
        </button>
      </div>
    </div>
  );
};
