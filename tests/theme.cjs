const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
async function boot(saved,{fail=false}={}){
 const dom=new JSDOM('<html><head></head><body><div class="cmp-card">Text</div></body></html>',{url:'https://campus.qairu.edu.kz/ru',runScripts:'outside-only'}),w=dom.window;
 let change,mediaChange,writes=0;
 const media={matches:false,addEventListener:(n,f)=>mediaChange=f};w.matchMedia=()=>media;
 w.browser={storage:{local:{get:async()=>{if(fail)throw Error('storage');return {campusNight:saved}},set:async()=>writes++},onChanged:{addListener:f=>change=f}}};
 for(const f of ['settings.js','lunatica-theme.js','content.js'])w.eval(fs.readFileSync('extension/'+f,'utf8'));
 await new Promise(setImmediate);
 return {w,dom,change,media,system:()=>mediaChange(),writes:()=>writes};
}
test('returning off preference avoids theme flash and retains comfort settings',async()=>{
 const b=await boot({mode:'off',scale:125,wide:true,hideAI:true,reduceMotion:false});
 assert.equal(b.w.document.documentElement.dataset.cnDark,'false');assert.equal(b.w.document.documentElement.dataset.cnScale,'125');
 assert.equal(b.w.document.querySelector('#qairu-space-theme')?.textContent||'','');assert.equal(b.writes(),0);b.dom.window.close();
});
test('live palette and system changes update campus tokens and remove owned style',async()=>{
 const b=await boot({mode:'dark',palette:'warm'}),d=b.w.document;
 assert.match(d.querySelector('#qairu-space-theme').textContent,/--cmp-surface-card:/);
 assert.match(d.querySelector('#qairu-space-theme').textContent,/#211e1a/);
 b.change({campusNight:{newValue:{mode:'system',scale:140}}},'local');assert.equal(d.documentElement.dataset.cnDark,'false');
 b.media.matches=true;b.system();assert.equal(d.documentElement.dataset.cnDark,'true');assert.equal(d.documentElement.dataset.cnScale,'140');
 b.change({campusNight:{newValue:{mode:'off'}}},'local');assert.equal(d.querySelector('#qairu-space-theme')?.textContent||'','');assert.equal(b.writes(),0);b.dom.window.close();
});
test('storage failure never overwrites saved settings',async()=>{const b=await boot(undefined,{fail:true});assert.equal(b.writes(),0);b.dom.window.close()});

