import type { BodyBands, EnemyPresentation, ImageSpec, SourceRect } from './types';

/** Legacy calibration remains valid for packs without optional presentation data. */
export function bodyBands(spec:ImageSpec,kind:string,height:number):BodyBands {
  const h=height/spec.scale;
  return spec.enemyPresentation?.bands??{
    top:448-h,neck:448-h*.77,hip:448-h*.30,
    legTop:448-h*(kind==='lurker'?.38:.30),foot:448,
  };
}
export function materialSamples(spec:Pick<ImageSpec,'enemyPresentation'>,kind:string):NonNullable<EnemyPresentation['samples']> {
  const s=spec.enemyPresentation?.samples;
  if(kind==='serpent')return {serpentScales:s?.serpentScales??[232,386,32,32],serpentHead:s?.serpentHead??[204,308,108,75]};
  if(kind==='colossus')return {colossusStone:s?.colossusStone??[200,116,100,100]};
  return {};
}
/** Material patches must be near-opaque. The head is a shaped overlay, not a tile. */
export function validMaterialPixels(pixels:Uint8ClampedArray,rect:SourceRect,overlay:boolean):boolean {
  if(pixels.length!==rect[2]*rect[3]*4)return false;
  let alpha=0;
  for(let i=3;i<pixels.length;i+=4)alpha+=pixels[i];
  return alpha/(rect[2]*rect[3]*255)>=(overlay?.5:.95);
}
