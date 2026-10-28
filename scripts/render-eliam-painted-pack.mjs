import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const here=dirname(fileURLToPath(import.meta.url));
const generated=resolve(here,'../generated-artifacts');
const poses=JSON.parse(readFileSync(resolve(generated,'eliam-pose-samples.json'),'utf8'));
const template=readFileSync(resolve(here,'render-eliam-painted-pack.html'),'utf8');
let saved=false;
const output=resolve(here,'../public/assets/production/characters/eliam/eliam-body-atlas.png');
const server=createServer((req,res)=>{
  if(req.method==='GET'&&req.url==='/'){
    res.writeHead(200,{'content-type':'text/html; charset=utf-8'});
    res.end(template.replace('/*POSE_DATA*/',JSON.stringify(poses)));return;
  }
  if(req.method==='GET'&&req.url==='/base.png'){
    res.writeHead(200,{'content-type':'image/png'});res.end(readFileSync(resolve(generated,'eliam-body-source-cell.png')));return;
  }
  if(req.method==='POST'&&req.url==='/atlas'){
    const chunks=[];req.on('data',x=>chunks.push(x));req.on('end',()=>{
      const png=Buffer.concat(chunks);writeFileSync(output,png);saved=true;res.writeHead(200);res.end('saved '+png.length+' bytes');
    });return;
  }
  res.writeHead(404);res.end();
});
server.listen(0,'127.0.0.1',()=>{
  const port=server.address().port;
  const chrome=spawn('/repl/tools/bin/chromium',['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--hide-scrollbars','--virtual-time-budget=20000','--dump-dom',`http://127.0.0.1:${port}/`],{stdio:['ignore','pipe','inherit']});
  let dom='';chrome.stdout.on('data',d=>dom+=d.toString());
  const timer=setTimeout(()=>{chrome.kill('SIGKILL');server.close(()=>process.exit(2));},120000);
  chrome.on('exit',code=>{clearTimeout(timer);server.close(()=>{
    if(!saved){console.error(dom.slice(-1000));process.exitCode=code||1;}
    else console.log(dom.match(/DONE[^<]*/)?.[0]??'atlas saved',output);
  });});
});
