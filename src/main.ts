import {CHAPTERS} from './story';
import { asset } from './assets';
import './polyfill';
import './style.css';
import { AudioEngine } from './audio/audio';
import { STAGES } from './core/levels';
import type { StageResult } from './core/stage';
import { Game } from './game';
import { Input } from './input';
import { WebPlatform } from './platform/web';
import { YouTubePlatform } from './platform/youtube';
import type { PlatformAdapter } from './platform/types';
import { Renderer } from './render/renderer';
import { SaveStore } from './save';
import { UI } from './ui/ui';

type AppState = 'menu' | 'playing' | 'paused' | 'results';

async function boot(): Promise<void> {
  // Swap this for another adapter (e.g. YouTubePlatform) to target a host.
  const platform: PlatformAdapter = new URLSearchParams(location.search).has('youtube') ? new YouTubePlatform() : new WebPlatform();
  await platform.init();
  const save = new SaveStore(platform);
  await save.load();

  const params = new URLSearchParams(location.search);
  const audio = new AudioEngine();
  const input = new Input();
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const renderer = new Renderer(canvas);
  const game = new Game(audio, input);
  let state: AppState = 'menu';

  const applySettings = () => {
    game.reduceMotion=!!save.data.settings.reduceMotion;
    audio.setSfx(save.data.settings.sfx);
    audio.setMusic(save.data.settings.music);
    audio.setMusicVolume(save.data.settings.musicVolume??.8);
    ui.setSettings(save.data.settings);
  };

  const ui = new UI(document.getElementById('ui')!, {
    play: (i, resumeRun = false) => startLevel(i, resumeRun),
    pause: () => pause(),
    resume: () => resume(),
    restart: () => {delete save.data.run;save.persist();startLevel(game.level);},
    levels: () => toMenu('levels'),
    home: () => toMenu('title'),
    next: () => startLevel(Math.min(game.level + 1, STAGES.length - 1)),
    setDifficulty: (d) => {
      save.data.settings.difficulty = d;
      save.persist();
      applySettings();
    },
    toggleSfx: () => {
      save.data.settings.sfx = !save.data.settings.sfx;
      save.persist();
      applySettings();
    },
    toggleMotion: () => {save.data.settings.reduceMotion=!save.data.settings.reduceMotion;save.persist();applySettings();},
    setMusicVolume: (v) => {save.data.settings.musicVolume=v;save.persist();applySettings();},
    toggleMusic: () => {
      save.data.settings.music = !save.data.settings.music;
      save.persist();
      applySettings();
    },
    click: () => audio.play('click'),
  });
  applySettings();
  audio.setHostAllowed(platform.isAudioAllowed());
  platform.onAudioAllowedChange((on) => audio.setHostAllowed(on));

  input.bindPad(ui.ref('pad'), ui.ref('knob'));
  input.bindButton(ui.ref('tAttack'), 'attack');
  input.bindButton(ui.ref('tJump'), 'jump');
  input.bindButton(ui.ref('tBlock'), 'block');
  input.bindButton(ui.ref('tDash'),'dash');
  input.bindButton(ui.ref('tInteract'),'interact');
  input.bindButton(ui.ref('tSwap'),'swap');
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  if (coarse || params.has('touch')) input.setMode('touch');
  input.onModeChange = (m) => ui.showTouch(m === 'touch');
  ui.showTouch(input.mode === 'touch');
  input.onPausePressed = () => {
    if (state === 'playing') pause();
    else if (state === 'paused') resume();
  };

  // ---------------------------------------------------------- flow

  function startLevel(i: number, resumeRun = false): void {
    if(!Number.isInteger(i)||i<0||i>=STAGES.length||(!params.has('debug')&&i>save.data.unlocked)) return;
    if(!params.has('debug') && !document.body.dataset.chapterAccepted){
      input.enabled=false; input.releaseAll(); game.paused=true;
      const def=STAGES[i], story=CHAPTERS[i], panel=document.createElement('dialog');
      panel.className='chapter-dialog scrollable';
      panel.innerHTML=`<div class="chapter-art" style="background-image:url('${asset(def.background)}')"></div><div class="chapter-copy"><p class="eyebrow">LAND ${i+1} OF ${STAGES.length} · ${def.inspiration}</p><h2>${story.title}</h2><p class="chapter-land">${def.name} · Eliam, Keeper of the Ember</p><div class="story-beat"><span id="story-speaker"></span><p id="story-line"></p><small id="story-page"></small></div><blockquote>“${def.verse.text}”<small>${def.verse.ref}</small></blockquote><div class="guardian-preview"><img src="${asset(def.bossArt)}" alt="Guardian concept art"><span>Guardian ahead<br><strong>${def.encounters[def.encounters.length-1].waves[0][0].kind==='king'?'The Hollow King':def.name==='The Garden Gates'?'Thorn Sentinel':['Dune Warden','Tide Serpent','Thorn Sentinel','Storm Watcher','Iron Colossus','Keeper of Shadows','Hollow King'][i]}</strong></span></div><p class="chapter-note">The Ember Hammer stays with Eliam. Optional weapons forge through ranks I–III in this land. Retry and Continue keep them; Restart and the next land reset them.</p><p class="chapter-note">A fictional adventure inspired by biblical themes.</p><button class="btn" id="story-next">Continue story →</button><button class="btn primary" id="chapter-enter">Enter this land →</button><button class="btn" id="chapter-back">Back</button></div>`;
      let beat=0;
      const showBeat=()=>{panel.querySelector('#story-speaker')!.textContent=story.beats[beat].speaker;panel.querySelector('#story-line')!.textContent=story.beats[beat].text;panel.querySelector('#story-page')!.textContent=`${beat+1} / ${story.beats.length}`;(panel.querySelector('#story-next') as HTMLButtonElement).hidden=beat===story.beats.length-1;};
      panel.querySelector('#story-next')!.addEventListener('click',()=>{beat=Math.min(story.beats.length-1,beat+1);showBeat();});
      showBeat();document.body.append(panel); panel.showModal();
      const close=()=>{panel.close();panel.remove();game.paused=false;};
       panel.querySelector('#chapter-enter')!.addEventListener('click',()=>{close();document.body.dataset.chapterAccepted='1';startLevel(i,resumeRun);delete document.body.dataset.chapterAccepted;});
      panel.querySelector('#chapter-back')!.addEventListener('click',()=>{close();toMenu('levels');});
      panel.addEventListener('cancel',()=>{close();toMenu('levels');});
      return;
    }
    if (!resumeRun && !params.has('debug')) {
      delete save.data.run;
      save.persist();
    }
    game.start(i, save.data.settings.difficulty, { autoplay: params.has('autoplay') });
    const run=save.data.run,s=game.stage!;
    if(resumeRun&&run?.level===i&&run.difficulty===save.data.settings.difficulty){
      s.nextEncounter=run.encounter;s.score=run.score;s.motes=run.motes;s.kills=run.kills;s.time=run.time;s.deaths=run.deaths;
      s.pickups.forEach((p,n)=>{if(run.collected.includes(n))p.taken=true;});
      s.restoreWeaponState(run.weaponState);
      const next=s.def.encounters[run.encounter];
      const x=next?(next.checkpoint??next.arena[0]+70):s.def.encounters[s.def.encounters.length-1].arena[1]+30;
      s.player.x=x;s.player.y=s.terrain.groundAt(x)??450;s.player.lastSafe={x,y:s.player.y};s.checkpoint={x,y:s.player.y};
      if(!next){s.pathOpen=true;for(const g of s.def.afterBoss??[])s.terrain.ground.push({x0:g[0],x1:g[1],y:g[2]});}
      s.restoreWeapons(run.weapons);
      game.camX=Math.max(0,x-game.viewW*.35);
    }
    s.prevPlayerX=s.player.x;s.prevPlayerY=s.player.y;
    lastSavedEncounter=-1;lastEquipmentRevision=-1;
    state = 'playing';
    input.enabled = true;
    input.releaseAll();
    ui.show('hud');
  }

  function toMenu(which: 'title' | 'levels'): void {
    state = 'menu';
    audio.resume();
    input.enabled = false;
    input.releaseAll();
    if (!game.demo || !game.stage) game.start(0, 'gentle', { demo: true });
    audio.playMusic('title');
    audio.setIntensity(0);
    if (which === 'title') ui.showTitle(save.data);
    else ui.showLevels(save.data, save.totalLamps());
  }

  function pause(): void {
    if (state !== 'playing') return;
    persistRun(true);
    state = 'paused';
    game.paused = true;
    input.enabled = false;
    input.releaseAll();
    audio.suspend();
    ui.showPause(save.data.settings.difficulty, game.level);
  }

  function resume(): void {
    if (state !== 'paused') return;
    state = 'playing';
    game.paused = false;
    input.enabled = true;
    audio.resume(); // resuming is a user gesture, so sound may start again
    audio.unlock();
    ui.show('hud');
  }

  game.onFinish = (r: StageResult) => {
    const newBest = save.record(r);
    platform.submitScore(save.totalScore());
    state = 'results';
    input.enabled = false;
    ui.showResults(r, newBest, r.stageId + 1 < STAGES.length, game.stage?.totalMotes ?? 0);
  };

  // ---------------------------------------------------------- browser

  let lastSavedEncounter=-1;
  let lastSavedWeaponRevision=-1;
  let lastSavedDeaths=-1;
  let lastRunSaveAt=0;
  function persistRun(force = false): void {
    const s=game.stage;
    if(state!=='playing'||!s||game.demo||params.has('debug')) return;
    const periodic=performance.now()-lastRunSaveAt>=1500;
    if(!force&&!periodic&&s.nextEncounter===lastSavedEncounter&&s.weaponRevision===lastSavedWeaponRevision&&s.deaths===lastSavedDeaths)return;
    save.data.run={
      level:game.level,
      encounter:s.nextEncounter,
      score:s.score,
      motes:s.motes,
      kills:s.kills,
      time:s.time,
      deaths:s.deaths,
      collected:s.pickups.map((p,n)=>p.placed&&p.taken?n:-1).filter(n=>n>=0),
      difficulty:s.diff.id,
      weaponState:s.saveWeaponState(),
    };
    save.persist();
    lastSavedEncounter=s.nextEncounter;
    lastSavedWeaponRevision=s.weaponRevision;
    lastSavedDeaths=s.deaths;
    lastRunSaveAt=performance.now();
  }
  window.addEventListener('pagehide',()=>persistRun(true));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persistRun(true);});

  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
  window.addEventListener('touchend', unlock, true);

  document.addEventListener(
    'touchmove',
    (e) => {
      if (!(e.target as HTMLElement).closest?.('.scrollable')) e.preventDefault();
    },
    { passive: false },
  );
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => {
    if (state === 'playing') e.preventDefault();
  });

  platform.onPause(() => {
    pause();
    input.releaseAll();
    audio.suspend();
  });
  platform.onResume(() => {if(state!=='paused')audio.resume();});
  window.addEventListener('pageshow',()=>{if(state!=='paused')audio.resume();});

  const relayout = () => ui.setLayout(renderer.resize());
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', relayout);
  window.visualViewport?.addEventListener('resize', relayout);
  relayout();

  // ---------------------------------------------------------- loop

  let lastSavedEncounter=-1,lastEquipmentRevision=-1;
  let menuPadPrev:number[]=[];
  let last = performance.now();
  let first = true;
  const frame = (now: number) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if(state!=='playing'){
      const gp=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected);
      if(gp){const btn=(i:number)=>!!gp.buttons[i]?.pressed;const now=[0,1,9,12,13,14,15].filter(btn);
        const edge=(i:number)=>now.includes(i)&&!menuPadPrev.includes(i);
        const scope=document.querySelector('dialog[open]')||document.querySelector('.screen.active:not(.hud)')||document.querySelector('.screen:not([hidden])');
        const buttons=Array.from((scope||document).querySelectorAll<HTMLButtonElement>('button:not(:disabled)')).filter(b=>b.getClientRects().length>0);
        if([12,13,14,15].some(edge)&&buttons.length){const n=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[(Math.max(0,n)+(edge(12)||edge(14)?-1:1)+buttons.length)%buttons.length].focus();}
        if(edge(0)&&buttons.length)(buttons.includes(document.activeElement as HTMLButtonElement)?document.activeElement as HTMLButtonElement:buttons[0]).click();
        if(edge(9)&&state==='paused')resume();menuPadPrev=now;
      }else menuPadPrev=[];
    }
    game.update(dt);
    if(state==='playing'&&game.stage&&!game.demo){
      const s=game.stage;
      if((s.nextEncounter!==lastSavedEncounter||s.equipmentRevision!==lastEquipmentRevision)&&s.phase==='play'){
        lastSavedEncounter=s.nextEncounter;lastEquipmentRevision=s.equipmentRevision;
        save.data.run={level:game.level,encounter:s.nextEncounter,score:s.score,motes:s.motes,kills:s.kills,time:s.time,deaths:s.deaths,collected:s.pickups.map((p,n)=>p.placed&&p.taken?n:-1).filter(n=>n>=0),difficulty:s.diff.id,weapons:s.weaponJournal()};save.persist();
      }
    }
    if(state==='playing'&&game.stage)ui.updateEquipment(game.stage,input.mode,audio.ready,save.data.settings.music);
    renderer.render(game, state === 'paused' ? 0 : dt, input.mode);
    if (first) {
      first = false;
      platform.firstFrameReady();
      platform.gameReady();
    }
    requestAnimationFrame(frame);
  };

  toMenu('title');
  requestAnimationFrame(frame);
  document.body.classList.add('ready');

  if (params.has('debug')) {
    game.speed = Math.max(1, Math.min(8, Number(params.get('speed')) || 1));
    if(params.has('qa'))void import('./qa').then(m=>m.mountQA(game,save,startLevel,audio));
    (window as unknown as Record<string, unknown>).__aol = { game, save, ui, startLevel, getState: () => state, input, audio };
  }
}

void boot().catch(()=>{
 const box=document.createElement('div');box.setAttribute('role','alert');box.className='startup-error';box.textContent='The game could not start. Reload to try again. The YouTube edition must be opened inside YouTube.';document.body.append(box);
});
