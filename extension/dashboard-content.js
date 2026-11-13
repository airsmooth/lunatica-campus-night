(() => {
  'use strict';
  if (window !== window.top) return;
  let pending;
  let examsPending;
  let examSessionRevision=0;
  if(browser.storage?.onChanged)browser.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.campusExamSession){examSessionRevision++;examsPending=null;}});
  const deadlineCache=new Map(),deadlineWaiting=[];
  let deadlineActive=0;
  function pumpDeadlines(){
    while(deadlineActive<2&&deadlineWaiting.length){
      const run=deadlineWaiting.shift();deadlineActive++;
      run().finally(()=>{deadlineActive--;pumpDeadlines();});
    }
  }
  function loadDeadline(payload){
    const url=CampusData.safeURL(payload?.url);
    if(!url||!/^\/(ru|kk|en)\/assignments\/[^/]+\/?$/.test(new URL(url).pathname))return Promise.resolve({dueAt:null});
    const dayHint=Number.isFinite(payload.dayHint)?CampusData.today(payload.dayHint):null;
    const key=JSON.stringify([url,dayHint]),cached=deadlineCache.get(key);
    if(cached&&Date.now()-cached.at<120000)return cached.promise;
    if(deadlineWaiting.length>=100)return Promise.resolve({dueAt:null});
    const promise=new Promise(resolve=>{
      deadlineWaiting.push(async()=>{
        try{resolve({dueAt:await readPage(new URL(url).pathname,doc=>CampusData.assignmentDeadline(doc,Date.now(),dayHint))});}
        catch{resolve({dueAt:null});}
      });pumpDeadlines();
    });
    deadlineCache.set(key,{promise,at:Date.now()});
    if(deadlineCache.size>200)deadlineCache.delete(deadlineCache.keys().next().value);
    return promise;
  }
  async function readPage(path, parser) {
    const response = await fetch(CampusData.origin + path, {credentials:'same-origin', cache:'no-store', redirect:'error', signal:AbortSignal.timeout(20000)});
    if (!response.ok) throw new Error('Войдите в кампус и повторите обновление.');
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    if (!doc.querySelector('h1') || doc.querySelector('input[type="password"]')) throw new Error('Войдите в кампус и повторите обновление.');
    return parser(doc);
  }
  async function loadExams() {
    const revision=examSessionRevision;
    const session=globalThis.CampusSessions?(await browser.storage.local.get(CampusSessions.key))[CampusSessions.key]||null:null;
    const engine=globalThis.CampusSessions?CampusSessions.engine(session):CampusExams;
    const documents=await readPage('/ru/documents',doc=>[...doc.querySelectorAll('a[href]')].map(a=>({href:a.getAttribute('href'),title:a.getAttribute('aria-label') || CampusData.text(a.parentElement)})));
    const sessionDocuments=documents.filter(x=>globalThis.CampusSessions?CampusSessions.documentMatches(session,x):/экзамен/i.test(x.title)&&/бакалавр/i.test(x.title)&&/2026/.test(x.title)&&/ноябр/i.test(x.title));
    const sourceURLs=[...new Set(sessionDocuments.map(x=>x.href))];
    if (sourceURLs.length!==1 || sourceURLs[0]!==engine.sourcePath) throw new Error('Файл расписания этой сессии изменён или найдено несколько версий. Старые даты скрыты: откройте документы университета и уточните актуальный файл.');
    const response=await fetch(CampusData.origin+engine.sourcePath,{credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
    if(!response.ok) throw new Error('Не удалось проверить исходный PDF. Войдите в кампус и повторите.');
    const bytes=await response.arrayBuffer();
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
    if(hash!==engine.sha256) throw new Error('Университет изменил PDF. Старые даты скрыты; нужна сверка новой таблицы. Откройте оригинал в документах университета.');
    const [schedule,courses]=await Promise.all([
      readPage('/ru/schedule',CampusData.schedule).catch(()=>({lessons:[]})),
      readPage('/ru/courses',doc=>CampusData.courses(doc).filter(x=>Object.values(engine.titles).includes(x.title)))
    ]);
    if(!courses.length) throw new Error('Не найдены ваши дисциплины для этой экзаменационной сессии.');
    const results=[];
    // Limit concurrent page requests. Only the course heading is read, never grades or work.
    for(let i=0;i<courses.length;i+=2) {
      results.push(...await Promise.all(courses.slice(i,i+2).map(async course=>{
        try {
          const meta=await readPage(new URL(course.url).pathname,doc=>CampusData.text(doc.querySelector('.cmp-cd-head__meta')));
          const stream=meta.match(/Поток\s+(\d+)/i),group=meta.match(/Группа\s*[—–-]?\s*Практика\s+(\d+)/i);
          const teacher=meta.match(/Преподаватель\s*[—–-]?\s*(.+)$/i)?.[1]||'';
          return engine.match({...course,stream:stream?+stream[1]:null,group:group?+group[1]:null,teacher,examHash:engine.sha256},schedule.lessons);
        } catch { return {...course,matches:[],issue:'Не удалось загрузить данные группы. Повторите обновление.'}; }
      })));
    }
    if(revision!==examSessionRevision)throw Error('Таблица сессии изменилась во время проверки. Повторите обновление.');
    return {courses:results,session,sessionTitle:session?.title||'Бакалавриат · ноябрь 2026',verifiedAt:Date.now(),source:CampusData.origin+engine.sourcePath};
  }
  function request(type,payload={}) {
    const message={type};
    if(type==='campus:deadline')return loadDeadline(payload);
    if(type==='campus:courses')return readPage('/ru/courses',CampusData.courses);
    if (message?.type === 'campus:page') return Promise.resolve(CampusData.page(document, location.href));
    if (message?.type === 'campus:exams') {
      if(!examsPending){const current=loadExams().then(value=>({value})).catch(error=>({error:error.message})).finally(()=>{if(examsPending===current)examsPending=null;});examsPending=current;}
      return examsPending;
    }
    if (message?.type !== 'campus:dashboard') return;
    if (!pending) pending = Promise.allSettled([
      readPage('/ru/schedule', CampusData.schedule),
      readPage('/ru/assignments', CampusData.assignments),
      readPage('/ru/courses',CampusData.courses)
    ]).then(async results => {
      const data={fetchedAt:Date.now(), schedule:results[0].status === 'fulfilled' ? results[0].value : null,
      assignments:results[1].status === 'fulfilled' ? results[1].value : null,
      courses:results[2].status === 'fulfilled'?results[2].value:null,
      errors:results.map(r=>r.status === 'rejected' ? r.reason.message : null)};
      if(data.schedule&&data.courses?.length&&typeof browser.runtime.sendMessage==='function'){
        try{
          const bytes=new TextEncoder().encode(data.courses.map(x=>new URL(x.url).pathname.replace(/^\/(kk|en)\//,'/ru/')).sort().join('\n'));
          const scope=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
          const reply=await browser.runtime.sendMessage({type:'campus:schedule-observe',scope,schedule:data.schedule});
          if(!reply?.record)throw Error(reply?.error||'Сравнение расписания недоступно.');
          data.scheduleRecord=reply.record;
        }catch{data.historyError='Не удалось сохранить сравнение расписания. Текущее расписание загружено.';}
      }
      return data;
    }).finally(()=>{pending=null;});
    return pending;
  }
  globalThis.CampusService={request};
  browser.runtime.onMessage.addListener(message=>request(message?.type,message));
})();
