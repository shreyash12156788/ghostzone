// Screen Wake Lock API manager with automatic re-acquisition on tab visibility change

class WakeLockManager {
  private sentinel: WakeLockSentinel | null = null;
  private isRequested: boolean = false;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isRequested) {
          this.acquire();
        }
      });
    }
  }

  async acquire(): Promise<boolean> {
    this.isRequested = true;
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    try {
      if (this.sentinel && !this.sentinel.released) {
        return true;
      }
      this.sentinel = await navigator.wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
      });
      return true;
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
      return false;
    }
  }

  release() {
    this.isRequested = false;
    if (this.sentinel) {
      this.sentinel.release().catch(() => {});
      this.sentinel = null;
    }
  }

  get isLocked(): boolean {
    return Boolean(this.sentinel && !this.sentinel.released);
  }
}

export const wakeLockManager = new WakeLockManager();
