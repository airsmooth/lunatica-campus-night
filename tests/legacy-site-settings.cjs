const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const base='extension/',source=n=>fs.readFileSync(base+n,'utf8'),tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const d=new JSDOM('<div id="host"></div>',{url:'https://campus.qairu.edu.kz/ru',runScripts:'outside-only'}),w=d.window;
 const oldTask='https://campus.qairu.edu.kz/ru/assignments/completed';
 const state={campusNight:{mode:'off',scale:125},campusFavorites:[{url:'https://campus.qairu.edu.kz/ru/courses/math',title:'Math favorite'}],campusTaskNotes:{[oldTask]:{status:'ready',note:'Old completed task'}}},listeners=new Set();let handler,saved;
 w.TextEncoder=TextEncoder;w.browser={commands:{onCommand:{addListener(){}}},runtime:{onMessage:{addListener:fn=>handler=fn},sendMessage:m=>handler(m)},storage:{local:{get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,state[k]])),set:async data=>{Object.assign(state,data);for(const fn of listeners)fn(Object.fromEntries(Object.entries(data).map(([k,v])=>[k,{newValue:v}])),'local');}},onChanged:{addListener:fn=>listeners.add(fn),removeListener:fn=>listeners.delete(fn)}}};
 for(const name of ['settings.js','campus-data.js','exam-data.js','preferences.js','schedule-history.js','background.js','popup.js','backup-ui.js','site-settings.js'])if(fs.existsSync(base+name))w.eval(source(name));
 w.CampusFiles={save:(...args)=>saved=args};
 assert.equal(typeof w.CampusSiteSettings?.mount,'function','on-site settings required');
 const root=w.document.querySelector('#host').attachShadow({mode:'open'});
 const view=w.CampusSiteSettings.mount({root,request:async()=>[{title:'Programming',url:'https://campus.qairu.edu.kz/ru/courses/code'}]});await tick();await tick();
 assert.equal(root.querySelector('#scale').value,'125');const mode=root.querySelector('input[name="mode"][value="dark"]');mode.checked=true;mode.dispatchEvent(new w.Event('change'));await tick();await tick();assert.equal(state.campusNight.mode,'dark');assert.equal(state.campusNight.scale,125);
 root.querySelector('#backup-export').click();await tick();assert.equal(JSON.parse(saved[0]).data.campusNight.mode,'dark');
 const search=root.querySelector('#campus-search');search.value='program';search.dispatchEvent(new w.Event('input'));await tick();assert.match(root.querySelector('#search-results').textContent,/Programming/);assert.doesNotMatch(root.querySelector('#search-results').textContent,/Math favorite/);
 search.value='math';search.dispatchEvent(new w.Event('input'));await tick();assert.match(root.querySelector('#search-results').textContent,/Math favorite/);
 assert.match(root.querySelector('#saved-notes')?.textContent||'',/Old completed task/,'historical notes remain manageable');root.querySelector('#saved-notes button').click();await tick();assert.equal(state.campusTaskNotes[oldTask],undefined);
 view.destroy();assert.equal(listeners.size,0,'unmount cleans controllers');w.close();console.log('PASS on-site settings: existing values, theme update, local backup, course/favorite search, cleanup.');
})().catch(error=>{console.error(error);process.exitCode=1;});
