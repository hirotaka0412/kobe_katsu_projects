import { build } from 'esbuild';
await build({entryPoints:['web/chat.js'],bundle:true,minify:true,format:'esm',outfile:'root/assets/chat.js'});
