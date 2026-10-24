import type { InputFrame } from './core/types';

type Action = 'left' | 'right' | 'jump' | 'attack' | 'block' | 'dash' | 'interact' | 'swap';
export type InputMode = 'keyboard' | 'touch' | 'gamepad';

const KEYS: Record<string, Action> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'jump',
  KeyW: 'jump',
  ArrowUp: 'jump',
  KeyZ: 'jump',
  KeyJ: 'attack',
  KeyL:'dash',
  KeyV:'dash',
  KeyX: 'attack',
  KeyK: 'block',
  KeyC: 'block',
  ShiftLeft: 'block',
  ShiftRight: 'block',
  KeyE: 'interact',
  KeyQ: 'swap',
};

/**
 * Collects keyboard, touch and gamepad input. Button presses are latched
 * until the game consumes them, so a quick tap is never lost between frames.
 */
export class Input {
  mode: InputMode = 'keyboard';
  enabled = false;
  private keyHeld = new Set<Action>();
  private touchHeld = new Set<Action>();
  private padHeld = new Set<Action>();
  private pressed = new Set<Action>();
  private padPrev = new Set<string>();
  /** Touch taps are short; keep jump "held" briefly so taps give a full jump. */
  private jumpAssist = 0;
  onPausePressed: (() => void) | null = null;
  onModeChange: ((m: InputMode) => void) | null = null;

  constructor() {
    window.addEventListener('keydown', (e) => {
      const a = KEYS[e.code];
      if (e.code === 'Escape' || e.code === 'KeyP') {
        this.onPausePressed?.();
        e.preventDefault();
        return;
      }
      if (!a) return;
      this.setMode('keyboard');
      if (!this.enabled) return;
      e.preventDefault();
      if (!e.repeat) this.pressed.add(a);
      this.keyHeld.add(a);
    });
    window.addEventListener('keyup', (e) => {
      const a = KEYS[e.code];
      if (a) this.keyHeld.delete(a);
    });
    window.addEventListener('blur', () => this.releaseAll());
  }

  setMode(m: InputMode): void {
    if (this.mode === m) return;
    this.mode = m;
    this.onModeChange?.(m);
  }

  /** Hook a touch button to an action (pressed while a finger is on it). */
  bindButton(el: HTMLElement, action: Action): void {
    const pointers = new Set<number>();
    const down = (e: PointerEvent) => {
      e.preventDefault();
      this.setMode('touch');
      el.setPointerCapture?.(e.pointerId);
      pointers.add(e.pointerId);
      if (this.enabled) {
        this.pressed.add(action);
        this.touchHeld.add(action);
        if (action === 'jump') this.jumpAssist = 16;
      }
      el.classList.add('down');
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        this.touchHeld.delete(action);
        el.classList.remove('down');
      }
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** A movement pad: the side of the pad under the finger picks the direction. */
  bindPad(el: HTMLElement, knob: HTMLElement): void {
    let id: number | null = null;
    const set = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const max = r.width / 2;
      const k = Math.max(-1, Math.min(1, dx / max));
      knob.style.transform = `translateX(${k * max * 0.55}px)`;
      this.touchHeld.delete('left');
      this.touchHeld.delete('right');
      if (!this.enabled) return;
      if (k < -0.18) this.touchHeld.add('left');
      else if (k > 0.18) this.touchHeld.add('right');
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.setMode('touch');
      id = e.pointerId;
      el.setPointerCapture?.(e.pointerId);
      el.classList.add('down');
      set(e);
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId === id) set(e);
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      knob.style.transform = '';
      el.classList.remove('down');
      this.touchHeld.delete('left');
      this.touchHeld.delete('right');
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
  }

  /** Reads the first connected gamepad (standard mapping). */
  pollGamepad(): void {
    const pads = navigator.getGamepads?.() ?? [];
    const gp = Array.from(pads).find((p) => p && p.connected);
    if (!gp) {this.padHeld.clear();this.padPrev.clear();return;}
    const b = (i: number) => !!gp.buttons[i]?.pressed;
    const ax = gp.axes[0] ?? 0;
    const now = new Set<string>();
    if (b(0)) now.add('jump');
    if (b(4)) now.add('dash');
    if (b(2) || b(3)) now.add('attack');
    if (b(1) || b(5) || b(7)) now.add('block');
    if (b(12)) now.add('interact');
    if (b(13)) now.add('swap');
    if (b(14) || ax < -0.4) now.add('left');
    if (b(15) || ax > 0.4) now.add('right');
    if (b(9)) now.add('start');
    if (now.size) this.setMode('gamepad');
    if (now.has('start') && !this.padPrev.has('start')) this.onPausePressed?.();
    this.padHeld.clear();
    if (this.enabled) {
      for (const a of now) {
        if (a === 'start') continue;
        this.padHeld.add(a as Action);
        if (!this.padPrev.has(a) && (a === 'jump' || a === 'attack' || a === 'block' || a === 'dash' || a === 'interact' || a === 'swap')) this.pressed.add(a);
      }
    }
    this.padPrev = now;
  }

  private held(a: Action): boolean {
    return this.keyHeld.has(a) || this.touchHeld.has(a) || this.padHeld.has(a);
  }

  /** Input for one simulation step; clears latched presses. */
  consume(): InputFrame {
    const f: InputFrame = {
      left: this.held('left'),
      right: this.held('right'),
      jumpHeld: this.held('jump') || this.pressed.has('jump') || this.jumpAssist > 0,
      blockHeld: this.held('block') || this.pressed.has('block'),
      jumpPressed: this.pressed.has('jump'),
      attackPressed: this.pressed.has('attack'),
      blockPressed: this.pressed.has('block'),
      dashPressed:this.pressed.has('dash'),
      interactPressed:this.pressed.has('interact'),
      swapPressed:this.pressed.has('swap'),
    };
    this.pressed.clear();
    if (this.jumpAssist > 0) this.jumpAssist--;
    return f;
  }

  releaseAll(): void {
    this.keyHeld.clear();
    this.touchHeld.clear();
    this.padHeld.clear();
    this.pressed.clear();
  }
}
