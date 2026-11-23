import { create } from 'zustand';
import {
  Room,
  LocationCoordinates,
  BoundaryAlertInfo,
  RevealState,
} from '../types';
import { Language, translations } from '../lib/i18n';
import { soundEffects } from '../lib/audio';

const SESSION_STORAGE_PERSISTENT_PLAYER_ID = 'hidenseek_persistent_player_id';
const SESSION_STORAGE_ROOM = 'hidenseek_active_room_id';
const LOCAL_STORAGE_LANG = 'hidenseek_language';
const LOCAL_STORAGE_THEME = 'hidenseek_theme';

export function getPersistentPlayerId(): string {
  if (typeof window === 'undefined') {
    return `player_${Date.now()}`;
  }
  let id = sessionStorage.getItem(SESSION_STORAGE_PERSISTENT_PLAYER_ID);
  if (!id) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      id = `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    sessionStorage.setItem(SESSION_STORAGE_PERSISTENT_PLAYER_ID, id);
  }
  return id;
}

interface GameState {
  room: Room | null;
  playerId: string | null;
  language: Language;
  theme: 'dark' | 'light';
  soundEnabled: boolean;
  userLocation: LocationCoordinates | null;
  gpsStatus: 'idle' | 'locating' | 'granted' | 'denied' | 'error';
  gpsAccuracy: number | null;
  simulationMode: boolean;
  outOfZoneAlert: BoundaryAlertInfo | null;
  otherOutOfZonePlayerName: string | null;
  toastMessage: string | null;
  revealState: RevealState;
  locations: Record<string, LocationCoordinates>;
  clockOffset: number; // serverNow - Date.now()

  // Actions
  setRoom: (room: Room | null) => void;
  setPlayerId: (id: string | null) => void;
  setLanguage: (lang: Language) => void;
  toggleTheme: () => void;
  toggleSound: () => void;
  setUserLocation: (coords: LocationCoordinates | null) => void;
  setGpsStatus: (status: GameState['gpsStatus'], accuracy?: number | null) => void;
  toggleSimulationMode: () => void;
  setOutOfZoneAlert: (alert: BoundaryAlertInfo | null) => void;
  setOtherOutOfZonePlayerName: (name: string | null) => void;
  setToastMessage: (msg: string | null) => void;
  updateRevealState: (state: RevealState) => void;
  setLocations: (locations: Record<string, LocationCoordinates>) => void;
  setClockOffset: (offset: number) => void;
  t: (key: keyof typeof translations.en) => string;
  resetGameSession: () => void;
}

export const useGameStore = create<GameState>((set, get) => {
  const initialTheme =
    (typeof window !== 'undefined' &&
      (localStorage.getItem(LOCAL_STORAGE_THEME) as 'dark' | 'light')) ||
    'dark';
  const initialLang =
    (typeof window !== 'undefined' &&
      (localStorage.getItem(LOCAL_STORAGE_LANG) as Language)) ||
    'en';
  const persistentPlayerId = getPersistentPlayerId();

  return {
    room: null,
    playerId: persistentPlayerId,
    language: initialLang,
    theme: initialTheme,
    soundEnabled: true,
    userLocation: null,
    gpsStatus: 'idle',
    gpsAccuracy: null,
    simulationMode: false,
    outOfZoneAlert: null,
    otherOutOfZonePlayerName: null,
    toastMessage: null,
    revealState: {
      isRevealing: false,
      secondsUntilNext: 0,
      secondsRemainingInReveal: 0,
      revealProgress: 0,
    },
    locations: {},
    clockOffset: 0,

    setRoom: (room) => {
      if (room && typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_STORAGE_ROOM, room.id);
      }
      set({ room });
    },

    setPlayerId: (id) => {
      if (typeof window !== 'undefined') {
        if (id) {
          sessionStorage.setItem(SESSION_STORAGE_PERSISTENT_PLAYER_ID, id);
        }
      }
      set({ playerId: id || getPersistentPlayerId() });
    },

    setLanguage: (lang) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_LANG, lang);
      }
      set({ language: lang });
    },

    toggleTheme: () => {
      const current = get().theme;
      const next = current === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_THEME, next);
        const root = document.documentElement;
        if (next === 'dark') {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.remove('dark');
          root.classList.add('light');
        }
      }
      set({ theme: next });
    },

    toggleSound: () => {
      const next = !get().soundEnabled;
      soundEffects.enabled = next;
      set({ soundEnabled: next });
    },

    setUserLocation: (coords) => set({ userLocation: coords }),

    setGpsStatus: (status, accuracy = null) =>
      set({ gpsStatus: status, gpsAccuracy: accuracy }),

    toggleSimulationMode: () =>
      set((state) => ({ simulationMode: !state.simulationMode })),

    setOutOfZoneAlert: (alert) => set({ outOfZoneAlert: alert }),

    setOtherOutOfZonePlayerName: (name) =>
      set({ otherOutOfZonePlayerName: name }),

    setToastMessage: (msg) => {
      set({ toastMessage: msg });
      if (msg) {
        setTimeout(() => {
          if (get().toastMessage === msg) {
            set({ toastMessage: null });
          }
        }, 4000);
      }
    },

    updateRevealState: (state) => set({ revealState: state }),

    setLocations: (locations) => set({ locations }),

    setClockOffset: (offset) => set({ clockOffset: offset }),

    t: (key) => {
      const lang = get().language;
      const dict = translations[lang] || translations.en;
      return dict[key] || translations.en[key] || key;
    },

    resetGameSession: () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(SESSION_STORAGE_ROOM);
      }
      set({
        room: null,
        outOfZoneAlert: null,
        otherOutOfZonePlayerName: null,
        toastMessage: null,
      });
    },
  };
});
