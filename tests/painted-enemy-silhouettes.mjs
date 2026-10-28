// Decode the SHIPPED PNG bytes, not just the header/alpha-support flag.
// No imaging packages or authoring tools required by npm test.
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const m=JSON.parse(readFileSync('public/assets/production/asset-manifest.json','utf8'));
// Reviewed alpha masks from the clean contrasting-background contact sheet.
// A changed mask needs a new visual inspection; do not regenerate blindly.
const approved={
  husk:'1fbc6b95f5fbfbb406cbd2642e1bfd17aee4b168917f7caabf382ba7c5c27dd9',
  wisp:'89bf13f2159c826e04736055eb83cbc307e7786ca3040e0c92e7caf2a0d458c8',
  caster:'a0b756bc682e279702ef39ad6ff795c7c9eaec44a2d8296f6186512d28cadb4e',
  lurker:'4c248cdab014ce1ec16aaec135a7fa55575bd79d2d35042d669737b1ad0302dd',
  sentinel:'1f4f142bd57ea73a5637629fd4b162a66ba43332e5d151819e8037d5e6f70df4',
  warden:'443a26f4e56691ed8c038fe7cee684c38047abeb275b971581ef901ef46f1730',
  serpent:'ae96006e84f078ca6afca36fb9431fa45b0ed1b2e1064b8bd1a8062d50a1e90b',
  thorn:'67bcd83157a86546eab7c8dc75b8f7ac9088aba7963ac6df799a74d9d0e55463',
  watcher:'a0e6bd42dfc3c02f0ff8439099d8380b9bc60485453c448f7743f44fcbea49fe',
  colossus:'2055df433e320abc2bc20676d2e26d46d5cf18f4a124c4946f2dd2c1bb6971ba',
  keeper:'0f9a5188e940008ee9c99b7eedcce3a2df2252e035ac4e1272925d1bf2a08b61',
  king:'fe3b26c5bd89578e09fbf5f103644986a41bc1c09ec709f59f88013c5e46bc63',
};
let checks=0;
const check=(condition,message)=>{if(!condition)throw Error(message);checks++;};
function decodePNG(path){
  const b=readFileSync(path);
  check(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'actual PNG signature');
  const chunks=[];let w,h;
  for(let off=8;off<b.length;){
    const len=b.readUInt32BE(off),type=b.toString('ascii',off+4,off+8),data=b.subarray(off+8,off+8+len);
    if(type==='IHDR'){
      w=data.readUInt32BE(0);h=data.readUInt32BE(4);
      check(w===512&&h===512&&data[8]===8&&data[9]===6&&data[12]===0,'untrimmed 8-bit RGBA, noninterlaced PNG');
    }
    if(type==='IDAT')chunks.push(data);
    off+=len+12;
  }
  const raw=inflateSync(Buffer.concat(chunks)),stride=w*4,out=Buffer.alloc(w*h*4);
  check(raw.length===(stride+1)*h,'complete PNG pixel stream');
  const paeth=(a,b,c)=>{
    const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);
    return pa<=pb&&pa<=pc?a:pb<=pc?b:c;
  };
  for(let y=0;y<h;y++){
    const filter=raw[y*(stride+1)];
    check(filter<=4,'valid PNG row filter');
    for(let x=0;x<stride;x++){
      const i=y*stride+x,a=x>=4?out[i-4]:0,b=y?out[i-stride]:0,c=y&&x>=4?out[i-stride-4]:0;
      const predictor=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c);
      out[i]=(raw[y*(stride+1)+1+x]+predictor)&255;
    }
  }
  return out;
}
function audit(rgba,kind){
  const spec=m.images[`${kind}-painted-body`];
  const dimensions={husk:[40,74],wisp:[34,34],caster:[40,82],lurker:[56,46],sentinel:[48,92],warden:[120,200],
    serpent:[70,70],thorn:[64,128],watcher:[64,144],colossus:[120,200],keeper:[64,128],king:[64,128]}[kind];
  const [width,height]=dimensions.map(v=>v/spec.scale),mask=Buffer.alloc(512*512);
  let pixels=0,hidden=0,outside=0,x0=512,y0=512,x1=0,y1=0;
  for(let i=0;i<mask.length;i++){
    const x=i%512,y=Math.floor(i/512),a=rgba[i*4+3];mask[i]=a;
    if(!a&&(rgba[i*4]||rgba[i*4+1]||rgba[i*4+2]))hidden++;
    if(a){
      if(x<256-width/2-1||x>256+width/2+1||y<448-height-1||y>=448)outside++;
    }
    if(a>16){pixels++;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  }
  check(hidden===0,`${kind}: zero hidden RGB on fully transparent pixels`);
  check(outside===0,`${kind}: no panels, labels or opaque pixels outside original calibrated body envelope`);
  check(y1>=445&&y1<448,`${kind}: stable original foot baseline`);
  const fill=pixels/((x1-x0+1)*(y1-y0+1));
  check(fill>.35&&fill<.82,`${kind}: character silhouette, not a filled rectangular panel`);
  // Count detached opaque components; a background decoration is not a limb.
  const seen=new Uint8Array(mask.length),sizes=[];
  for(let i=0;i<mask.length;i++){
    if(mask[i]<=16||seen[i])continue;
    let size=0;const stack=[i];seen[i]=1;
    while(stack.length){
      const p=stack.pop(),x=p%512,y=Math.floor(p/512);size++;
      for(let yy=Math.max(0,y-1);yy<=Math.min(511,y+1);yy++)
        for(let xx=Math.max(0,x-1);xx<=Math.min(511,x+1);xx++){
          const q=yy*512+xx;if(!seen[q]&&mask[q]>16){seen[q]=1;stack.push(q);}
        }
    }
    sizes.push(size);
  }
  sizes.sort((a,b)=>b-a);
  check(sizes.slice(1).reduce((a,b)=>a+b,0)<pixels*.005,`${kind}: no substantial disconnected source-board graphics`);
  check(createHash('sha256').update(mask).digest('hex')===approved[kind],`${kind}: matches visually inspected clean silhouette`);
  return {rgba,kind,fill,pixels};
}
for(const kind of Object.keys(approved)){
  const path='public/'+m.images[`${kind}-painted-body`].src,rgba=decodePNG(path);
  const result=audit(rgba,kind);
  // Prove this audit rejects actual stray pixels instead of only alpha support.
  const contaminated=Buffer.from(rgba);
  for(let y=200;y<350;y++)for(let x=400;x<500;x++){
    const i=(y*512+x)*4;contaminated[i]=255;contaminated[i+3]=255;
  }
  let failed=false;try{audit(contaminated,kind);}catch{failed=true;}
  check(failed,`${kind}: opaque side-panel regression is rejected`);
  console.log(`${kind}: clean silhouette, ${result.pixels} pixels, ${(result.fill*100).toFixed(1)}% bounding-box occupancy`);
}
console.log(`${checks} decoded PNG/silhouette and contamination-regression checks passed.`);
