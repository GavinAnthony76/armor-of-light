// Small Node-only decoder for the shipped noninterlaced 8-bit RGBA PNG fixtures.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

export function decodeRGBA(path) {
  const b=readFileSync(path),chunks=[];
  if(!b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Expected PNG');
  let width,height;
  for(let off=8;off<b.length;){
    const len=b.readUInt32BE(off),type=b.toString('ascii',off+4,off+8),data=b.subarray(off+8,off+8+len);
    if(type==='IHDR'){
      width=data.readUInt32BE(0);height=data.readUInt32BE(4);
      if(data[8]!==8||data[9]!==6||data[12]!==0)throw Error('Expected noninterlaced RGBA8 PNG');
    }
    if(type==='IDAT')chunks.push(data);
    off+=len+12;
  }
  const raw=inflateSync(Buffer.concat(chunks)),stride=width*4,pixels=new Uint8ClampedArray(width*height*4);
  if(raw.length!==(stride+1)*height)throw Error('Incomplete PNG');
  const paeth=(a,b,c)=>{
    const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);
    return pa<=pb&&pa<=pc?a:pb<=pc?b:c;
  };
  for(let y=0;y<height;y++){
    const filter=raw[y*(stride+1)];
    if(filter>4)throw Error('Invalid PNG filter');
    for(let x=0;x<stride;x++){
      const i=y*stride+x,a=x>=4?pixels[i-4]:0,b=y?pixels[i-stride]:0,c=y&&x>=4?pixels[i-stride-4]:0;
      const predictor=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c);
      pixels[i]=(raw[y*(stride+1)+1+x]+predictor)&255;
    }
  }
  return {width,height,pixels};
}
