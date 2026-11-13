const fs=require('fs'),assert=require('assert/strict');
const {JSDOM}=require('jsdom');
const source=name=>fs.readFileSync('extension/'+name,'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const shell='<div class="adm-shell"><header><h1>Курсы</h1></header><main class="adm-shell__content"><div class="cmp-content"><h1 class="cmp-cd-head__title">Тестовый курс</h1><p id="original-content">Учебные материалы</p></div></main></div>';
async function run(){
  const storage={campusNight:{mode:'off',scale:125},campusFavorites:[{title:'Сохранённый курс',url:'https://campus.qairu.edu.kz/ru/courses/saved'}]};
  const listeners=new Set(),requests=[],timers=new Map();let timerID=0,writeHandler;
  const d=new JSDOM(shell,{url:'https://campus.qairu.edu.kz/ru/courses/demo',runScripts:'outside-only',pretendToBeVisual:true});const w=d.window;
  w.setInterval=(fn,ms)=>{const id=++timerID;timers.set(id,{fn,ms});return id;};w.clearInterval=id=>timers.delete(id);
  const local={get:async key=>({[key]:storage[key]}),set:async changes=>{Object.assign(storage,changes);listeners.forEach(fn=>fn(Object.fromEntries(Object.entries(changes).map(([k,v])=>[k,{newValue:v}])),'local'));}};
  w.browser={storage:{local,onChanged:{addListener:fn=>listeners.add(fn),removeListener:fn=>listeners.delete(fn)}},commands:{onCommand:{addListener(){}}},runtime:{onMessage:{addListener:fn=>writeHandler=fn},sendMessage:msg=>writeHandler(msg)}};
  for(const name of ['settings.js','campus-data.js','exam-data.js','exam-sessions.js','preferences.js','schedule-history.js','task-notes-ui.js','calendar.js','background.js','dashboard.js','session-ui.js','exams.js','popup.js','backup-ui.js','site-settings.js'])w.eval(source(name));
  w.CampusService={request:async type=>{
    requests.push(type);
    if(type==='campus:page')return w.CampusData.page(w.document,w.location.href);
    if(type==='campus:exams')return {value:{verifiedAt:Date.now(),source:w.CampusData.origin+w.CampusExams.sourcePath,courses:[w.CampusExams.match({title:w.CampusExams.titles.ai,stream:2,group:6},[])]}};
    return {fetchedAt:Date.now(),schedule:{lessons:[{title:'Ближайшая пара',start:Date.now()+600000,end:Date.now()+3600000,room:'224',type:'Практика',teacher:'Преподаватель'}]},assignments:[],errors:[null,null]};
  }};
  w.eval(source('site-panel.js'));await tick();await tick();
  let host=w.document.querySelector('#campus-night-panel'),root=host.shadowRoot;
  assert(host);assert.equal(host.parentElement.firstElementChild,host);assert.match(root.textContent,/Ближайшая пара/);assert.match(root.querySelector('#next-class').textContent,/Через 10 мин/);assert.match(root.querySelector('#favorite-list').textContent,/Сохранённый курс/);
  assert.equal(w.document.querySelector('#original-content').textContent,'Учебные материалы');assert.equal(timers.size,2);assert.equal(listeners.size,8);
  root.querySelector('[data-panel="appearance"]').click();assert.equal(root.querySelector('#appearance').hidden,false);assert.equal(root.querySelector('#scale').value,'125');root.querySelector('[data-panel="today"]').click();
  root.querySelector('#add-favorite').click();await tick();await tick();assert.equal(storage.campusFavorites.length,2);assert.equal(storage.campusFavorites[1].title,'Тестовый курс');
  assert.equal(storage.campusNight.mode,'off');assert.equal(storage.campusNight.scale,125,'old presentation settings stay unchanged');
  root.querySelector('[data-panel="exams"]').click();root.querySelector('#refresh-exams').click();await tick();await tick();assert.match(root.querySelector('#exam-list').textContent,/Защита проекта/);
  root.querySelector('#panel-toggle').click();await tick();assert.equal(storage.campusPanel.collapsed,true);assert.equal(root.querySelector('#panel-content').hidden,true);assert.equal(root.querySelector('#panel-toggle').getAttribute('aria-expanded'),'false');
  const before=requests.length;for(const timer of timers.values())timer.fn();await tick();assert.equal(requests.length,before,'collapsed panel never auto-fetches');
  // React replaces the authenticated content container during a route transition.
  const replacement=w.document.createElement('main');replacement.className='adm-shell__content';replacement.innerHTML='<h1 class="cmp-cd-head__title">Другой курс</h1>';
  w.document.querySelector('.adm-shell__content').replaceWith(replacement);await tick();await tick();
  host=w.document.querySelector('#campus-night-panel');root=host.shadowRoot;
  assert.equal(w.document.querySelectorAll('#campus-night-panel').length,1);assert.equal(timers.size,2,'SPA remount does not leak timers');assert.equal(listeners.size,8,'SPA remount does not leak storage listeners');assert.equal(root.querySelector('#panel-content').hidden,true);assert.equal(requests.length,before,'collapsed remount does not fetch');
  root.querySelector('#panel-toggle').click();await tick();await tick();assert.equal(requests.length,before+1);assert.equal(storage.campusPanel.collapsed,false);
  // External storage updates synchronize the collapse state.
  await local.set({campusPanel:{collapsed:true}});assert.equal(root.querySelector('#panel-content').hidden,true);
  replacement.append(w.document.createElement('p'));await tick();assert.equal(w.document.querySelector('#campus-night-panel'),host,'ordinary mutations reuse the panel');
  const notebook=w.document.createElement('div');notebook.className='cmp-nb';replacement.append(notebook);await tick();assert.equal(w.document.querySelector('#campus-night-panel'),null,'fixed-height notebook is not squeezed');notebook.remove();await tick();await tick();assert(w.document.querySelector('#campus-night-panel'));
  w.history.pushState({},'', '/login');replacement.innerHTML='<input type="password">';await tick();assert.equal(w.document.querySelector('#campus-night-panel'),null);assert.equal(timers.size,0,'logout removes every panel timer');assert.equal(listeners.size,1,'only permanent preference listener remains');
  w.document.body.innerHTML=shell;w.history.pushState({},'', '/ru');await tick();await tick();root=w.document.querySelector('#campus-night-panel').shadowRoot;assert.equal(root.querySelector('#panel-content').hidden,true,'collapsed choice persists on mount');
  w.close();console.log('PASS: in-page placement, existing site content/settings preserved, favorites and exam UI, collapsed no-fetch, SPA remounts without duplicated panels/listeners/timers, storage sync, logout removal.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
