import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { vibrate, HapticPatterns } from '../lib/vibration';
import { soundEffects } from '../lib/audio';

interface HoldButtonProps {
  onConfirm: () => void;
  holdDurationMs?: number;
  label: string;
  sublabel?: string;
  className?: string;
  disabled?: boolean;
}

export const HoldButton: React.FC<HoldButtonProps> = ({
  onConfirm,
  holdDurationMs = 1500,
  label,
  sublabel = 'Press & hold to confirm',
  className,
  disabled = false,
}) => {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startHold = () => {
    if (disabled) return;
    setHolding(true);
    startTimeRef.current = Date.now();
    vibrate(HapticPatterns.click);
    soundEffects.playTick();

    const loop = () => {
      if (!startTimeRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const ratio = Math.min(1, elapsed / holdDurationMs);
      setProgress(ratio * 100);

      if (ratio >= 1) {
        // Complete!
        setHolding(false);
        setProgress(0);
        startTimeRef.current = null;
        vibrate(HapticPatterns.caught);
        soundEffects.playCaught();
        onConfirm();
      } else {
        animationFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  };

  const cancelHold = () => {
    setHolding(false);
    setProgress(0);
    startTimeRef.current = null;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full select-none">
      <button
        type="button"
        disabled={disabled}
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={startHold}
        onTouchEnd={cancelHold}
        className={cn(
          'relative w-full h-14 overflow-hidden rounded-2xl font-display font-semibold text-white shadow-lg active:scale-95 transition-transform flex flex-col items-center justify-center',
          'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600',
          disabled && 'opacity-50 cursor-not-allowed active:scale-100',
          className
        )}
      >
        {/* Progress Fill Bar */}
        <div
          className="absolute inset-y-0 left-0 bg-white/30 transition-all duration-75 pointer-events-none"
          style={{ width: `${progress}%` }}
        />

        <span className="relative z-10 text-base flex items-center gap-1.5">
          {label}
        </span>
        <span className="relative z-10 text-[11px] text-white/80 font-normal">
          {holding ? `Keep holding... (${Math.round(progress)}%)` : sublabel}
        </span>
      </button>
    </div>
  );
};
