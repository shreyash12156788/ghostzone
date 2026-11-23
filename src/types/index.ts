export type Role = 'SEEKER' | 'HIDER' | 'UNDECIDED';

export type PlayerStatus = 'LOBBY' | 'HIDING' | 'CAUGHT' | 'OUT_OF_ZONE' | 'DISQUALIFIED';

export type GamePhase = 'LOBBY' | 'ROLE_REVEAL' | 'HIDING' | 'PLAYING' | 'ENDED';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
  updatedAt: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string; // color or hex
  color?: string;
  isHost: boolean;
  isReady: boolean;
  role: Role;
  status: PlayerStatus;
  rawStatus?: 'active' | 'out' | 'caught' | 'dq';
  location?: LocationCoordinates;
  outOfZoneSince?: number | null;
  outSince?: number | null;
  caughtAt?: number | null;
  caughtBy?: string | null;
  distanceTraveled: number; // in meters
  distance?: number;
  outOfZoneCount: number;
  outCount?: number;
  connected?: boolean;
  joinedAt?: number;
  isSimulated?: boolean;
}

export interface Zone {
  type: 'CIRCLE' | 'POLYGON';
  center: { lat: number; lng: number };
  radius: number; // in meters (50-2000m)
  polygon?: Array<{ lat: number; lng: number }>;
}

export interface GameConfig {
  gameDuration: number; // in seconds (e.g. 600)
  hidingDuration: number; // in seconds (e.g. 60)
  revealInterval: number; // in seconds (e.g. 120)
  revealDuration: number; // in seconds (e.g. 15)
  gracePeriod: number; // in seconds (e.g. 20)
  seekerId: string | null;
  // Server-specific field aliases:
  radius?: number; // 50-2000 m
  durationMin?: number; // 5-180 min
  duration?: number; // 5-180 min
  hideSec?: number; // 10-600 sec
  revealEveryMin?: number; // 1-30 min
  revealSec?: number; // 5-60 sec
  graceSec?: number; // 5-120 sec
}

export interface ServerRevealState {
  active: boolean;
  index: number;
  endsAt: number | null;
  nextAt: number | null;
}

export interface Room {
  id: string; // 6-character code
  phase: GamePhase;
  status?: 'lobby' | 'hiding' | 'playing' | 'ended';
  config: GameConfig;
  zone: Zone;
  players: Record<string, Player>;
  hostId: string;
  seekerId?: string | null;
  createdAt: number;
  roleRevealStartedAt?: number | null;
  startedAt?: number | null; // hiding phase started
  startAt?: number | null;
  playStartedAt?: number | null; // actual play phase started
  playStartAt?: number | null;
  endedAt?: number | null;
  winner?: 'SEEKER' | 'HIDERS' | null;
  winReason?: string | null;
  // Server state fields:
  reveal?: ServerRevealState;
  revealState?: RevealState;
  isRevealing?: boolean;
  locations?: Record<string, LocationCoordinates>;
  serverNow?: number;
  clockOffset?: number;
  timeRemaining?: number;
  nextRevealIn?: number;
  revealSecRemaining?: number;
}

export interface RevealState {
  isRevealing: boolean;
  secondsUntilNext: number;
  secondsRemainingInReveal: number;
  revealProgress: number; // 0.0 to 1.0
}

export interface BoundaryAlertInfo {
  isOut: boolean;
  secondsRemaining: number;
  bearingToCenter: number;
  distanceToCenter: number;
}

export interface GameStats {
  totalDurationSeconds: number;
  hidersCount: number;
  caughtCount: number;
  disqualifiedCount: number;
  winner: 'SEEKER' | 'HIDERS';
  winReason: string;
}

// Server Event payload shape
export type ServerEventType =
  | 'started'
  | 'playing'
  | 'out_of_zone'
  | 'returned'
  | 'caught'
  | 'dq'
  | 'reveal_start'
  | 'ended'
  | 'host_changed';

export interface ServerEventPayload {
  type: ServerEventType;
  at?: number;
  playerId?: string;
  name?: string;
  graceSec?: number;
  reason?: string;
  endsAt?: number;
  winner?: 'seeker' | 'hiders' | 'SEEKER' | 'HIDERS';
  [key: string]: any;
}
