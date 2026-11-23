import * as turf from '@turf/turf';
import {
  Player,
  Zone,
  Room,
  RevealState,
  BoundaryAlertInfo,
  GamePhase,
  Role,
} from '../types';

/**
 * Checks whether a given geographic coordinate is inside the game zone.
 * Supports CIRCLE zones (via geodesic distance) and POLYGON zones (via Turf pointInPolygon).
 */
export function isInsideZone(
  point: { lat: number; lng: number },
  zone: Zone
): boolean {
  if (!point || typeof point.lat !== 'number' || typeof point.lng !== 'number') {
    return true; // fail-safe if GPS is warming up
  }

  if (zone.type === 'CIRCLE') {
    const from = turf.point([point.lng, point.lat]);
    const center = turf.point([zone.center.lng, zone.center.lat]);
    const distanceMeters = turf.distance(from, center, { units: 'meters' });
    return distanceMeters <= zone.radius;
  }

  if (zone.type === 'POLYGON' && zone.polygon && zone.polygon.length >= 3) {
    const pt = turf.point([point.lng, point.lat]);
    const coordinates = zone.polygon.map((p) => [p.lng, p.lat]);
    // Ensure the polygon is closed (first coord matches last coord)
    if (
      coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
      coordinates[0][1] !== coordinates[coordinates.length - 1][1]
    ) {
      coordinates.push(coordinates[0]);
    }
    const poly = turf.polygon([coordinates]);
    return turf.booleanPointInPolygon(pt, poly);
  }

  return true;
}

/**
 * Calculates compass bearing from player position to zone center in degrees (0 - 360).
 */
export function calculateBearingToCenter(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const p1 = turf.point([from.lng, from.lat]);
  const p2 = turf.point([to.lng, to.lat]);
  const bearing = turf.bearing(p1, p2);
  return (bearing + 360) % 360;
}

/**
 * Calculates geodesic distance between two points in meters.
 */
export function calculateDistanceMeters(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  const from = turf.point([p1.lng, p1.lat]);
  const to = turf.point([p2.lng, p2.lat]);
  return turf.distance(from, to, { units: 'meters' });
}

/**
 * Pure function to derive current game phase from timestamps.
 */
export function deriveGamePhase(room: Room, currentTime: number): GamePhase {
  if (room.phase === 'LOBBY' || room.phase === 'ENDED') {
    return room.phase;
  }

  if (room.roleRevealStartedAt) {
    const elapsedRoleReveal = (currentTime - room.roleRevealStartedAt) / 1000;
    if (elapsedRoleReveal < 5) {
      return 'ROLE_REVEAL';
    }
  }

  if (room.startedAt) {
    const elapsedHiding = (currentTime - room.startedAt) / 1000;
    if (elapsedHiding < room.config.hidingDuration) {
      return 'HIDING';
    }
  }

  if (room.playStartedAt) {
    const elapsedPlay = (currentTime - room.playStartedAt) / 1000;
    if (elapsedPlay < room.config.gameDuration) {
      return 'PLAYING';
    }
    return 'ENDED';
  }

  return room.phase;
}

/**
 * Calculates remaining seconds in the current phase.
 */
export function calculatePhaseRemaining(room: Room, currentTime: number): number {
  const currentPhase = deriveGamePhase(room, currentTime);

  if (currentPhase === 'ROLE_REVEAL' && room.roleRevealStartedAt) {
    const elapsed = Math.floor((currentTime - room.roleRevealStartedAt) / 1000);
    return Math.max(0, 5 - elapsed);
  }

  if (currentPhase === 'HIDING' && room.startedAt) {
    const elapsed = Math.floor((currentTime - room.startedAt) / 1000);
    return Math.max(0, room.config.hidingDuration - elapsed);
  }

  if (currentPhase === 'PLAYING' && room.playStartedAt) {
    const elapsed = Math.floor((currentTime - room.playStartedAt) / 1000);
    return Math.max(0, room.config.gameDuration - elapsed);
  }

  return 0;
}

/**
 * Pure function to calculate reveal schedule derived from playStartedAt timestamp.
 * Reveal happens periodically every `revealInterval` seconds and lasts `revealDuration` seconds.
 */
export function calculateRevealState(
  playStartedAt: number | null | undefined,
  revealIntervalSec: number,
  revealDurationSec: number,
  currentTime: number
): RevealState {
  if (!playStartedAt || currentTime < playStartedAt) {
    return {
      isRevealing: false,
      secondsUntilNext: revealIntervalSec,
      secondsRemainingInReveal: 0,
      revealProgress: 0,
    };
  }

  const elapsedSec = Math.floor((currentTime - playStartedAt) / 1000);
  const cycleLength = revealIntervalSec + revealDurationSec;
  const currentCycleTime = elapsedSec % cycleLength;

  if (currentCycleTime < revealIntervalSec) {
    // We are in hiding window counting down to next reveal
    const secondsUntilNext = revealIntervalSec - currentCycleTime;
    return {
      isRevealing: false,
      secondsUntilNext,
      secondsRemainingInReveal: 0,
      revealProgress: currentCycleTime / revealIntervalSec,
    };
  } else {
    // We are inside an active reveal window
    const revealTimeElapsed = currentCycleTime - revealIntervalSec;
    const secondsRemainingInReveal = Math.max(0, revealDurationSec - revealTimeElapsed);
    return {
      isRevealing: true,
      secondsUntilNext: 0,
      secondsRemainingInReveal,
      revealProgress: revealTimeElapsed / revealDurationSec,
    };
  }
}

/**
 * Checks player's boundary status against the zone.
 * Tracks grace period countdown if outside zone.
 */
export function checkPlayerBoundary(
  player: Player,
  zone: Zone,
  gracePeriodSec: number,
  currentTime: number
): {
  isOut: boolean;
  outOfZoneSince: number | null;
  isDisqualified: boolean;
  alertInfo: BoundaryAlertInfo;
} {
  if (!player.location) {
    return {
      isOut: false,
      outOfZoneSince: null,
      isDisqualified: false,
      alertInfo: {
        isOut: false,
        secondsRemaining: gracePeriodSec,
        bearingToCenter: 0,
        distanceToCenter: 0,
      },
    };
  }

  const inside = isInsideZone(player.location, zone);
  const bearing = calculateBearingToCenter(player.location, zone.center);
  const distance = calculateDistanceMeters(player.location, zone.center);

  if (inside) {
    return {
      isOut: false,
      outOfZoneSince: null,
      isDisqualified: false,
      alertInfo: {
        isOut: false,
        secondsRemaining: gracePeriodSec,
        bearingToCenter: bearing,
        distanceToCenter: distance,
      },
    };
  }

  // Player is outside the zone
  const outOfZoneSince = player.outOfZoneSince || currentTime;
  const elapsedOutOfZone = (currentTime - outOfZoneSince) / 1000;
  const secondsRemaining = Math.max(0, Math.ceil(gracePeriodSec - elapsedOutOfZone));
  const isDisqualified = secondsRemaining <= 0;

  return {
    isOut: true,
    outOfZoneSince,
    isDisqualified,
    alertInfo: {
      isOut: true,
      secondsRemaining,
      bearingToCenter: bearing,
      distanceToCenter: distance,
    },
  };
}

/**
 * Evaluates win conditions during the game.
 * - Hiders win if time expires.
 * - Seeker wins if all hiders are caught or disqualified.
 */
export function evaluateWinCondition(
  room: Room,
  currentTime: number
): { isGameOver: boolean; winner?: 'SEEKER' | 'HIDERS'; reason?: string } {
  // If not in playing phase, no win condition yet
  if (room.phase !== 'PLAYING') {
    return { isGameOver: false };
  }

  // Check game timer expiration
  if (room.playStartedAt) {
    const elapsedSec = (currentTime - room.playStartedAt) / 1000;
    if (elapsedSec >= room.config.gameDuration) {
      return {
        isGameOver: true,
        winner: 'HIDERS',
        reason: 'Time expired! The hiders successfully evaded the seeker.',
      };
    }
  }

  // Check hiders remaining
  const allPlayers = Object.values(room.players);
  const hiders = allPlayers.filter((p) => p.role === 'HIDER');

  if (hiders.length > 0) {
    const activeHiders = hiders.filter(
      (p) => p.status === 'HIDING' || p.status === 'OUT_OF_ZONE'
    );

    if (activeHiders.length === 0) {
      return {
        isGameOver: true,
        winner: 'SEEKER',
        reason: 'All hiders have been caught or disqualified!',
      };
    }
  }

  return { isGameOver: false };
}

/**
 * Assigns one Seeker and sets all other players as Hiders.
 * If seekerId is specified and present, picks that player; otherwise picks randomly.
 */
export function assignPlayerRoles(
  players: Record<string, Player>,
  preferredSeekerId?: string | null
): Record<string, Player> {
  const playerIds = Object.keys(players);
  if (playerIds.length === 0) return players;

  let seekerId = preferredSeekerId;
  if (!seekerId || !players[seekerId]) {
    const randomIndex = Math.floor(Math.random() * playerIds.length);
    seekerId = playerIds[randomIndex];
  }

  const updated: Record<string, Player> = {};
  for (const [id, player] of Object.entries(players)) {
    const role: Role = id === seekerId ? 'SEEKER' : 'HIDER';
    updated[id] = {
      ...player,
      role,
      status: 'HIDING',
      outOfZoneSince: null,
      caughtAt: null,
      caughtBy: null,
    };
  }

  return updated;
}
