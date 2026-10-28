import {STAGES} from '../src/core/levels';

/** Read live encounter names/kinds, not the abbreviated names in prose docs. */
export const campaignMinis=STAGES.flatMap(land=>land.encounters.flatMap(encounter=>{
  const name=encounter.miniBoss?.name;
  if(!name)return [];
  const kind=encounter.waves[0][0].kind;
  const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  return [{name,kind,theme:land.theme,actor:`mini.${slug}`,image:`mini-${slug}-painted-body`}];
}));
