import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Crown,
  Play,
  Copy,
  Check,
  MapPin,
  Settings,
  Users,
  Compass,
  ArrowLeft,
  Eye,
  Sliders,
} from 'lucide-react';
import { gameService } from '../services';
import { useGameStore } from '../store/gameStore';
import { AvatarBadge } from '../components/AvatarBadge';
import { MapComponent } from '../components/MapComponent';
import { SimulationDrawer } from '../components/SimulationDrawer';
import { useGeolocation } from '../hooks/useGeolocation';
import { soundEffects } from '../lib/audio';

export const LobbyScreen: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const room = useGameStore((state) => state.room);
  const setRoom = useGameStore((state) => state.setRoom);
  const playerId = useGameStore((state) => state.playerId);
  const userLocation = useGameStore((state) => state.userLocation);
  const t = useGameStore((state) => state.t);

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'zone' | 'settings'>('zone');
  const [recenterTarget, setRecenterTarget] = useState<[number, number] | null>(null);

  const { nudgeSimulatedLocation } = useGeolocation({
    roomId: roomId || undefined,
    playerId: playerId || undefined,
    autoStart: true,
  });

  // Subscribe to live room updates
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = gameService.subscribeToRoom(roomId, (updatedRoom) => {
      if (!updatedRoom) {
        navigate('/');
        return;
      }
      setRoom(updatedRoom);

      // Phase changes: automatically advance
      if (
        updatedRoom.phase === 'ROLE_REVEAL' ||
        updatedRoom.phase === 'HIDING' ||
        updatedRoom.phase === 'PLAYING'
      ) {
        navigate(`/game/${roomId}`);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [roomId, navigate, setRoom]);

  if (!room || !roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const currentPlayer = playerId ? room.players[playerId] : null;
  const isHost = Boolean(currentPlayer?.isHost);
  const playersList = Object.values(room.players);

  const handleCopyCode = () => {
    const url = `${window.location.origin}/join?room=${room.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      soundEffects.playTick();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleReady = () => {
    if (playerId) {
      soundEffects.playTick();
      gameService.setPlayerReady(room.id, playerId, !currentPlayer?.isReady);
    }
  };

  const handleStartGame = async () => {
    soundEffects.playTick();
    await gameService.startGame(room.id);
  };

  const handleRadiusChange = (radius: number) => {
    if (isHost) {
      gameService.updateZone(room.id, {
        ...room.zone,
        radius,
      });
    }
  };

  const handleZoneCenterChange = (lat: number, lng: number) => {
    if (isHost) {
      soundEffects.playTick();
      gameService.updateZone(room.id, {
        ...room.zone,
        center: { lat, lng },
      });
      setRecenterTarget([lat, lng]);
    }
  };

  const handleUseMyCurrentLocation = () => {
    if (userLocation && isHost) {
      soundEffects.playTick();
      gameService.updateZone(room.id, {
        ...room.zone,
        center: { lat: userLocation.lat, lng: userLocation.lng },
      });
      setRecenterTarget([userLocation.lat, userLocation.lng]);
    }
  };

  const handleConfigChange = (key: string, val: number | string | null) => {
    if (isHost) {
      gameService.updateConfig(room.id, { [key]: val });
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-55px)] flex flex-col justify-between p-3 sm:p-4 max-w-md mx-auto">
      {/* Top Header Card: Room Code, Squad count, share */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (playerId) gameService.leaveRoom(room.id, playerId);
                navigate('/');
              }}
              className="p-1.5 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground"
              title="Leave Room"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                  Room
                </span>
                <span className="text-base font-display font-extrabold text-foreground font-mono">
                  {room.id}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-1 py-1.5 px-3 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-xs font-semibold text-foreground transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Operatives Roster */}
        <div className="p-3 rounded-2xl bg-secondary/50 border border-border mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-display font-bold text-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              Operatives Joined ({playersList.length})
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              2–10 Players
            </span>
          </div>

          {/* Player badges horizontal scroll */}
          <div className="flex items-center gap-3 overflow-x-auto py-1">
            {playersList.map((player) => (
              <div key={player.id} className="relative shrink-0 text-center">
                <AvatarBadge player={player} size="md" showStatus={false} />
                <span className="block text-[10px] font-semibold text-foreground truncate max-w-[64px] mt-1">
                  {player.name}
                </span>
                {player.isHost && (
                  <span className="inline-block text-[8px] bg-amber-500/20 text-amber-400 px-1 rounded-sm font-semibold">
                    Host
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tabs: Zone Map Editor vs Rules & Settings */}
        <div className="flex rounded-xl bg-secondary/80 p-1 mb-3 border border-border">
          <button
            type="button"
            onClick={() => setActiveTab('zone')}
            className={`flex-1 py-1.5 text-xs font-display font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'zone'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-primary" />
            <span>Map Safe Zone</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-1.5 text-xs font-display font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'settings'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-primary" />
            <span>Game Rules</span>
          </button>
        </div>

        {/* Tab 1: Map Safe Zone Editor */}
        {activeTab === 'zone' && (
          <div className="space-y-3">
            <div className="relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-border shadow-inner">
              <MapComponent
                zone={room.zone}
                players={room.players}
                currentPlayerId={playerId}
                userLocation={userLocation}
                isLobby={true}
                isZoneEditable={isHost}
                onZoneCenterChange={handleZoneCenterChange}
                recenterCoords={recenterTarget}
              />

              {/* Host tap hint badge */}
              {isHost && (
                <div className="absolute top-2 left-2 z-20 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-medium text-emerald-300 border border-emerald-500/30 shadow-md">
                  Tap map to relocate zone center
                </div>
              )}

              {/* Center on My GPS Button */}
              {isHost && (
                <button
                  type="button"
                  onClick={handleUseMyCurrentLocation}
                  className="absolute bottom-2 right-2 z-20 bg-card/90 hover:bg-card border border-border text-foreground px-2.5 py-1.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>My Location</span>
                </button>
              )}
            </div>

            {/* Radius slider (Host only or read-only) */}
            <div className="p-3 rounded-2xl bg-secondary/40 border border-border">
              <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                <span className="text-muted-foreground">{t('zoneRadius')}:</span>
                <span className="font-display font-bold text-primary font-mono text-sm">
                  {room.zone.radius} meters
                </span>
              </div>
              {isHost ? (
                <input
                  type="range"
                  min={50}
                  max={1000}
                  step={25}
                  value={room.zone.radius}
                  onChange={(e) => handleRadiusChange(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              ) : (
                <div className="text-[11px] text-muted-foreground italic">
                  Host is setting the perimeter size.
                </div>
              )}
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-0.5">
                <span>50m (Courtyard)</span>
                <span>250m (Building)</span>
                <span>1000m (Campus)</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Game Rules & Timers */}
        {activeTab === 'settings' && (
          <div className="space-y-3">
            {/* Seeker Picker */}
            <div className="p-3 rounded-2xl bg-secondary/40 border border-border">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-rose-400" />
                {t('seekerPicker')}
              </label>
              {isHost ? (
                <select
                  value={room.config.seekerId || ''}
                  onChange={(e) =>
                    handleConfigChange('seekerId', e.target.value || null)
                  }
                  className="w-full p-2.5 text-xs rounded-xl bg-card border border-border text-foreground focus:ring-1 focus:ring-primary"
                >
                  <option value="">{t('randomSeeker')}</option>
                  {playersList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.id === playerId ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-xs font-semibold text-foreground p-2 bg-card rounded-xl border border-border">
                  {room.config.seekerId
                    ? room.players[room.config.seekerId]?.name || 'Specific Player'
                    : 'Randomly selected when game starts'}
                </div>
              )}
            </div>

            {/* Timing Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Game Duration */}
              <div className="p-2.5 rounded-2xl bg-secondary/40 border border-border">
                <span className="text-[11px] text-muted-foreground block mb-1">
                  Game Duration
                </span>
                {isHost ? (
                  <select
                    value={room.config.gameDuration}
                    onChange={(e) =>
                      handleConfigChange('gameDuration', Number(e.target.value))
                    }
                    className="w-full p-1.5 text-xs rounded-lg bg-card border border-border text-foreground font-mono font-bold"
                  >
                    <option value={300}>5 Mins</option>
                    <option value={600}>10 Mins</option>
                    <option value={900}>15 Mins</option>
                    <option value={1200}>20 Mins</option>
                  </select>
                ) : (
                  <span className="font-bold font-mono text-foreground">
                    {Math.round(room.config.gameDuration / 60)} Mins
                  </span>
                )}
              </div>

              {/* Hiding Grace Duration */}
              <div className="p-2.5 rounded-2xl bg-secondary/40 border border-border">
                <span className="text-[11px] text-muted-foreground block mb-1">
                  Hiding Time
                </span>
                {isHost ? (
                  <select
                    value={room.config.hidingDuration}
                    onChange={(e) =>
                      handleConfigChange('hidingDuration', Number(e.target.value))
                    }
                    className="w-full p-1.5 text-xs rounded-lg bg-card border border-border text-foreground font-mono font-bold"
                  >
                    <option value={30}>30s (Sprint)</option>
                    <option value={60}>60s (Default)</option>
                    <option value={120}>120s (2 min)</option>
                  </select>
                ) : (
                  <span className="font-bold font-mono text-foreground">
                    {room.config.hidingDuration}s
                  </span>
                )}
              </div>

              {/* Reveal Interval */}
              <div className="p-2.5 rounded-2xl bg-secondary/40 border border-border">
                <span className="text-[11px] text-muted-foreground block mb-1">
                  Radar Interval
                </span>
                {isHost ? (
                  <select
                    value={room.config.revealInterval}
                    onChange={(e) =>
                      handleConfigChange('revealInterval', Number(e.target.value))
                    }
                    className="w-full p-1.5 text-xs rounded-lg bg-card border border-border text-foreground font-mono font-bold"
                  >
                    <option value={60}>Every 1 Min</option>
                    <option value={120}>Every 2 Mins</option>
                    <option value={180}>Every 3 Mins</option>
                    <option value={300}>Every 5 Mins</option>
                  </select>
                ) : (
                  <span className="font-bold font-mono text-foreground">
                    Every {Math.round(room.config.revealInterval / 60)}m
                  </span>
                )}
              </div>

              {/* Boundary Grace */}
              <div className="p-2.5 rounded-2xl bg-secondary/40 border border-border">
                <span className="text-[11px] text-muted-foreground block mb-1">
                  Zone Grace Period
                </span>
                {isHost ? (
                  <select
                    value={room.config.gracePeriod}
                    onChange={(e) =>
                      handleConfigChange('gracePeriod', Number(e.target.value))
                    }
                    className="w-full p-1.5 text-xs rounded-lg bg-card border border-border text-foreground font-mono font-bold"
                  >
                    <option value={15}>15 Seconds</option>
                    <option value={20}>20 Seconds</option>
                    <option value={30}>30 Seconds</option>
                  </select>
                ) : (
                  <span className="font-bold font-mono text-foreground">
                    {room.config.gracePeriod}s
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer: Launch Game or Ready state */}
      <div className="mt-4 space-y-2 pb-safe">
        {isHost ? (
          <button
            type="button"
            onClick={handleStartGame}
            className="w-full py-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold text-base shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Launch HideNSeek Game</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleToggleReady}
            className={`w-full py-3.5 rounded-2xl font-display font-bold text-sm border shadow-lg flex items-center justify-center gap-2 transition-all ${
              currentPlayer?.isReady
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                : 'bg-secondary border-border text-foreground'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>
              {currentPlayer?.isReady ? 'You are Ready! (Tap to change)' : 'Tap When Ready'}
            </span>
          </button>
        )}

        {!isHost && (
          <p className="text-center text-[11px] text-muted-foreground">
            Waiting for host <span className="font-semibold text-foreground">{room.players[room.hostId]?.name || 'Host'}</span> to launch the game...
          </p>
        )}
      </div>

      {/* Dev Simulation Drawer */}
      <SimulationDrawer
        roomId={room.id}
        onNudgeLocation={nudgeSimulatedLocation}
      />
    </div>
  );
};
