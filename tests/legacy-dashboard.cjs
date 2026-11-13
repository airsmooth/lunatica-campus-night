const fs=require('node:fs');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {webcrypto}=require('node:crypto');
const base='extension/';
const source=n=>fs.readFileSync(base+n,'utf8');
const now=Date.parse('2026-11-12T08:30:00+05:00');
const html='<h1>Расписание</h1><div class="cmp-grid"><div class="cmp-grid__row cmp-grid__row--head">'+['9 ноя','10 ноя','11 ноя','12 ноя','13 ноя','14 ноя'].map(d=>`<span class="cmp-grid__daydate">${d}</span>`).join('')+'</div><div class="cmp-grid__row"><span class="cmp-grid__timerange">09:00–09:50</span>'+Array.from({length:6},(_,i)=>`<span class="cmp-grid__cell">${i===3?'<div class="qui-meet"><span class="qui-meet__title">Основы искусственного интеллекта</span><span class="qui-meet__type">Практика 6</span><span class="qui-meet__room">ауд. 222</span><span class="qui-meet__people">Преподаватель</span><span class="qui-meet__note">Английский · AI&amp;ML</span></div>':''}</span>`).join('')+'</div></div>';
function task(id,status,due=''){return `<div class="qui-row"><a class="qui-row__texts" href="/ru/assignments/${id}"><span>${id}</span><span>Курс</span></a><span class="cmp-deadline-row__chips">${due} ${status}</span></div>`;}
const assignments='<h1>Задания</h1><div class="cmp-toolbar"></div>'+task('today','Не сдано','Сегодня')+task('soon','Не сдано','Осталось 3 дня')+task('later','Не сдано','Осталось 12 дней')+task('late','Не сдано','Просрочено')+task('undated','Не сдано')+task('graded','Оценено','Просрочено')+task('review','На проверке')+task('closed','Не сдано','Ведомость закрыта')+task('optional','','Срок 12 ноя');
function dom(markup=''){return new JSDOM(markup,{url:'https://campus.qairu.edu.kz/ru/schedule',runScripts:'outside-only'});}
function load(w,...files){for(const f of files)w.eval(source(f));}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function run(){
  const d=dom(html);load(d.window,'campus-data.js','exam-data.js');const C=d.window.CampusData,E=d.window.CampusExams;
  const schedule=C.schedule(d.window.document,now);assert.equal(schedule.lessons.length,1);assert.equal(schedule.lessons[0].start,Date.parse('2026-11-12T09:00:00+05:00'));assert.equal(schedule.lessons[0].end,Date.parse('2026-11-12T09:50:00+05:00'));
  assert.equal(C.dateLabel('2 янв',Date.parse('2026-12-30T12:00:00Z')),Date.parse('2027-01-02T00:00:00+05:00'));
  assert.equal(C.today(Date.parse('2026-11-11T19:01:00Z')),Date.parse('2026-11-12T00:00:00+05:00'));
  assert.throws(()=>C.schedule(dom('<h1>Login</h1>').window.document,now));
  const items=C.assignments(dom(assignments).window.document,now);assert.equal(items.length,5);assert.equal(items[0].title,'late');assert.equal(items.find(x=>x.title==='undated').due,null);assert.equal(items.find(x=>x.title==='soon').due,Date.parse('2026-11-15T00:00:00+05:00'));
  for(const bad of ['https://evil.example/ru','javascript:alert(1)','https://campus.qairu.edu.kz.evil/ru','/api/delete','/ru/logout','https://u:p@campus.qairu.edu.kz/ru'])assert.equal(C.safeURL(bad),null,bad);
  assert.equal(C.safeURL('/ru/courses/test?token=secret#section-summary'),'https://campus.qairu.edu.kz/ru/courses/test#section-summary');
  let exam=E.match({title:E.titles.ai,stream:2,group:6},schedule.lessons);assert.equal(exam.matches.length,1);assert.equal(exam.matches[0].date,'2026-11-25');assert.equal(exam.matches[0].room,'224');assert.equal(exam.matches[0].format,'Защита проекта');
  exam=E.match({title:E.titles.math,stream:1,group:3},[{title:E.titles.math,note:'Английский'}]);assert.equal(exam.matches.length,2,'split practice must never select one random session');
  assert.equal(E.match({title:E.titles.ai,stream:2,group:1},[{title:E.titles.ai,note:'Казахский'}]).matches.length,0,'do not match other language');
  assert.equal(E.match({title:E.titles.ai,stream:2,group:6},[]).matches[0].room,'224','unique language in verified stream survives exam week');
  assert.equal(E.match({title:E.titles.math,stream:1,group:2,teacher:'Ansar Berdiqozha'},[]).matches[0].time,'11:00–12:40','known instructor identifies language without teaching week');
  assert.equal(E.match({title:E.titles.math,stream:1,group:2,teacher:'Unknown'},[]).matches.length,0,'unknown language must stay unresolved');
  assert.equal(E.match({title:E.titles.math,stream:1,group:2},[],'kk').matches[0].room,'219','explicit language selection can resolve missing evidence');
  // Real collector, exact allowed endpoints, and byte-level source verification.
  const w=d.window;let listener;const requests=[];
  // Public test fixtures must not depend on a document from a private campus session.
  const syntheticPDF=new TextEncoder().encode('%PDF-1.4 synthetic test document');
  w.CampusExams={...E,sha256:require('node:crypto').createHash('sha256').update(syntheticPDF).digest('hex')};
  Object.defineProperty(w,'crypto',{value:webcrypto});w.AbortSignal=AbortSignal;
  w.browser={runtime:{onMessage:{addListener:fn=>listener=fn}}};
  let mismatch=false,duplicateDocument=false,emptyTeachingWeek=false;
  w.fetch=async(url,options)=>{
    requests.push({url,options});assert.equal(options.credentials,'same-origin');assert.equal(options.redirect,'error');
    const pathname=new URL(url).pathname;let body;
    if(pathname===E.sourcePath)return {ok:true,arrayBuffer:async()=>mismatch?new Uint8Array([1,2,3]).buffer:syntheticPDF.buffer};
    if(pathname==='/ru/schedule')body=emptyTeachingWeek?'<h1>Расписание</h1><p>Занятий нет</p>':html;
    else if(pathname==='/ru/assignments')body=assignments;
    else if(pathname==='/ru/documents')body=`<h1>Документы</h1><a aria-label="${E.sourceTitle}" href="${E.sourcePath}">${E.sourceTitle}</a>`+(duplicateDocument?'<a aria-label="Расписание экзаменов: бакалавриат, ноябрь 2026, исправлено" href="/api/storage/revised">Исправлено</a>':'');
    else if(pathname==='/ru/courses')body=`<h1>Курсы</h1><article><a href="/ru/courses/test"><h3>${E.titles.ai}</h3></a></article>`;
    else if(pathname==='/ru/courses/test')body='<h1>Курс</h1><div class="cmp-cd-head__meta">Поток 2 Группа — Практика 6</div>';
    else throw new Error('Unexpected request: '+pathname);
    return {ok:true,text:async()=>body};
  };
  load(w,'dashboard-content.js');
  const result=await listener({type:'campus:dashboard'});assert.equal(result.schedule.lessons.length,1);assert.equal(result.assignments.length,5);
  const exams=await listener({type:'campus:exams'});assert.equal(exams.value.courses[0].matches[0].room,'224');
  emptyTeachingWeek=true;assert.equal((await listener({type:'campus:exams'})).value.courses[0].matches[0].room,'224');emptyTeachingWeek=false;
  duplicateDocument=true;assert.match((await listener({type:'campus:exams'})).error,/несколько версий/);duplicateDocument=false;
  mismatch=true;const blocked=await listener({type:'campus:exams'});assert.match(blocked.error,/изменил PDF/);assert.equal(blocked.value,undefined);
  w.fetch=async()=>({ok:true,text:async()=>'<h1>Вход</h1><input type="password">'});const auth=await listener({type:'campus:dashboard'});assert.equal(auth.schedule,null);assert.equal(auth.assignments,null);assert.match(auth.errors[0],/Войдите/);
  // Popup interactions with persistent storage shared between reopened windows.
  const storage={campusNight:{mode:'off',scale:125}};let messages=0;let favoriteHandler;const callbacks=[];
  const bg=dom();bg.window.browser={commands:{onCommand:{addListener(){}}},runtime:{onMessage:{addListener:fn=>favoriteHandler=fn}},storage:{local:{get:async key=>({[key]:storage[key]}),set:async obj=>{Object.assign(storage,obj);callbacks.forEach(fn=>fn(Object.fromEntries(Object.entries(obj).map(([k,v])=>[k,{newValue:v}])),'local'));}}}};load(bg.window,'settings.js','campus-data.js','background.js');
  function popup(){
    const p=dom(source('popup.html'));const win=p.window;
    win.Date=class extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}};
    win.browser={runtime:{sendMessage:message=>favoriteHandler(message)},tabs:{query:async()=>[{id:1,active:true,url:'https://campus.qairu.edu.kz/ru/courses/test'}],sendMessage:async(id,msg)=>{messages++;return msg.type==='campus:page'?{url:'https://campus.qairu.edu.kz/ru/courses/test',title:'Тестовый курс'}:msg.type==='campus:exams'?exams:{...result,schedule,assignments:items};}},storage:{local:{get:async key=>({[key]:storage[key]}),set:async obj=>{Object.assign(storage,obj);for(const callback of callbacks)callback(Object.fromEntries(Object.entries(obj).map(([k,v])=>[k,{newValue:v}])),'local');}},onChanged:{addListener:fn=>callbacks.push(fn),removeListener:fn=>{const i=callbacks.indexOf(fn);if(i>=0)callbacks.splice(i,1);}}}};
    load(win,'settings.js','campus-data.js','dashboard.js','exam-data.js','preferences.js','calendar.js','exams.js','popup.js','popup-start.js');return p;
  }
  let p=popup();await tick();await tick();let doc=p.window.document;
  assert.match(doc.querySelector('#next-class').textContent,/Через 30 мин/);assert.match(doc.querySelector('#next-class').textContent,/222/);assert.equal(doc.querySelector('input[value="off"]').checked,true);
  assert.match(doc.querySelector('#deadlines').textContent,/soon/);assert.doesNotMatch(doc.querySelector('#deadlines').textContent,/later/);
  const select=doc.querySelector('#deadline-filter');select.value='today';select.dispatchEvent(new p.window.Event('change'));assert.doesNotMatch(doc.querySelector('#deadlines').textContent,/soon/);assert.match(doc.querySelector('#deadlines').textContent,/late/);
  doc.querySelector('#deadlines details').open=true;select.value='all';select.dispatchEvent(new p.window.Event('change'));assert.equal(doc.querySelector('#deadlines details').open,true,'expanded undated section survives rerender');
  doc.querySelector('[data-panel="favorites"]').click();assert.equal(doc.querySelector('#favorites').hidden,false);assert.equal(doc.querySelector('#today').hidden,true);
  doc.querySelector('#add-favorite').click();await tick();await tick();assert.equal(storage.campusFavorites.length,1);doc.querySelector('#add-favorite').click();await tick();assert.equal(storage.campusFavorites.length,1);
  p.window.close();p=popup();await tick();await tick();doc=p.window.document;assert.match(doc.querySelector('#favorite-list').textContent,/Тестовый курс/);doc.querySelector('#favorite-list button').click();await tick();assert.equal(storage.campusFavorites.length,0);
  doc.querySelector('#refresh-exams').click();await tick();await tick();assert.match(doc.querySelector('#exam-list').textContent,/среда, 25 ноября/);assert.match(doc.querySelector('#exam-list').textContent,/224/);
  p.window.close();d.window.close();
  await Promise.all(['a','b','c'].map(id=>favoriteHandler({type:'campus:favorite-change',change:{add:{title:id,url:'https://campus.qairu.edu.kz/ru/courses/'+id}}})));assert.equal(storage.campusFavorites.length,3,'concurrent writers preserve all favorites');bg.window.close();
  console.log('PASS: schedule time zone/year rollover, deadlines/status exclusions, URL restrictions, exam group/language/split sessions, source hash changes, login expiry, popup filtering, favorites reopening/dedup/removal, existing settings, exam rendering.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
