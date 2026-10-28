import { Player } from '../src/core/player';
import { sampleHeroPose, type Pose } from '../src/render/hero';

const phases = [0, 1 / 4, 1 / 2, 3 / 4];
const out: Record<string, { poses: Pose[]; fps: number; loop: boolean; sourceState: string }> = {};
function sample(name: string, makePlayer: (phase: number, i: number) => Player, fps: number, loop: boolean, timeFor: (phase: number) => number = p => p): void {
  out[name] = { poses: phases.map((phase, i) => {
    const p = makePlayer(phase, i);
    return sampleHeroPose(p, timeFor(phase));
  }), fps, loop, sourceState: name };
}
const base = () => new Player(0, 0, 5);
sample('idle', (phase) => { const p=base(); p.state='move'; p.onGround=true; p.vx=0; return p; }, 1.4, true, p => p * (Math.PI * 2 / 2.2));
sample('run', (_phase, i) => { const p=base(); p.state='move'; p.onGround=true; p.vx=260; p.stride=i*Math.PI/2; return p; }, 8, true);
sample('block', (_phase, i) => { const p=base(); p.state='block'; p.t=i/3; return p; }, 3.82, true, p => p * (Math.PI * 2 / 6));
sample('hurt', (_phase, i) => { const p=base(); p.state='hurt'; p.t=i/3*.32; return p; }, 10, false);
sample('dead', (_phase, i) => { const p=base(); p.state='dead'; p.t=i/3*.6; return p; }, 6.67, false, p => p * 4 / 3);
sample('jump-rise', (_phase, i) => { const p=base(); p.state='move'; p.onGround=false; p.vy=-220; p.airTime=i/3*.2; return p; }, 8, true);
sample('jump-fall', (_phase, i) => { const p=base(); p.state='move'; p.onGround=false; p.vy=220; p.airTime=i/3*.2; return p; }, 8, true);
sample('dash', (_phase, i) => { const p=base(); p.state='move'; p.onGround=true; p.dashTime=.14-i/4*.14; return p; }, 24, false);
for (const [name, combo] of [['attack.hammer.light-1',0],['attack.hammer.light-2',1],['attack.hammer.light-3',2]] as const) {
  sample(name, (phase) => { const p=base(); p.state='attack'; p.combo=combo; p.heavySwing=false; p.airSwing=false; p.t=p.swing.dur*phase; return p; }, 12, false);
}
sample('attack.hammer.heavy', phase => { const p=base(); p.state='attack'; p.combo=0; p.heavySwing=true; p.t=p.swing.dur*phase; return p; }, 12, false);
sample('attack.hammer.air', phase => { const p=base(); p.state='attack'; p.onGround=false; p.airSwing=true; p.heavySwing=false; p.t=p.swing.dur*phase; return p; }, 12, false);
sample('attack.hammer.air-heavy', phase => { const p=base(); p.state='attack'; p.onGround=false; p.airSwing=true; p.heavySwing=true; p.t=p.swing.dur*phase; return p; }, 12, false);
process.stdout.write(JSON.stringify(out));
