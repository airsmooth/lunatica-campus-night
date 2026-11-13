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
test('date text token stays readable inside the isolated study panel',async()=>{
 const b=await boot({mode:'dark'});
 const luminance=h=>{const c=h.match(/[a-f0-9]{2}/gi).map(x=>parseInt(x,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722};
 for(const palette of ['graphite','warm','midnight']){const css=b.w.CampusSpaceTheme.css(palette),ink=css.match(/--cmp-ink-700:(#[a-f0-9]{6})/i)?.[1],surface=css.match(/--cmp-surface-card:(#[a-f0-9]{6})/i)?.[1];assert.ok(ink,'isolated panel needs an inherited date color');assert.ok((luminance(ink)+.05)/(luminance(surface)+.05)>=4.5)}
 b.dom.window.close();
});

