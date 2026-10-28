import { validateManifest } from '../src/production/manifest';
import type { EnemyPresentation, ProductionManifest } from '../src/production/types';
/** Validate against the complete clip/anchor contract; leave the installed pack untouched. */
export function calibrationPack(base:ProductionManifest,id:string,src:string,metadata:string,provenance?:{source:string;license:string}):ProductionManifest {
  const pack=structuredClone(base),spec=pack.images[id];
  if(!spec)throw Error('Unknown image');
  if(provenance)Object.assign(spec,provenance);
  spec.src=src;spec.enemyPresentation=JSON.parse(metadata) as EnemyPresentation;
  return validateManifest(pack);
}
