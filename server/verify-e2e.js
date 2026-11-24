const { io } = require('socket.io-client');
const crypto = require('crypto');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

async function verifyEndToEnd() {
  console.log('=== Starting End-to-End Client & Server Type Verification ===');

  const hostPlayerId = crypto.randomUUID();
  const socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
  });

  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
  });
  console.log('✅ Client connected to Socket.io backend at', SERVER_URL);

  // 1. Replicate CreateRoomScreen payload
  const createPayload = {
    hostName: 'Commander Hawk',
    avatar: '#06d6a0',
    zone: {
      center: { lat: 18.5204, lng: 73.8567 },
      radius: 250,
    },
    config: {
      radius: 250,
      durationMin: 10,
      hideSec: 60,
      revealEveryMin: 2,
      revealSec: 15,
      graceSec: 20,
    },
    playerId: hostPlayerId,
  };

  console.log('Emitting room:create with payload:', createPayload);

  const ack = await new Promise((resolve) => {
    socket.emit('room:create', createPayload, resolve);
  });

  console.log('Received room:create ack:', JSON.stringify(ack, null, 2));

  if (!ack || !ack.ok) {
    throw new Error('Create room failed with ack: ' + JSON.stringify(ack));
  }

  const { room: state, playerId: returnedPlayerId } = ack;
  if (!state || !state.room || !state.room.id) {
    throw new Error('Invalid state returned: missing room.id');
  }

  console.log('✅ Created Room ID:', state.room.id);
  console.log('✅ Returned Player ID:', returnedPlayerId);

  // Type & Shape Assertions
  if (state.room.id.length !== 6) {
    throw new Error(`Room ID must be 6 characters, got: "${state.room.id}"`);
  }
  if (state.room.hostId !== hostPlayerId) {
    throw new Error(`hostId mismatch: expected ${hostPlayerId}, got ${state.room.hostId}`);
  }
  if (state.room.status !== 'lobby') {
    throw new Error(`room.status mismatch: expected 'lobby', got ${state.room.status}`);
  }
  if (state.room.zone.radius !== 250 || typeof state.room.zone.center.lat !== 'number') {
    throw new Error('room.zone format mismatch: ' + JSON.stringify(state.room.zone));
  }
  if (
    state.room.config.radius !== 250 ||
    state.room.config.durationMin !== 10 ||
    state.room.config.hideSec !== 60 ||
    state.room.config.revealEveryMin !== 2 ||
    state.room.config.revealSec !== 15 ||
    state.room.config.graceSec !== 20
  ) {
    throw new Error('room.config format mismatch: ' + JSON.stringify(state.room.config));
  }

  // Check players array format
  if (!Array.isArray(state.players) || state.players.length !== 1) {
    throw new Error('state.players must be an array with 1 player');
  }
  const hostP = state.players[0];
  if (
    hostP.id !== hostPlayerId ||
    hostP.name !== 'Commander Hawk' ||
    hostP.avatar !== '#06d6a0' ||
    hostP.isHost !== true ||
    hostP.role !== 'undecided' ||
    hostP.status !== 'active'
  ) {
    throw new Error('Player format mismatch: ' + JSON.stringify(hostP));
  }

  // Check reveal object format
  if (
    typeof state.reveal.active !== 'boolean' ||
    typeof state.reveal.index !== 'number'
  ) {
    throw new Error('state.reveal format mismatch: ' + JSON.stringify(state.reveal));
  }

  // Check locations format
  if (typeof state.locations !== 'object') {
    throw new Error('state.locations must be an object');
  }

  console.log('✅ All server data shapes match client TypeScript types exactly!');

  // 2. Test persistent playerId reconnection
  console.log('Testing persistent reconnection with same playerId...');
  const reconnectSocket = io(SERVER_URL, { transports: ['websocket'] });
  await new Promise((resolve) => reconnectSocket.on('connect', resolve));

  const rejoinAck = await new Promise((resolve) => {
    reconnectSocket.emit(
      'room:join',
      {
        roomId: state.room.id,
        name: 'Commander Hawk (Reconnected)',
        avatar: '#06d6a0',
        playerId: hostPlayerId,
      },
      resolve
    );
  });

  if (!rejoinAck.ok || rejoinAck.room.players.length !== 1) {
    throw new Error('Reconnection failed: ' + JSON.stringify(rejoinAck));
  }
  console.log('✅ Persistent playerId reconnection successful, player restored');

  socket.disconnect();
  reconnectSocket.disconnect();

  console.log('🎉 End-to-end verification succeeded with 0 errors!');
  process.exit(0);
}

verifyEndToEnd().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
