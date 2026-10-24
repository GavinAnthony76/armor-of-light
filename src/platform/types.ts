/**
 * Everything the game needs from the host environment goes through this
 * interface. The standalone web build uses WebPlatform; a YouTube Playables
 * build can supply an adapter backed by the Playables SDK instead, without
 * touching game logic or menus.
 */
export interface PlatformAdapter {
  readonly name: string;
  init(): Promise<void>;

  /** Persisted save blob (JSON string) or null if none. */
  load(): Promise<string | null>;
  save(data: string): Promise<void>;

  /** Report the player's overall score to the host (e.g. a leaderboard). */
  submitScore(value: number): void;

  /** Host-level audio permission (separate from the in-game sound toggle). */
  isAudioAllowed(): boolean;
  onAudioAllowedChange(cb: (allowed: boolean) => void): void;

  /** Host asks the game to pause (tab hidden, app backgrounded…). */
  onPause(cb: () => void): void;
  onResume(cb: () => void): void;

  /** Loading milestones some hosts want to know about. */
  firstFrameReady(): void;
  gameReady(): void;
}
