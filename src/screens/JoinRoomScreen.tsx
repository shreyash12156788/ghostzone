import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, Check, LogIn, AlertCircle } from 'lucide-react';
import { gameService } from '../services';
import { useGameStore } from '../store/gameStore';
import { soundEffects } from '../lib/audio';

const AVATAR_COLORS = [
  '#3b82f6', // Blue
  '#06d6a0', // Teal
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#ef4444', // Red
];

export const JoinRoomScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setRoom = useGameStore((state) => state.setRoom);
  const setPlayerId = useGameStore((state) => state.setPlayerId);
  const t = useGameStore((state) => state.t);

  const [roomId, setRoomId] = useState(
    (searchParams.get('room') || '').toUpperCase()
  );
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const qRoom = searchParams.get('room');
    if (qRoom) {
      setRoomId(qRoom.toUpperCase());
    }
  }, [searchParams]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = roomId.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      setError('Please enter a valid 6-character Room Code.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }

    setLoading(true);
    soundEffects.playTick();

    try {
      const { room, playerId } = await gameService.joinRoom(
        cleanCode,
        name.trim(),
        selectedColor
      );

      setRoom(room);
      setPlayerId(playerId);
      navigate(`/lobby/${cleanCode}`);
    } catch (err: unknown) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : 'Room not found. Check the code and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-55px)] flex flex-col justify-between p-4 max-w-md mx-auto">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">
              {t('joinRoom')}
            </h2>
            <p className="text-xs text-muted-foreground">
              Enter the mission code to join your squad
            </p>
          </div>
        </div>

        <form onSubmit={handleJoin} className="space-y-5">
          {/* 6-digit Room Code Input */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              {t('enterCode')}
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="e.g. K7X2QP"
              className="w-full text-center py-3.5 px-4 text-2xl font-mono font-bold tracking-widest rounded-2xl bg-secondary border border-border text-foreground uppercase placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
            />
          </div>

          {/* Player Name */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              {t('yourName')}
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 absolute left-3.5 text-muted-foreground" />
              <input
                type="text"
                required
                maxLength={18}
                placeholder="e.g. Maya, Arjun, Scout"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Avatar Color Picker */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">
              {t('pickAvatar')}
            </label>
            <div className="flex items-center justify-between gap-2 p-2 bg-secondary/50 rounded-2xl border border-border">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  style={{ backgroundColor: color }}
                  className={`w-9 h-9 rounded-full transition-transform flex items-center justify-center ${
                    selectedColor === color
                      ? 'scale-110 ring-4 ring-white shadow-lg'
                      : 'opacity-75 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  {selectedColor === color && (
                    <Check className="w-4 h-4 text-white drop-shadow" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-2xl bg-destructive/15 border border-destructive/30 flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || roomId.length !== 6 || !name.trim()}
            className="w-full py-4 rounded-2xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-display font-bold text-base shadow-xl flex items-center justify-center gap-2 transition-all mt-4"
          >
            <LogIn className="w-5 h-5" />
            <span>{loading ? 'Joining Room...' : 'Enter Mission Lobby'}</span>
          </button>
        </form>
      </div>

      <div className="text-center text-[11px] text-muted-foreground pb-safe">
        Make sure you are on the same campus and have GPS enabled!
      </div>
    </div>
  );
};
