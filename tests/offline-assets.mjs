import {asset} from '../src/assets.ts';
let count=0;const check=(ok,msg)=>{if(!ok)throw Error(msg);count++;};
const prior=globalThis.window;
try{
 globalThis.window={__armorAssetMap:{'assets/known.png':'data:image/png;base64,AAAA'}};
 check(asset('assets/known.png')==='data:image/png;base64,AAAA','known embedded path retained');
 check(asset('assets/missing.png')==='data:application/octet-stream;base64,','missing embedded image cannot request a file sidecar');
 check(asset('assets/missing.wav')==='data:application/octet-stream;base64,','missing embedded sound stays local for synthesized fallback');
 check(asset(undefined)===''&&asset('')==='','absent optional paths retain empty result');
}finally{if(prior===undefined)delete globalThis.window;else globalThis.window=prior;}
console.log(`${count} embedded asset resolution checks passed.`);
