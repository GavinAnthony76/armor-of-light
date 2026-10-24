// A real single-file bundle: dynamic QA and shared weapon modules are included, not left as imports.
import {mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join} from 'node:path';
const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('vite/package.json'))('esbuild');
const result=await build({entryPoints:['src/main.ts'],bundle:true,write:false,outdir:'standalone',format:'iife',define:{'import.meta.env.BASE_URL':'"./"'},target:'es2020',minify:true});
const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text.replace(/<\/script/gi,'<\\/script');
const css=result.outputFiles.find(f=>f.path.endsWith('.css')).text;
let html=readFileSync('index.html','utf8').replace(/<script type="module" src="\/src\/main.ts"><\/script>/,()=>`<style>${css}</style><script>${js}</script>`);
const assets={};
for(const file of readdirSync('public/assets'))if(file.endsWith('.webp'))assets['assets/'+file]='data:image/webp;base64,'+readFileSync(join('public/assets',file)).toString('base64');
html=html.replace('<body>','<body><script>window.__armorAssetMap='+JSON.stringify(assets)+';</script>');
mkdirSync('dist-single',{recursive:true});writeFileSync('dist-single/armor-of-light.html',html);
console.log(`Self-contained edition generated: ${(html.length/1024).toFixed(1)} KiB; no external JS modules.`);
