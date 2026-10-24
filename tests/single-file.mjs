// Inlines the built CSS and JS into one HTML file: dist-single/armor-of-light.html
// Usage: npm run build && npm run build:single
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
let html = readFileSync(join(dist, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"[^>]*>/g, (_, file) => {
  return `<style>${readFileSync(join(dist, file), 'utf8')}</style>`;
});
html = html.replace(/<script type="module"[^>]*src="\.\/([^"]+)"[^>]*><\/script>/g, (_, file) => {
  const js = readFileSync(join(dist, file), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
});

const assetMap={};
for(const file of readdirSync('public/assets')){
 if(file.endsWith('.webp'))assetMap['assets/'+file]='data:image/webp;base64,'+readFileSync(join('public/assets',file)).toString('base64');
}
html=html.replace('<body>', '<body><script>window.__armorAssetMap='+JSON.stringify(assetMap)+';</script>');
mkdirSync('dist-single', { recursive: true });
writeFileSync('dist-single/armor-of-light.html', html);
console.log(`dist-single/armor-of-light.html  ${(html.length / 1024).toFixed(1)} kB`);
