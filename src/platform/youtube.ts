import type { PlatformAdapter } from './types';

/** YouTube host adapter; gameplay remains shared with the web edition. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type YtGame = any;

export class YouTubePlatform implements PlatformAdapter {
  readonly name = 'youtube';
  private get yt(): YtGame {
    return (window as unknown as { ytgame?: YtGame }).ytgame;
  }

  async init(): Promise<void> {
    if (!this.yt?.game?.loadData || !this.yt?.game?.saveData) throw new Error('Playables SDK not loaded');
    await new Promise<void>(resolve=>requestAnimationFrame(()=>{this.firstFrameReady();resolve();}));
  }
  async load(): Promise<string | null> {
    const data = await this.yt.game.loadData();
    return data ? String(data) : null;
  }
  async save(data: string): Promise<void> {
    await this.yt.game.saveData(data);
  }
  submitScore(value: number): void {
    this.yt.engagement?.sendScore?.({ value });
  }
  isAudioAllowed(): boolean {
    return typeof this.yt.system?.isAudioEnabled==='function'?this.yt.system.isAudioEnabled():true;
  }
  onAudioAllowedChange(cb: (allowed: boolean) => void): void {
    this.yt.system?.onAudioEnabledChange?.(cb);
  }
  onPause(cb: () => void): void {
    this.yt.system?.onPause?.(cb);
  }
  onResume(cb: () => void): void {
    this.yt.system?.onResume?.(cb);
  }
  private firstSent=false;
  firstFrameReady(): void {
    if(this.firstSent)return;this.firstSent=true;
    this.yt.game.firstFrameReady();
  }
  gameReady(): void {
    this.yt.game.gameReady();
  }
}
