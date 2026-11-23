import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Trophy,
  RotateCcw,
  Home,
  Shield,
  Eye,
  Clock,
  Compass,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { gameService } from '../services';
import { useGameStore } from '../store/gameStore';
import { formatTime, formatDistance } from '../lib/utils';
import { soundEffects } from '../lib/audio';

export const ResultsScreen: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const room = useGameStore((state) => state.room);
  const setRoom = useGameStore((state) => state.setRoom);
  const playerId = useGameStore((state) => state.playerId);
  const resetGameSession = useGameStore((state) => state.resetGameSession);
  const t = useGameStore((state) => state.t);

  // Confetti burst & fanfare sound on mount
  useEffect(() => {
    soundEffects.playVictory();

    // Multistage celebratory confetti
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      const timeout = setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 400);

      return () => clearTimeout(timeout);
    } catch {}
  }, []);

  // Room sync listener (if host clicks Play Again, all clients return to Lobby)
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = gameService.subscribeToRoom(roomId, (updatedRoom) => {
      if (!updatedRoom) {
        navigate('/');
        return;
      }
      setRoom(updatedRoom);
      if (updatedRoom.phase === 'LOBBY') {
        navigate(`/lobby/${roomId}`);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [roomId, navigate, setRoom]);

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const isSeekerWinner = room.winner === 'SEEKER';
  const playersList = Object.values(room.players);
  const currentPlayer = playerId ? room.players[playerId] : null;
  const isHost = Boolean(currentPlayer?.isHost);

  // Calculate stats
  const totalDuration = room.playStartedAt
    ? Math.floor(((room.endedAt || Date.now()) - room.playStartedAt) / 1000)
    : 0;

  const handlePlayAgain = async () => {
    soundEffects.playTick();
    await gameService.restartGame(room.id);
  };

  const handleBackHome = () => {
    soundEffects.playTick();
    resetGameSession();
    navigate('/');
  };

  return (
    <div className="min-h-[calc(100vh-55px)] flex flex-col justify-between p-4 max-w-md mx-auto">
      <div>
        {/* Victory Header Banner */}
        <div className="text-center mt-3 mb-6">
          <div className="inline-flex p-4 rounded-3xl bg-secondary/80 border-2 border-primary/50 shadow-2xl mb-4 relative">
            <Trophy className="w-12 h-12 text-amber-400 animate-bounce" />
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary animate-ping" />
          </div>

          <h1 className="text-3xl font-display font-extrabold tracking-tight text-foreground uppercase">
            {isSeekerWinner ? t('seekerWon') : t('hidersWon')}
          </h1>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1.5 leading-relaxed">
            {room.winReason || 'Mission completed! Outstanding teamwork.'}
          </p>
        </div>

        {/* Match Overview Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="p-3 rounded-2xl bg-secondary/50 border border-border">
            <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
            <span className="text-[10px] text-muted-foreground block font-mono">
              Match Time
            </span>
            <span className="text-sm font-display font-bold text-foreground">
              {formatTime(totalDuration)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-secondary/50 border border-border">
            <Compass className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <span className="text-[10px] text-muted-foreground block font-mono">
              Your Distance
            </span>
            <span className="text-sm font-display font-bold text-foreground">
              {formatDistance(currentPlayer?.distanceTraveled || 0)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-secondary/50 border border-border">
            <AlertTriangle className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <span className="text-[10px] text-muted-foreground block font-mono">
              Zone Breaches
            </span>
            <span className="text-sm font-display font-bold text-foreground">
              {currentPlayer?.outOfZoneCount || 0}
            </span>
          </div>
        </div>

        {/* Operatives Debrief List */}
        <div className="p-3.5 rounded-3xl bg-secondary/40 border border-border space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs font-display font-bold text-foreground mb-2">
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              Operatives Debrief
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              Status & Distance
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {playersList.map((player) => {
              const isSeeker = player.role === 'SEEKER';
              const isCaught = player.status === 'CAUGHT';
              const isDisqualified = player.status === 'DISQUALIFIED';

              return (
                <div
                  key={player.id}
                  className="p-2.5 rounded-2xl bg-card border border-border flex items-center justify-between text-xs shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow"
                      style={{ backgroundColor: player.avatar || '#3b82f6' }}
                    >
                      {player.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground flex items-center gap-1">
                        <span>{player.name}</span>
                        {player.id === playerId && (
                          <span className="text-[10px] text-primary">(You)</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        {isSeeker ? (
                          <Eye className="w-2.5 h-2.5 text-rose-400" />
                        ) : (
                          <Shield className="w-2.5 h-2.5 text-primary" />
                        )}
                        {isSeeker ? 'Seeker' : 'Hider'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-[11px] font-bold block ${
                        isCaught
                          ? 'text-rose-400'
                          : isDisqualified
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {isCaught
                        ? 'Caught'
                        : isDisqualified
                        ? 'Disqualified'
                        : isSeeker
                        ? 'Hunter'
                        : 'Survived ✨'}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {formatDistance(player.distanceTraveled)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="space-y-2.5 pb-safe">
        {isHost ? (
          <button
            type="button"
            onClick={handlePlayAgain}
            className="w-full py-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold text-base shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <RotateCcw className="w-5 h-5" />
            <span>{t('playAgain')} (Same Room)</span>
          </button>
        ) : (
          <p className="text-center text-xs text-muted-foreground mb-1">
            Waiting for host to restart match...
          </p>
        )}

        <button
          type="button"
          onClick={handleBackHome}
          className="w-full py-3.5 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground font-display font-semibold text-sm border border-border shadow flex items-center justify-center gap-2 transition-all"
        >
          <Home className="w-4 h-4 text-muted-foreground" />
          <span>{t('backHome')}</span>
        </button>
      </div>
    </div>
  );
};
