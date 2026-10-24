import {readFileSync,writeFileSync} from 'node:fs';
const html=readFileSync('dist/index.html','utf8');
writeFileSync('dist/youtube.html',html.replace('</head>','<script src="https://www.youtube.com/game_api/v1"></script><script>const u=new URL(location.href);u.searchParams.set("youtube","1");history.replaceState(null,"",u);</script></head>'));
console.log('Standalone static and YouTube entrypoints generated with matching asset hashes.');
