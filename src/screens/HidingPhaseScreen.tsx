import React, { useEffect, useState } from 'react';
import { EyeOff, Shield, FastForward, Clock } from 'lucide-react';
import { MapComponent } from '../components/MapComponent';
import { useGameStore } from '../store/gameStore';
import { gameService } from '../services';
import { formatTime } from '../lib/utils';
import { soundEffects } from '../lib/audio';

interface HidingPhaseScreenProps {
  onComplete?: () => void;
}

export const HidingPhaseScreen: React.FC<HidingPhaseScreenProps> = ({ onComplete }) => {
  const room = useGameStore((state) => state.room);
  const playerId = useGameStore((state) => state.playerId);
  const userLocation = useGameStore((state) => state.userLocation);
  const t = useGameStore((state) => state.t);

  const [timeLeft, setTimeLeft] = useState(room?.config.hidingDuration || 60);

  const currentPlayer = playerId && room ? room.players[playerId] : null;
  const isSeeker = currentPlayer?.role === 'SEEKER';

  useEffect(() => {
    if (!room) return;

    const interval = setInterval(() => {
      const clockOffset = useGameStore.getState().clockOffset;
      const nowAdjusted = Date.now() + clockOffset;

      // hide end = room.playStartAt
      const hideSec = room.config.hideSec ?? room.config.hidingDuration ?? 60;
      const hideEnd =
        room.playStartAt ||
        room.playStartedAt ||
        (room.startAt ? room.startAt + hideSec * 1000 : null) ||
        (room.startedAt ? room.startedAt + hideSec * 1000 : null);

      const remaining = hideEnd
        ? Math.max(0, Math.ceil((hideEnd - nowAdjusted) / 1000))
        : 0;
      setTimeLeft(remaining);

      if (remaining <= 5 && remaining > 0) {
        soundEffects.playTick();
      }

      if (remaining <= 0) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [room, onComplete]);

  const handleSkipHiding = () => {
    if (room) {
      gameService.advancePhase(room.id);
    }
    if (onComplete) onComplete();
  };

  if (!room) return null;

  return (
    <div className="relative h-[calc(100vh-55px)] flex flex-col justify-between overflow-hidden select-none">
      {isSeeker ? (
        /* SEEKER SCREEN: EYES CLOSED / BLINDFOLDED */
        <div className="absolute inset-0 z-40 bg-slate-950 flex flex-col justify-between items-center p-6 text-white text-center">
          {/* Subtle radar circle animation */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-[320px] h-[320px] rounded-full border border-red-500 animate-ping-slow" />
            <div className="w-[180px] h-[180px] rounded-full border border-red-500" />
          </div>

          <div className="pt-safe">
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-red-400 bg-red-950/60 px-3 py-1 rounded-full border border-red-800">
              {t('eyesClosed')}
            </span>
          </div>

          <div className="my-auto flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-red-900/40 border-2 border-red-500 flex items-center justify-center shadow-2xl mb-6">
              <EyeOff className="w-12 h-12 text-red-400" />
            </div>

            <span className="text-xs text-slate-400 uppercase tracking-widest font-mono">
              {t('seekerReleasedIn')}
            </span>
            <div className="text-6xl font-display font-extrabold text-red-500 tabular-nums my-2 drop-shadow-lg">
              {formatTime(timeLeft)}
            </div>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Do not peek! Hiders are scattering to find cover within the safe boundary.
            </p>
          </div>

          <div className="pb-safe w-full max-w-xs">
            <button
              type="button"
              onClick={handleSkipHiding}
              className="text-xs text-muted-foreground hover:text-white flex items-center justify-center gap-1 mx-auto py-2 transition-colors"
            >
              <FastForward className="w-4 h-4" />
              <span>Skip Countdown (Dev)</span>
            </button>
          </div>
        </div>
      ) : (
        /* HIDER SCREEN: RUN & HIDE WITH LIVE MAP */
        <div className="relative h-full w-full flex flex-col justify-between">
          {/* Top Floating HUD banner */}
          <div className="absolute top-3 inset-x-3 z-30 flex flex-col items-center pointer-events-none">
            <div className="bg-slate-900/90 text-white px-4 py-2.5 rounded-2xl border border-primary/40 shadow-2xl backdrop-blur-md flex items-center gap-3 pointer-events-auto">
              <div className="p-2 rounded-xl bg-primary/20 text-primary">
                <Clock className="w-5 h-5 animate-spin" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
                  {t('runAndHide')}
                </span>
                <span className="text-2xl font-display font-extrabold tabular-nums leading-none">
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Map */}
          <div className="h-full w-full">
            <MapComponent
              zone={room.zone}
              players={room.players}
              currentPlayerId={playerId}
              userLocation={userLocation}
              isLobby={false}
              isRevealing={false}
              locations={room.locations}
            />
          </div>

          {/* Bottom guidance card */}
          <div className="absolute bottom-4 inset-x-4 z-30">
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-primary/30 text-white shadow-2xl backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary shrink-0" />
                <p className="text-xs text-slate-200">
                  Stay inside the green circle. The seeker is released when the clock hits 00:00!
                </p>
              </div>

              <button
                type="button"
                onClick={handleSkipHiding}
                className="ml-2 px-2.5 py-1.5 rounded-xl bg-secondary/80 hover:bg-secondary text-[11px] font-semibold text-slate-300 flex items-center gap-1 shrink-0"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Skip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
