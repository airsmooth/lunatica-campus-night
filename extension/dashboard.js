(() => {
  'use strict';
  function mount({root=document, request=null, autoLoad=true, isActive=()=>true}={}) {
  const $ = selector => root.querySelector(selector);
  const notes=globalThis.CampusTaskNotes?.mount({root});
  let disposed=false;
  let data = null;
  let favorites = [];
  const favoritesKey = 'campusFavorites';
  const dateFormat = new Intl.DateTimeFormat('ru-RU', {timeZone:'Asia/Almaty', day:'numeric', month:'short', weekday:'short'});
  const timeFormat = new Intl.DateTimeFormat('ru-RU', {timeZone:'Asia/Almaty',hour:'2-digit',minute:'2-digit'});
  function element(tag, label, className) {
    const el = document.createElement(tag);
    if (label) el.textContent = label;
    if (className) el.className = className;
    return el;
  }
  function link(title, url) {
    const el = element('a', title);
    el.href = url; el.target = '_blank'; el.rel = 'noopener';
    return el;
  }
  function empty(container, message) { container.replaceChildren(element('p', message, 'empty')); }
  async function campusTab(activeOnly = false) {
    const tabs = await browser.tabs.query(activeOnly ? {active:true,currentWindow:true} : {url:CampusData.origin+'/*'});
    const candidates = tabs.filter(t => CampusData.safeURL(t.url));
    candidates.sort((a,b)=>Number(b.active)-Number(a.active)||(b.lastAccessed||0)-(a.lastAccessed||0));
    if (!candidates.length) throw new Error(activeOnly ? 'Откройте нужную страницу кампуса в активной вкладке.' : 'Откройте кампус в Firefox и войдите в кабинет.');
    return candidates[0];
  }
  async function message(tab, type, payload={}) {
    try { return await browser.tabs.sendMessage(tab.id, {type,...payload}, {frameId:0}); }
    catch { throw new Error('Обновите вкладку кампуса после установки расширения, затем повторите.'); }
  }
  function renderSchedule() {
    const box = $('#next-class');
    if (!data?.schedule) return empty(box, data?.errors?.[0] || 'Расписание пока не загружено.');
    const now = Date.now();
    const next = data.schedule.lessons.find(x=>x.end > now);
    box.replaceChildren();
    if (!next) return empty(box, 'В загруженной неделе больше нет пар. Следующую неделю можно посмотреть в расписании кампуса.');
    const minutes = Math.max(1, Math.ceil((next.start-now)/60000));
    const remaining = Math.max(1, Math.ceil((next.end-now)/60000));
    const countdown = next.start <= now ? `Идёт сейчас · ещё ${remaining} мин` : minutes < 60 ? `Через ${minutes} мин` : minutes < 1440 ? `Через ${Math.floor(minutes/60)} ч ${minutes%60} мин` : dateFormat.format(next.start);
    box.append(element('p', countdown, 'eyebrow'), element('h3', next.title),
      element('p', `${dateFormat.format(next.start)} · ${timeFormat.format(next.start)}–${timeFormat.format(next.end)}`, 'when'),
      element('p', [next.room,next.type].filter(Boolean).join(' · ')), element('p', next.teacher),
      link('Расписание ↗', CampusData.origin+'/ru/schedule'));
  }
  function renderChanges(){
    let box=$('#schedule-changes');
    if(!box){box=element('details');box.id='schedule-changes';$('#next-class').after(box);}
    const record=data?.scheduleRecord,changes=record?.changes||[];
    box.hidden=!changes.length&&!data?.historyError;box.replaceChildren();
    if(!changes.length){if(data?.historyError)box.append(element('summary',data.historyError));return;}
    box.append(element('summary',`Изменения расписания · ${changes.length}`));
    box.append(element('p','Сравнение с предыдущей успешной загрузкой этой недели. Изменения замечены расширением; проверьте расписание кампуса.'));
    const when=lesson=>`${dateFormat.format(lesson.start)}, ${timeFormat.format(lesson.start)}–${timeFormat.format(lesson.end)}${lesson.room?' · '+lesson.room:''}`;
    for(const change of changes){
      const row=element('article',null,'schedule-change'),lesson=change.after||change.before;
      if(!lesson)continue;
      row.append(element('strong',lesson.title));
      if(change.kind==='changed'){row.append(element('p','Было: '+when(change.before)),element('p','Стало: '+when(change.after)));}
      else row.append(element('p',(change.kind==='added'?'Добавлено: ':'Больше не показано: ')+when(lesson)));
      if(Number.isFinite(change.observedAt))row.append(element('small','Замечено '+dateFormat.format(change.observedAt)+' в '+timeFormat.format(change.observedAt)));
      box.append(row);
    }
    const ack=element('button','Отметить просмотренным'),status=element('p');ack.type='button';status.setAttribute('role','status');
    ack.addEventListener('click',async()=>{
      ack.disabled=true;
      try{
        const reply=await browser.runtime.sendMessage({type:'campus:schedule-ack',scope:record.scope,from:record.from,revision:record.revision});
        if(!reply?.history)throw Error(reply?.error||'Не удалось сохранить. Повторите.');
        if(data?.scheduleRecord===record){data.scheduleRecord=reply.history.find(r=>r.scope===record.scope&&r.from===record.from)||null;renderChanges();}
      }catch(error){status.textContent=error.message;ack.disabled=false;}
    });box.append(ack,status);
  }
  function renderDeadlines() {
    if(notes?.busy())return;
    const box = $('#deadlines');
    const wasOpen=box.querySelector('details')?.open || false;
    if (!data?.assignments) return empty(box, data?.errors?.[1] || 'Задания пока не загружены.');
    const now = Date.now(), today = CampusData.today(now), filter = $('#deadline-filter').value;
    const end = today + (filter === 'today' ? 1 : 7)*86400000;
    const dated = data.assignments.filter(x=>x.overdue || x.due!==null && (filter==='all' || x.due<end)).sort((a,b)=>Number(b.overdue)-Number(a.overdue)||(a.dueAt??(a.due===null?0:a.due+86399999))-(b.dueAt??(b.due===null?0:b.due+86399999)));
    const undated = data.assignments.filter(x=>x.due===null && !x.overdue);
    box.replaceChildren();
    if (!dated.length) box.append(element('p', 'На этот период дедлайнов нет.', 'empty'));
    function card(task) {
      const row=element('article',null,'task');
      row.append(link(task.title,task.url),element('p',task.course));
      const deadline=element('small');deadline.dataset.deadlineUrl=task.url;renderDeadline(deadline,task);row.append(deadline);
      notes?.decorate(task,row);
      return row;
    }
    for (const task of dated) box.append(card(task));
    if (undated.length) {
      const details=element('details'); const summary=element('summary',`Без срока · ${undated.length}`);
      details.open=wasOpen;details.append(summary,...undated.map(card)); box.append(details);
    }
    box.append(link('Все задания ↗',CampusData.origin+'/ru/assignments'));
  }
  function renderDeadline(label,task){
    const now=Date.now(),today=CampusData.today(now),exact=Number.isFinite(task.dueAt);
    const overdue=exact?task.dueAt<=now:task.overdue||task.due!==null&&task.due<today;
    label.className=overdue?'overdue':'due';
    if(!exact){label.textContent=overdue?'Просрочено':task.due===null?'Срок не указан':`${task.due===today?'Сегодня':dateFormat.format(task.due)} · время уточните в задании`;return;}
    const minutes=Math.max(1,Math.ceil((task.dueAt-now)/60000));
    const remaining=overdue?'Просрочено':minutes<60?`осталось ${minutes} мин`:minutes<1440?`осталось ${Math.floor(minutes/60)} ч${minutes%60?' '+minutes%60+' мин':''}`:'';
    label.textContent=`${CampusData.today(task.dueAt)===today?'Сегодня':dateFormat.format(task.dueAt)}, ${timeFormat.format(task.dueAt)} · UTC+5${remaining?' · '+remaining:''}`;
  }
  async function enrichDeadlines(current){
    let tab;try{if(!request)tab=await campusTab();}catch{return;}
    // The collector shares a two-request queue and a short-lived in-memory cache.
    await Promise.all(current.assignments.slice(0,100).map(async task=>{
      try{
        const payload={url:task.url,dayHint:task.due};
        const result=request?await request('campus:deadline',payload):await message(tab,'campus:deadline',payload);
        if(disposed||data!==current||!Number.isFinite(result?.dueAt))return;
        task.dueAt=result.dueAt;task.due=CampusData.today(task.dueAt);
        for(const label of root.querySelectorAll('[data-deadline-url]'))if(label.dataset.deadlineUrl===task.url)renderDeadline(label,task);
      }catch{/* The original day-only deadline remains visible. */}
    }));
    if(!disposed&&data===current)renderDeadlines();
  }
  async function refresh() {
    $('#refresh').disabled=true;
    $('#data-status').textContent='Читаю расписание и задания из кампуса…';
    if(!data){renderSchedule(); renderDeadlines();}
    try {
      data=request ? await request('campus:dashboard') : await message(await campusTab(),'campus:dashboard');
      if(disposed) return;
      renderSchedule(); renderDeadlines();renderChanges();
      if(Array.isArray(data.assignments))void enrichDeadlines(data);
      $('#data-status').textContent=`Обновлено в ${timeFormat.format(data.fetchedAt)} · время Астаны (UTC+5). ${data.errors.some(Boolean)?'Часть данных недоступна.':''}`;
    } catch(error) { $('#data-status').textContent=error.message; }
    finally { $('#refresh').disabled=false; }
  }
  function validFavorites(value) {
    return Array.isArray(value) ? value.filter(x=>x && CampusData.safeURL(x.url) && typeof x.title==='string').slice(0,50).map(x=>({url:CampusData.safeURL(x.url),title:x.title.slice(0,180)})) : [];
  }
  function renderFavorites() {
    const box=$('#favorite-list'); box.replaceChildren();
    if (!favorites.length) return empty(box,'Здесь будут ваши быстрые ссылки.');
    for (const favorite of favorites) {
      const row=element('div',null,'favorite'); const remove=element('button','Убрать');
      remove.setAttribute('aria-label','Убрать из избранного: '+favorite.title);
      remove.addEventListener('click',()=>changeFavorite({remove:favorite.url}));
      row.append(link(favorite.title,favorite.url),remove);box.append(row);
    }
  }
  let favoritesQueue=Promise.resolve();
  function changeFavorite(change) {
    favoritesQueue=favoritesQueue.then(async()=>{
      const result=await browser.runtime.sendMessage({type:'campus:favorite-change',change});
      if(result.error)throw new Error(result.error);
      favorites=validFavorites(result.favorites);renderFavorites();
      if(result.duplicate){$('#favorite-status').textContent='Эта страница уже в избранном.';return;}
      $('#favorite-status').textContent=change.remove?'Страница убрана.':'Добавлено. Сохранится после перезапуска Firefox.';
    }).catch(error=>{$('#favorite-status').textContent=error.message || 'Не удалось сохранить избранное.';});
    return favoritesQueue;
  }
  $('#add-favorite').addEventListener('click',async()=>{
    try { const current=request ? await request('campus:page') : await message(await campusTab(true),'campus:page'); if (!CampusData.safeURL(current.url)) throw new Error('Недопустимый адрес.'); await changeFavorite({add:current}); }
    catch(error) { $('#favorite-status').textContent=error.message; }
  });
  const storageChanged=(changes,area)=>{
    if(disposed||area!=='local')return;
    if(changes[favoritesKey]){favorites=validFavorites(changes[favoritesKey].newValue);renderFavorites();}
    if(changes.campusScheduleHistory&&data?.scheduleRecord){const old=data.scheduleRecord;data.scheduleRecord=changes.campusScheduleHistory.newValue?.find(r=>r.scope===old.scope&&r.from===old.from)||null;renderChanges();}
  };
  browser.storage.onChanged.addListener(storageChanged);
  browser.storage.local.get(favoritesKey).then(value=>{favorites=validFavorites(value[favoritesKey]);renderFavorites();}).catch(()=>{$('#favorite-status').textContent='Не удалось прочитать избранное.';});
  for(const button of root.querySelectorAll('[data-panel]')) button.addEventListener('click',()=>{
    for(const other of root.querySelectorAll('[data-panel]')) other.setAttribute('aria-pressed',String(other===button));
    for(const panel of root.querySelectorAll('.panel')) panel.hidden=panel.id!==button.dataset.panel;
  });
  $('#refresh').addEventListener('click',refresh);
  $('#deadline-filter').addEventListener('change',renderDeadlines);
  const timer=setInterval(()=>{if(!disposed&&isActive()){renderSchedule();renderDeadlines();}},30000);
  if(autoLoad) refresh();
  return {refresh,destroy(){disposed=true;clearInterval(timer);notes?.destroy();browser.storage.onChanged.removeListener(storageChanged);}};
  }
  globalThis.CampusDashboard={mount};
})();
