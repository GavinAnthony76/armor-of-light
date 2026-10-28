"""Decode shipped OGG/WAVs in Chromium and exercise actual SampleBank routing.

Run against the Vite development workflow:
  BASE=https://<development-domain> python3 tests/approved-sfx-browser.py
This is an automated desktop-browser check, not physical-device listening.
"""
import json
import os
import shutil
from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    browser = pw.chromium.launch(
        executable_path=os.environ.get("CHROMIUM_PATH") or shutil.which("chromium"),
        args=["--no-sandbox"],
    )
    page = browser.new_page()
    page.goto(os.environ["BASE"], wait_until="networkidle")
    # Context creation is explicitly initiated by a real user gesture.
    page.evaluate("""() => {
      const button=document.createElement('button');
      button.id='audio-test-unlock';button.textContent='Unlock audio test';
      button.style.cssText='position:fixed;top:0;left:0;z-index:2147483647';
      button.onclick=()=>{window.testAudioContext=new AudioContext();void window.testAudioContext.resume();};
      document.body.append(button);
    }""")
    page.click("#audio-test-unlock")
    result = page.evaluate("""async () => {
      const {SampleBank}=await import('/src/production/samples.ts');
      const {ProductionAssets}=await import('/src/production/assets.ts');
      await window.testAudioContext.close();
      // Headless runners may report a live context as running without an audio
      // device advancing its clock. Render the real Web Audio graph offline.
      const ctx=new OfflineAudioContext(1,48000,48000);
      const assets=new ProductionAssets();await assets.load();
      const bus=ctx.createGain();bus.connect(ctx.destination);
      const decoded=[];
      for(const [id,spec] of Object.entries(assets.manifest.audio)){
        for(const path of spec.sources){
          const response=await fetch('/'+path);
          if(!response.ok)throw Error(path+': HTTP '+response.status);
          const buffer=await ctx.decodeAudioData(await response.arrayBuffer());
          if(buffer.duration>.5||buffer.numberOfChannels!==1)throw Error('bad decoded format '+path);
          let peak=0,first=-1;const pcm=buffer.getChannelData(0);
          for(let i=0;i<pcm.length;i++){
            peak=Math.max(peak,Math.abs(pcm[i]));
            if(first<0&&Math.abs(pcm[i])>.001)first=i;
          }
          if(peak>10**(-3/20)||first<0||first/buffer.sampleRate>.01)throw Error('bad decoded waveform '+path);
          decoded.push({id,path,duration:buffer.duration,peak});
        }
      }
      const bank=new SampleBank(ctx,bus,assets);
      if(bank.play('hit'))throw Error('cold event must synthesize');
      await bank.preload('hit');
      if(!bank.play('hit'))throw Error('decoded hit not used');
      // Simulate unsupported OGG without mutating the production manifest.
      const fallbackAssets=new ProductionAssets(p=>p,async (url,opts)=>{
        if(String(url).endsWith('.ogg'))return new Response('invalid OGG');
        return fetch('/'+url,opts);
      });
      fallbackAssets.install(assets.manifest);
      const fallbackBank=new SampleBank(ctx,bus,fallbackAssets);
      await fallbackBank.preload('parry');
      if(!fallbackBank.play('parry')||fallbackAssets.issues.length)throw Error('WAV fallback failed');
      const rendered=await ctx.startRendering(),pcm=rendered.getChannelData(0);
      const rms=Math.sqrt(pcm.reduce((sum,n)=>sum+n*n,0)/pcm.length);
      if(rms<=.001)throw Error('no rendered sampled output at existing bus');
      document.querySelector('#audio-test-unlock').remove();
      return {decoded:decoded.length,rms,wavFallback:true};
    }""")
    print("Chromium sample verification:", json.dumps(result))
    browser.close()
