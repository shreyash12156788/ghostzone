import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { gameService } from '../services';
import { LocationCoordinates } from '../types';

interface UseGeolocationOptions {
  roomId?: string;
  playerId?: string;
  autoStart?: boolean;
}

export function useGeolocation({ roomId, playerId, autoStart = true }: UseGeolocationOptions) {
  const setUserLocation = useGameStore((state) => state.setUserLocation);
  const setGpsStatus = useGameStore((state) => state.setGpsStatus);
  const simulationMode = useGameStore((state) => state.simulationMode);
  const userLocation = useGameStore((state) => state.userLocation);

  const lastBroadcastTimeRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);

  // Broadcast throttled position to game service (every 3-4s strictly while hiding/playing)
  const handlePosition = useCallback(
    (coords: LocationCoordinates) => {
      setUserLocation(coords);

      const now = Date.now();
      const currentRoom = useGameStore.getState().room;
      const isGameActive =
        currentRoom &&
        (currentRoom.phase === 'HIDING' ||
          currentRoom.phase === 'PLAYING' ||
          currentRoom.status === 'hiding' ||
          currentRoom.status === 'playing');

      // Throttle updates to at most once every 3.2 seconds strictly while hiding/playing
      if (
        isGameActive &&
        roomId &&
        playerId &&
        now - lastBroadcastTimeRef.current >= 3200
      ) {
        lastBroadcastTimeRef.current = now;
        gameService.updateLocation(roomId, playerId, coords).catch(console.warn);
      }
    },
    [roomId, playerId, setUserLocation]
  );

  // Start native watchPosition
  const startWatching = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('error');
      return;
    }

    setGpsStatus('locating');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: LocationCoordinates = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          updatedAt: Date.now(),
        };
        setGpsStatus('granted', pos.coords.accuracy);
        // If not manually overriding in simulation mode, update position
        if (!simulationMode) {
          handlePosition(coords);
        }
      },
      (err) => {
        console.warn('Geolocation watch error:', err.message);
        if (err.code === 1) {
          setGpsStatus('denied');
        } else {
          setGpsStatus('error');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000,
      }
    );
  }, [setGpsStatus, simulationMode, handlePosition]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Request high-accuracy permission explicitly
  const requestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('error');
      return;
    }
    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: LocationCoordinates = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          updatedAt: Date.now(),
        };
        setGpsStatus('granted', pos.coords.accuracy);
        handlePosition(coords);
      },
      (err) => {
        if (err.code === 1) {
          setGpsStatus('denied');
        } else {
          setGpsStatus('error');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [setGpsStatus, handlePosition]);

  // Simulation step helper (allows desktop testers to simulate walking)
  const nudgeSimulatedLocation = useCallback(
    (deltaLatMeters: number, deltaLngMeters: number) => {
      const current = userLocation || {
        lat: 18.5204,
        lng: 73.8567,
        accuracy: 5,
        updatedAt: Date.now(),
      };

      const deltaLat = deltaLatMeters / 111320;
      const deltaLng =
        deltaLngMeters / (111320 * Math.cos((current.lat * Math.PI) / 180));

      const newCoords: LocationCoordinates = {
        lat: current.lat + deltaLat,
        lng: current.lng + deltaLng,
        accuracy: 3,
        updatedAt: Date.now(),
      };

      setUserLocation(newCoords);
      const currentRoom = useGameStore.getState().room;
      const isGameActive =
        currentRoom &&
        (currentRoom.phase === 'HIDING' ||
          currentRoom.phase === 'PLAYING' ||
          currentRoom.status === 'hiding' ||
          currentRoom.status === 'playing');

      if (isGameActive && roomId && playerId) {
        gameService.updateLocation(roomId, playerId, newCoords).catch(console.warn);
      }
    },
    [userLocation, roomId, playerId, setUserLocation]
  );

  useEffect(() => {
    if (autoStart) {
      startWatching();
    }
    return () => {
      stopWatching();
    };
  }, [autoStart, startWatching, stopWatching]);

  return {
    startWatching,
    stopWatching,
    requestLocation,
    nudgeSimulatedLocation,
  };
}
