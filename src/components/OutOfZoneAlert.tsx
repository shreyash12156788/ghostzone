import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Navigation } from 'lucide-react';
import { BoundaryAlertInfo } from '../types';
import { soundEffects } from '../lib/audio';
import { vibrate, HapticPatterns } from '../lib/vibration';

interface OutOfZoneAlertProps {
  alert: BoundaryAlertInfo | null;
}

export const OutOfZoneAlert: React.FC<OutOfZoneAlertProps> = ({ alert }) => {
  const isOut = Boolean(alert && alert.isOut && alert.secondsRemaining > 0);

  useEffect(() => {
    if (isOut) {
      soundEffects.playHazardAlarm();
      vibrate(HapticPatterns.outOfZoneAlarm);
    }
  }, [isOut, alert?.secondsRemaining]);

  if (!isOut || !alert) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-between p-6 overflow-hidden"
      >
        {/* Pulsing red hazard screen border */}
        <div className="absolute inset-0 border-[8px] border-red-500 animate-hazard-flash pointer-events-none" />
        <div className="absolute inset-0 bg-red-950/40 backdrop-blur-[2px] pointer-events-none" />

        {/* Top Warning Banner */}
        <div className="relative z-10 w-full max-w-sm mx-auto text-center pt-safe">
          <div className="inline-flex items-center gap-2 bg-red-600/90 text-white font-display px-4 py-2 rounded-full shadow-lg border border-red-400">
            <AlertTriangle className="w-5 h-5 animate-bounce" />
            <span className="text-sm font-bold tracking-wide">
              OUT OF BOUNDARY ZONE!
            </span>
          </div>
        </div>

        {/* Center Countdown & Direction Compass */}
        <div className="relative z-10 flex flex-col items-center justify-center my-auto">
          <div className="text-6xl font-display font-extrabold text-red-500 tabular-nums drop-shadow-md animate-pulse">
            {alert.secondsRemaining}s
          </div>
          <p className="text-xs font-semibold text-red-200 mt-1 uppercase tracking-wider">
            Grace Time Remaining
          </p>

          {/* Direction Arrow back to zone center */}
          <div className="mt-6 flex flex-col items-center">
            <div
              className="w-16 h-16 rounded-full bg-red-600/80 border-2 border-white flex items-center justify-center shadow-2xl transition-transform duration-300"
              style={{
                transform: `rotate(${alert.bearingToCenter}deg)`,
              }}
            >
              <Navigation className="w-8 h-8 text-white fill-white" />
            </div>
            <span className="text-xs text-white/90 font-medium mt-2 bg-black/60 px-3 py-1 rounded-full">
              Safe Zone Center: ~{Math.round(alert.distanceToCenter)}m
            </span>
          </div>
        </div>

        {/* Bottom instruction */}
        <div className="relative z-10 text-center pb-safe">
          <p className="text-sm font-bold text-white bg-black/70 py-2 px-4 rounded-xl border border-red-500/50 max-w-xs mx-auto">
            Sprint back into the zone immediately to avoid disqualification!
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
