import { ROMAN, WEAPONS } from '../core/weapons';
import type { Stage } from '../core/stage';
import type { InputMode } from '../input';
import { drawWeapon } from '../render/weapons';
import {CHAPTERS} from '../story';
import { asset } from '../assets';
import { DIFFICULTIES, DifficultyId } from '../core/config';
import { STAGES } from '../core/levels';
import type { StageResult } from '../core/stage';
import type { Layout } from '../render/renderer';
import type { SaveData } from '../save';
import { ICON } from './icons';

export interface UIHandlers {
  play(level: number): void;
  pause(): void;
  resume(): void;
  restart(): void;
  levels(): void;
  home(): void;
  next(): void;
  setDifficulty(d: DifficultyId): void;
  toggleSfx(): void;
  toggleMusic(): void;
  setMusicVolume(v:number):void;
  toggleMotion(): void;
  click(): void;
}

export type Screen = 'title' | 'levels' | 'help' | 'hud' | 'pause' | 'results';

const lampsHtml = (n: number, cls = '') =>
  `<span class="lamps ${cls}" aria-label="${n} of 3 lamps">${[0, 1, 2]
    .map((i) => `<span class="lamp ${i < n ? 'on' : ''}" style="--i:${i}">${ICON.lamp}</span>`)
    .join('')}</span>`;

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** All menus and the touch controls are DOM over the canvas. */
export class UI {
  current: Screen | 'none' = 'none';
  private screens: Record<Screen, HTMLElement>;
  readonly touch: HTMLElement;
  private keyboardMode = false;

  constructor(
    private root: HTMLElement,
    private h: UIHandlers,
  ) {
    root.innerHTML = `
      <section class="screen title" data-screen="title">
        <div class="brand">
          <p class="eyebrow">Seven lands · A journey of courage and restoration</p>
          <h1>Armor<span>of</span>Light</h1>
          <p class="tag">Eliam · Keeper of the Ember</p>
        </div>
        <div class="menu">
          <button class="btn big primary" data-act="continue">${ICON.play}<span data-ref="playLabel">Begin</span></button>
          <button class="btn" data-act="levels">${ICON.levels}<span>Levels</span></button>
        </div>
        <div class="difficulty" role="radiogroup" aria-label="Difficulty">
          <button class="seg" role="radio" data-diff="gentle">Gentle</button>
          <button class="seg" role="radio" data-diff="challenging">Challenging</button>
        </div>
        <p class="diff-blurb" data-ref="diffBlurb"></p>
        <div class="row">
          <button class="btn icon" data-act="sfx" aria-label="Sound effects"></button>
          <button class="btn icon" data-act="music" aria-label="Music">${ICON.music}</button><label class="music-volume">Music <input aria-label="Music volume" data-volume type="range" min="0" max="100" step="5" value="80"></label>
          <button class="btn" data-act="motion" aria-pressed="false">Reduce motion</button><button class="btn icon" data-act="help" aria-label="How to play">${ICON.help}</button>
        </div>
      </section>

      <section class="screen levels" data-screen="levels">
        <header class="bar">
          <button class="btn icon" data-act="home" aria-label="Back">${ICON.back}</button>
          <h2>Choose a land</h2>
          <span class="chip" data-ref="lampTotal"></span>
        </header>
        <div class="cards scrollable" data-ref="cards"></div>
      </section>

      <section class="screen help" data-screen="help">
        <div class="card wide scrollable">
          <h2>How to play</h2>
          <p>Seven fictional lands inspired by Scripture. Gameplay and animated characters are built on Claude’s original design; campaign expansion and illustrated environments are integrated in this edition. Original procedural music; no third-party recorded songs.</p><div class="help-grid">
            <div><h3>Keyboard</h3>
              <p><kbd>←</kbd><kbd>→</kbd> or <kbd>A</kbd><kbd>D</kbd> walk</p>
              <p><kbd>Space</kbd> or <kbd>W</kbd> jump · press again for a double jump</p>
              <p><kbd>J</kbd> or <kbd>X</kbd> strike</p>
              <p>Hold <kbd>K</kbd> or <kbd>C</kbd> to block</p>
              <p><kbd>L</kbd> or <kbd>V</kbd> dash. Jump against a wall to kick away.</p><p><kbd>E</kbd> pick up · <kbd>Q</kbd> swap weapon</p><p><kbd>Esc</kbd> pause</p></div>
            <div><h3>Touch</h3>
              <p>Slide on the left pad to walk</p>
              <p><b>Strike</b>, <b>Jump</b> and <b>Shield</b> buttons on the right</p>
              <h3>Controller</h3>
              <p>Stick walks · A jump · X strike · B block · Y pick up · LT swap · LB dash</p></div>
          </div>
          <p class="equipment-rules">Your Ember Hammer is always yours. Weapons stay where enemies drop them: press E / Y or tap PICK UP near one. Copies forge ranks I–III. Retry and Continue keep equipment; Restart or entering another land clears the alternate slot.</p>
          <div class="warn-key">
            <p><span class="w gold"></span><b>Gold warning:</b> block it. Block right as it flashes to <b>parry</b>, which stuns the foe.</p>
            <p><span class="w red"></span><b>Red warning:</b> it can’t be blocked. Jump or move away.</p>
          </div>
          <button class="btn primary" data-act="home">${ICON.back}<span>Back</span></button>
        </div>
      </section>

      <section class="screen hud" data-screen="hud">
        <div class="equipment-hud" data-ref="equipment"><canvas data-ref="weaponIcon" width="68" height="68" aria-hidden="true"></canvas><div><strong data-ref="weaponName"></strong><small data-ref="weaponSlots"></small></div></div>
        <div class="weapon-prompt" data-ref="weaponPrompt" role="status" hidden><strong data-ref="dropName"></strong><span data-ref="dropBenefit"></span><b data-ref="dropAction"></b></div>
        <span class="audio-hint" data-ref="audioHint"></span>
        <button class="btn icon hud-btn" data-act="pause" aria-label="Pause">${ICON.pause}</button>
      </section>

      <section class="screen modal" data-screen="pause">
        <div class="card">
          <h2>Paused</h2>
          <p class="card-sub" data-ref="pauseSub"></p><small class="equipment-rules">Continue keeps equipment. Restart or a new land resets the alternate; your hammer stays.</small>
          <button class="btn big primary" data-act="resume">${ICON.play}<span>Resume</span></button>
          <button class="btn" data-act="restart">${ICON.retry}<span>Restart level</span></button>
          <button class="btn" data-act="levels">${ICON.levels}<span>Levels</span></button>
          <div class="row">
            <button class="btn icon" data-act="sfx" aria-label="Sound effects"></button>
            <button class="btn icon" data-act="music" aria-label="Music">${ICON.music}</button><label class="music-volume">Music <input aria-label="Music volume" data-volume type="range" min="0" max="100" step="5" value="80"></label>
          </div>
        </div>
      </section>

      <section class="screen modal" data-screen="results">
        <div class="card results">
          <p class="card-sub" data-ref="resLevel"></p>
          <h2 data-ref="resTitle">Level complete</h2>
          <div data-ref="resLamps"></div>
          <dl class="stats">
            <div><dt>Score</dt><dd data-ref="resScore"></dd></div>
            <div><dt>Time</dt><dd data-ref="resTime"></dd></div>
            <div><dt>Light gathered</dt><dd data-ref="resMotes"></dd></div>
            <div><dt>Retries</dt><dd data-ref="resDeaths"></dd></div>
          </dl>
          <p class="badge" data-ref="resBadge">New best!</p>
          <p class="ending" data-ref="resEnding"></p>
          <button class="btn big primary" data-act="next" data-ref="nextBtn">${ICON.next}<span>Next land</span></button>
          <button class="btn" data-act="restart" data-ref="replayBtn">${ICON.retry}<span>Play again</span></button>
          <button class="btn" data-act="levels">${ICON.levels}<span>Levels</span></button>
        </div>
      </section>

      <div class="touch" data-ref="touch" aria-hidden="true">
        <div class="pad" data-ref="pad"><span class="arrow l">◀</span><span class="knob" data-ref="knob"></span><span class="arrow r">▶</span></div>
        <div class="equipment-buttons"><button class="tbtn interact" data-ref="tInteract" tabindex="-1">Pick up</button><button class="tbtn swap" data-ref="tSwap" tabindex="-1">Swap</button></div>
        <div class="buttons">
          <button class="tbtn dash" data-ref="tDash" tabindex="-1">${ICON.dash}<span>Dash</span></button><button class="tbtn block" data-ref="tBlock" tabindex="-1">${ICON.shield}<span>Shield</span></button>
          <button class="tbtn jump" data-ref="tJump" tabindex="-1">${ICON.jump}<span>Jump</span></button>
          <button class="tbtn attack" data-ref="tAttack" tabindex="-1">${ICON.hammer}<span>Strike</span></button>
        </div>
      </div>
    `;
    root.querySelectorAll<HTMLInputElement>('[data-volume]').forEach(el=>el.addEventListener('input',()=>this.h.setMusicVolume(Number(el.value)/100)));
    const q = (s: string) => root.querySelector(`[data-screen="${s}"]`) as HTMLElement;
    this.screens = { title: q('title'), levels: q('levels'), help: q('help'), hud: q('hud'), pause: q('pause'), results: q('results') };
    this.touch = this.ref('touch');

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' || e.key.startsWith('Arrow') || e.key === 'Enter') this.keyboardMode = true;
    });
    window.addEventListener('pointerdown', () => (this.keyboardMode = false));

    root.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('button');
      if (!btn || btn.disabled || btn.classList.contains('tbtn')) return;
      this.h.click();
      if (btn.dataset.level !== undefined) return this.h.play(Number(btn.dataset.level));
      if (btn.dataset.diff) return this.h.setDifficulty(btn.dataset.diff as DifficultyId);
      switch (btn.dataset.act) {
        case 'continue':
          return this.h.play(Number(btn.dataset.target ?? 0));
        case 'motion': return this.h.toggleMotion();
        case 'levels':
          return this.h.levels();
        case 'home':
          return this.h.home();
        case 'help':
          return this.show('help');
        case 'pause':
          return this.h.pause();
        case 'resume':
          return this.h.resume();
        case 'restart':
          return this.h.restart();
        case 'next':
          return this.h.next();
        case 'sfx':
          return this.h.toggleSfx();
        case 'music':
          return this.h.toggleMusic();
      }
    });
  }

  ref<T extends HTMLElement = HTMLElement>(name: string): T {
    return this.root.querySelector(`[data-ref="${name}"]`) as T;
  }

  show(screen: Screen | 'none'): void {
    this.current = screen;
    for (const [name, el] of Object.entries(this.screens)) {
      const on = name === screen || (name === 'hud' && (screen === 'pause' || screen === 'results'));
      el.classList.toggle('active', on);
      el.toggleAttribute('inert', !on || (name === 'hud' && screen !== 'hud'));
    }
    this.root.classList.toggle('playing', screen === 'hud');
    this.touch.setAttribute('aria-hidden',String(!(screen==='hud'&&this.root.classList.contains('touch-on'))));
    if (screen !== 'none' && screen !== 'hud' && this.keyboardMode) {
      const first = this.screens[screen].querySelector('button');
      if (first) requestAnimationFrame(() => (first as HTMLButtonElement).focus({ preventScroll: true }));
    }
  }

  setSettings(s: SaveData['settings']): void {
    this.root.querySelectorAll<HTMLInputElement>('[data-volume]').forEach(el=>el.value=String(Math.round((s.musicVolume??.8)*100)));
    this.root.querySelectorAll<HTMLButtonElement>('[data-act="sfx"]').forEach((b) => {
      b.innerHTML = s.sfx ? ICON.sound : ICON.soundOff;
      b.setAttribute('aria-pressed', String(s.sfx));
      b.setAttribute('aria-label', s.sfx ? 'Sound effects on' : 'Sound effects off');
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-act="music"]').forEach((b) => {
      b.classList.toggle('off', !s.music);
      b.setAttribute('aria-pressed', String(s.music));
      b.setAttribute('aria-label', s.music ? 'Music on' : 'Music off');
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-diff]').forEach((b) => {
      const on = b.dataset.diff === s.difficulty;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
    this.root.querySelectorAll('[data-act="motion"]').forEach(b=>b.setAttribute('aria-pressed',String(!!s.reduceMotion)));
    this.ref('diffBlurb').textContent = DIFFICULTIES[s.difficulty].blurb;
  }

  private weaponStamp='';
  updateEquipment(s:Stage,mode:InputMode,audioReady:boolean,musicOn:boolean):void {
    const p=s.player,w=WEAPONS[p.weaponId],eq=p.equipment;
    const swap=mode==='keyboard'?'Q swap':mode==='gamepad'?'LT swap':'SWAP';
    const pickup=mode==='keyboard'?'E':mode==='gamepad'?'Y':'PICK UP';
    const stamp=`${p.weaponId}${p.weaponRank}${eq.alternate?.id}${eq.alternate?.rank}${mode}`;
    if(stamp!==this.weaponStamp){
      this.weaponStamp=stamp;
      this.ref('weaponName').textContent=`${w.name} ${ROMAN[p.weaponRank]}`;
      this.ref('weaponSlots').textContent=eq.alternate?`${swap} · ${p.weaponId==='hammer'?WEAPONS[eq.alternate.id].name+' '+ROMAN[eq.alternate.rank]:'Ember Hammer'} ready`:'Hammer kept · alternate empty';
      const c=this.ref<HTMLCanvasElement>('weaponIcon'),ctx=c.getContext('2d')!;ctx.clearRect(0,0,68,68);ctx.save();ctx.translate(18,54);ctx.scale(.76,.76);drawWeapon(ctx,p.weaponId,p.weaponRank,{x:0,y:0},2.65,0);ctx.restore();
    }
    const d=s.nearbyWeapon(),prompt=this.ref('weaponPrompt');prompt.hidden=!d;
    this.ref<HTMLButtonElement>('tInteract').disabled=!d;
    this.ref<HTMLButtonElement>('tSwap').disabled=!eq.alternate;
    if(d){
      const max=eq.alternate?.id===d.weapon&&eq.alternate.rank===3;
      const upgrade=eq.alternate?.id===d.weapon;
      this.ref('dropName').textContent=`${WEAPONS[d.weapon].name} · ${ROMAN[upgrade?Math.min(3,(eq.alternate?.rank??1)+1):d.rank]}`;
      this.ref('dropBenefit').textContent=WEAPONS[d.weapon].benefit;
      this.ref('dropAction').textContent=max?'Maximum rank III · leave this copy':`${pickup} · ${upgrade?'Forge upgrade':'Equip'}  /  walk on to leave`;
    }
    this.ref('audioHint').textContent=!musicOn?'Music off · change in Pause':!audioReady?'Tap or press a key for audio':'';
  }

  setLayout(l: Layout): void {
    const st = this.root.style;
    st.setProperty('--gx', `${l.ox}px`);
    st.setProperty('--gy', `${l.oy}px`);
    st.setProperty('--gw', `${l.viewW * l.scale}px`);
    st.setProperty('--gh', `${540 * l.scale}px`);
    st.setProperty('--u', `${l.scale}px`);
    this.root.classList.toggle('portrait', l.portrait);
  }

  showTouch(on: boolean): void {
    this.root.classList.toggle('touch-on', on);
    this.touch.setAttribute('aria-hidden',String(!(on&&this.current==='hud')));
  }

  showTitle(save: SaveData): void {
    const target = Math.min(save.run?.level ?? save.unlocked, STAGES.length - 1);
    const b = this.root.querySelector<HTMLButtonElement>('[data-act="continue"]')!;
    b.dataset.target = String(target);
    this.ref('playLabel').textContent = (save.run||target > 0) ? `Continue: ${STAGES[target].name}` : 'Begin the journey';
    this.setSettings(save.settings);
    this.show('title');
  }

  showLevels(save: SaveData, lamps: number): void {
    this.ref('lampTotal').innerHTML = `${ICON.lamp}<span>${lamps} / ${STAGES.length * 3}</span>`;
    this.ref('cards').innerHTML = STAGES.map((def, i) => {
      const locked = i > save.unlocked;
      const rec = save.best[i];
      return `<button class="level-card ${locked ? 'locked' : ''}" ${locked ? 'disabled' : `data-level="${i}"`} aria-label="${locked ? `Level ${i + 1} locked` : `Play level ${i + 1}: ${def.name}`}">
        <span class="art" style="background:linear-gradient(0deg,#100b1870,#100b1800),url('${asset(def.background)}') center/cover"><span class="num">${locked ? ICON.lock : i + 1}</span></span>
        <span class="info">
          <span class="lname">${def.name}</span>
          <span class="lsub">${def.subtitle}</span>
          <span class="lmeta">${lampsHtml(rec?.lamps ?? 0, 'small')}${rec ? `<span class="best">Best ${rec.score.toLocaleString()}</span>` : locked ? '<span class="best">Clear the land before</span>' : '<span class="best">Not yet cleared</span>'}</span>
        </span>
      </button>`;
    }).join('');
    this.show('levels');
  }

  showPause(diff: DifficultyId, level: number): void {
    this.ref('pauseSub').textContent = `${STAGES[level].name} · ${DIFFICULTIES[diff].label}`;
    this.show('pause');
  }

  showResults(r: StageResult, newBest: boolean, hasNext: boolean, totalMotes: number): void {
    const def = STAGES[r.stageId];
    this.ref('resLevel').textContent = `Level ${r.stageId + 1} · ${def.name} · ${DIFFICULTIES[r.difficulty].label}`;
    this.ref('resTitle').textContent = !hasNext ? 'A new morning' : ['Well done', 'Bravely done', 'Shining victory'][r.lamps - 1];
    this.ref('resLamps').innerHTML = lampsHtml(r.lamps, 'big animate');
    this.ref('resScore').textContent = r.score.toLocaleString();
    this.ref('resTime').textContent = fmtTime(r.time);
    this.ref('resMotes').textContent = `${r.motes} / ${totalMotes}`;
    this.ref('resDeaths').textContent = String(r.deaths);
    this.ref('resBadge').hidden = !newBest;
    const ending = this.ref('resEnding');
    ending.hidden = false;
    ending.textContent = CHAPTERS[r.stageId].aftermath;
    this.ref('nextBtn').hidden = !hasNext;
    this.ref('replayBtn').classList.toggle('primary', !hasNext);
    this.show('results');
  }
}
