import type { PlatformAdapter } from './types';

const KEY = 'armor-of-light-save-v1';

/** Standalone browser platform: localStorage saves, focus/visibility pause. */
export class WebPlatform implements PlatformAdapter {
  readonly name = 'web';
  constructor(private readonly storageKey=KEY){}
  private memory: string | null = null;
  private pauseCbs: (() => void)[] = [];
  private resumeCbs: (() => void)[] = [];

  async init(): Promise<void> {
    const pause = () => this.pauseCbs.forEach((cb) => cb());
    const resume = () => this.resumeCbs.forEach((cb) => cb());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pause();
      else resume();
    });
    window.addEventListener('blur', pause);
    window.addEventListener('focus', resume);
    window.addEventListener('pagehide', pause);
  }

  async load(): Promise<string | null> {
    try {
      return window.localStorage.getItem(this.storageKey) ?? this.memory;
    } catch {
      return this.memory; // storage blocked (private mode, sandboxed iframe…)
    }
  }

  async save(data: string): Promise<void> {
    this.memory = data;
    try {
      window.localStorage.setItem(this.storageKey, data);
    } catch {
      /* keep the in-memory copy */
    }
  }

  submitScore(_value: number): void {
    /* no leaderboard in the standalone build */
  }

  isAudioAllowed(): boolean {
    return true;
  }

  onAudioAllowedChange(_cb: (allowed: boolean) => void): void {
    /* the browser has no host-level audio switch */
  }

  onPause(cb: () => void): void {
    this.pauseCbs.push(cb);
  }

  onResume(cb: () => void): void {
    this.resumeCbs.push(cb);
  }

  firstFrameReady(): void {}
  gameReady(): void {}
}
