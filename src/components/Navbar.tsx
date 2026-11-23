import React from 'react';
import {
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Bot,
  MapPin,
  Wifi,
  Globe,
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { Language } from '../lib/i18n';

export const Navbar: React.FC = () => {
  const theme = useGameStore((state) => state.theme);
  const toggleTheme = useGameStore((state) => state.toggleTheme);
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const toggleSound = useGameStore((state) => state.toggleSound);
  const language = useGameStore((state) => state.language);
  const setLanguage = useGameStore((state) => state.setLanguage);
  const simulationMode = useGameStore((state) => state.simulationMode);
  const toggleSimulationMode = useGameStore((state) => state.toggleSimulationMode);
  const gpsStatus = useGameStore((state) => state.gpsStatus);
  const gpsAccuracy = useGameStore((state) => state.gpsAccuracy);

  const handleLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as Language);
  };

  return (
    <header className="sticky top-0 z-30 w-full glass-panel px-3 py-2.5 flex items-center justify-between border-b border-border/50 select-none">
      {/* Brand logo & name */}
      <div className="flex items-center gap-2">
        <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-md">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-black animate-ping absolute" />
          <div className="w-3 h-3 rounded-full bg-white relative z-10" />
        </div>
        <div className="flex flex-col">
          <span className="font-display font-bold text-sm tracking-tight leading-none bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            HideNSeek <span className="text-primary text-xs font-mono">LIVE</span>
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {/* GPS Signal Chip */}
            <span
              className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded-full font-medium ${
                gpsStatus === 'granted'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : gpsStatus === 'denied'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              <MapPin className="w-2.5 h-2.5" />
              {gpsStatus === 'granted'
                ? `GPS ${gpsAccuracy ? `±${Math.round(gpsAccuracy)}m` : 'OK'}`
                : gpsStatus === 'denied'
                ? 'No GPS'
                : 'GPS...'}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded-full font-medium bg-blue-500/20 text-blue-400">
              <Wifi className="w-2.5 h-2.5" />
              Live
            </span>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Simulation mode toggle */}
        <button
          type="button"
          onClick={toggleSimulationMode}
          title="Toggle Simulation Dev Panel"
          className={`p-1.5 rounded-xl border transition-colors ${
            simulationMode
              ? 'bg-primary/20 text-primary border-primary'
              : 'text-muted-foreground hover:text-foreground border-transparent hover:bg-secondary/60'
          }`}
        >
          <Bot className="w-4 h-4" />
        </button>

        {/* Audio Toggle */}
        <button
          type="button"
          onClick={toggleSound}
          title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title="Toggle Theme"
          className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Language selector */}
        <div className="relative flex items-center">
          <Globe className="w-3.5 h-3.5 absolute left-1.5 text-muted-foreground pointer-events-none" />
          <select
            value={language}
            onChange={handleLangChange}
            className="pl-5 pr-1 py-1 text-xs rounded-xl bg-secondary/80 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
          >
            <option value="en">EN</option>
            <option value="mr">मराठी</option>
            <option value="hi">हिंदी</option>
          </select>
        </div>
      </div>
    </header>
  );
};
