/** Explicit opt-in fixtures for browser QA. Never active in an ordinary play URL. */
import type { AudioEngine } from './audio/audio';
import type { Game } from './game';
import type { SaveStore } from './save';
import { LAND_WEAPONS } from './core/weapons';
export function mountQA(game:Game,save:SaveStore,start:(land:number)=>void,audio:AudioEngine):void {
  const panel=document.createElement('details');panel.className='qa-panel';panel.open=true;
  panel.innerHTML='<summary>Development QA fixtures</summary><label>Land <select id="qa-land">'+LAND_WEAPONS.map((w,i)=>`<option value="${i}">${i+1} · ${w}</option>`).join('')+'</select></label><button id="qa-reset">Reset land fixture</button><button id="qa-foe">Spawn reward foe</button><button id="qa-rank">Next copy foe</button><button id="qa-gallery">Show all designs</button><button id="qa-archive">Archive checkpoint</button><label>Freeze <input type="checkbox" id="qa-freeze"></label><output id="qa-state"></output>';
  document.body.append(panel);
  let serial=0,lastKey='';
  window.addEventListener('keydown',e=>lastKey=e.code);
  panel.querySelector('#qa-reset')!.addEventListener('click',()=>{
    game.paused=false;delete save.data.run;serial=0;start(Number((panel.querySelector('#qa-land') as HTMLSelectElement).value));
    const s=game.stage!;s.player.x=300;s.player.y=s.terrain.groundAt(300)??450;s.player.lastSafe={x:s.player.x,y:s.player.y};s.player.invuln=0;
    game.camX=0;game.banners=[];
  });
  const foe=()=>{
    const s=game.stage;if(!s)return;
    game.paused=false;(panel.querySelector('#qa-freeze') as HTMLInputElement).checked=false;
    s.player.setState('move');s.player.x=300;s.player.y=s.terrain.groundAt(300)??450;s.player.vx=0;s.player.vy=0;s.player.onGround=true;s.player.facing=1;
    const e=s.spawnEnemy('husk',350);e.hp=.5;e.cooldown=999;e.rewardId=`e0w${serial++}s0`;
    game.banners=[];
  };
  panel.querySelector('#qa-archive')!.addEventListener('click',()=>{
    delete save.data.run;start(0);const s=game.stage!;s.nextEncounter=1;s.player.x=2810;s.player.y=900;s.player.vx=0;s.player.vy=0;s.player.onGround=true;s.player.lastSafe={x:2810,y:900};s.checkpoint={x:2810,y:900};s.prevPlayerX=2810;s.prevPlayerY=900;game.camX=2450;game.banners=[];
  });
  panel.querySelector('#qa-foe')!.addEventListener('click',foe);panel.querySelector('#qa-rank')!.addEventListener('click',foe);
  panel.querySelector('#qa-freeze')!.addEventListener('change',e=>game.paused=(e.target as HTMLInputElement).checked);
  panel.querySelector('#qa-gallery')!.addEventListener('click',()=>{location.href='./weapon-gallery.html';});
  const out=panel.querySelector('output')!;
  setInterval(()=>{const s=game.stage;const sound=audio.diagnostics();if(s)out.textContent=`${s.player.weaponId} ${s.player.weaponRank} · ${s.weaponDrops.length} drops · ${s.issuedRewards.size} issued · demo=${game.demo} x=${s.player.x.toFixed(0)} y=${s.player.y.toFixed(0)} seal=${s.beaconSeal} gate=${s.archiveGateOpen} key=${lastKey} · audio=${sound.state} RMS=${sound.rms.toFixed(4)} steps=${sound.steps}`;},150);
}
