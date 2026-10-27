import { cleanJournal, type WeaponJournal } from './core/weapons';
import type { DifficultyId } from './core/config';
import { STAGES } from './core/levels';
import type { StageResult } from './core/stage';
import type { PlatformAdapter } from './platform/types';

export interface LevelRecord {
  score: number;
  lamps: number;
  time: number;
  challenging: boolean; // cleared on Challenging at least once
}

export interface SaveData {
  version: 2;
  run?: {level:number;layoutRevision?:string;encounter:number;score:number;motes:number;kills:number;time:number;deaths:number;collected:number[];difficulty:DifficultyId;levelState?:{keeper?:boolean;seal?:boolean;gate?:boolean;checkpoint?:{x:number;y:number}};weapons?:WeaponJournal};
  unlocked: number;
  best: Record<number, LevelRecord>;
  settings: { sfx: boolean; music: boolean; musicVolume?:number; reduceMotion?:boolean; difficulty: DifficultyId };
}

const defaults = (): SaveData => ({
  version: 2,
  unlocked: 0,
  best: {},
  settings: { sfx: true, music: true, musicVolume:.8, difficulty: 'gentle' },
});

/** Progress and settings, stored through the platform adapter. */
export class SaveStore {
  data = defaults();
  private writes:Promise<void>=Promise.resolve();
  constructor(private platform: PlatformAdapter) {}

  async load(): Promise<void> {
    try {
      const raw = await this.platform.load();
      if (!raw) return;
      const p = JSON.parse(raw) as Partial<SaveData>;
      const d = defaults();
      if (typeof p.unlocked === 'number') d.unlocked = Math.max(0, Math.min(STAGES.length - 1, Math.floor(p.unlocked)));
      if (p.best && typeof p.best === 'object') {
        for (const [k, v] of Object.entries(p.best)) {
          const i = Number(k);
          if (Number.isInteger(i) && i >= 0 && i < STAGES.length && v && typeof v.score === 'number') {
            d.best[i] = {
              score: v.score,
              lamps: Math.max(0, Math.min(3, v.lamps | 0)),
              time: typeof v.time === 'number' ? v.time : 0,
              challenging: !!v.challenging,
            };
          }
        }
      }
      const run=p.run;
      if(run&&Number.isInteger(run.level)&&run.level>=0&&run.level<=d.unlocked&&run.level<STAGES.length&&Number.isInteger(run.encounter)&&run.encounter>=0&&run.encounter<=STAGES[run.level].encounters.length&&[run.score,run.motes,run.kills,run.time,run.deaths].every(n=>Number.isFinite(n)&&n>=0)&&Array.isArray(run.collected)&&(run.difficulty==='gentle'||run.difficulty==='challenging')) d.run={...run,collected:run.collected.filter(n=>Number.isInteger(n)&&n>=0)};
      // An old checkpoint/collectible/reward index cannot be mapped to new geometry.
      // Reset only that attempt; campaign records and settings remain untouched.
      // The Archive build on main predates layoutRevision but already persisted
      // its distinctive objective/checkpoint contract. Preserve those same-map
      // saves; older surface-only builds did not contain this contract.
      const legacy=run?.levelState,cp=legacy?.checkpoint;
      if(d.run?.level===0&&d.run.layoutRevision===undefined&&
        typeof legacy?.keeper==='boolean'&&typeof legacy?.seal==='boolean'&&typeof legacy?.gate==='boolean'&&
        cp&&Number.isFinite(cp.x)&&Number.isFinite(cp.y)&&
        STAGES[0].ground.some(([a,b,y])=>cp.x>=a&&cp.x<b&&cp.y===y)){
        d.run.layoutRevision=STAGES[0].layoutRevision;
      }
      if(d.run&&d.run.layoutRevision!==STAGES[d.run.level].layoutRevision)delete d.run;
      if(d.run)d.run.weapons=cleanJournal(run?.weapons,d.run.level,STAGES[d.run.level].length);
      if (p.settings) {
        if(typeof p.settings.musicVolume==='number'&&Number.isFinite(p.settings.musicVolume))d.settings.musicVolume=Math.max(0,Math.min(1,p.settings.musicVolume));
        d.settings.reduceMotion=!!p.settings.reduceMotion;
        if (typeof p.settings.sfx === 'boolean') d.settings.sfx = p.settings.sfx;
        if (typeof p.settings.music === 'boolean') d.settings.music = p.settings.music;
        if (p.settings.difficulty === 'gentle' || p.settings.difficulty === 'challenging') d.settings.difficulty = p.settings.difficulty;
      }
      this.data = d;
    } catch {
      this.data = defaults();
    }
  }

  persist(): void {
    const raw=JSON.stringify(this.data);
    this.writes=this.writes.then(()=>this.platform.save(raw)).catch(()=>{});
  }

  async flush():Promise<void>{await this.writes;}

  /** Records a cleared level; returns true for a new best score. */
  record(r: StageResult): boolean {
    delete this.data.run;
    const prev = this.data.best[r.stageId];
    const newBest = !prev || r.score > prev.score;
    this.data.best[r.stageId] = {
      score: Math.max(r.score, prev?.score ?? 0),
      lamps: Math.max(r.lamps, prev?.lamps ?? 0),
      time: prev?.time ? Math.min(prev.time, r.time) : r.time,
      challenging: (prev?.challenging ?? false) || r.difficulty === 'challenging',
    };
    if (r.stageId + 1 < STAGES.length) this.data.unlocked = Math.max(this.data.unlocked, r.stageId + 1);
    this.persist();
    return newBest;
  }

  totalScore(): number {
    return Object.values(this.data.best).reduce((a, b) => a + b.score, 0);
  }

  totalLamps(): number {
    return Object.values(this.data.best).reduce((a, b) => a + b.lamps, 0);
  }
}
