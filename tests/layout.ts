import {computeLayout,cameraTop} from '../src/render/renderer';
(globalThis as any).window={devicePixelRatio:3};
let checks=0;
function check(value:boolean,message:string){if(!value)throw Error(message);checks++;}
const phones=[
 {w:926,h:428,insets:{top:0,right:0,bottom:0,left:0}},
 {w:926,h:428,insets:{top:0,right:44,bottom:21,left:44}},
 {w:844,h:390,insets:{top:0,right:44,bottom:21,left:44}},
 {w:667,h:320,insets:{top:0,right:0,bottom:0,left:0}},
 {w:568,h:320,insets:{top:0,right:44,bottom:21,left:44}},
 {w:390,h:844,insets:{top:47,right:0,bottom:34,left:0}},
 {w:320,h:568,insets:{top:0,right:0,bottom:0,left:0}},
 {w:430,h:740,insets:{top:0,right:0,bottom:0,left:0}},
];
for(const {w,h,insets} of phones){
 const l=computeLayout(w,h,true,insets),tag=`${w}x${h}`;
 check(Math.abs(l.ox-insets.left)<.01,`${tag}: no extra left letterbox`);
 check(Math.abs(l.ox+l.viewW*l.scale-(w-insets.right))<.01,`${tag}: scene reaches safe right edge`);
 check(Math.abs(l.oy+l.viewH*l.scale+l.controlsH+insets.bottom-h)<.01,`${tag}: dock directly meets scene and safe bottom`);
 check(64*l.scale>=32,`${tag}: Eliam remains readable`);
 for(const y of [450,275,120,0,-100]){
  const room=l.touch&&!l.portrait?Math.max(90,106/l.scale):90;
  const top=cameraTop(l.viewH,y,1,room);
  check(y-64-top>=0&&y-top<=l.viewH,`${tag}: player stays inside scene at height ${y}`);
 }
 check(cameraTop(l.viewH,450)+l.viewH>=450,`${tag}: landing surface remains visible`);
 if(!l.portrait){
  const floor=(450-cameraTop(l.viewH,450,1,Math.max(90,106/l.scale)))*l.scale;
  check(l.viewH*l.scale-floor>=105.9,`${tag}: landing line clears the thumb controls`);
 }
}
const desktop=computeLayout(1440,900,false);
check(desktop.viewH===540&&desktop.controlsH===0,'desktop framing retained');
check(desktop.dpr===2,'render resolution stays capped');
console.log(`${checks} responsive scene/camera checks passed.`);
