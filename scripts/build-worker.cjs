const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const xp=fs.readFileSync(path.join(root,'extension/xp.js'),'utf8');
const worker=fs.readFileSync(path.join(root,'server/worker.mjs'),'utf8');
const entry="import '../extension/xp.js';";
if(!worker.startsWith(entry))throw Error('Review Worker entrypoint');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/worker.mjs'),xp+'\n'+worker.slice(entry.length));
console.log('Built Worker module');
