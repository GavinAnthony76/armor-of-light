import { titleHeroPlacement } from '../src/ui/title-scene';
let count=0;
const check=(ok:unknown,message:string)=>{if(!ok)throw new Error(message);count++;};
for(const [w,h] of [[1440,900],[1024,768],[1280,720],[390,844],[360,640],[320,568],[844,390],[568,320]]){
  for(const opening of [true,false]){
    const layout=titleHeroPlacement(w,h,opening);
    check(layout.x>0&&layout.x<w,'warrior center remains on screen');
    check(layout.foot>0&&layout.foot<h,'feet are not cropped below canvas');
    check(layout.size>0&&layout.foot-layout.size>=0,'whole warrior fits above feet');
    check(layout.size/85>0,'rig uses a single positive uniform scale');
  }
}
console.log(`${count} opening/title warrior placement checks passed across desktop and portrait/landscape phones.`);
