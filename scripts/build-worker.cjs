const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const xp=fs.readFileSync(path.join(root,'extension/xp.js'),'utf8');
const worker=fs.readFileSync(path.join(root,'server/worker.mjs'),'utf8');
const entry="import '../extension/xp.js';";
if(!worker.startsWith(entry))throw Error('Review Worker entrypoint');
const gradeModel=fs.readFileSync(path.join(root,'extension/grades-model.js'),'utf8');
const grades=fs.readFileSync(path.join(root,'server/grades.mjs'),'utf8').replace("import '../extension/grades-model.js';",'');
// Separate module scopes avoid collisions with the existing XP implementation.
const gradeModule='const {routeGrades,publishGrades}=(()=>{\n'+grades.replaceAll('export async function','async function')+'\nreturn {routeGrades,publishGrades};})();\n';
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/worker.mjs'),xp+'\n'+gradeModel+'\n'+gradeModule+worker.slice(entry.length).replace("import {routeGrades,publishGrades} from './grades.mjs';",''));
console.log('Built Worker module');
