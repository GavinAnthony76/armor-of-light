import {readFileSync,existsSync} from 'node:fs';
let n=0;const check=(v,m)=>{if(!v)throw Error(m);n++;};
const index=readFileSync('dist/index.html','utf8'),yt=readFileSync('dist/youtube.html','utf8'),single=readFileSync('dist-single/armor-of-light.html','utf8');
for(const page of ['index.html','youtube.html','weapon-gallery.html']){
 const html=readFileSync('dist/'+page,'utf8');
 for(const match of html.matchAll(/(?:href|src)="\.\/([^"]+)"/g))check(existsSync('dist/'+match[1]),`${page} local reference ${match[1]}`);
}
check(yt.includes('https://www.youtube.com/game_api/v1'),'SDK script retained');
check(yt.includes('searchParams.set("youtube","1")'),'YouTube host selected');
check(!index.includes('game_api'),'standalone web has no mandatory external SDK');
check(!single.includes('src="/src/main.ts"'),'single edition includes code');
check(single.includes('data:image/webp;base64,'),'single edition includes artwork');
check(!/<script[^>]+src=/.test(single),'single edition has no external JS dependency');
check(!/<link[^>]+stylesheet/.test(single),'single edition has no external stylesheet dependency');
console.log(`${n} build/standalone/reference checks passed.`);
