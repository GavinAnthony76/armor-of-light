import type {ProductionManifest} from '../src/production/types';

/** Conservative current-land bound: all hero poses, shared enemies, one live
 * guardian, every layer/depth band, prop, surface and effect in that land.
 * Future-land guardians/layers are NOT concurrent scene residency. */
export function sceneResidency(m:ProductionManifest):[string,number][] {
  const guardians:Record<string,string>={desert:'warden',flood:'serpent',garden:'thorn',
    mountain:'watcher',valley:'colossus',city:'keeper',river:'king'};
  return Object.entries(m.lands).map(([theme,land])=>{
    const ids=new Set<string>();
    const clip=(id:string)=>{if(m.clips[id])ids.add(m.clips[id].image);};
    for(const id of ['eliam','husk','wisp','caster','lurker','sentinel',`boss.${guardians[theme]}`])
      for(const key of Object.values(m.actors[id]?.states??{}))clip(key);
    for(const key of Object.values(m.effects))clip(key);
    for(const l of land.layers)ids.add(l.image);
    for(const p of land.props){ids.add(p.image);if(p.clip)clip(p.clip);}
    for(const id of Object.values(land.surfaces??{}))ids.add(id);
    // Painted rig source materials are used independently of actor clips.
    for(const id of Object.keys(m.images))if(id.startsWith('eliam-'))ids.add(id);
    return [theme,[...ids].reduce((n,id)=>n+m.images[id].width*m.images[id].height*4,0)];
  });
}
