import React, { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Circle,
  Polygon,
  Marker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { Player, Zone, LocationCoordinates } from '../types';
import { useGameStore } from '../store/gameStore';

// Custom Map click listener for host zone placement
function MapEventsHandler({
  isEditable,
  onLocationSelect,
}: {
  isEditable: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (isEditable && onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Controller to smoothly pan/zoom map when user clicks "Recenter"
function MapRecenterController({
  target,
  zoom,
}: {
  target: [number, number] | null;
  zoom?: number;
}) {
  const map = useMap();
  const prevTargetRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (target) {
      const isFirst = !prevTargetRef.current;
      prevTargetRef.current = target;
      if (isFirst) {
        map.setView(target, zoom || 17);
      } else {
        map.flyTo(target, zoom || map.getZoom(), { duration: 1.2 });
      }
    }
  }, [target, zoom, map]);

  return null;
}

// Create custom animated div-icons for players
function createPlayerDivIcon(
  player: Player,
  isSelf: boolean,
  isRevealed: boolean
): L.DivIcon {
  const initial = (player.name || 'P').charAt(0).toUpperCase();
  const roleColor = player.role === 'SEEKER' ? '#ef4444' : '#10b981';
  const bgColor = player.avatar || roleColor;

  const html = `
    <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 select-none pointer-events-auto">
      ${
        isRevealed
          ? `<div class="absolute w-12 h-12 rounded-full border-2 border-primary animate-ping opacity-75"></div>`
          : ''
      }
      ${
        isSelf
          ? `<div class="absolute w-10 h-10 rounded-full bg-cyan-400/30 animate-pulse"></div>`
          : ''
      }
      <div class="w-8 h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center font-bold text-xs text-white" style="background-color: ${bgColor};">
        ${initial}
      </div>
      <div class="absolute top-9 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-md whitespace-nowrap bg-black/80 text-white border border-white/20">
        ${player.name} ${isSelf ? '(You)' : ''}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-map-player-pin',
    iconSize: [0, 0],
  });
}

interface MapComponentProps {
  zone: Zone;
  players?: Record<string, Player>;
  currentPlayerId?: string | null;
  userLocation?: LocationCoordinates | null;
  isRevealing?: boolean;
  isLobby?: boolean;
  isZoneEditable?: boolean;
  onZoneCenterChange?: (lat: number, lng: number) => void;
  recenterCoords?: [number, number] | null;
  locations?: Record<string, LocationCoordinates>;
  className?: string;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  zone,
  players = {},
  currentPlayerId,
  userLocation,
  isRevealing = false,
  isLobby = false,
  isZoneEditable = false,
  onZoneCenterChange,
  recenterCoords,
  locations,
  className = 'h-full w-full',
}) => {
  const theme = useGameStore((state) => state.theme);
  const storeLocations = useGameStore((state) => state.locations);
  const activeLocations = locations || storeLocations;
  const hasServerLocations = activeLocations && Object.keys(activeLocations).length > 0;

  // Free OpenStreetMap tile layer with attribution
  const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

  const defaultCenter: [number, number] = [zone.center.lat, zone.center.lng];

  // Self player
  const selfPlayer = currentPlayerId ? players[currentPlayerId] : null;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <MapContainer
        center={defaultCenter}
        zoom={17}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution={tileAttribution}
          url={tileUrl}
          maxZoom={19}
        />

        <MapEventsHandler
          isEditable={isZoneEditable}
          onLocationSelect={onZoneCenterChange}
        />

        {recenterCoords && (
          <MapRecenterController target={recenterCoords} zoom={17} />
        )}

        {/* Boundary Safe Zone: Circle */}
        {zone.type === 'CIRCLE' && (
          <Circle
            center={[zone.center.lat, zone.center.lng]}
            radius={zone.radius}
            pathOptions={{
              color: '#06d6a0',
              fillColor: '#06d6a0',
              fillOpacity: 0.1,
              weight: 2.5,
              dashArray: '8, 8',
            }}
          />
        )}

        {/* Boundary Safe Zone: Polygon */}
        {zone.type === 'POLYGON' && zone.polygon && (
          <Polygon
            positions={zone.polygon.map((p) => [p.lat, p.lng])}
            pathOptions={{
              color: '#06d6a0',
              fillColor: '#06d6a0',
              fillOpacity: 0.1,
              weight: 2.5,
              dashArray: '8, 8',
            }}
          />
        )}

        {/* User GPS Accuracy Ring */}
        {userLocation && (
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={Math.min(userLocation.accuracy || 15, 60)}
            pathOptions={{
              color: '#38bdf8',
              fillColor: '#38bdf8',
              fillOpacity: 0.15,
              weight: 1,
            }}
          />
        )}

        {/* Render Players: Render markers only from state.locations when available (server authoritative visibility) */}
        {hasServerLocations ? (
          <>
            {Object.entries(activeLocations).map(([pId, loc]) => {
              if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return null;
              const player = players[pId] || {
                id: pId,
                name: pId === currentPlayerId ? 'You' : 'Operative',
                avatar: '#06d6a0',
                role: 'UNDECIDED',
                status: 'HIDING',
                distanceTraveled: 0,
                outOfZoneCount: 0,
                isHost: false,
                isReady: true,
              };
              const isSelf = pId === currentPlayerId;
              const icon = createPlayerDivIcon(player, isSelf, isRevealing);

              return (
                <Marker
                  key={pId}
                  position={[loc.lat, loc.lng]}
                  icon={icon}
                />
              );
            })}
            {/* If self has userLocation but isn't yet echoed in activeLocations, ensure self marker renders */}
            {currentPlayerId && userLocation && !activeLocations[currentPlayerId] && (
              <Marker
                key={currentPlayerId}
                position={[userLocation.lat, userLocation.lng]}
                icon={createPlayerDivIcon(
                  players[currentPlayerId] || {
                    id: currentPlayerId,
                    name: 'You',
                    avatar: '#06d6a0',
                    role: 'UNDECIDED',
                    status: 'HIDING',
                    distanceTraveled: 0,
                    outOfZoneCount: 0,
                    isHost: false,
                    isReady: true,
                  },
                  true,
                  isRevealing
                )}
              />
            )}
          </>
        ) : (
          Object.values(players).map((player) => {
            if (!player.location) return null;

            const isSelf = player.id === currentPlayerId;
            const isSeeker = selfPlayer?.role === 'SEEKER';
            const isPlayerSeeker = player.role === 'SEEKER';

            let shouldShow = false;
            if (isLobby || isSelf) {
              shouldShow = true;
            } else if (isRevealing) {
              shouldShow = true;
            } else if (player.status === 'CAUGHT' || player.status === 'DISQUALIFIED') {
              shouldShow = true;
            } else if (!isSeeker && isPlayerSeeker) {
              shouldShow = isRevealing;
            }

            if (!shouldShow) return null;

            const icon = createPlayerDivIcon(player, isSelf, isRevealing);

            return (
              <Marker
                key={player.id}
                position={[player.location.lat, player.location.lng]}
                icon={icon}
              />
            );
          })
        )}
      </MapContainer>
    </div>
  );
};
