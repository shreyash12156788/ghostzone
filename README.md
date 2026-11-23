# HideNSeek Live — Real-World GPS Hide & Seek Game (PWA)

**HideNSeek Live** is a production-quality, mobile-first progressive web app (PWA) designed for campus and park play. Players join rooms via a 6-character code or QR code, designate a Seeker, set up geofenced play areas on a live tactical map, flee during hiding countdowns, and track periodic live radar reveals with out-of-zone grace warnings and hold-to-confirm tag mechanics.

---

## 🌟 Key Features

1. **Room & Lobby Architecture**:
   - 6-character room codes (e.g. `K7X2QP`), instant share link, and scannable QR code.
   - Customizable player avatars & color palettes.
   - Real-time lobby roster with host crown badge, ready states, and live connection status.
2. **Interactive Safe Zone Editor**:
   - Host can tap anywhere on the Leaflet map to relocate the zone center.
   - Slider to adjust safe perimeter radius from **50 m to 1,000 m**.
   - "Center on My GPS" button to center the game on the host's actual location.
3. **Pure Engine Game Rules & Timers (`src/game/engine.ts`)**:
   - Timers are derived from shared timestamps (`startedAt`, `playStartedAt`), not fragile local intervals.
   - **Role Reveal Animation**: Dramatic identity assignment ("You are the SEEKER" / "You are a HIDER") with sound and haptics.
   - **Hiding Phase**: Big countdown timer. Hiders see their live GPS position and the perimeter; Seeker's screen is locked into "Eyes Closed" mode.
   - **Tactical Radar Reveals**: Periodic scan cycles (every 2–5 min) that reveal all hiders on everyone's map for 10–15 seconds with animated sonar waves, then fade back into stealth.
   - **Boundary Geofencing**: Geodesic point-in-zone checks with Turf.js. Breaching the boundary triggers an emergency full-screen siren, 20s grace countdown, and a rotating compass arrow pointing back to safe zone center. Exceeding grace triggers automatic disqualification.
   - **Hold-to-Confirm Catching**: 1.5-second hold button prevents accidental taps while running in the field.
4. **Hardware & Mobile Web APIs**:
   - **Screen Wake Lock API**: Automatically keeps the phone screen awake during active gameplay and re-acquires lock when switching back from other apps.
   - **Web Audio API**: Synthesized sonar sweeps, hazard sirens, caught buzzers, and victory fanfare (no external audio assets required).
   - **Vibration API**: Haptic pulses for radar pings, danger alarms, and role reveals.
   - **PWA Ready**: Offline caching, service worker, manifest, and home screen installability.
5. **Multilingual (i18n)**:
   - English, Marathi (मराठी), and Hindi (हिंदी) with instant language switching.
6. **Multi-Tab Cross-Communication & Dev Simulation**:
   - `MockGameService` communicates via `BroadcastChannel` + `localStorage` so multiple browser tabs or windows simulate distinct players in real time without needing an external server.
   - **Simulation Dev Panel**: Toggleable panel to spawn AI bot players, simulate walking via a 4-direction joystick, test out-of-zone boundary alerts, and trigger immediate radar scans.

---

## 🚀 Quick Start

### 1. Installation
```bash
# Clone or navigate to the directory
cd d:\GAME

# Install dependencies
npm install

# Start development server
npm run dev
```

### 2. Running Unit Tests
All core game engine calculations, boundary algorithms, reveal schedules, and win conditions are tested with Vitest:
```bash
npm test
```

### 3. Production Build
```bash
npm run build
npm run preview
```

---

## 🧪 Testing With Multiple Browser Tabs

You can test a full multiplayer game on a single laptop or desktop:
1. Open `http://localhost:5173` in Tab 1 (Host).
2. Click **Create Room**, enter your name (e.g. `Rohan`), and click **Create Mission Room**.
3. Copy the 6-character room code (e.g. `K7X2QP`) or the share link.
4. Open an Incognito Window or Tab 2, navigate to the link or click **Join Room**, and enter the code with a second player name (e.g. `Priya`).
5. Notice both tabs immediately show each other in the lobby in real time via the cross-tab `BroadcastChannel`!
6. In Tab 1, adjust the zone radius slider, designate a Seeker (or keep Random), and click **Launch HideNSeek Game**.
7. Both tabs will simultaneously show the dramatic **Role Reveal**, followed by the **Hiding Phase**, and transition directly into the **Live Tactical Radar Game**.

---

## 🤖 Testing With Simulation Mode

To test geofence alerts and radar sweeps solo without walking outdoors:
1. Tap the **Bot icon** in the top navigation bar to open the **Simulation Dev Panel**.
2. Click **+3 Bots** to spawn AI players (`Agent Alex`, `Shadow Priya`, `Echo Sam`) inside the safe zone.
3. Click **Wander** to move the bots 5m in random directions.
4. Use the **Walk Simulator Joystick** (⬆️ ⬇️ ⬅️ ➡️) to nudge your own GPS location in 8m increments.
5. Click **Breach Zone**: Teleports your location 350m away from the center to immediately trigger the **Fullscreen Red Hazard Border**, the **20s Grace Timer**, the **Audio Siren**, and the **Direction Arrow back to zone center**.
6. Click **Center**: Returns you back to the center of the zone, clearing the alarm.
7. Click **Force Reveal**: Instantly activates a 15-second radar sweep with sonar audio and pulsing player map markers.

---

## 📁 Project Architecture

```
d:\GAME/
├── public/                     # PWA icons, favicon, manifest
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── AvatarBadge.tsx     # Player avatar with role and status indicators
│   │   ├── HoldButton.tsx      # 1.5s press-and-hold confirmation button
│   │   ├── HowToPlayModal.tsx  # Game guide bottom sheet
│   │   ├── MapComponent.tsx    # Leaflet map with dark CARTO tiles & zone overlays
│   │   ├── Navbar.tsx          # Top bar with GPS status, audio, theme, language
│   │   ├── OutOfZoneAlert.tsx  # Fullscreen out-of-zone emergency overlay
│   │   ├── PermissionsModal.tsx# Location & Wake Lock onboarding dialog
│   │   ├── RadarSweep.tsx      # Sonar wave animation overlay
│   │   └── SimulationDrawer.tsx# Dev simulation control panel
│   ├── game/                   # Pure, unit-testable game logic
│   │   ├── engine.ts           # Turf geofencing, reveal cycles, win conditions
│   │   └── engine.test.ts      # 15 Vitest unit tests (100% pass)
│   ├── hooks/
│   │   └── useGeolocation.ts   # GPS tracking, throttling, and simulated walk
│   ├── lib/
│   │   ├── audio.ts            # Web Audio API sound synthesizer
│   │   ├── i18n.ts             # English, Marathi, Hindi translation dictionaries
│   │   ├── utils.ts            # Classnames helper, formatters
│   │   ├── vibration.ts        # Vibration API patterns
│   │   └── wakelock.ts         # Screen Wake Lock manager
│   ├── screens/                # Mobile-first screen views
│   │   ├── ActiveGameFlow.tsx  # Router orchestrating live phases seamlessly
│   │   ├── CreateRoomScreen.tsx# Room generator, share link, QR code
│   │   ├── HidingPhaseScreen.tsx# Countdown screen (Hider view vs Seeker blindfold)
│   │   ├── JoinRoomScreen.tsx  # 6-character room code entry
│   │   ├── LandingScreen.tsx   # Home landing with radar graphics
│   │   ├── LiveGameScreen.tsx  # Fullscreen tactical map HUD
│   │   ├── LobbyScreen.tsx     # Live roster, zone editor, and game settings
│   │   ├── ResultsScreen.tsx   # Confetti celebration and match debrief stats
│   │   └── RoleRevealScreen.tsx# Fullscreen role announcement
│   ├── services/
│   │   ├── gameService.ts      # IGameService interface & MockGameService (BroadcastChannel/localStorage)
│   │   ├── socketGameService.ts# Server-authoritative SocketGameService (WebSocket state/event)
│   │   └── index.ts            # Active service selected via VITE_USE_MOCK (false = socket, true = mock)
│   ├── store/
│   │   └── gameStore.ts        # Zustand store with persistence
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces (Room, Player, Zone, etc.)
│   ├── App.tsx                 # Route declarations & theme listener
│   ├── index.css               # Tailwind CSS & custom radar keyframes
│   └── main.tsx                # React root mount
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## ⚡ Server-Authoritative Architecture (`SocketGameService`)

When `VITE_USE_MOCK=false` (the default), the app uses `SocketGameService` connecting over WebSocket to the authoritative game server.

### Selection by `VITE_USE_MOCK`:
- `VITE_USE_MOCK=false` (or unset): Uses `SocketGameService` (server authoritative).
- `VITE_USE_MOCK=true`: Uses `MockGameService` (in-memory + BroadcastChannel multi-tab test service).

Configure this via environment variable or in `.env`:
```env
VITE_USE_MOCK=false
VITE_SOCKET_URL=ws://localhost:3000/ws
```

### Server Authoritative Responsibilities:
The server owns all state mutations and game events:
1. **Phases & Transitions**: Server transitions from `LOBBY` -> `ROLE_REVEAL` -> `HIDING` -> `PLAYING` -> `ENDED`. The UI simply renders whatever phase the server dictates.
2. **Radar Reveal Cycles**: Server triggers and ends reveal windows via `state` and `event` messages (`reveal_start` / `reveal_end`).
3. **Boundary Verification & Disqualification**: Server tracks GPS coordinates, detects out-of-zone players, manages grace timers, and marks players `DISQUALIFIED`.
4. **Win Conditions**: Server evaluates timer expiration and caught/eliminated players to declare the winner.

### Server Accepted Parameter Ranges:
- **`radius`**: 50 – 2,000 meters
- **`duration`**: 5 – 180 minutes
- **`hideSec`**: 10 – 600 seconds
- **`revealEveryMin`**: 1 – 30 minutes
- **`revealSec`**: 5 – 60 seconds
- **`graceSec`**: 5 – 120 seconds

The client UI controls seamlessly map to these accepted ranges.

### WebSocket Message Protocol:
- **Client to Server**:
  - `create_room`: `{ type: 'create_room', hostName, avatar, initialZone, config }`
  - `join_room`: `{ type: 'join_room', roomId, playerName, avatar }`
  - `leave_room`: `{ type: 'leave_room', roomId, playerId }`
  - `update_location`: `{ type: 'update_location', roomId, playerId, coords }`
  - `update_config`: `{ type: 'update_config', roomId, config }`
  - `update_zone`: `{ type: 'update_zone', roomId, zone }`
  - `set_ready`: `{ type: 'set_ready', roomId, playerId, isReady }`
  - `start_game`: `{ type: 'start_game', roomId }`
  - `mark_caught`: `{ type: 'mark_caught', roomId, targetPlayerId, caughtByPlayerId }`
  - `disqualify_player`: `{ type: 'disqualify_player', roomId, playerId }`
  - `restart_game`: `{ type: 'restart_game', roomId }`
- **Server to Client**:
  - `state`: `{ type: 'state', state: Room }`
  - `event`:
    - `reveal_start`: `{ type: 'event', event: 'reveal_start', secondsRemaining: 15 }`
    - `reveal_end`: `{ type: 'event', event: 'reveal_end', nextRevealIn: 180 }`
    - `player_out_of_zone`: `{ type: 'event', event: 'player_out_of_zone', playerId, name, secondsRemaining }`
    - `player_returned`: `{ type: 'event', event: 'player_returned', playerId }`
    - `player_caught`: `{ type: 'event', event: 'player_caught', playerId, caughtBy }`
    - `player_disqualified`: `{ type: 'event', event: 'player_disqualified', playerId }`
    - `game_over`: `{ type: 'event', event: 'game_over', winner: 'SEEKER' | 'HIDERS', reason: string }`


---

## 🛡️ License
MIT License. Built for outdoor campus stealth and social hide & seek games!
