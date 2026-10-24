import { defineConfig } from 'vite';

// Relative base so the build works from any static host or sub-folder
// (YouTube Playables bundles are also served from a sub-path).
export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', allowedHosts: true },
  plugins: [{
    name: 'youtube-entry',
    enforce: 'post',
    generateBundle(_, bundle) {
      const index = bundle['index.html'];
      if (index?.type !== 'asset') throw new Error('Missing standalone index.html');
      const sdk = '<script src="https://www.youtube.com/game_api/v1"></script><script>const u=new URL(location.href);u.searchParams.set("youtube","1");history.replaceState(null,"",u);</script>';
      this.emitFile({ type: 'asset', fileName: 'youtube.html', source: String(index.source).replace('</head>', `${sdk}</head>`) });
    },
  }],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    sourcemap: false,
  },
});
