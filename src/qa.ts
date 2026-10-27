/** Explicit opt-in fixtures for browser QA. Never active in an ordinary play URL. */
import type { AudioEngine } from './audio/audio';
import type { Game } from './game';
import type { SaveStore } from './save';
import { LAND_WEAPONS } from './core/weapons';
export function mountQA(game:Game,save:SaveStore,start:(land:number)=>void,audio:AudioEngine):void {
  const panel=document.createElement('details');panel.className='qa-panel';panel.open=true;
  panel.innerHTML='<summary>Development QA fixtures</summary><label>Land <select id="qa-land">'+LAND_WEAPONS.map((w,i)=>`<option value="${i}">${i+1} · ${w}</option>`).join('')+'</select></label><button id="qa-reset">Reset land fixture</button><button id="qa-foe">Spawn reward foe</button><button id="qa-rank">Next copy foe</button><button id="qa-gallery">Show all designs</button><label>Freeze <input type="checkbox" id="qa-freeze"></label><output id="qa-state"></output>';
  document.body.append(panel);
  const rewards=document.createElement('label');
  rewards.innerHTML='First-land reward <select id="qa-weapon"><option value="sunblade">Sunblade</option><option value="sling">Dawn Sling</option></select>';
  panel.insertBefore(rewards,panel.querySelector('#qa-foe'));
  let serial=0,lastKey='';
  window.addEventListener('keydown',e=>lastKey=e.code);
  panel.querySelector('#qa-reset')!.addEventListener('click',()=>{
    game.paused=false;delete save.data.run;serial=0;start(Number((panel.querySelector('#qa-land') as HTMLSelectElement).value));
    const s=game.stage!;s.player.x=s.def.start;s.player.y=s.terrain.groundAt(s.def.start)??450;s.player.lastSafe={x:s.player.x,y:s.player.y};s.player.invuln=0;
    game.camX=0;game.banners=[];
  });
  const foe=()=>{
    const s=game.stage;if(!s)return;
    game.paused=false;(panel.querySelector('#qa-freeze') as HTMLInputElement).checked=false;
    s.player.clearActionBuffers();s.ranged.clear();s.player.dashTime=0;
    s.player.setState('move');s.player.x=s.def.start;s.player.y=s.terrain.groundAt(s.def.start)??450;s.player.vx=0;s.player.vy=0;s.player.onGround=true;s.player.facing=1;
    const e=s.spawnEnemy('husk',s.def.start+50);e.hp=.5;e.cooldown=999;
    const sling=s.def.id===0&&(panel.querySelector('#qa-weapon') as HTMLSelectElement).value==='sling';
    e.rewardId=sling?['e1w0s0','e1w1s0','e1w1s1'][serial++%3]:`e0w${serial++}s0`;
    game.banners=[];
  };
  panel.querySelector('#qa-foe')!.addEventListener('click',foe);panel.querySelector('#qa-rank')!.addEventListener('click',foe);
  panel.querySelector('#qa-freeze')!.addEventListener('change',e=>game.paused=(e.target as HTMLInputElement).checked);
  panel.querySelector('#qa-gallery')!.addEventListener('click',()=>{location.href='./weapon-gallery.html';});
  const out=panel.querySelector('output')!;
  setInterval(()=>{const s=game.stage;const sound=audio.diagnostics();if(s)out.textContent=`${s.player.weaponId} ${s.player.weaponRank} · ${s.weaponDrops.length} drops · ${s.issuedRewards.size} issued · demo=${game.demo} x=${s.player.x.toFixed(0)} key=${lastKey} · audio=${sound.state} RMS=${sound.rms.toFixed(4)} steps=${sound.steps}`;},150);
}
