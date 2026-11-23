import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, LogIn, HelpCircle, Shield, Eye, Radio, Sparkles } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { HowToPlayModal } from '../components/HowToPlayModal';
import { PermissionsModal } from '../components/PermissionsModal';
import { useGeolocation } from '../hooks/useGeolocation';
import { soundEffects } from '../lib/audio';

export const LandingScreen: React.FC = () => {
  const navigate = useNavigate();
  const t = useGameStore((state) => state.t);
  const gpsStatus = useGameStore((state) => state.gpsStatus);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);

  const { requestLocation } = useGeolocation({ autoStart: true });

  const handleCreateRoom = () => {
    soundEffects.playTick();
    navigate('/create');
  };

  const handleJoinRoom = () => {
    soundEffects.playTick();
    navigate('/join');
  };

  return (
    <div className="relative min-h-[calc(100vh-55px)] flex flex-col justify-between p-4 max-w-md mx-auto">
      {/* Background Decorative Radar Grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 opacity-30">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full border border-primary/20 animate-ping-slow" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full border border-primary/30" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140px] h-[140px] rounded-full border border-primary/40" />
      </div>

      {/* Hero Header */}
      <div className="flex flex-col items-center text-center mt-6">
        {/* Animated Radar Crosshair Icon */}
        <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border-2 border-primary/40 p-4 shadow-2xl flex items-center justify-center">
          <div className="absolute inset-2 rounded-2xl border border-primary/20 animate-pulse" />
          <Radio className="w-12 h-12 text-primary animate-pulse" />
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive animate-ping" />
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive" />
        </div>

        <h1 className="mt-5 text-3xl font-display font-extrabold tracking-tight text-foreground">
          HideNSeek <span className="text-primary">Live</span>
        </h1>
        <p className="mt-2 text-xs text-muted-foreground max-w-xs leading-relaxed">
          {t('tagline')}
        </p>

        {/* Feature Badges */}
        <div className="flex items-center gap-2 mt-4">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-secondary/80 border border-border text-foreground">
            <Radio className="w-3 h-3 text-primary" /> Live Radar
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-secondary/80 border border-border text-foreground">
            <Shield className="w-3 h-3 text-cyan-400" /> Geofenced
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-secondary/80 border border-border text-foreground">
            <Eye className="w-3 h-3 text-rose-400" /> Stealth
          </span>
        </div>
      </div>

      {/* Main Action Buttons */}
      <div className="space-y-3 my-6">
        <button
          type="button"
          onClick={handleCreateRoom}
          className="w-full py-4 px-5 rounded-2xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-display font-bold text-base shadow-xl flex items-center justify-center gap-2.5 transition-all"
        >
          <PlusCircle className="w-5 h-5" />
          <span>{t('createRoom')}</span>
        </button>

        <button
          type="button"
          onClick={handleJoinRoom}
          className="w-full py-3.5 px-5 rounded-2xl bg-secondary hover:bg-secondary/80 active:scale-[0.98] text-foreground font-display font-semibold text-sm border border-border shadow-md flex items-center justify-center gap-2.5 transition-all"
        >
          <LogIn className="w-5 h-5 text-primary" />
          <span>{t('joinRoom')}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowHowToPlay(true)}
          className="w-full py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
          <span>{t('howToPlay')}</span>
        </button>
      </div>

      {/* GPS Status Card & Permissions note */}
      <div className="rounded-2xl bg-secondary/40 border border-border/60 p-3 mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              gpsStatus === 'granted' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <div className="text-[11px] text-muted-foreground">
            {gpsStatus === 'granted' ? (
              <span className="text-emerald-400 font-medium">GPS Signal Active</span>
            ) : (
              <span>Location access recommended</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowPermissions(true)}
          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
        >
          <Sparkles className="w-3 h-3" /> Info
        </button>
      </div>

      {/* Modals */}
      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />

      <PermissionsModal
        isOpen={showPermissions}
        onClose={() => setShowPermissions(false)}
        onRequestGps={requestLocation}
        gpsStatus={gpsStatus}
      />
    </div>
  );
};
