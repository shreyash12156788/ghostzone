const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint for Render deployment
app.get('/healthz', (req, res) => {
  res.send('ok');
});

// Serve frontend build from ../dist
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

/**
 * In-memory state
 * rooms: Map<roomId, Room>
 * playerSockets: Map<playerId, Socket>
 */
const rooms = new Map();
const playerSockets = new Map();

// Generate random 6-character room code (omits ambiguous chars 0, O, 1, I)
function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Haversine distance in meters
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Serialize room state for a specific recipient (authoritative visibility filter)
function serializeRoomForPlayer(room, recipientId) {
  const recipient = room.players.get(recipientId);
  const isSeeker = recipient && recipient.role === 'seeker';

  // 1. Players array
  const playersArray = [];
  for (const p of room.players.values()) {
    playersArray.push({
      id: p.id,
      name: p.name,
      color: p.color || p.avatar || '#06d6a0',
      avatar: p.avatar || p.color || '#06d6a0',
      isHost: p.id === room.hostId,
      role: p.role, // 'seeker' | 'hider' | 'undecided'
      status: p.status, // 'active' | 'out' | 'caught' | 'dq'
      outSince: p.outSince || null,
      outCount: p.outCount || 0,
      caughtAt: p.caughtAt || null,
      connected: Boolean(p.connected),
      joinedAt: p.joinedAt,
      distance: Math.round(p.distance || 0),
    });
  }

  // 2. Locations dictionary with visibility filtering:
  // - Hiders see all locations.
  // - The seeker sees hiders' locations ONLY while reveal.active is true (plus own location).
  const locationsDict = {};
  for (const [pId, p] of room.players.entries()) {
    if (!room.locations.has(pId)) continue;
    const loc = room.locations.get(pId);

    if (room.status === 'lobby') {
      locationsDict[pId] = loc;
    } else if (!isSeeker) {
      // Hiders see all active locations
      locationsDict[pId] = loc;
    } else {
      // Seeker sees own location, or hiders' locations when reveal is active (or if player is already caught/dq)
      if (pId === recipientId || room.reveal.active || p.status === 'caught' || p.status === 'dq') {
        locationsDict[pId] = loc;
      }
    }
  }

  return {
    serverNow: Date.now(),
    room: {
      id: room.id,
      hostId: room.hostId,
      status: room.status, // 'lobby' | 'hiding' | 'playing' | 'ended'
      seekerId: room.seekerId || null,
      startAt: room.startAt || null,
      playStartAt: room.playStartAt || null,
      endedAt: room.endedAt || null,
      winner: room.winner || null, // 'seeker' | 'hiders' | null
      zone: {
        center: room.zone.center,
        radius: room.zone.radius,
      },
      config: {
        radius: room.config.radius,
        durationMin: room.config.durationMin,
        hideSec: room.config.hideSec,
        revealEveryMin: room.config.revealEveryMin,
        revealSec: room.config.revealSec,
        graceSec: room.config.graceSec,
        seekerId: room.config.seekerId || null,
      },
    },
    reveal: {
      active: Boolean(room.reveal.active),
      index: room.reveal.index || 0,
      endsAt: room.reveal.endsAt || null,
      nextAt: room.reveal.nextAt || null,
    },
    me: recipientId,
    players: playersArray,
    locations: locationsDict,
  };
}

// Broadcast tailored state to each player in the room
function sendStateToRoom(room) {
  for (const p of room.players.values()) {
    const socket = playerSockets.get(p.id);
    if (socket && socket.connected) {
      socket.emit('state', serializeRoomForPlayer(room, p.id));
    }
  }
}

// Socket Connection Handling
io.on('connection', (socket) => {
  let boundPlayerId = null;
  let boundRoomId = null;

  // 1. room:create
  socket.on('room:create', (payload, ack) => {
    const cb = typeof ack === 'function' ? ack : () => {};
    try {
      const { hostName, avatar, zone, config, playerId } = payload || {};
      const actualPlayerId = playerId || `player_${Date.now()}`;

      let roomId = generateRoomId();
      while (rooms.has(roomId)) {
        roomId = generateRoomId();
      }

      const initialRadius = Number(config?.radius ?? zone?.radius ?? 250);
      const initialCenter = zone?.center || { lat: 18.5204, lng: 73.8567 };

      const room = {
        id: roomId,
        hostId: actualPlayerId,
        status: 'lobby',
        seekerId: null,
        startAt: null,
        playStartAt: null,
        endedAt: null,
        winner: null,
        zone: {
          center: initialCenter,
          radius: initialRadius,
        },
        config: {
          radius: initialRadius,
          durationMin: Number(config?.durationMin ?? 10),
          hideSec: Number(config?.hideSec ?? 60),
          revealEveryMin: Number(config?.revealEveryMin ?? 2),
          revealSec: Number(config?.revealSec ?? 15),
          graceSec: Number(config?.graceSec ?? 20),
          seekerId: null,
        },
        reveal: {
          active: false,
          index: 0,
          endsAt: null,
          nextAt: null,
        },
        players: new Map(),
        locations: new Map(),
      };

      const hostPlayer = {
        id: actualPlayerId,
        name: (hostName || 'Host').trim(),
        avatar: avatar || '#06d6a0',
        color: avatar || '#06d6a0',
        role: 'undecided',
        status: 'active',
        outSince: null,
        outCount: 0,
        caughtAt: null,
        connected: true,
        joinedAt: Date.now(),
        distance: 0,
      };

      room.players.set(actualPlayerId, hostPlayer);
      rooms.set(roomId, room);

      boundPlayerId = actualPlayerId;
      boundRoomId = roomId;
      playerSockets.set(actualPlayerId, socket);
      socket.join(roomId);

      const stateSnapshot = serializeRoomForPlayer(room, actualPlayerId);
      cb({ ok: true, room: stateSnapshot, playerId: actualPlayerId });
      sendStateToRoom(room);
    } catch (err) {
      console.error('[room:create] Error:', err);
      cb({ ok: false, error: err.message || 'Failed to create room' });
    }
  });

  // 2. room:join
  socket.on('room:join', (payload, ack) => {
    const cb = typeof ack === 'function' ? ack : () => {};
    try {
      const { roomId, name, avatar, playerId } = payload || {};
      if (!roomId) {
        return cb({ ok: false, error: 'Room ID is required' });
      }

      const upperRoomId = roomId.trim().toUpperCase();
      const room = rooms.get(upperRoomId);
      if (!room) {
        return cb({ ok: false, error: `Room ${upperRoomId} not found` });
      }

      const actualPlayerId = playerId || `player_${Date.now()}`;

      // Check if player already exists (reconnection)
      if (room.players.has(actualPlayerId)) {
        const existingPlayer = room.players.get(actualPlayerId);
        existingPlayer.connected = true;
        if (name) existingPlayer.name = name.trim();
        if (avatar) {
          existingPlayer.avatar = avatar;
          existingPlayer.color = avatar;
        }
      } else {
        // New player joining
        if (room.status !== 'lobby') {
          return cb({ ok: false, error: 'Game is already in progress' });
        }
        if (room.players.size >= 10) {
          return cb({ ok: false, error: 'Room is full (max 10 players)' });
        }

        const newPlayer = {
          id: actualPlayerId,
          name: (name || `Player ${room.players.size + 1}`).trim(),
          avatar: avatar || '#10b981',
          color: avatar || '#10b981',
          role: 'undecided',
          status: 'active',
          outSince: null,
          outCount: 0,
          caughtAt: null,
          connected: true,
          joinedAt: Date.now(),
          distance: 0,
        };
        room.players.set(actualPlayerId, newPlayer);
      }

      boundPlayerId = actualPlayerId;
      boundRoomId = upperRoomId;
      playerSockets.set(actualPlayerId, socket);
      socket.join(upperRoomId);

      const stateSnapshot = serializeRoomForPlayer(room, actualPlayerId);
      cb({ ok: true, room: stateSnapshot, playerId: actualPlayerId });
      sendStateToRoom(room);
    } catch (err) {
      console.error('[room:join] Error:', err);
      cb({ ok: false, error: err.message || 'Failed to join room' });
    }
  });

  // 3. room:config (host only)
  socket.on('room:config', (payload, ack) => {
    const cb = typeof ack === 'function' ? ack : () => {};
    try {
      const { roomId, config } = payload || {};
      if (!roomId || !config) {
        return cb({ ok: false, error: 'Invalid parameters' });
      }

      const room = rooms.get(roomId.toUpperCase());
      if (!room) return cb({ ok: false, error: 'Room not found' });
      if (room.hostId !== boundPlayerId) {
        return cb({ ok: false, error: 'Only the host can update config' });
      }
      if (room.status !== 'lobby') {
        return cb({ ok: false, error: 'Cannot update config during active game' });
      }

      if (typeof config.radius === 'number') {
        const r = Math.max(50, Math.min(2000, config.radius));
        room.config.radius = r;
        room.zone.radius = r;
      }
      if (typeof config.durationMin === 'number') {
        room.config.durationMin = Math.max(5, Math.min(180, config.durationMin));
      }
      if (typeof config.hideSec === 'number') {
        room.config.hideSec = Math.max(10, Math.min(600, config.hideSec));
      }
      if (typeof config.revealEveryMin === 'number') {
        room.config.revealEveryMin = Math.max(1, Math.min(30, config.revealEveryMin));
      }
      if (typeof config.revealSec === 'number') {
        room.config.revealSec = Math.max(5, Math.min(60, config.revealSec));
      }
      if (typeof config.graceSec === 'number') {
        room.config.graceSec = Math.max(5, Math.min(120, config.graceSec));
      }
      if (config.seekerId !== undefined) {
        room.seekerId = config.seekerId || null;
        room.config.seekerId = config.seekerId || null;
      }
      if (config.center && typeof config.center.lat === 'number' && typeof config.center.lng === 'number') {
        room.zone.center = { lat: config.center.lat, lng: config.center.lng };
      }

      cb({ ok: true });
      sendStateToRoom(room);
    } catch (err) {
      console.error('[room:config] Error:', err);
      cb({ ok: false, error: err.message || 'Failed to update config' });
    }
  });

  // 4. room:seeker (host only)
  socket.on('room:seeker', (payload, ack) => {
    const cb = typeof ack === 'function' ? ack : () => {};
    try {
      const { roomId, seekerId } = payload || {};
      if (!roomId) return cb({ ok: false, error: 'Room ID required' });

      const room = rooms.get(roomId.toUpperCase());
      if (!room) return cb({ ok: false, error: 'Room not found' });
      if (room.hostId !== boundPlayerId) {
        return cb({ ok: false, error: 'Only the host can choose seeker' });
      }
      if (room.status !== 'lobby') {
        return cb({ ok: false, error: 'Cannot choose seeker during active game' });
      }

      if (seekerId && !room.players.has(seekerId)) {
        return cb({ ok: false, error: 'Selected player is not in room' });
      }

      room.seekerId = seekerId || null;
      room.config.seekerId = seekerId || null;

      cb({ ok: true });
      sendStateToRoom(room);
    } catch (err) {
      console.error('[room:seeker] Error:', err);
      cb({ ok: false, error: err.message || 'Failed to select seeker' });
    }
  });

  // 5. game:start (host only, needs >= 2 players, random seeker if none chosen)
  socket.on('game:start', (payload, ack) => {
    const cb = typeof ack === 'function' ? ack : () => {};
    try {
      const { roomId } = payload || {};
      if (!roomId) return cb({ ok: false, error: 'Room ID required' });

      const room = rooms.get(roomId.toUpperCase());
      if (!room) return cb({ ok: false, error: 'Room not found' });
      if (room.hostId !== boundPlayerId) {
        return cb({ ok: false, error: 'Only the host can start the game' });
      }
      if (room.status !== 'lobby') {
        return cb({ ok: false, error: 'Game is already started' });
      }
      if (room.players.size < 2) {
        return cb({ ok: false, error: 'At least 2 players are required to start the game' });
      }

      // Assign Seeker (random if none chosen or chosen player left)
      if (!room.seekerId || !room.players.has(room.seekerId)) {
        const playerIds = Array.from(room.players.keys());
        const randomId = playerIds[Math.floor(Math.random() * playerIds.length)];
        room.seekerId = randomId;
        room.config.seekerId = randomId;
      }

      // Assign roles & reset gameplay metrics
      for (const p of room.players.values()) {
        p.role = p.id === room.seekerId ? 'seeker' : 'hider';
        p.status = 'active';
        p.outSince = null;
        p.outCount = 0;
        p.caughtAt = null;
        p.distance = 0;
      }

      const now = Date.now();
      room.status = 'hiding';
      room.startAt = now;
      room.playStartAt = now + room.config.hideSec * 1000;
      room.endedAt = null;
      room.winner = null;
      room.reveal = {
        active: false,
        index: 0,
        endsAt: null,
        nextAt: room.playStartAt + room.config.revealEveryMin * 60 * 1000,
      };

      // Emit exact server event: started
      io.to(room.id).emit('event', { type: 'started', at: now });

      cb({ ok: true });
      sendStateToRoom(room);
    } catch (err) {
      console.error('[game:start] Error:', err);
      cb({ ok: false, error: err.message || 'Failed to start game' });
    }
  });

  // 6. loc:update (no ack, accept only in hiding and playing)
  socket.on('loc:update', (payload) => {
    try {
      if (!payload || !payload.roomId || !payload.playerId) return;

      const room = rooms.get(payload.roomId.toUpperCase());
      if (!room) return;
      if (room.status !== 'hiding' && room.status !== 'playing') return;

      const player = room.players.get(payload.playerId);
      if (!player) return;

      const lat = Number(payload.lat);
      const lng = Number(payload.lng);
      const accuracy = Number(payload.accuracy) || 10;
      if (isNaN(lat) || isNaN(lng)) return;

      const prevLoc = room.locations.get(payload.playerId);
      if (prevLoc) {
        const dist = haversineDistanceMeters(prevLoc.lat, prevLoc.lng, lat, lng);
        if (dist >= 1) {
          player.distance = (player.distance || 0) + dist;
        }
      }

      room.locations.set(payload.playerId, {
        lat,
        lng,
        accuracy,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error('[loc:update] Error:', err);
    }
  });

  // 7. player:caught (seeker or the target itself, only in playing)
  socket.on('player:caught', (payload, ack) => {
    const cb = typeof ack === 'function' ? ack : () => {};
    try {
      const { roomId, targetId } = payload || {};
      if (!roomId) return cb({ ok: false, error: 'Room ID required' });

      const room = rooms.get(roomId.toUpperCase());
      if (!room) return cb({ ok: false, error: 'Room not found' });
      if (room.status !== 'playing') {
        return cb({ ok: false, error: 'Can only mark caught during active playing phase' });
      }

      const actualTargetId = targetId || boundPlayerId;
      if (!actualTargetId) return cb({ ok: false, error: 'Target ID required' });

      const isSeeker = boundPlayerId === room.seekerId;
      const isSelf = boundPlayerId === actualTargetId;

      if (!isSeeker && !isSelf) {
        return cb({ ok: false, error: 'Only the seeker or the operative themselves can confirm a tag' });
      }

      const targetPlayer = room.players.get(actualTargetId);
      if (!targetPlayer) return cb({ ok: false, error: 'Target player not in room' });
      if (targetPlayer.role === 'seeker') {
        return cb({ ok: false, error: 'Seeker cannot be caught' });
      }
      if (targetPlayer.status === 'caught' || targetPlayer.status === 'dq') {
        return cb({ ok: true }); // already caught or dq
      }

      const now = Date.now();
      targetPlayer.status = 'caught';
      targetPlayer.caughtAt = now;

      // Emit caught event
      io.to(room.id).emit('event', {
        type: 'caught',
        playerId: targetPlayer.id,
        name: targetPlayer.name,
        at: now,
      });

      // Check win condition: all hiders caught or dq
      let remainingActiveHiders = 0;
      let totalHiders = 0;
      for (const p of room.players.values()) {
        if (p.role === 'hider') {
          totalHiders++;
          if (p.status === 'active' || p.status === 'out') {
            remainingActiveHiders++;
          }
        }
      }

      if (totalHiders > 0 && remainingActiveHiders === 0) {
        room.status = 'ended';
        room.winner = 'seeker';
        room.endedAt = now;
        io.to(room.id).emit('event', { type: 'ended', winner: 'seeker', at: now });
      }

      cb({ ok: true });
      sendStateToRoom(room);
    } catch (err) {
      console.error('[player:caught] Error:', err);
      cb({ ok: false, error: err.message || 'Failed to mark caught' });
    }
  });

  // 8. room:leave (transfer host if host leaves)
  socket.on('room:leave', (payload, ack) => {
    const cb = typeof ack === 'function' ? ack : () => {};
    try {
      const { roomId, playerId } = payload || {};
      const upperRoomId = (roomId || boundRoomId || '').toUpperCase();
      const actualPlayerId = playerId || boundPlayerId;

      if (!upperRoomId || !rooms.has(upperRoomId)) {
        return cb({ ok: true });
      }

      const room = rooms.get(upperRoomId);
      const leavingPlayer = room.players.get(actualPlayerId);

      room.players.delete(actualPlayerId);
      room.locations.delete(actualPlayerId);
      socket.leave(upperRoomId);

      if (room.players.size === 0) {
        rooms.delete(upperRoomId);
      } else if (room.hostId === actualPlayerId) {
        // Transfer host to first connected player (or first remaining player)
        const remainingPlayers = Array.from(room.players.values());
        const newHost = remainingPlayers.find((p) => p.connected) || remainingPlayers[0];
        room.hostId = newHost.id;
        io.to(upperRoomId).emit('event', {
          type: 'host_changed',
          playerId: newHost.id,
          name: newHost.name,
          at: Date.now(),
        });
        sendStateToRoom(room);
      } else {
        sendStateToRoom(room);
      }

      cb({ ok: true });
    } catch (err) {
      console.error('[room:leave] Error:', err);
      cb({ ok: false, error: err.message || 'Failed to leave room' });
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    if (boundPlayerId && boundRoomId && rooms.has(boundRoomId)) {
      const room = rooms.get(boundRoomId);
      if (room.players.has(boundPlayerId)) {
        const p = room.players.get(boundPlayerId);
        p.connected = false;
        sendStateToRoom(room);
      }
    }
  });
});

/**
 * 1-Second Authoritative Game Loop
 */
setInterval(() => {
  const now = Date.now();

  for (const [roomId, room] of rooms.entries()) {
    // 1. Transition: hiding -> playing when now >= playStartAt
    if (room.status === 'hiding') {
      if (room.playStartAt && now >= room.playStartAt) {
        room.status = 'playing';
        room.reveal = {
          active: false,
          index: 0,
          endsAt: null,
          nextAt: room.playStartAt + room.config.revealEveryMin * 60 * 1000,
        };
        io.to(roomId).emit('event', { type: 'playing', at: now });
      }
    }

    // 2. In playing phase: handle reveals, timer expiration, and win conditions
    if (room.status === 'playing') {
      // Game duration expired -> Hiders win
      const gameEndTime = (room.playStartAt || room.startAt || now) + room.config.durationMin * 60 * 1000;
      if (now >= gameEndTime) {
        room.status = 'ended';
        room.winner = 'hiders';
        room.endedAt = now;
        io.to(roomId).emit('event', { type: 'ended', winner: 'hiders', at: now });
        sendStateToRoom(room);
        continue;
      }

      // Handle reveals
      if (room.reveal.active) {
        if (room.reveal.endsAt && now >= room.reveal.endsAt) {
          room.reveal.active = false;
          room.reveal.endsAt = null;
          // Note: client specifications dictate NO reveal_end event
        }
      } else {
        if (room.reveal.nextAt && now >= room.reveal.nextAt) {
          room.reveal.active = true;
          room.reveal.endsAt = now + room.config.revealSec * 1000;
          room.reveal.nextAt = room.reveal.endsAt + room.config.revealEveryMin * 60 * 1000;
          room.reveal.index = (room.reveal.index || 0) + 1;
          io.to(roomId).emit('event', {
            type: 'reveal_start',
            endsAt: room.reveal.endsAt,
            at: now,
          });
        }
      }

      // Check win condition: all hiders caught or dq -> Seeker wins
      let totalHiders = 0;
      let activeHiders = 0;
      for (const p of room.players.values()) {
        if (p.role === 'hider') {
          totalHiders++;
          if (p.status === 'active' || p.status === 'out') {
            activeHiders++;
          }
        }
      }

      if (totalHiders > 0 && activeHiders === 0) {
        room.status = 'ended';
        room.winner = 'seeker';
        room.endedAt = now;
        io.to(roomId).emit('event', { type: 'ended', winner: 'seeker', at: now });
        sendStateToRoom(room);
        continue;
      }
    }

    // 3. Out-of-zone check during hiding and playing
    if (room.status === 'hiding' || room.status === 'playing') {
      for (const p of room.players.values()) {
        if (p.status !== 'active' && p.status !== 'out') continue;

        const loc = room.locations.get(p.id);
        if (!loc) continue;

        const dist = haversineDistanceMeters(
          loc.lat,
          loc.lng,
          room.zone.center.lat,
          room.zone.center.lng
        );

        const isOutside = dist > room.zone.radius;

        if (isOutside) {
          if (p.status !== 'out') {
            p.status = 'out';
            p.outSince = now;
            p.outCount = (p.outCount || 0) + 1;
            io.to(roomId).emit('event', {
              type: 'out_of_zone',
              playerId: p.id,
              name: p.name,
              graceSec: room.config.graceSec,
              at: now,
            });
          } else {
            // Already out: check grace countdown expiration
            if (now - (p.outSince || now) >= room.config.graceSec * 1000) {
              p.status = 'dq';
              io.to(roomId).emit('event', {
                type: 'dq',
                playerId: p.id,
                name: p.name,
                reason: 'Exceeded safe zone grace period',
                at: now,
              });

              // Check if that was the last active hider
              if (room.status === 'playing') {
                let activeHidersCount = 0;
                for (const player of room.players.values()) {
                  if (player.role === 'hider' && (player.status === 'active' || player.status === 'out')) {
                    activeHidersCount++;
                  }
                }
                if (activeHidersCount === 0) {
                  room.status = 'ended';
                  room.winner = 'seeker';
                  room.endedAt = now;
                  io.to(roomId).emit('event', { type: 'ended', winner: 'seeker', at: now });
                }
              }
            }
          }
        } else {
          // Player returned inside zone
          if (p.status === 'out') {
            p.status = 'active';
            p.outSince = null;
            io.to(roomId).emit('event', {
              type: 'returned',
              playerId: p.id,
              name: p.name,
              at: now,
            });
          }
        }
      }
    }

    // 4. Send authoritative "state" message every 1 second to each player
    sendStateToRoom(room);
  }
}, 1000);

// SPA fallback for all unmatched client-side routes (e.g. /lobby, /create, /join)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`HideNSeek server listening on ${PORT}`);
});
