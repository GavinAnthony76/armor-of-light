import { defineConfig } from 'vite';

// Relative base so the build works from any static host or sub-folder
// (YouTube Playables bundles are also served from a sub-path).
export default defineConfig({
  base: './',
  server: { allowedHosts: ['terminal.local'] },
  build: {
    target: 'es2020',
    rollupOptions: { input: { main:'index.html', weapons:'weapon-gallery.html' } },
    assetsInlineLimit: 0,
    sourcemap: false,
  },
});
