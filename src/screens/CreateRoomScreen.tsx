import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, QrCode, ArrowRight, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { gameService } from '../services';
import { useGameStore } from '../store/gameStore';
import { soundEffects } from '../lib/audio';

const AVATAR_COLORS = [
  '#06d6a0', // Teal
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#ef4444', // Red
];

export const CreateRoomScreen: React.FC = () => {
  const navigate = useNavigate();
  const setRoom = useGameStore((state) => state.setRoom);
  const setPlayerId = useGameStore((state) => state.setPlayerId);
  const userLocation = useGameStore((state) => state.userLocation);
  const t = useGameStore((state) => state.t);

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    soundEffects.playTick();

    try {
      const initialCenter = userLocation
        ? { lat: userLocation.lat, lng: userLocation.lng }
        : { lat: 18.5204, lng: 73.8567 }; // Default campus coords

      const { room, playerId } = await gameService.createRoom(
        name.trim(),
        selectedColor,
        { center: initialCenter, radius: 250 }
      );

      setRoom(room);
      setPlayerId(playerId);
      setCreatedRoomId(room.id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join?room=${createdRoomId}`
    : '';

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      soundEffects.playTick();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleProceedToLobby = () => {
    if (createdRoomId) {
      soundEffects.playTick();
      navigate(`/lobby/${createdRoomId}`);
    }
  };

  return (
    <div className="min-h-[calc(100vh-55px)] flex flex-col justify-between p-4 max-w-md mx-auto">
      {/* Top Header */}
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
              {t('createRoom')}
            </h2>
            <p className="text-xs text-muted-foreground">
              Set up your room & invite your squad
            </p>
          </div>
        </div>

        {!createdRoomId ? (
          /* Form: Name & Avatar selection */
          <form onSubmit={handleCreate} className="space-y-5">
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
                  placeholder="e.g. Rahul, Sneha, Commander"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

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

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-4 rounded-2xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-display font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all mt-6"
            >
              {loading ? 'Creating Room...' : 'Create Mission Room'}
            </button>
          </form>
        ) : (
          /* Room Created Success Card with Code, Link, QR */
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-5 rounded-3xl bg-secondary/60 border border-primary/30 text-center relative overflow-hidden">
              <span className="text-[11px] font-bold text-primary uppercase tracking-widest">
                {t('roomCode')}
              </span>
              <div className="text-4xl font-display font-extrabold tracking-widest text-foreground my-2 select-all font-mono">
                {createdRoomId}
              </div>
              <p className="text-xs text-muted-foreground">
                Share this 6-character code with your friends
              </p>

              {/* Share & Copy Buttons */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-card border border-border text-xs font-semibold hover:border-primary transition-colors text-foreground"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">{t('copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t('copyLink')}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-card border border-border text-xs font-semibold hover:border-primary transition-colors text-foreground"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{showQr ? 'Hide QR' : t('showQr')}</span>
                </button>
              </div>

              {/* QR Code Container */}
              {showQr && (
                <div className="mt-4 p-4 bg-white rounded-2xl inline-block shadow-xl border-4 border-slate-900">
                  <QRCodeSVG value={shareUrl} size={160} level="M" />
                  <p className="text-[10px] text-slate-800 font-bold mt-1 font-mono">
                    Scan to Join
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleProceedToLobby}
              className="w-full py-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold text-base shadow-xl flex items-center justify-center gap-2 transition-all"
            >
              <span>Proceed to Lobby</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-muted-foreground pb-safe">
        GPS geofencing will activate once the host launches the game.
      </div>
    </div>
  );
};
