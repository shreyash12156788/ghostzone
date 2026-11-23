// Safe Vibration API wrapper with pattern presets

export function vibrate(pattern: number | number[]) {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}

export const HapticPatterns = {
  click: 20,
  revealBlip: [80, 50, 80],
  outOfZoneAlarm: [300, 100, 300, 100, 300],
  caught: [400],
  roleReveal: [100, 60, 200],
  success: [50, 50, 100],
};
