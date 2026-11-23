import {
  GameConfig,
  LocationCoordinates,
  Player,
  Room,
  Zone,
} from '../types';
import {
  assignPlayerRoles,
  isInsideZone,
  calculateDistanceMeters,
  calculateRevealState,
  evaluateWinCondition,
} from '../game/engine';

export interface IGameService {
  createRoom(
    hostName: string,
    avatar: string,
    initialZone?: Partial<Zone>
  ): Promise<{ room: Room; playerId: string }>;
  
  joinRoom(
    roomId: string,
    playerName: string,
    avatar: string
  ): Promise<{ room: Room; playerId: string }>;
  
  leaveRoom(roomId: string, playerId: string): Promise<void>;
  
  updateLocation(
    roomId: string,
    playerId: string,
    coords: LocationCoordinates
  ): Promise<void>;
  
  updateConfig(roomId: string, config: Partial<GameConfig>): Promise<void>;
  
  updateZone(roomId: string, zone: Zone): Promise<void>;
  
  setPlayerReady(
    roomId: string,
    playerId: string,
    isReady: boolean
  ): Promise<void>;
  
  startGame(roomId: string): Promise<void>;
  
  advancePhase(roomId: string): Promise<void>;

  markCaught(
    roomId: string,
    targetPlayerId: string,
    caughtByPlayerId?: string
  ): Promise<void>;
  
  disqualifyPlayer(roomId: string, playerId: string): Promise<void>;
  
  restartGame(roomId: string): Promise<void>;
  
  subscribeToRoom(
    roomId: string,
    callback: (room: Room | null) => void
  ): () => void;
  
  // Simulation utilities for testing
  addSimulationBots(roomId: string, count?: number): Promise<void>;
  removeSimulationBots(roomId: string): Promise<void>;
  stepSimulationBots(roomId: string): Promise<void>;
  triggerTestReveal(roomId: string): Promise<void>;
}

// Generate random 6-character room code like K7X2QP
export function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit ambiguous chars like I, 1, O, 0
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const STORAGE_PREFIX = 'hidenseek_room_';
const CHANNEL_NAME = 'hidenseek_cross_tab_sync';

/**
 * In-memory + BroadcastChannel + LocalStorage game service.
 * Enables full multi-tab live sync, persistent reloads, host handoffs, and AI bot simulations.
 */
export class MockGameService implements IGameService {
  private rooms: Map<string, Room> = new Map();
  private subscribers: Map<string, Set<(room: Room | null) => void>> = new Map();
  private channel: BroadcastChannel | null = null;
  private botSimulationIntervals: Map<string, NodeJS.Timeout> = new Map();
  private roomLoops: Map<string, any> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          const { type, roomId, room } = event.data || {};
          if (type === 'ROOM_SYNC' && roomId && room) {
            this.rooms.set(roomId, room);
            this.saveToStorage(roomId, room);
            this.notifySubscribers(roomId, room);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported in this context', e);
      }
    }
  }

  private getStorageKey(roomId: string): string {
    return `${STORAGE_PREFIX}${roomId.toUpperCase()}`;
  }

  private saveToStorage(roomId: string, room: Room) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.getStorageKey(roomId), JSON.stringify(room));
    } catch (e) {
      console.warn('Failed to save room to localStorage', e);
    }
  }

  private loadFromStorage(roomId: string): Room | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(this.getStorageKey(roomId));
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load room from localStorage', e);
    }
    return null;
  }

  private broadcastRoom(roomId: string, room: Room) {
    this.rooms.set(roomId, room);
    this.saveToStorage(roomId, room);
    this.notifySubscribers(roomId, room);
    if (this.channel) {
      this.channel.postMessage({ type: 'ROOM_SYNC', roomId, room });
    }
  }

  private notifySubscribers(roomId: string, room: Room | null) {
    const subs = this.subscribers.get(roomId);
    if (subs) {
      subs.forEach((cb) => cb(room ? JSON.parse(JSON.stringify(room)) : null));
    }
  }

  private getRoom(roomId: string): Room {
    const upperId = roomId.toUpperCase();
    let room = this.rooms.get(upperId);
    if (!room) {
      room = this.loadFromStorage(upperId) || undefined;
      if (room) {
        this.rooms.set(upperId, room);
      }
    }
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }
    return room;
  }

  async createRoom(
    hostName: string,
    avatar: string,
    initialZone?: Partial<Zone>
  ): Promise<{ room: Room; playerId: string }> {
    const roomId = generateRoomId();
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Default zone: campus center or user location
    const defaultCenter = initialZone?.center || { lat: 18.5204, lng: 73.8567 };
    const zone: Zone = {
      type: initialZone?.type || 'CIRCLE',
      center: defaultCenter,
      radius: initialZone?.radius || 250, // 250m default radius
      polygon: initialZone?.polygon,
    };

    const hostPlayer: Player = {
      id: playerId,
      name: hostName.trim() || 'Host',
      avatar,
      isHost: true,
      isReady: true,
      role: 'UNDECIDED',
      status: 'LOBBY',
      distanceTraveled: 0,
      outOfZoneCount: 0,
    };

    const room: Room = {
      id: roomId,
      phase: 'LOBBY',
      config: {
        gameDuration: 600, // 10 minutes
        hidingDuration: 60, // 60 seconds hiding time
        revealInterval: 120, // 2 minutes between reveals
        revealDuration: 15, // 15 seconds reveal window
        gracePeriod: 20, // 20 seconds grace period
        seekerId: null,
      },
      zone,
      players: { [playerId]: hostPlayer },
      hostId: playerId,
      createdAt: Date.now(),
    };

    this.broadcastRoom(roomId, room);
    return { room, playerId };
  }

  async joinRoom(
    roomId: string,
    playerName: string,
    avatar: string
  ): Promise<{ room: Room; playerId: string }> {
    const upperId = roomId.toUpperCase();
    const room = this.getRoom(upperId);

    // Prevent duplicate player with same local identity if already in room
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newPlayer: Player = {
      id: playerId,
      name: playerName.trim() || `Player ${Object.keys(room.players).length + 1}`,
      avatar,
      isHost: false,
      isReady: false,
      role: 'UNDECIDED',
      status: 'LOBBY',
      distanceTraveled: 0,
      outOfZoneCount: 0,
    };

    room.players[playerId] = newPlayer;
    this.broadcastRoom(upperId, room);
    return { room, playerId };
  }

  async leaveRoom(roomId: string, playerId: string): Promise<void> {
    const upperId = roomId.toUpperCase();
    try {
      const room = this.getRoom(upperId);
      delete room.players[playerId];

      const remainingPlayerIds = Object.keys(room.players);
      if (remainingPlayerIds.length === 0) {
        // Room empty, clean up
        this.rooms.delete(upperId);
        localStorage.removeItem(this.getStorageKey(upperId));
        this.notifySubscribers(upperId, null);
        return;
      }

      // If host left, transfer host role
      if (room.hostId === playerId) {
        const nextHostId = remainingPlayerIds[0];
        room.hostId = nextHostId;
        room.players[nextHostId].isHost = true;
      }

      this.broadcastRoom(upperId, room);
    } catch {
      // Room might not exist
    }
  }

  async updateLocation(
    roomId: string,
    playerId: string,
    coords: LocationCoordinates
  ): Promise<void> {
    const upperId = roomId.toUpperCase();
    const room = this.getRoom(upperId);
    const player = room.players[playerId];
    if (!player) return;

    // Track distance traveled
    if (player.location) {
      const dist = calculateDistanceMeters(player.location, coords);
      if (dist > 1 && dist < 100) {
        // filter GPS jumps
        player.distanceTraveled += Math.round(dist);
      }
    }

    player.location = coords;

    // If game is in progress, check boundary
    if (room.phase === 'PLAYING') {
      const inside = isInsideZone(coords, room.zone);
      if (!inside) {
        if (!player.outOfZoneSince) {
          player.outOfZoneSince = Date.now();
          player.outOfZoneCount += 1;
        }
        player.status = 'OUT_OF_ZONE';
      } else {
        if (player.status === 'OUT_OF_ZONE') {
          player.status = 'HIDING';
        }
        player.outOfZoneSince = null;
      }
    }

    this.broadcastRoom(upperId, room);
  }

  async updateConfig(
    roomId: string,
    config: Partial<GameConfig>
  ): Promise<void> {
    const upperId = roomId.toUpperCase();
    const room = this.getRoom(upperId);
    room.config = { ...room.config, ...config };
    this.broadcastRoom(upperId, room);
  }

  async updateZone(roomId: string, zone: Zone): Promise<void> {
    const upperId = roomId.toUpperCase();
    const room = this.getRoom(upperId);
    room.zone = zone;
    this.broadcastRoom(upperId, room);
  }

  async setPlayerReady(
    roomId: string,
    playerId: string,
    isReady: boolean
  ): Promise<void> {
    const upperId = roomId.toUpperCase();
    const room = this.getRoom(upperId);
    if (room.players[playerId]) {
      room.players[playerId].isReady = isReady;
      this.broadcastRoom(upperId, room);
    }
  }

  async startGame(roomId: string): Promise<void> {
    const upperId = roomId.toUpperCase();
    const room = this.getRoom(upperId);

    // Assign roles
    room.players = assignPlayerRoles(room.players, room.config.seekerId);
    room.phase = 'ROLE_REVEAL';
    room.roleRevealStartedAt = Date.now();
    this.broadcastRoom(upperId, room);

    // Automatically transition to Hiding phase after 5 seconds
    setTimeout(() => {
      try {
        const cur = this.getRoom(upperId);
        if (cur.phase === 'ROLE_REVEAL') {
          cur.phase = 'HIDING';
          cur.startedAt = Date.now();
          this.broadcastRoom(upperId, cur);

          // Automatically transition to Playing phase after hidingDuration
          setTimeout(() => {
            try {
              const live = this.getRoom(upperId);
              if (live.phase === 'HIDING') {
                live.phase = 'PLAYING';
                live.playStartedAt = Date.now();
                this.broadcastRoom(upperId, live);
                this.startRoomLoop(upperId);
              }
            } catch {}
          }, cur.config.hidingDuration * 1000);
        }
      } catch {}
    }, 5000);
  }

  async advancePhase(roomId: string): Promise<void> {
    const upperId = roomId.toUpperCase();
    const room = this.getRoom(upperId);
    if (room.phase === 'ROLE_REVEAL') {
      room.phase = 'HIDING';
      room.startedAt = Date.now();
    } else if (room.phase === 'HIDING') {
      room.phase = 'PLAYING';
      room.playStartedAt = Date.now();
      this.startRoomLoop(upperId);
    }
    this.broadcastRoom(upperId, room);
  }

  private startRoomLoop(roomId: string) {
    this.stopRoomLoop(roomId);
    const interval = setInterval(() => {
      try {
        const room = this.getRoom(roomId);
        if (room.phase !== 'PLAYING') {
          this.stopRoomLoop(roomId);
          return;
        }

        const now = Date.now();
        let changed = false;

        // 1. Reveal State update
        const rState = calculateRevealState(
          room.playStartedAt,
          room.config.revealInterval,
          room.config.revealDuration,
          now
        );
        if (
          !room.revealState ||
          room.revealState.isRevealing !== rState.isRevealing ||
          Math.abs(room.revealState.secondsRemainingInReveal - rState.secondsRemainingInReveal) >= 1
        ) {
          room.revealState = rState;
          room.isRevealing = rState.isRevealing;
          room.nextRevealIn = rState.secondsUntilNext;
          room.revealSecRemaining = rState.secondsRemainingInReveal;
          changed = true;
        }

        // 2. Disqualify players exceeding grace period
        for (const player of Object.values(room.players)) {
          if (player.status === 'OUT_OF_ZONE' && player.outOfZoneSince) {
            const elapsedOut = (now - player.outOfZoneSince) / 1000;
            if (elapsedOut >= room.config.gracePeriod) {
              player.status = 'DISQUALIFIED';
              changed = true;
            }
          }
        }

        // 3. Evaluate win condition
        const win = evaluateWinCondition(room, now);
        if (win.isGameOver) {
          room.phase = 'ENDED';
          room.endedAt = now;
          room.winner = win.winner;
          room.winReason = win.reason;
          changed = true;
          this.stopRoomLoop(roomId);
        }

        if (changed) {
          this.broadcastRoom(roomId, room);
        }
      } catch {
        this.stopRoomLoop(roomId);
      }
    }, 1000);

    this.roomLoops.set(roomId, interval);
  }

  private stopRoomLoop(roomId: string) {
    const loop = this.roomLoops.get(roomId);
    if (loop) {
      clearInterval(loop);
      this.roomLoops.delete(roomId);
    }
  }

  async markCaught(
    roomId: string,
    targetPlayerId: string,
    caughtByPlayerId?: string
  ): Promise<void> {
    const upperId = roomId.toUpperCase();
    const room = this.getRoom(upperId);
    const target = room.players[targetPlayerId];
    if (target && target.role === 'HIDER') {
      target.status = 'CAUGHT';
      target.caughtAt = Date.now();
      target.caughtBy = caughtByPlayerId || null;

      // Check if all hiders are caught
      const hiders = Object.values(room.players).filter((p) => p.role === 'HIDER');
      const activeHiders = hiders.filter(
        (p) => p.status === 'HIDING' || p.status === 'OUT_OF_ZONE'
      );

      if (activeHiders.length === 0) {
        room.phase = 'ENDED';
        room.endedAt = Date.now();
        room.winner = 'SEEKER';
        room.winReason = 'All hiders have been caught!';
      }

      this.broadcastRoom(upperId, room);
    }
  }

  async disqualifyPlayer(roomId: string, playerId: string): Promise<void> {
    const upperId = roomId.toUpperCase();
    const room = this.getRoom(upperId);
    const target = room.players[playerId];
    if (target) {
      target.status = 'DISQUALIFIED';

      // Check if all hiders are eliminated
      const hiders = Object.values(room.players).filter((p) => p.role === 'HIDER');
      const activeHiders = hiders.filter(
        (p) => p.status === 'HIDING' || p.status === 'OUT_OF_ZONE'
      );

      if (activeHiders.length === 0 && hiders.length > 0) {
        room.phase = 'ENDED';
        room.endedAt = Date.now();
        room.winner = 'SEEKER';
        room.winReason = 'All hiders were caught or disqualified for leaving the zone!';
      }

      this.broadcastRoom(upperId, room);
    }
  }

  async restartGame(roomId: string): Promise<void> {
    const upperId = roomId.toUpperCase();
    this.stopRoomLoop(upperId);
    const room = this.getRoom(upperId);

    room.phase = 'LOBBY';
    room.startedAt = null;
    room.roleRevealStartedAt = null;
    room.playStartedAt = null;
    room.endedAt = null;
    room.winner = null;
    room.winReason = null;

    for (const player of Object.values(room.players)) {
      player.role = 'UNDECIDED';
      player.status = 'LOBBY';
      player.outOfZoneSince = null;
      player.caughtAt = null;
      player.caughtBy = null;
      player.outOfZoneCount = 0;
      player.distanceTraveled = 0;
    }

    this.broadcastRoom(upperId, room);
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

    // Immediate dispatch
    try {
      const room = this.getRoom(upperId);
      callback(JSON.parse(JSON.stringify(room)));
    } catch {
      callback(null);
    }

    return () => {
      const subs = this.subscribers.get(upperId);
      if (subs) {
        subs.delete(callback);
      }
    };
  }

  // --- DEV / SIMULATION UTILITIES ---

  async addSimulationBots(roomId: string, count = 3): Promise<void> {
    const upperId = roomId.toUpperCase();
    const room = this.getRoom(upperId);

    const botNames = ['Agent Alex', 'Shadow Priya', 'Echo Sam', 'Ghost Rohan'];
    const botColors = ['#06d6a0', '#3b82f6', '#ec4899', '#8b5cf6'];

    for (let i = 0; i < count; i++) {
      const botId = `bot_${i + 1}`;
      if (!room.players[botId]) {
        // Random offset within 70% of zone radius
        const angle = Math.random() * Math.PI * 2;
        const distMeters = (Math.random() * 0.7 + 0.1) * room.zone.radius;
        // ~111,320 meters per degree
        const deltaLat = (distMeters * Math.cos(angle)) / 111320;
        const deltaLng =
          (distMeters * Math.sin(angle)) /
          (111320 * Math.cos((room.zone.center.lat * Math.PI) / 180));

        room.players[botId] = {
          id: botId,
          name: botNames[i % botNames.length],
          avatar: botColors[i % botColors.length],
          isHost: false,
          isReady: true,
          role: 'UNDECIDED',
          status: 'LOBBY',
          isSimulated: true,
          distanceTraveled: 0,
          outOfZoneCount: 0,
          location: {
            lat: room.zone.center.lat + deltaLat,
            lng: room.zone.center.lng + deltaLng,
            accuracy: 5,
            updatedAt: Date.now(),
          },
        };
      }
    }

    this.broadcastRoom(upperId, room);
  }

  async removeSimulationBots(roomId: string): Promise<void> {
    const upperId = roomId.toUpperCase();
    const room = this.getRoom(upperId);

    for (const [id, player] of Object.entries(room.players)) {
      if (player.isSimulated) {
        delete room.players[id];
      }
    }

    this.broadcastRoom(upperId, room);
  }

  async stepSimulationBots(roomId: string): Promise<void> {
    const upperId = roomId.toUpperCase();
    try {
      const room = this.getRoom(upperId);
      let changed = false;

      for (const player of Object.values(room.players)) {
        if (player.isSimulated && player.location && player.status !== 'CAUGHT' && player.status !== 'DISQUALIFIED') {
          // Wander 3-8 meters in a random direction
          const stepMeters = Math.random() * 5 + 3;
          const angle = Math.random() * Math.PI * 2;
          const deltaLat = (stepMeters * Math.cos(angle)) / 111320;
          const deltaLng =
            (stepMeters * Math.sin(angle)) /
            (111320 * Math.cos((room.zone.center.lat * Math.PI) / 180));

          player.location = {
            lat: player.location.lat + deltaLat,
            lng: player.location.lng + deltaLng,
            accuracy: 4,
            updatedAt: Date.now(),
          };
          player.distanceTraveled += Math.round(stepMeters);
          changed = true;
        }
      }

      if (changed) {
        this.broadcastRoom(upperId, room);
      }
    } catch {}
  }

  async triggerTestReveal(roomId: string): Promise<void> {
    const upperId = roomId.toUpperCase();
    const room = this.getRoom(upperId);
    if (room.phase === 'PLAYING') {
      // Force playStartedAt to align right at a reveal window
      room.playStartedAt = Date.now() - room.config.revealInterval * 1000;
      this.broadcastRoom(upperId, room);
    }
  }
}

