import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Radio,
  Clock,
  Shield,
  Eye,
  Navigation,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Lock,
  LogOut,
  Users,
} from 'lucide-react';
import { gameService } from '../services';
import { useGameStore } from '../store/gameStore';
import {
  calculateBearingToCenter,
  calculateDistanceMeters,
} from '../game/engine';
import { MapComponent } from '../components/MapComponent';
import { RadarSweep } from '../components/RadarSweep';
import { OutOfZoneAlert } from '../components/OutOfZoneAlert';
import { HoldButton } from '../components/HoldButton';
import { SimulationDrawer } from '../components/SimulationDrawer';
import { useGeolocation } from '../hooks/useGeolocation';
import { formatTime } from '../lib/utils';
import { soundEffects } from '../lib/audio';
import { vibrate, HapticPatterns } from '../lib/vibration';
import { wakeLockManager } from '../lib/wakelock';

export const LiveGameScreen: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const room = useGameStore((state) => state.room);
  const setRoom = useGameStore((state) => state.setRoom);
  const playerId = useGameStore((state) => state.playerId);
  const userLocation = useGameStore((state) => state.userLocation);
  const outOfZoneAlert = useGameStore((state) => state.outOfZoneAlert);
  const setOutOfZoneAlert = useGameStore((state) => state.setOutOfZoneAlert);
  const revealState = useGameStore((state) => state.revealState);
  const t = useGameStore((state) => state.t);

  const [gameTimeRemaining, setGameTimeRemaining] = useState(room?.config.gameDuration || 600);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [recenterTarget, setRecenterTarget] = useState<[number, number] | null>(null);
  const [otherOutOfZoneToast, setOtherOutOfZoneToast] = useState<string | null>(null);

  const prevIsRevealingRef = useRef<boolean>(false);

  const { nudgeSimulatedLocation } = useGeolocation({
    roomId: roomId || undefined,
    playerId: playerId || undefined,
    autoStart: true,
  });

  // Keep screen awake using Screen Wake Lock API
  useEffect(() => {
    wakeLockManager.acquire();
    return () => {
      wakeLockManager.release();
    };
  }, []);

  // Room synchronization subscription (renders authoritative server state)
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = gameService.subscribeToRoom(roomId, (updatedRoom) => {
      if (!updatedRoom) {
        navigate('/');
        return;
      }
      setRoom(updatedRoom);

      // Server-authoritative game termination
      if (updatedRoom.phase === 'ENDED') {
        navigate(`/results/${roomId}`);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [roomId, navigate, setRoom]);

  // Audio/vibration reaction when server state activates radar reveal
  useEffect(() => {
    if (revealState.isRevealing && !prevIsRevealingRef.current) {
      soundEffects.playRadarPing();
      vibrate(HapticPatterns.revealBlip);
    }
    prevIsRevealingRef.current = revealState.isRevealing;
  }, [revealState.isRevealing]);

  // HUD timer and display helpers tick
  useEffect(() => {
    if (!room || room.phase !== 'PLAYING') return;

    const interval = setInterval(() => {
      const clockOffset = useGameStore.getState().clockOffset;
      const nowAdjusted = Date.now() + clockOffset;

      // 1. Game Clock display derived from server timestamps with clockOffset:
      // game end = room.playStartAt + config.durationMin * 60000
      const playStart =
        room.playStartAt || room.playStartedAt || room.startAt || Date.now();
      const durationMin =
        room.config.durationMin ??
        (room.config.gameDuration ? Math.round(room.config.gameDuration / 60) : 10);
      const gameEnd = playStart + durationMin * 60000;
      const remaining = Math.max(0, Math.ceil((gameEnd - nowAdjusted) / 1000));
      setGameTimeRemaining(room.timeRemaining ?? remaining);

      // 2. Out of zone alert display for current player:
      // grace end = player.outSince + config.graceSec * 1000
      const self = playerId ? room.players[playerId] : null;
      if (self && self.status === 'OUT_OF_ZONE') {
        const center = room.zone.center;
        const from = userLocation || center;
        const bearing = calculateBearingToCenter(from, center);
        const distance = calculateDistanceMeters(from, center);
        const outSince = self.outSince ?? self.outOfZoneSince ?? nowAdjusted;
        const graceSec = room.config.graceSec ?? room.config.gracePeriod ?? 20;
        const graceEnd = outSince + graceSec * 1000;
        const secondsRemaining = Math.max(0, Math.ceil((graceEnd - nowAdjusted) / 1000));

        setOutOfZoneAlert({
          isOut: true,
          secondsRemaining,
          bearingToCenter: bearing,
          distanceToCenter: distance,
        });
      } else {
        setOutOfZoneAlert(null);
      }

      // 3. Next reveal countdown tick:
      // next reveal = reveal.nextAt
      if (room.reveal) {
        const isRevealing = Boolean(room.reveal.active);
        const secondsRemainingInReveal = room.reveal.endsAt
          ? Math.max(0, Math.ceil((room.reveal.endsAt - nowAdjusted) / 1000))
          : 0;
        const secondsUntilNext = room.reveal.nextAt
          ? Math.max(0, Math.ceil((room.reveal.nextAt - nowAdjusted) / 1000))
          : 0;

        useGameStore.getState().updateRevealState({
          isRevealing,
          secondsRemainingInReveal,
          secondsUntilNext,
          revealProgress: 0,
        });
      }

      // 4. Other player out of zone toast:
      const otherOut = Object.values(room.players).find(
        (p) => p.id !== playerId && p.status === 'OUT_OF_ZONE'
      );
      if (otherOut) {
        setOtherOutOfZoneToast(`${otherOut.name} is outside the safe zone!`);
      } else {
        setOtherOutOfZoneToast(null);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [room, playerId, userLocation, setOutOfZoneAlert]);

  if (!room || !roomId) return null;

  const currentPlayer = playerId ? room.players[playerId] : null;
  const isSeeker = currentPlayer?.role === 'SEEKER';
  const allPlayers = Object.values(room.players);
  const hiders = allPlayers.filter((p) => p.role === 'HIDER');
  const activeHiders = hiders.filter(
    (p) => p.status === 'HIDING' || p.status === 'OUT_OF_ZONE'
  );

  const handleRecenter = () => {
    soundEffects.playTick();
    if (userLocation) {
      setRecenterTarget([userLocation.lat, userLocation.lng]);
    } else {
      setRecenterTarget([room.zone.center.lat, room.zone.center.lng]);
    }
  };

  const handleSelfCaught = () => {
    if (playerId) {
      gameService.markCaught(room.id, playerId);
    }
  };

  const handleSeekerTagPlayer = (targetId: string) => {
    soundEffects.playTick();
    gameService.markCaught(room.id, targetId, playerId || undefined);
  };

  const handleLeaveGame = () => {
    if (playerId) {
      gameService.leaveRoom(room.id, playerId);
    }
    navigate('/');
  };

  return (
    <div className="relative h-[calc(100vh-55px)] w-full overflow-hidden select-none">
      {/* Full-Screen Interactive Leaflet Map */}
      <MapComponent
        zone={room.zone}
        players={room.players}
        currentPlayerId={playerId}
        userLocation={userLocation}
        isLobby={false}
        isRevealing={revealState.isRevealing}
        recenterCoords={recenterTarget}
        locations={room.locations}
        className="h-full w-full"
      />

      {/* Radar Sweep Animation Effect Overlay */}
      <RadarSweep
        isActive={revealState.isRevealing}
        secondsRemaining={revealState.secondsRemainingInReveal}
      />

      {/* Out of Zone Full-Screen Hazard Alert */}
      <OutOfZoneAlert alert={outOfZoneAlert} />

      {/* Other Player Out of Zone Toast Banner */}
      {otherOutOfZoneToast && (
        <div className="absolute top-16 inset-x-4 z-30 flex justify-center pointer-events-none animate-bounce">
          <div className="bg-amber-600/95 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-2xl border border-amber-300 flex items-center gap-1.5 backdrop-blur-md">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{otherOutOfZoneToast}</span>
          </div>
        </div>
      )}

      {/* TOP FLOATING HUD */}
      <div className="absolute top-2 inset-x-2 sm:inset-x-4 z-20 flex items-center justify-between gap-2 pointer-events-none">
        {/* Game Remaining Clock */}
        <div className="pointer-events-auto bg-slate-900/90 text-white px-3 py-2 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          <div className="flex flex-col">
            <span className="text-[9px] text-muted-foreground uppercase font-mono font-semibold">
              Game Clock
            </span>
            <span className="text-base font-display font-extrabold tabular-nums leading-none">
              {formatTime(gameTimeRemaining)}
            </span>
          </div>
        </div>

        {/* Next Radar Reveal Countdown Ring */}
        <div
          className={`pointer-events-auto px-3 py-2 rounded-2xl border shadow-xl backdrop-blur-md flex items-center gap-2 transition-colors ${
            revealState.isRevealing
              ? 'bg-primary/90 text-primary-foreground border-white/30 animate-pulse'
              : 'bg-slate-900/90 text-white border-white/10'
          }`}
        >
          <Radio
            className={`w-4 h-4 ${
              revealState.isRevealing ? 'animate-spin' : 'text-primary'
            }`}
          />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-mono font-semibold opacity-80">
              {revealState.isRevealing ? 'Scan Active' : 'Next Radar'}
            </span>
            <span className="text-base font-display font-extrabold tabular-nums leading-none">
              {revealState.isRevealing
                ? `${revealState.secondsRemainingInReveal}s`
                : formatTime(revealState.secondsUntilNext)}
            </span>
          </div>
        </div>

        {/* Operatives Remaining Pill */}
        <div className="pointer-events-auto bg-slate-900/90 text-white px-3 py-2 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <div className="flex flex-col text-right">
            <span className="text-[9px] text-muted-foreground uppercase font-mono font-semibold">
              Hiders
            </span>
            <span className="text-base font-display font-extrabold tabular-nums leading-none">
              {activeHiders.length}/{hiders.length}
            </span>
          </div>
        </div>
      </div>

      {/* Floating Map Actions (Recenter & WakeLock badge) */}
      <div className="absolute right-3 top-20 z-20 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleRecenter}
          className="p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-white border border-white/10 shadow-xl backdrop-blur-md flex items-center justify-center transition-colors active:scale-95"
          title="Recenter on My Location"
        >
          <Navigation className="w-5 h-5 text-primary" />
        </button>

        <div
          className="p-2.5 rounded-2xl bg-slate-900/90 text-emerald-400 border border-white/10 shadow-xl backdrop-blur-md flex items-center justify-center"
          title="Screen Wake Lock Active"
        >
          <Lock className="w-4 h-4" />
        </div>
      </div>

      {/* BOTTOM GLASS DRAWER & ACTION PANEL */}
      <div className="absolute bottom-0 inset-x-0 z-30 flex flex-col items-center">
        {/* Drawer Toggle Handle */}
        <button
          type="button"
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="py-1 px-4 rounded-t-xl bg-slate-900/90 border-t border-x border-white/15 text-muted-foreground hover:text-white flex items-center gap-1 shadow-2xl backdrop-blur-md text-[11px] font-semibold"
        >
          <Users className="w-3.5 h-3.5 text-primary" />
          <span>Squad Status ({activeHiders.length} Hidden)</span>
          {drawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        {/* Drawer Body */}
        <div className="w-full bg-slate-900/95 border-t border-white/15 shadow-2xl backdrop-blur-xl p-4 pb-safe space-y-3">
          {drawerOpen && (
            <div className="space-y-3 max-h-56 overflow-y-auto mb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {allPlayers.map((player) => {
                  const isUser = player.id === playerId;
                  const isPlayerHider = player.role === 'HIDER';
                  const isCaught = player.status === 'CAUGHT';
                  const isDisqualified = player.status === 'DISQUALIFIED';

                  return (
                    <div
                      key={player.id}
                      className={`p-2.5 rounded-2xl border flex items-center justify-between ${
                        isCaught || isDisqualified
                          ? 'bg-slate-950/60 border-slate-800 opacity-60'
                          : 'bg-slate-800/80 border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white"
                          style={{ backgroundColor: player.avatar || '#3b82f6' }}
                        >
                          {player.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-1">
                            <span>{player.name}</span>
                            {isUser && <span className="text-[10px] text-primary">(You)</span>}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {player.role === 'SEEKER' ? 'Seeker 👁️' : 'Hider 🛡️'} •{' '}
                            {player.status === 'OUT_OF_ZONE'
                              ? '⚠️ Out of Zone'
                              : isCaught
                              ? 'Caught'
                              : isDisqualified
                              ? 'Disqualified'
                              : 'Hidden'}
                          </span>
                        </div>
                      </div>

                      {/* Seeker Tag Action */}
                      {isSeeker && !isUser && isPlayerHider && !isCaught && !isDisqualified && (
                        <button
                          type="button"
                          onClick={() => handleSeekerTagPlayer(player.id)}
                          className="px-2.5 py-1 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-display font-bold text-xs shadow-md"
                        >
                          Tag Caught
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          {!isSeeker && currentPlayer?.status === 'HIDING' && (
            <HoldButton
              onConfirm={handleSelfCaught}
              label="I Got Caught"
              sublabel="Hold 1.5s to confirm tag"
              holdDurationMs={1500}
            />
          )}

          {/* Bottom actions: Leave game */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              Role: <strong className="text-white">{isSeeker ? 'Seeker' : 'Hider'}</strong>
            </span>
            <button
              type="button"
              onClick={handleLeaveGame}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave Game</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dev Simulation Drawer */}
      <SimulationDrawer
        roomId={room.id}
        onNudgeLocation={nudgeSimulatedLocation}
      />
    </div>
  );
};
