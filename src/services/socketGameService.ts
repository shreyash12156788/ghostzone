import { io, Socket } from 'socket.io-client';
import {
  GameConfig,
  LocationCoordinates,
  Player,
  PlayerStatus,
  Role,
  Room,
  Zone,
  ServerEventPayload,
} from '../types';
import { IGameService } from './gameService';
import { useGameStore, getPersistentPlayerId } from '../store/gameStore';
import { soundEffects } from '../lib/audio';
import { vibrate, HapticPatterns } from '../lib/vibration';
import { calculateBearingToCenter, calculateDistanceMeters } from '../game/engine';

/**
 * SocketGameService
 * Connects to the authoritative game server using Socket.io.
 * Listens for:
 *   - 'state': authoritative room state snapshots every ~second
 *   - 'event': server events ({ type, at, ...data })
 * Emits (with ack { ok, error }):
 *   - room:create, room:join, room:config, room:seeker, game:start, player:caught, room:leave
 * Emits (without ack, every 3-4s):
 *   - loc:update
 */
export class SocketGameService implements IGameService {
  private socket: Socket;
  private subscribers: Map<string, Set<(room: Room | null) => void>> = new Map();
  private cachedRoom: Room | null = null;
  private currentRoomId: string | null = null;

  constructor() {
    const envUrl = (import.meta.env.VITE_SERVER_URL as string)?.trim();
    const serverUrl =
      envUrl ||
      (typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'http://localhost:3001');

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    this.setupListeners();
  }

  private setupListeners() {
    // 1. Auto re-join on socket connect using sessionStorage
    this.socket.on('connect', () => {
      const savedRoomId =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('hidenseek_active_room_id')
          : null;
      const savedPlayerId = getPersistentPlayerId();
      const savedName =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('hidenseek_player_name') || 'Operative'
          : 'Operative';
      const savedAvatar =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('hidenseek_player_avatar') || '#06d6a0'
          : '#06d6a0';

      if (savedRoomId && savedPlayerId) {
        this.socket.emit(
          'room:join',
          {
            roomId: savedRoomId.toUpperCase(),
            name: savedName,
            avatar: savedAvatar,
            playerId: savedPlayerId,
          },
          (ack: { ok: boolean; error?: string; room?: any; playerId?: string }) => {
            if (ack?.ok && ack.room) {
              this.handleServerState(ack.room);
            }
          }
        );
      }
    });

    // 2. Authoritative 'state' message handler
    this.socket.on('state', (state: any) => {
      if (!state) return;
      this.handleServerState(state);
    });

    // 3. Exact 'event' message handler ({ type, at, ...data })
    this.socket.on('event', (eventPayload: ServerEventPayload) => {
      if (!eventPayload || !eventPayload.type) return;
      this.handleServerEvent(eventPayload);
    });
  }

  /**
   * Transforms server state into the Room model and updates store & subscribers
   */
  private handleServerState(state: any) {
    const store = useGameStore.getState();

    // 1. Compute clockOffset = state.serverNow - Date.now()
    const serverNow = state.serverNow || Date.now();
    const clockOffset = serverNow - Date.now();
    store.setClockOffset(clockOffset);

    // If state contains a wrapped room or is raw state
    const rawRoom = state.room || state;
    if (!rawRoom || !rawRoom.id) return;

    const roomId = String(rawRoom.id).toUpperCase();
    this.currentRoomId = roomId;

    // 2. Map status -> UI phase: lobby=LOBBY, hiding=HIDING, playing=PLAYING, ended=ENDED
    const serverStatus = (rawRoom.status || 'lobby').toLowerCase();
    let phase: Room['phase'] = 'LOBBY';
    if (serverStatus === 'hiding') phase = 'HIDING';
    else if (serverStatus === 'playing') phase = 'PLAYING';
    else if (serverStatus === 'ended') phase = 'ENDED';

    // 3. Map Config
    const rawCfg = rawRoom.config || {};
    const radius = Number(rawCfg.radius ?? 250);
    const durationMin = Number(rawCfg.durationMin ?? rawCfg.duration ?? 10);
    const hideSec = Number(rawCfg.hideSec ?? rawCfg.hidingDuration ?? 60);
    const revealEveryMin = Number(rawCfg.revealEveryMin ?? 2);
    const revealSec = Number(rawCfg.revealSec ?? rawCfg.revealDuration ?? 15);
    const graceSec = Number(rawCfg.graceSec ?? rawCfg.gracePeriod ?? 20);

    const config: GameConfig = {
      gameDuration: durationMin * 60,
      hidingDuration: hideSec,
      revealInterval: revealEveryMin * 60,
      revealDuration: revealSec,
      gracePeriod: graceSec,
      seekerId: rawRoom.seekerId ?? null,
      radius,
      durationMin,
      duration: durationMin,
      hideSec,
      revealEveryMin,
      revealSec,
      graceSec,
    };

    // 4. Map Players array to Record<string, Player>
    const playersDict: Record<string, Player> = {};
    if (Array.isArray(state.players)) {
      for (const p of state.players) {
        const role: Role =
          p.role === 'seeker' || p.role === 'SEEKER'
            ? 'SEEKER'
            : p.role === 'hider' || p.role === 'HIDER'
            ? 'HIDER'
            : 'UNDECIDED';

        let status: PlayerStatus = 'LOBBY';
        if (p.status === 'out') status = 'OUT_OF_ZONE';
        else if (p.status === 'caught') status = 'CAUGHT';
        else if (p.status === 'dq') status = 'DISQUALIFIED';
        else if (p.status === 'active') {
          status = serverStatus === 'lobby' ? 'LOBBY' : 'HIDING';
        }

        const loc = state.locations?.[p.id];

        playersDict[p.id] = {
          id: p.id,
          name: p.name || 'Operative',
          avatar: p.color || p.avatar || '#06d6a0',
          color: p.color,
          isHost: Boolean(p.isHost || p.id === rawRoom.hostId),
          isReady: p.status === 'active' || Boolean(p.connected),
          role,
          status,
          rawStatus: p.status,
          location: loc
            ? {
                lat: loc.lat,
                lng: loc.lng,
                accuracy: loc.accuracy,
                updatedAt: loc.updatedAt,
              }
            : undefined,
          outOfZoneSince: p.outSince ?? null,
          outSince: p.outSince ?? null,
          outOfZoneCount: p.outCount || 0,
          outCount: p.outCount || 0,
          caughtAt: p.caughtAt ?? null,
          distanceTraveled: p.distance || 0,
          distance: p.distance || 0,
          connected: p.connected,
          joinedAt: p.joinedAt,
        };
      }
    }

    // 5. Store Locations dictionary
    if (state.locations) {
      store.setLocations(state.locations);
    }

    // 6. Map Reveal state
    const nowAdjusted = Date.now() + clockOffset;
    const isRevealing = Boolean(state.reveal?.active);
    const secondsRemainingInReveal = state.reveal?.endsAt
      ? Math.max(0, Math.ceil((state.reveal.endsAt - nowAdjusted) / 1000))
      : 0;
    const secondsUntilNext = state.reveal?.nextAt
      ? Math.max(0, Math.ceil((state.reveal.nextAt - nowAdjusted) / 1000))
      : 0;

    store.updateRevealState({
      isRevealing,
      secondsRemainingInReveal,
      secondsUntilNext,
      revealProgress: 0,
    });

    // 7. Assemble Normalized Room
    const winner =
      rawRoom.winner === 'seeker'
        ? 'SEEKER'
        : rawRoom.winner === 'hiders'
        ? 'HIDERS'
        : rawRoom.winner ?? null;

    const room: Room = {
      id: roomId,
      phase,
      status: serverStatus as Room['status'],
      config,
      zone: {
        type: 'CIRCLE',
        center: rawRoom.zone?.center || { lat: 18.5204, lng: 73.8567 },
        radius: rawRoom.zone?.radius ?? config.radius ?? 250,
      },
      players: playersDict,
      hostId: rawRoom.hostId,
      seekerId: rawRoom.seekerId,
      createdAt: rawRoom.startAt || Date.now(),
      startedAt: rawRoom.startAt ?? null,
      startAt: rawRoom.startAt ?? null,
      playStartedAt: rawRoom.playStartAt ?? null,
      playStartAt: rawRoom.playStartAt ?? null,
      endedAt: rawRoom.endedAt ?? null,
      winner,
      winReason: rawRoom.winReason || (winner ? `${winner} won the mission!` : null),
      reveal: state.reveal,
      revealState: {
        isRevealing,
        secondsRemainingInReveal,
        secondsUntilNext,
        revealProgress: 0,
      },
      locations: state.locations,
      serverNow,
      clockOffset,
    };

    this.cachedRoom = room;
    store.setRoom(room);
    this.notifySubscribers(roomId, room);
  }

  /**
   * Handles the exact server event types specified by the server protocol
   */
  private handleServerEvent(event: ServerEventPayload) {
    const store = useGameStore.getState();
    const myPlayerId = store.playerId;

    switch (event.type) {
      case 'started': {
        // Game has started (hiding phase)
        break;
      }

      case 'playing': {
        // Seeker is released (playing phase)
        break;
      }

      case 'out_of_zone': {
        // { playerId, name, graceSec }
        if (event.playerId === myPlayerId) {
          const room = this.cachedRoom || store.room;
          const userLoc = store.userLocation;
          const center = room?.zone?.center || { lat: 18.5204, lng: 73.8567 };
          const from = userLoc || center;
          const bearing = calculateBearingToCenter(from, center);
          const distance = calculateDistanceMeters(from, center);

          store.setOutOfZoneAlert({
            isOut: true,
            secondsRemaining: event.graceSec ?? room?.config?.graceSec ?? 20,
            bearingToCenter: bearing,
            distanceToCenter: distance,
          });
        } else {
          store.setOtherOutOfZonePlayerName(event.name || 'Operative');
          store.setToastMessage(
            `⚠️ ${event.name || 'An operative'} is out of the zone! (${event.graceSec ?? 20}s grace)`
          );
        }
        soundEffects.playHazardAlarm();
        vibrate(HapticPatterns.outOfZoneAlarm);
        break;
      }

      case 'returned': {
        // { playerId, name }
        if (event.playerId === myPlayerId) {
          store.setOutOfZoneAlert(null);
        } else {
          store.setOtherOutOfZonePlayerName(null);
          store.setToastMessage(`✅ ${event.name || 'Operative'} returned to safe zone.`);
        }
        break;
      }

      case 'caught': {
        // { playerId, name }
        soundEffects.playCaught();
        vibrate(HapticPatterns.caught);
        store.setToastMessage(`🎯 ${event.name || 'Operative'} was caught!`);
        break;
      }

      case 'dq': {
        // { playerId, name, reason }
        if (event.playerId === myPlayerId) {
          store.setOutOfZoneAlert(null);
        }
        store.setToastMessage(
          `❌ ${event.name || 'Operative'} was disqualified${event.reason ? `: ${event.reason}` : ''}.`
        );
        break;
      }

      case 'reveal_start': {
        // { endsAt }
        soundEffects.playRadarPing();
        vibrate(HapticPatterns.revealBlip);
        const clockOffset = store.clockOffset;
        const nowAdjusted = Date.now() + clockOffset;
        const secondsRemaining = event.endsAt
          ? Math.max(0, Math.ceil((event.endsAt - nowAdjusted) / 1000))
          : 15;

        store.updateRevealState({
          isRevealing: true,
          secondsRemainingInReveal: secondsRemaining,
          secondsUntilNext: 0,
          revealProgress: 0,
        });
        break;
      }

      case 'ended': {
        // { winner } winner is "seeker" or "hiders"
        const winner = event.winner === 'seeker' ? 'SEEKER' : 'HIDERS';
        if (this.cachedRoom) {
          this.cachedRoom.phase = 'ENDED';
          this.cachedRoom.status = 'ended';
          this.cachedRoom.winner = winner;
          this.cachedRoom.winReason = `${winner} won the mission!`;
          store.setRoom({ ...this.cachedRoom });
          this.notifySubscribers(this.cachedRoom.id, this.cachedRoom);
        }
        break;
      }

      case 'host_changed': {
        // { playerId, name }
        store.setToastMessage(`👑 Host changed to ${event.name || 'new operative'}.`);
        break;
      }

      default:
        break;
    }
  }

  private notifySubscribers(roomId: string, room: Room | null) {
    const upperId = roomId.toUpperCase();
    const subs = this.subscribers.get(upperId);
    if (subs) {
      subs.forEach((cb) => cb(room ? JSON.parse(JSON.stringify(room)) : null));
    }
  }

  // --- CLIENT -> SERVER EMITS ---

  async createRoom(
    hostName: string,
    avatar: string,
    initialZone?: Partial<Zone>
  ): Promise<{ room: Room; playerId: string }> {
    const persistentId = getPersistentPlayerId();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('hidenseek_player_name', hostName);
      sessionStorage.setItem('hidenseek_player_avatar', avatar);
    }

    const payload = {
      hostName: hostName.trim() || 'Host',
      avatar,
      zone: {
        center: initialZone?.center || { lat: 18.5204, lng: 73.8567 },
        radius: initialZone?.radius || 250,
      },
      config: {
        radius: initialZone?.radius || 250,
        durationMin: 10,
        hideSec: 60,
        revealEveryMin: 2,
        revealSec: 15,
        graceSec: 20,
      },
      playerId: persistentId,
    };

    return new Promise((resolve, reject) => {
      this.socket.emit(
        'room:create',
        payload,
        (ack: { ok: boolean; error?: string; room?: any; playerId?: string }) => {
          if (ack?.ok && ack.room) {
            this.handleServerState(ack.room);
            const assignedId = ack.playerId || persistentId;
            useGameStore.getState().setPlayerId(assignedId);
            resolve({ room: this.cachedRoom!, playerId: assignedId });
          } else {
            reject(new Error(ack?.error || 'Failed to create room on server.'));
          }
        }
      );
    });
  }

  async joinRoom(
    roomId: string,
    playerName: string,
    avatar: string
  ): Promise<{ room: Room; playerId: string }> {
    const persistentId = getPersistentPlayerId();
    const upperId = roomId.toUpperCase();

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('hidenseek_player_name', playerName);
      sessionStorage.setItem('hidenseek_player_avatar', avatar);
    }

    const payload = {
      roomId: upperId,
      name: playerName.trim() || 'Player',
      avatar,
      playerId: persistentId,
    };

    return new Promise((resolve, reject) => {
      this.socket.emit(
        'room:join',
        payload,
        (ack: { ok: boolean; error?: string; room?: any; playerId?: string }) => {
          if (ack?.ok && ack.room) {
            this.handleServerState(ack.room);
            const assignedId = ack.playerId || persistentId;
            useGameStore.getState().setPlayerId(assignedId);
            resolve({ room: this.cachedRoom!, playerId: assignedId });
          } else {
            reject(new Error(ack?.error || 'Failed to join room on server.'));
          }
        }
      );
    });
  }

  async updateConfig(
    roomId: string,
    config: Partial<GameConfig>
  ): Promise<void> {
    const upperId = roomId.toUpperCase();

    // 1. If seeker is designated, emit room:seeker
    if (config.seekerId !== undefined) {
      this.socket.emit(
        'room:seeker',
        { roomId: upperId, seekerId: config.seekerId },
        (ack: { ok: boolean; error?: string }) => {
          if (!ack?.ok && ack?.error) {
            console.warn('[SocketGameService] room:seeker error:', ack.error);
          }
        }
      );
    }

    // 2. Emit room:config
    const serverConfig = {
      radius: config.radius,
      durationMin:
        config.durationMin ??
        (config.gameDuration ? Math.round(config.gameDuration / 60) : undefined),
      hideSec: config.hideSec ?? config.hidingDuration,
      revealEveryMin:
        config.revealEveryMin ??
        (config.revealInterval ? Math.round(config.revealInterval / 60) : undefined),
      revealSec: config.revealSec ?? config.revealDuration,
      graceSec: config.graceSec ?? config.gracePeriod,
      seekerId: config.seekerId,
    };

    return new Promise((resolve, reject) => {
      this.socket.emit(
        'room:config',
        { roomId: upperId, config: serverConfig },
        (ack: { ok: boolean; error?: string }) => {
          if (ack?.ok) resolve();
          else reject(new Error(ack?.error || 'Failed to update config'));
        }
      );
    });
  }

  async updateZone(roomId: string, zone: Zone): Promise<void> {
    return this.updateConfig(roomId, { radius: zone.radius });
  }

  async setPlayerReady(
    _roomId: string,
    _playerId: string,
    _isReady: boolean
  ): Promise<void> {
    // Player ready is reflected via active presence
  }

  async startGame(roomId: string): Promise<void> {
    const upperId = roomId.toUpperCase();
    return new Promise((resolve, reject) => {
      this.socket.emit(
        'game:start',
        { roomId: upperId },
        (ack: { ok: boolean; error?: string }) => {
          if (ack?.ok) resolve();
          else reject(new Error(ack?.error || 'Failed to start game'));
        }
      );
    });
  }

  async advancePhase(_roomId: string): Promise<void> {
    // Authoritative server manages phase transitions
  }

  async updateLocation(
    roomId: string,
    playerId: string,
    coords: LocationCoordinates
  ): Promise<void> {
    // loc:update without ack (every 3-4s while hiding/playing)
    this.socket.emit('loc:update', {
      roomId: roomId.toUpperCase(),
      playerId,
      lat: coords.lat,
      lng: coords.lng,
      accuracy: coords.accuracy,
    });
  }

  async markCaught(
    roomId: string,
    targetPlayerId: string,
    _caughtByPlayerId?: string
  ): Promise<void> {
    const upperId = roomId.toUpperCase();
    return new Promise((resolve, reject) => {
      this.socket.emit(
        'player:caught',
        { roomId: upperId, targetId: targetPlayerId },
        (ack: { ok: boolean; error?: string }) => {
          if (ack?.ok) resolve();
          else reject(new Error(ack?.error || 'Failed to mark caught'));
        }
      );
    });
  }

  async disqualifyPlayer(_roomId: string, _playerId: string): Promise<void> {
    // Authoritative server disqualifies players who exceed grace period
  }

  async restartGame(roomId: string): Promise<void> {
    const upperId = roomId.toUpperCase();
    return new Promise((resolve, reject) => {
      this.socket.emit(
        'room:leave',
        { roomId: upperId, playerId: getPersistentPlayerId() },
        (ack: { ok: boolean; error?: string }) => {
          if (ack?.ok) resolve();
          else resolve();
        }
      );
    });
  }

  async leaveRoom(roomId: string, playerId: string): Promise<void> {
    const upperId = roomId.toUpperCase();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('hidenseek_active_room_id');
    }
    this.currentRoomId = null;
    this.cachedRoom = null;
    return new Promise((resolve, reject) => {
      this.socket.emit(
        'room:leave',
        { roomId: upperId, playerId },
        (ack: { ok: boolean; error?: string }) => {
          if (ack?.ok) resolve();
          else reject(new Error(ack?.error || 'Failed to leave room'));
        }
      );
    });
  }

  subscribeToRoom(
    roomId: string,
    callback: (room: Room | null) => void
  ): () => void {
    const upperId = roomId.toUpperCase();
    if (!this.subscribers.has(upperId)) {
      this.subscribers.set(upperId, new Set());
    }
    this.subscribers.get(upperId)!.add(callback);

    if (this.cachedRoom && this.cachedRoom.id === upperId) {
      callback(JSON.parse(JSON.stringify(this.cachedRoom)));
    }

    return () => {
      const subs = this.subscribers.get(upperId);
      if (subs) {
        subs.delete(callback);
      }
    };
  }

  // Simulation helpers for dev testing
  async addSimulationBots(): Promise<void> {}
  async removeSimulationBots(): Promise<void> {}
  async stepSimulationBots(): Promise<void> {}
  async triggerTestReveal(): Promise<void> {}
}
