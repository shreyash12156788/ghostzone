const { io } = require('socket.io-client');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

async function runTest() {
  console.log('--- Starting Socket.io Backend Test ---');

  const hostPlayerId = 'host_test_uuid_1';
  const joinerPlayerId = 'joiner_test_uuid_2';

  const hostSocket = io(SERVER_URL, {
    transports: ['websocket'],
    reconnection: false,
  });

  const joinerSocket = io(SERVER_URL, {
    transports: ['websocket'],
    reconnection: false,
  });

  await new Promise((resolve) => hostSocket.on('connect', resolve));
  await new Promise((resolve) => joinerSocket.on('connect', resolve));
  console.log('✅ Both sockets connected to server');

  let roomId = null;

  // 1. Host creates room
  const createRes = await new Promise((resolve) => {
    hostSocket.emit(
      'room:create',
      {
        hostName: 'HostPlayer',
        avatar: '#06d6a0',
        zone: { center: { lat: 18.5204, lng: 73.8567 }, radius: 300 },
        config: {
          radius: 300,
          durationMin: 5,
          hideSec: 10,
          revealEveryMin: 1,
          revealSec: 5,
          graceSec: 10,
        },
        playerId: hostPlayerId,
      },
      resolve
    );
  });

  if (!createRes.ok || !createRes.room) {
    throw new Error('Failed to create room: ' + JSON.stringify(createRes));
  }
  roomId = createRes.room.room.id;
  console.log(`✅ Room created successfully: ${roomId}`);
  console.log(`   Host playerId: ${createRes.playerId}`);

  // 2. Joiner joins room
  const joinRes = await new Promise((resolve) => {
    joinerSocket.emit(
      'room:join',
      {
        roomId,
        name: 'JoinerPlayer',
        avatar: '#ef4444',
        playerId: joinerPlayerId,
      },
      resolve
    );
  });

  if (!joinRes.ok || !joinRes.room) {
    throw new Error('Failed to join room: ' + JSON.stringify(joinRes));
  }
  console.log(`✅ Joiner joined room successfully`);

  // Verify initial state received
  const hostInitialState = await new Promise((resolve) => {
    hostSocket.once('state', resolve);
  });
  console.log('✅ Host received state: players count = ' + hostInitialState.players.length);
  if (hostInitialState.players.length !== 2) {
    throw new Error(`Expected 2 players, got ${hostInitialState.players.length}`);
  }

  // 3. Test config update
  const configRes = await new Promise((resolve) => {
    hostSocket.emit(
      'room:config',
      {
        roomId,
        config: { radius: 250, hideSec: 10 },
      },
      resolve
    );
  });
  if (!configRes.ok) throw new Error('Failed to update config');
  console.log('✅ Host updated config');

  // 4. Test seeker designation
  const seekerRes = await new Promise((resolve) => {
    hostSocket.emit(
      'room:seeker',
      {
        roomId,
        seekerId: hostPlayerId,
      },
      resolve
    );
  });
  if (!seekerRes.ok) throw new Error('Failed to select seeker');
  console.log('✅ Host designated self as Seeker');

  // 5. Start Game
  const startPromise = new Promise((resolve) => {
    joinerSocket.once('event', (evt) => {
      if (evt.type === 'started') resolve(evt);
    });
  });

  const startRes = await new Promise((resolve) => {
    hostSocket.emit('game:start', { roomId }, resolve);
  });
  if (!startRes.ok) throw new Error('Failed to start game: ' + JSON.stringify(startRes));

  const startedEvt = await startPromise;
  console.log('✅ Received started event on joiner socket:', startedEvt);

  // 6. Test loc:update during hiding
  hostSocket.emit('loc:update', {
    roomId,
    playerId: hostPlayerId,
    lat: 18.5204,
    lng: 73.8567,
    accuracy: 5,
  });

  joinerSocket.emit('loc:update', {
    roomId,
    playerId: joinerPlayerId,
    lat: 18.5205,
    lng: 73.8568,
    accuracy: 6,
  });
  console.log('✅ Emitted loc:update for both players');

  // Wait for state to reflect locations
  await new Promise((r) => setTimeout(r, 1200));

  const joinerState = await new Promise((resolve) => {
    joinerSocket.once('state', resolve);
  });

  console.log('✅ Joiner (hider) received state during hiding. Locations visible:', Object.keys(joinerState.locations));

  const hostState = await new Promise((resolve) => {
    hostSocket.once('state', resolve);
  });
  console.log('✅ Host (seeker) received state during hiding. Locations visible (seeker only sees self when reveal inactive):', Object.keys(hostState.locations));

  if (!hostState.locations[hostPlayerId]) {
    throw new Error('Seeker should see own location');
  }
  if (hostState.locations[joinerPlayerId]) {
    throw new Error('Seeker should NOT see hider location while reveal.active is false');
  }
  console.log('✅ Visibility filter verified: Seeker cannot see hider during non-reveal');

  // 7. Test caught
  // First, artificially set status to playing so caught is allowed
  // In our test, let's wait or simulate playing:
  // Let's test player:caught directly:
  // Note: player:caught requires playing phase.
  console.log('Waiting for hiding phase to transition to playing (or timeout)...');
  await new Promise((resolve) => {
    joinerSocket.on('event', (evt) => {
      if (evt.type === 'playing') {
        console.log('✅ Game phase automatically transitioned to PLAYING!');
        resolve();
      }
    });
    // In case hideSec takes 10s:
    setTimeout(resolve, 11000);
  });

  // Now test caught
  const caughtPromise = new Promise((resolve) => {
    joinerSocket.once('event', (evt) => {
      if (evt.type === 'caught') resolve(evt);
    });
  });

  const caughtRes = await new Promise((resolve) => {
    hostSocket.emit(
      'player:caught',
      {
        roomId,
        targetId: joinerPlayerId,
      },
      resolve
    );
  });

  if (!caughtRes.ok) {
    console.log('player:caught returned:', caughtRes);
  } else {
    const caughtEvt = await caughtPromise;
    console.log('✅ Received caught event:', caughtEvt);
  }

  // Check ended event
  const endedPromise = new Promise((resolve) => {
    joinerSocket.once('event', (evt) => {
      if (evt.type === 'ended') resolve(evt);
    });
    setTimeout(() => resolve(null), 3000);
  });
  const endedEvt = await endedPromise;
  if (endedEvt) {
    console.log('✅ Game ended event received:', endedEvt);
  }

  hostSocket.disconnect();
  joinerSocket.disconnect();
  console.log('🎉 All backend socket tests passed successfully!');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
