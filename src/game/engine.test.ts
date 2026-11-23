import { describe, it, expect } from 'vitest';
import {
  isInsideZone,
  calculateBearingToCenter,
  calculateDistanceMeters,
  calculateRevealState,
  checkPlayerBoundary,
  evaluateWinCondition,
  assignPlayerRoles,
  deriveGamePhase,
} from './engine';
import { Player, Room, Zone } from '../types';

describe('HideNSeek Game Engine', () => {
  const mockCenter = { lat: 18.5204, lng: 73.8567 }; // Pune campus coordinates
  const circleZone: Zone = {
    type: 'CIRCLE',
    center: mockCenter,
    radius: 200, // 200 meters radius
  };

  describe('isInsideZone', () => {
    it('returns true when point is at zone center', () => {
      expect(isInsideZone(mockCenter, circleZone)).toBe(true);
    });

    it('returns true when point is well inside circle radius', () => {
      // ~50m north: approx 0.00045 degrees lat
      const pointInside = { lat: 18.5208, lng: 73.8567 };
      expect(isInsideZone(pointInside, circleZone)).toBe(true);
    });

    it('returns false when point is far outside circle radius', () => {
      // ~1.1km north: 0.01 degrees lat
      const pointOutside = { lat: 18.5304, lng: 73.8567 };
      expect(isInsideZone(pointOutside, circleZone)).toBe(false);
    });

    it('handles polygon zones correctly', () => {
      const polygonZone: Zone = {
        type: 'POLYGON',
        center: mockCenter,
        radius: 200,
        polygon: [
          { lat: 18.520, lng: 73.856 },
          { lat: 18.522, lng: 73.856 },
          { lat: 18.522, lng: 73.858 },
          { lat: 18.520, lng: 73.858 },
        ],
      };

      const insidePoly = { lat: 18.521, lng: 73.857 };
      const outsidePoly = { lat: 18.525, lng: 73.860 };

      expect(isInsideZone(insidePoly, polygonZone)).toBe(true);
      expect(isInsideZone(outsidePoly, polygonZone)).toBe(false);
    });
  });

  describe('calculateBearingToCenter & calculateDistanceMeters', () => {
    it('calculates distance and bearing toward center accurately', () => {
      // Point directly south of center
      const pointSouth = { lat: 18.5150, lng: 73.8567 };
      const distance = calculateDistanceMeters(pointSouth, mockCenter);
      expect(distance).toBeGreaterThan(400);
      expect(distance).toBeLessThan(700);

      const bearing = calculateBearingToCenter(pointSouth, mockCenter);
      // Facing center (north) should be close to 0 / 360 degrees
      expect(Math.abs(bearing)).toBeLessThan(5);
    });
  });

  describe('calculateRevealState', () => {
    const revealInterval = 180; // 3 minutes
    const revealDuration = 15; // 15 seconds
    const playStartedAt = 1000000;

    it('returns countdown when before first reveal interval', () => {
      // 60 seconds into game
      const currentTime = playStartedAt + 60 * 1000;
      const state = calculateRevealState(playStartedAt, revealInterval, revealDuration, currentTime);
      expect(state.isRevealing).toBe(false);
      expect(state.secondsUntilNext).toBe(120);
      expect(state.secondsRemainingInReveal).toBe(0);
    });

    it('activates reveal when reveal interval is reached', () => {
      // Exactly at 180 seconds into game
      const currentTime = playStartedAt + 180 * 1000;
      const state = calculateRevealState(playStartedAt, revealInterval, revealDuration, currentTime);
      expect(state.isRevealing).toBe(true);
      expect(state.secondsRemainingInReveal).toBe(15);
      expect(state.secondsUntilNext).toBe(0);
    });

    it('counts down remaining reveal time during active reveal', () => {
      // 185 seconds into game (5s into 15s reveal)
      const currentTime = playStartedAt + 185 * 1000;
      const state = calculateRevealState(playStartedAt, revealInterval, revealDuration, currentTime);
      expect(state.isRevealing).toBe(true);
      expect(state.secondsRemainingInReveal).toBe(10);
    });

    it('switches back to countdown after reveal ends', () => {
      // 196 seconds into game (1s after reveal ended)
      // Next reveal should be in 179s
      const currentTime = playStartedAt + 196 * 1000;
      const state = calculateRevealState(playStartedAt, revealInterval, revealDuration, currentTime);
      expect(state.isRevealing).toBe(false);
      expect(state.secondsUntilNext).toBe(179);
    });
  });

  describe('checkPlayerBoundary', () => {
    const mockPlayer: Player = {
      id: 'p1',
      name: 'Priya',
      avatar: '#10b981',
      isHost: false,
      isReady: true,
      role: 'HIDER',
      status: 'HIDING',
      distanceTraveled: 0,
      outOfZoneCount: 0,
      location: { lat: 18.5204, lng: 73.8567, updatedAt: Date.now() },
    };

    it('does not trigger alert when inside zone', () => {
      const res = checkPlayerBoundary(mockPlayer, circleZone, 20, Date.now());
      expect(res.isOut).toBe(false);
      expect(res.isDisqualified).toBe(false);
      expect(res.outOfZoneSince).toBeNull();
    });

    it('triggers out-of-zone alert and tracks grace countdown when outside', () => {
      const outsidePlayer: Player = {
        ...mockPlayer,
        location: { lat: 18.5304, lng: 73.8567, updatedAt: Date.now() }, // 1.1km away
      };

      const now = 5000000;
      // First tick outside
      const res1 = checkPlayerBoundary(outsidePlayer, circleZone, 20, now);
      expect(res1.isOut).toBe(true);
      expect(res1.isDisqualified).toBe(false);
      expect(res1.outOfZoneSince).toBe(now);
      expect(res1.alertInfo.secondsRemaining).toBe(20);

      // 10 seconds later
      const outsidePlayerTracking: Player = {
        ...outsidePlayer,
        outOfZoneSince: now,
      };
      const res2 = checkPlayerBoundary(outsidePlayerTracking, circleZone, 20, now + 10000);
      expect(res2.isOut).toBe(true);
      expect(res2.isDisqualified).toBe(false);
      expect(res2.alertInfo.secondsRemaining).toBe(10);

      // 21 seconds later (past grace period)
      const res3 = checkPlayerBoundary(outsidePlayerTracking, circleZone, 20, now + 21000);
      expect(res3.isOut).toBe(true);
      expect(res3.isDisqualified).toBe(true);
      expect(res3.alertInfo.secondsRemaining).toBe(0);
    });
  });

  describe('evaluateWinCondition', () => {
    const createMockRoom = (): Room => ({
      id: 'TEST01',
      phase: 'PLAYING',
      config: {
        gameDuration: 600, // 10 minutes
        hidingDuration: 120,
        revealInterval: 180,
        revealDuration: 15,
        gracePeriod: 20,
        seekerId: 's1',
      },
      zone: circleZone,
      hostId: 's1',
      createdAt: 1000000,
      playStartedAt: 1000000,
      players: {
        s1: {
          id: 's1',
          name: 'Seeker',
          avatar: '#ef4444',
          isHost: true,
          isReady: true,
          role: 'SEEKER',
          status: 'HIDING',
          distanceTraveled: 0,
          outOfZoneCount: 0,
        },
        h1: {
          id: 'h1',
          name: 'Hider 1',
          avatar: '#3b82f6',
          isHost: false,
          isReady: true,
          role: 'HIDER',
          status: 'HIDING',
          distanceTraveled: 0,
          outOfZoneCount: 0,
        },
        h2: {
          id: 'h2',
          name: 'Hider 2',
          avatar: '#10b981',
          isHost: false,
          isReady: true,
          role: 'HIDER',
          status: 'HIDING',
          distanceTraveled: 0,
          outOfZoneCount: 0,
        },
      },
    });

    it('game continues while hiders are still active and time remains', () => {
      const room = createMockRoom();
      const res = evaluateWinCondition(room, 1000000 + 300 * 1000);
      expect(res.isGameOver).toBe(false);
    });

    it('declares HIDERS winner when game time runs out', () => {
      const room = createMockRoom();
      const res = evaluateWinCondition(room, 1000000 + 601 * 1000);
      expect(res.isGameOver).toBe(true);
      expect(res.winner).toBe('HIDERS');
    });

    it('declares SEEKER winner when all hiders are caught or disqualified', () => {
      const room = createMockRoom();
      room.players.h1.status = 'CAUGHT';
      room.players.h2.status = 'DISQUALIFIED';

      const res = evaluateWinCondition(room, 1000000 + 200 * 1000);
      expect(res.isGameOver).toBe(true);
      expect(res.winner).toBe('SEEKER');
    });
  });

  describe('assignPlayerRoles', () => {
    it('sets preferred seeker when provided', () => {
      const players: Record<string, Player> = {
        p1: { id: 'p1', name: 'A', avatar: '', isHost: true, isReady: true, role: 'UNDECIDED', status: 'LOBBY', distanceTraveled: 0, outOfZoneCount: 0 },
        p2: { id: 'p2', name: 'B', avatar: '', isHost: false, isReady: true, role: 'UNDECIDED', status: 'LOBBY', distanceTraveled: 0, outOfZoneCount: 0 },
      };

      const updated = assignPlayerRoles(players, 'p2');
      expect(updated.p2.role).toBe('SEEKER');
      expect(updated.p1.role).toBe('HIDER');
    });
  });
});
