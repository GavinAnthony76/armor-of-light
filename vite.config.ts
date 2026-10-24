import { defineConfig } from 'vite';

// Relative base so the build works from any static host or sub-folder
// (YouTube Playables bundles are also served from a sub-path).
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    sourcemap: false,
  },
});
