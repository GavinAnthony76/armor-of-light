import type { Theme } from '../core/levels';

/**
 * All sound is synthesized with Web Audio: no files to download.
 * Music is generated live from a chord progression per level, with a
 * battle layer (drums, faster arpeggios) that swells during fights.
 * The AudioContext is created only after the first user gesture.
 */
export type Sfx =
  | 'swing' | 'hit' | 'hitHeavy' | 'kill' | 'block' | 'parry' | 'clang' | 'hurt' | 'jump' | 'land'
  | 'warn' | 'warnRed' | 'shoot' | 'boom' | 'pickup' | 'heal' | 'splash' | 'wave' | 'roar'
  | 'bossDown' | 'clear' | 'click' | 'death' | 'respawn' | 'gate' | 'sling';

interface Song {
  bpm: number;
  chords: number[][]; // MIDI notes, one chord per bar
  scale: number[]; // MIDI notes for melody
  pluck: OscillatorType;
}

const SONGS: Record<Theme | 'title', Song> = {
  title: { bpm: 70, chords: [[50, 57, 62, 66], [47, 54, 59, 62], [43, 50, 55, 59], [45, 52, 57, 61]], scale: [62, 64, 66, 69, 71, 74, 76, 78], pluck: 'triangle' },
  desert: { bpm: 84, chords: [[50, 54, 57, 62], [51, 55, 58, 63], [48, 51, 55, 60], [50, 54, 57, 62]], scale: [62, 63, 66, 67, 69, 70, 72, 74], pluck: 'triangle' },
  flood: { bpm: 72, chords: [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 60], [40, 47, 52, 56]], scale: [64, 67, 69, 72, 74, 76, 79, 81], pluck: 'sine' },
  garden: { bpm: 92, chords: [[48, 55, 60, 64], [47, 55, 59, 62], [45, 52, 57, 60], [41, 48, 53, 57]], scale: [67, 69, 71, 72, 74, 76, 79, 81], pluck: 'triangle' },
  mountain: {bpm:78,chords:[[50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64], [45, 52, 57, 61]],scale:[60,62,64,67,69,72,74,76],pluck:'triangle'},
  valley: {bpm:96,chords:[[43, 50, 55, 58], [39, 46, 51, 55], [41, 48, 53, 57], [38, 45, 50, 54]],scale:[60,62,64,67,69,72,74,76],pluck:'triangle'},
  city: {bpm:88,chords:[[45, 52, 57, 60], [44, 51, 56, 59], [41, 48, 53, 57], [40, 47, 52, 56]],scale:[60,62,64,67,69,72,74,76],pluck:'triangle'},
  river: {bpm:80,chords:[[48, 55, 60, 64], [43, 50, 55, 59], [45, 52, 57, 60], [41, 48, 53, 57]],scale:[60,62,64,67,69,72,74,76],pluck:'triangle'},
};

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private reverb!: ConvolverNode;
  private reverbSend!: GainNode;
  private noise!: AudioBuffer;
  private sfxOn = true;
  private musicOn = true;
  private musicVolume = .8;
  private hostAllowed = true;
  private hostSuspended = false;
  private song: Song | null = null;
  private songName = '';
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private intensity = 0;
  private targetIntensity = 0;
  private boss = false;
  private meter:AnalyserNode|null=null;
  private meterSamples:Float32Array<ArrayBuffer>|null=null;
  diagnostics():{state:string;musicOn:boolean;volume:number;hostAllowed:boolean;rms:number;steps:number} {
    if(this.ctx&&!this.meter){this.meter=this.ctx.createAnalyser();this.meter.fftSize=1024;this.musicBus.connect(this.meter);this.meterSamples=new Float32Array(1024);}
    let rms=0;if(this.meter&&this.meterSamples){this.meter.getFloatTimeDomainData(this.meterSamples);rms=Math.sqrt(this.meterSamples.reduce((sum,n)=>sum+n*n,0)/this.meterSamples.length);}
    return {state:this.ctx?.state??'locked',musicOn:this.musicOn,volume:this.musicVolume,hostAllowed:this.hostAllowed,rms,steps:this.step};
  }
  private lastPlay: Record<string, number> = {};

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  setSfx(on: boolean): void {
    this.sfxOn = on;
    this.applyGains();
  }

  setMusicVolume(v:number):void {this.musicVolume=Math.max(0,Math.min(1,v));this.applyGains();}

  setMusic(on: boolean): void {
    this.musicOn = on;
    this.applyGains();
  }

  setHostAllowed(on: boolean): void {
    this.hostAllowed = on;
    this.applyGains();
  }

  /** Call from a user gesture (tap, click, key). Safe to call often. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        const ctx = new Ctor();
        this.ctx = ctx;
        // Request resume synchronously inside the initiating gesture, before creating impulse buffers.
        if(ctx.state!=='running')void ctx.resume().catch(()=>{});
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.ratio.value = 4;
        this.master = ctx.createGain();
        this.master.connect(comp).connect(ctx.destination);
        this.sfxBus = ctx.createGain();
        this.musicBus = ctx.createGain();
        this.sfxBus.connect(this.master);
        this.musicBus.connect(this.master);
        this.reverb = ctx.createConvolver();
        this.reverb.buffer = this.makeImpulse(2.4);
        this.reverbSend = ctx.createGain();
        this.reverbSend.gain.value = 0.35;
        this.reverbSend.connect(this.reverb).connect(this.musicBus);
        this.noise = this.makeNoise();
        this.applyGains();
        if (this.songName) this.startScheduler();
      }
      if (this.ctx.state !== 'running' && this.ctx.state !== 'closed' && !this.hostSuspended) void this.ctx.resume().then(()=>{this.nextTime=this.ctx!.currentTime+.05;this.startScheduler();}).catch(() => {});
    } catch {
      this.ctx = null;
    }
  }

  suspend(): void {
    this.hostSuspended = true;
    if (this.ctx?.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    this.hostSuspended = false;
    if (this.ctx && this.ctx.state!=='closed')void this.ctx.resume().then(()=>{this.nextTime=this.ctx!.currentTime+.05;this.startScheduler();}).catch(()=>{});
  }

  private applyGains(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const host = this.hostAllowed ? 1 : 0;
    this.master.gain.setTargetAtTime(0.8 * host, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.sfxOn ? 0.72 : 0, t, 0.03);
    this.musicBus.gain.setTargetAtTime(this.musicOn ? this.musicVolume*1.15 : 0, t, 0.3);
  }

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  private makeImpulse(sec: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return b;
  }

  // ------------------------------------------------------------- music

  playMusic(name: Theme | 'title'): void {
    if (this.songName === name) return;
    this.songName = name;
    this.song = SONGS[name];
    this.step = 0;
    this.targetIntensity = 0;
    this.boss = false;
    if (this.ctx) {
      this.nextTime = this.ctx.currentTime + 0.1;
      this.startScheduler();
    }
  }

  stopMusic(): void {
    this.songName = '';
    this.song = null;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  /** 0 = exploring, ~0.7 = fighting, 1 = guardian battle. */
  setIntensity(v: number, boss = false): void {
    this.targetIntensity = v;
    this.boss = boss;
  }

  private startScheduler(): void {
    if (!this.ctx || this.timer !== null) return;
    this.nextTime = Math.max(this.nextTime, this.ctx.currentTime + 0.05);
    this.timer = window.setInterval(() => this.schedule(), 50);
  }

  private schedule(): void {
    const ctx = this.ctx;
    const song = this.song;
    if (!ctx || !song || this.hostSuspended) return;
    if (ctx.state !== 'running') {
      this.nextTime = ctx.currentTime + 0.05;
      return;
    }
    // Never replay minutes of expired notes after background timer throttling.
    if(this.nextTime<ctx.currentTime-.25)this.nextTime=ctx.currentTime+.05;
    const eighth = 60 / song.bpm / 2;
    while (this.nextTime < ctx.currentTime + 0.25) {
      this.intensity += (this.targetIntensity - this.intensity) * 0.06;
      this.playStep(song, this.step, this.nextTime, eighth);
      this.step++;
      this.nextTime += eighth;
    }
  }

  private playStep(song: Song, step: number, t: number, eighth: number): void {
    const bar = Math.floor(step / 8);
    const inBar = step % 8;
    const chord = song.chords[bar % song.chords.length];
    const I = this.intensity;
    const bus = this.musicBus;

    // pad: one long chord per bar
    if (inBar === 0) {
      for (const n of chord.slice(1)) this.pad(mtof(n), t, eighth * 8, 0.035 + I * 0.01);
      // bass
      this.note('triangle', mtof(chord[0] - 12), t, eighth * 3, 0.16, bus, 0.01);
    }
    if (inBar === 4) this.note('triangle', mtof(chord[0] - 12), t, eighth * 3, 0.12 + I * 0.05, bus, 0.01);

    // arpeggio: sparse when exploring, constant 8ths in battle
    const arpOn = I > 0.35 ? true : inBar % 2 === 0 && (inBar === 0 || Math.random() < 0.55);
    if (arpOn) {
      const pattern = [1, 2, 3, 2, 1, 3, 2, 3];
      const n = chord[pattern[inBar]] + (I > 0.35 && inBar % 4 === 3 ? 12 : 12);
      this.pluckNote(song.pluck, mtof(n), t, 0.05 + I * 0.025);
    }

    // a gentle bell melody while exploring
    if (I < 0.5 && (inBar === 2 || inBar === 6) && Math.random() < 0.5) {
      const n = song.scale[Math.floor(Math.random() * song.scale.length)];
      this.bell(mtof(n), t, 0.05 * (1 - I));
    }

    // battle drums
    if (I > 0.2) {
      const dv = (I - 0.2) / 0.8;
      if (inBar === 0 || inBar === 3 || inBar === 6 || (this.boss && inBar === 4)) this.drum(t, 0.5 * dv, this.boss ? 60 : 75);
      if (inBar % 2 === 1) this.shaker(t, 0.06 * dv);
      if (this.boss && inBar === 0) this.note('sawtooth', mtof(chord[0] - 24), t, eighth * 6, 0.07 * dv, bus, 0.05, 400);
    }
  }

  private pad(f: number, t: number, dur: number, vol: number): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1100;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.15);
    lp.connect(g);
    g.connect(this.musicBus);
    g.connect(this.reverbSend);
    for (const det of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur * 1.2);
    }
  }

  private pluckNote(type: OscillatorType, f: number, t: number, vol: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g);
    g.connect(this.musicBus);
    g.connect(this.reverbSend);
    o.start(t);
    o.stop(t + 0.4);
  }

  private bell(f: number, t: number, vol: number): void {
    const ctx = this.ctx!;
    for (const [mult, v] of [
      [1, 1],
      [2.76, 0.3],
      [5.4, 0.12],
    ]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f * mult;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8 / mult);
      o.connect(g);
      g.connect(this.musicBus);
      g.connect(this.reverbSend);
      o.start(t);
      o.stop(t + 2);
    }
  }

  private drum(t: number, vol: number, f = 75): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(f * 1.8, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.4);
    this.noiseBurst(t, 0.05, vol * 0.25, 1200, 'bandpass', this.musicBus);
  }

  private shaker(t: number, vol: number): void {
    this.noiseBurst(t, 0.05, vol, 7000, 'highpass', this.musicBus);
  }

  // ----------------------------------------------------------- effects

  private note(type: OscillatorType, f: number, t: number, dur: number, vol: number, bus: AudioNode, attack = 0.005, lp = 0, f1 = 0): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let src: AudioNode = o;
    if (lp) {
      const f2 = ctx.createBiquadFilter();
      f2.type = 'lowpass';
      f2.frequency.value = lp;
      o.connect(f2);
      src = f2;
    }
    src.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noiseBurst(t: number, dur: number, vol: number, freq: number, type: BiquadFilterType, bus: AudioNode, q = 1, sweepTo = 0): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  play(name: Sfx, k = 0): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.sfxOn || !this.hostAllowed) return;
    const t = ctx.currentTime;
    // avoid machine-gun stacking of identical sounds
    const last = this.lastPlay[name] ?? -1;
    if (t - last < 0.03) return;
    this.lastPlay[name] = t;
    const b = this.sfxBus;
    switch (name) {
      case 'sling':
        this.note('triangle',480+k*100,t,.14,.18,b,.002,0,160);
        this.noiseBurst(t,.07,.2,2600,'bandpass',b,1.1);
        break;
      case 'swing':
        this.noiseBurst(t, 0.16, 0.35, 900 + k * 300, 'bandpass', b, 1.4, 3200 + k * 500);
        break;
      case 'hit':
        this.note('sine', 180, t, 0.12, 0.5, b, 0.002, 0, 70);
        this.noiseBurst(t, 0.08, 0.35, 2500, 'bandpass', b, 0.8);
        this.note('triangle', 880, t, 0.08, 0.12, b);
        break;
      case 'hitHeavy':
        this.note('sine', 140, t, 0.22, 0.7, b, 0.002, 0, 45);
        this.noiseBurst(t, 0.15, 0.45, 1600, 'bandpass', b, 0.7);
        this.note('triangle', 660, t, 0.15, 0.15, b);
        break;
      case 'kill':
        [0, 4, 7, 12].forEach((s, i) => this.note('sine', mtof(76 + s), t + i * 0.05, 0.5, 0.1, b));
        this.noiseBurst(t, 0.6, 0.12, 3000, 'highpass', b, 0.5, 9000);
        break;
      case 'block':
        for (const f of [520, 1310, 2240]) this.note('square', f, t, 0.18, 0.06, b, 0.001, 3000);
        this.noiseBurst(t, 0.06, 0.3, 3500, 'bandpass', b);
        break;
      case 'parry':
        for (const [f, v] of [
          [1046, 0.18],
          [1568, 0.12],
          [2093, 0.08],
        ])
          this.note('sine', f, t, 0.9, v, b, 0.002);
        this.noiseBurst(t, 0.25, 0.3, 6000, 'highpass', b);
        this.note('sine', 220, t, 0.2, 0.3, b, 0.002, 0, 90);
        break;
      case 'clang':
        for (const f of [330, 870]) this.note('square', f, t, 0.12, 0.06, b, 0.001, 1800);
        break;
      case 'hurt':
        this.note('sine', 220, t, 0.3, 0.5, b, 0.002, 0, 80);
        this.noiseBurst(t, 0.15, 0.25, 600, 'lowpass', b);
        break;
      case 'jump':
        this.noiseBurst(t, 0.1, 0.12, 1200, 'bandpass', b, 1, 2400);
        break;
      case 'land':
        this.noiseBurst(t, 0.1, 0.18 + k * 0.2, 500, 'lowpass', b);
        break;
      case 'warn':
        this.note('sine', 880, t, 0.25, 0.06, b, 0.01, 0, 1320);
        break;
      case 'warnRed':
        this.note('sawtooth', 110, t, 0.5, 0.12, b, 0.05, 700, 160);
        break;
      case 'shoot':
        this.note('sawtooth', 300, t, 0.3, 0.1, b, 0.01, 900, 120);
        break;
      case 'boom':
        this.note('sine', 90, t, 0.6, 0.8, b, 0.002, 0, 35);
        this.noiseBurst(t, 0.5, 0.5, 400, 'lowpass', b);
        break;
      case 'pickup':
        this.note('sine', mtof(84 + (k % 5) * 2), t, 0.25, 0.08, b, 0.002);
        break;
      case 'heal':
        [0, 4, 7, 12, 16].forEach((s, i) => this.note('triangle', mtof(72 + s), t + i * 0.06, 0.4, 0.09, b));
        break;
      case 'splash':
        this.noiseBurst(t, 0.5, 0.45, 900, 'lowpass', b, 0.7, 300);
        break;
      case 'wave':
        this.note('sawtooth', 147, t, 0.8, 0.08, b, 0.15, 900);
        this.note('sawtooth', 220, t, 0.8, 0.06, b, 0.15, 900);
        break;
      case 'roar':
        this.note('sawtooth', 70, t, 1.4, 0.3, b, 0.2, 500, 50);
        this.noiseBurst(t, 1.2, 0.25, 300, 'bandpass', b, 0.6);
        break;
      case 'bossDown':
        [48, 55, 60, 64, 67, 72].forEach((m, i) => this.note('triangle', mtof(m), t + i * 0.08, 2.2, 0.1, b, 0.02));
        this.noiseBurst(t, 1.5, 0.2, 5000, 'highpass', b, 0.5, 12000);
        break;
      case 'clear':
        [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => this.note('triangle', mtof(m), t + i * 0.1, 1.4, 0.1, b));
        break;
      case 'click':
        this.note('sine', 900, t, 0.06, 0.12, b);
        break;
      case 'death':
        [67, 64, 60, 55].forEach((m, i) => this.note('sine', mtof(m), t + i * 0.18, 0.6, 0.12, b));
        break;
      case 'respawn':
        [55, 60, 64, 67, 72].forEach((m, i) => this.note('sine', mtof(m), t + i * 0.05, 0.6, 0.08, b));
        break;
      case 'gate':
        this.note('sine', 60, t, 2.0, 0.3, b, 0.3, 0, 40);
        [60, 67, 72, 76].forEach((m, i) => this.note('sine', mtof(m), t + 0.3 + i * 0.15, 2.0, 0.08, b, 0.05));
        break;
    }
  }
}
