import React, { useState } from 'react';
import {
  Bot,
  Users,
  Compass,
  Radio,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  Home,
} from 'lucide-react';
import { gameService } from '../services';
import { useGameStore } from '../store/gameStore';

interface SimulationDrawerProps {
  roomId?: string;
  onNudgeLocation?: (latMeters: number, lngMeters: number) => void;
}

export const SimulationDrawer: React.FC<SimulationDrawerProps> = ({
  roomId,
  onNudgeLocation,
}) => {
  const simulationMode = useGameStore((state) => state.simulationMode);
  const room = useGameStore((state) => state.room);
  const playerId = useGameStore((state) => state.playerId);
  const [collapsed, setCollapsed] = useState(false);

  if (!simulationMode) return null;

  const handleAddBots = () => {
    if (roomId) gameService.addSimulationBots(roomId);
  };

  const handleRemoveBots = () => {
    if (roomId) gameService.removeSimulationBots(roomId);
  };

  const handleStepBots = () => {
    if (roomId) gameService.stepSimulationBots(roomId);
  };

  const handleTriggerReveal = () => {
    if (roomId) gameService.triggerTestReveal(roomId);
  };

  // Teleport player 300 meters north of zone center to test out-of-zone alert!
  const handleStepOutOfZone = () => {
    if (room && playerId) {
      const center = room.zone.center;
      // 300m north (approx +0.0027 degrees lat)
      const outCoords = {
        lat: center.lat + 0.0035,
        lng: center.lng,
        accuracy: 3,
        updatedAt: Date.now(),
      };
      gameService.updateLocation(room.id, playerId, outCoords);
    }
  };

  const handleReturnToCenter = () => {
    if (room && playerId) {
      const center = room.zone.center;
      const centerCoords = {
        lat: center.lat,
        lng: center.lng,
        accuracy: 3,
        updatedAt: Date.now(),
      };
      gameService.updateLocation(room.id, playerId, centerCoords);
    }
  };

  return (
    <aside aria-label="Simulation Dev Panel" className="fixed bottom-2 right-2 sm:right-4 z-40 max-w-xs w-full bg-slate-900/95 border border-primary/40 rounded-2xl shadow-2xl p-3 text-white backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-1.5 text-xs font-display font-bold text-primary">
          <Bot className="w-4 h-4" />
          <span>SIMULATION DEV PANEL</span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="text-muted-foreground hover:text-white p-0.5"
        >
          {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-2.5 space-y-2.5 text-xs">
          {/* Bot controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleAddBots}
              disabled={!roomId}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 rounded-xl font-medium transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>+3 Bots</span>
            </button>
            <button
              type="button"
              onClick={handleStepBots}
              disabled={!roomId}
              className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
              title="Wander bots 5m"
            >
              Wander
            </button>
            <button
              type="button"
              onClick={handleRemoveBots}
              disabled={!roomId}
              className="py-1.5 px-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 rounded-xl transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Test Reveal & Boundary Alerts */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={handleTriggerReveal}
              disabled={!roomId || room?.phase !== 'PLAYING'}
              className="flex items-center justify-center gap-1 py-1.5 px-2 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 rounded-xl transition-colors text-[11px]"
            >
              <Radio className="w-3.5 h-3.5 text-indigo-400" />
              <span>Force Reveal</span>
            </button>
            <button
              type="button"
              onClick={handleStepOutOfZone}
              disabled={!roomId}
              className="flex items-center justify-center gap-1 py-1.5 px-2 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-200 rounded-xl transition-colors text-[11px]"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
              <span>Breach Zone</span>
            </button>
          </div>

          {/* Joystick Walk Simulator */}
          <div className="bg-black/40 p-2 rounded-xl border border-white/5 flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Compass className="w-3 h-3" /> Walk Simulator
              </span>
              <button
                type="button"
                onClick={handleReturnToCenter}
                className="text-primary hover:underline flex items-center gap-0.5"
              >
                <Home className="w-3 h-3" /> Center
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1 w-28">
              <div />
              <button
                type="button"
                onClick={() => onNudgeLocation && onNudgeLocation(8, 0)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 active:bg-primary active:text-black rounded flex items-center justify-center"
                title="Walk North 8m"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <div />
              <button
                type="button"
                onClick={() => onNudgeLocation && onNudgeLocation(0, -8)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 active:bg-primary active:text-black rounded flex items-center justify-center"
                title="Walk West 8m"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center justify-center text-[9px] text-slate-500 font-mono">
                8m
              </div>
              <button
                type="button"
                onClick={() => onNudgeLocation && onNudgeLocation(0, 8)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 active:bg-primary active:text-black rounded flex items-center justify-center"
                title="Walk East 8m"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <div />
              <button
                type="button"
                onClick={() => onNudgeLocation && onNudgeLocation(-8, 0)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 active:bg-primary active:text-black rounded flex items-center justify-center"
                title="Walk South 8m"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <div />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
