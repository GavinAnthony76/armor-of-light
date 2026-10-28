import { readFileSync } from 'node:fs';
import { calibrationPack } from './guardian-calibration-model.ts';
const base=JSON.parse(readFileSync('public/assets/production/asset-manifest.json','utf8'));
const before=JSON.stringify(base),id='warden-painted-body';let count=0;
const check=(ok,msg)=>{if(!ok)throw Error(msg);count++;};
const edited=calibrationPack(base,id,'assets/production/bosses/warden/replacement.png',JSON.stringify({bands:{top:48,neck:140,hip:328,legTop:328,foot:448}}));
check(edited.images[id].src.endsWith('replacement.png'),'export uses selected source');
check(JSON.stringify(base)===before,'preview cannot mutate installed manifest');
for(const metadata of ['invalid JSON','{"bands":{"top":-4}}','{"samples":{"colossusStone":[500,0,100,100]}}','{"bands":{"top":2,"neck":200,"hip":100,"legTop":328,"foot":448}}']){
 let failed=false;try{calibrationPack(base,id,base.images[id].src,metadata);}catch{failed=true;}
 check(failed,'invalid calibration must not export');
}
let rejected=false;try{calibrationPack(base,id,'file:///tmp/painting.png','{}');}catch{rejected=true;}
check(rejected,'local-only blob/file URLs cannot leak into shipping patch');
const replacement=calibrationPack(base,id,'assets/production/bosses/warden/new.png','{}',{source:'Replacement author',license:'Owner permission'});
check(replacement.images[id].source==='Replacement author','replacement provenance is explicit');
check(replacement.images[id].license==='Owner permission','replacement does not silently inherit old license');
console.log(`${count} calibration export/immutability/validation checks passed.`);
