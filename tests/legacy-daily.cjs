const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const base='extension/';
const source=n=>fs.readFileSync(base+n,'utf8');
const dom=html=>new JSDOM(html,{url:'https://campus.qairu.edu.kz/ru',runScripts:'outside-only'});
const now=Date.parse('2026-11-13T12:00:00+05:00');
const d=dom('');d.window.eval(source('campus-data.js'));const C=d.window.CampusData;
assert.equal(typeof C.assignmentDeadline,'function','exact deadline parser is required');
const detail=(...chips)=>dom('<h1>Task</h1><div class="cmp-deadline-row__chips">'+chips.map(x=>`<span>${x}</span>`).join('')+'</div>').window.document;
assert.equal(C.assignmentDeadline(detail('Не сдано','до 13 ноя, 23:59'),now),Date.parse('2026-11-13T23:59:00+05:00'));
assert.equal(C.assignmentDeadline(detail('до 1 янв, 00:15'),Date.parse('2026-12-31T12:00:00+05:00')),Date.parse('2027-01-01T00:15:00+05:00'));
assert.equal(C.assignmentDeadline(detail('до 13 ноября 2026, 09:05'),now),Date.parse('2026-11-13T09:05:00+05:00'));
for(const invalid of ['до 31 ноя, 12:00','до 13 ноя, 25:00','до 13 ноя','Сдано 13 ноя, 12:00','до 13 ноя, 12:99'])assert.equal(C.assignmentDeadline(detail(invalid),now),null,invalid);
assert.equal(C.assignmentDeadline(detail('до 13 ноя, 12:00','до 14 ноя, 12:00'),now),null,'conflicting exact deadlines remain unknown');
assert.equal(C.assignmentDeadline(dom('<h1>Task</h1><p>до 13 ноя, 12:00</p>').window.document,now),null,'do not parse instructions as deadlines');
assert.equal(C.assignmentDeadline(detail('до 13 ноя, 12:00'),now,C.today(now)+86400000),null,'day hint mismatch fails closed');
assert.equal(C.assignmentDeadline(detail('до 13 ноя, 12:00'),now,C.today(now)),now);
d.window.close();console.log('PASS exact deadlines: actual chip format, UTC+5, year rollover, invalid dates, ambiguity and day-only fallback.');
(async()=>{
  const d=dom('<h1>Campus</h1>'),w=d.window;let listener,calls=0,active=0,peak=0;
  w.AbortSignal=AbortSignal;w.browser={runtime:{onMessage:{addListener:fn=>listener=fn}}};
  w.fetch=async(url,options)=>{calls++;active++;peak=Math.max(peak,active);assert.equal(options.credentials,'same-origin');assert.equal(options.redirect,'error');await new Promise(r=>setTimeout(r,5));active--;return {ok:true,text:async()=>'<h1>Task</h1><div class="cmp-deadline-row__chips"><span>до 13 ноя 2026, 23:59</span></div>'};};
  w.eval(source('campus-data.js'));w.eval(source('dashboard-content.js'));
  const request=url=>listener({type:'campus:deadline',url,dayHint:C.today(now)});
  const one=await request('https://campus.qairu.edu.kz/ru/assignments/a');
  assert.equal(one?.dueAt,Date.parse('2026-11-13T23:59:00+05:00'),'collector reads exact deadline');
  await request('https://campus.qairu.edu.kz/ru/assignments/a');assert.equal(calls,1,'short-lived cache avoids duplicate requests');
  await Promise.all(['b','c','d','e'].map(id=>request('https://campus.qairu.edu.kz/ru/assignments/'+id)));assert.ok(peak<=2,'at most two detail requests');
  const before=calls;for(const url of ['https://evil.example/ru/assignments/a','https://campus.qairu.edu.kz/ru/grades','https://campus.qairu.edu.kz/api/storage/id'])assert.equal((await request(url)).dueAt,null);assert.equal(calls,before,'invalid detail URLs never fetched');
  w.fetch=async()=>({ok:false});assert.equal((await request('https://campus.qairu.edu.kz/ru/assignments/f')).dueAt,null,'failure stays unknown');
  w.close();console.log('PASS deadline collector: allowed detail reads, bounded concurrency, deduplication and failure fallback.');
})().catch(error=>{console.error(error);process.exitCode=1;});
(async()=>{
 const d=dom(source('popup.html')),w=d.window;w.Date=class extends Date{static now(){return now;}};
 w.browser={storage:{local:{get:async()=>({})},onChanged:{addListener(){},removeListener(){}}}};
 w.eval(source('campus-data.js'));w.eval(source('dashboard.js'));
 const before={title:'Math',start:now,end:now+3600000,room:'200'},after={...before,room:'219'};
 const data={fetchedAt:now,schedule:{lessons:[]},scheduleRecord:{scope:'a'.repeat(64),from:C.today(now),revision:1,changes:[{kind:'changed',before,after,observedAt:now}]},assignments:[{url:C.origin+'/ru/assignments/a',title:'Exact task',course:'Course',due:C.today(now),overdue:false}],errors:[]};
 const view=w.CampusDashboard.mount({request:async type=>type==='campus:deadline'?{dueAt:now+7200000}:data});
 await new Promise(r=>setTimeout(r,20));
 try{
 assert.match(w.document.querySelector('#deadlines').textContent,/14:00/,'visible exact time');
 assert.match(w.document.querySelector('#deadlines').textContent,/2 ч/,'visible countdown');
 assert.match(w.document.querySelector('#schedule-changes')?.textContent||'',/200.*219/,'schedule UI shows old and new room');
 }finally{view.destroy();w.close();}
 console.log('PASS dashboard UI: exact deadline/countdown and before/after schedule changes.');
})().catch(error=>{console.error(error);process.exitCode=1;});
