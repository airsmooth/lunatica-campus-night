(() => {
  'use strict';
  if(window!==window.top)return;
  const preference='campusExamGrid',ttl=300000;
  let enabled=true,ready=false,revision=0,preferencesRevision=0,data=null,error='',loading=false;
  let control=null,root=null,grid=null,rows=[],signature='',queued=false,generation=0;
  const choices=CampusPreferences.watch(()=>{revision++;renderChoices();schedule();});
  const formatter=new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Almaty',day:'numeric',month:'long'});
  const el=(tag,text,className)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;};
  function isSchedule(){return /^\/(ru|kk|en)\/schedule\/?$/.test(location.pathname)&&!document.querySelector('input[type="password"]');}
  function clearRows(){rows.forEach(row=>row.remove());rows=[];signature='';}
  function courses(){const engine=globalThis.CampusSessions?CampusSessions.engine(data?.session):CampusExams;return(data?.courses||[]).map(course=>choices.get(course)?engine.match(course,[],choices.get(course)):course);}
  function exportCalendar(course=null,date=null,time=null){
    try{
      let items=CampusCalendar.events(data,choices.all());
      if(course){const start=Date.parse(date+'T'+time.trim().slice(0,5)+':00+05:00');items=items.filter(item=>item.courseURL===CampusData.safeURL(course.url)&&item.start===start);}
      items=CampusCalendar.upcoming(items,Date.now(),!course);
      CampusFiles.save(CampusCalendar.serialize(items),'campus-exams.ics','text/calendar;charset=utf-8');
      root.querySelector('#exam-grid-status').textContent=`Файл подготовлен: ${items.length} сеансов. Импортируйте .ics в календарь. Даты в файле не обновляются автоматически.`;
    }catch(error){root.querySelector('#exam-grid-status').textContent=error.message;}
  }
  function sessions(){return courses().flatMap(course=>course.matches.flatMap(exam=>[
    ...exam.time.split(';').map(time=>({course,exam,time:time.trim(),date:Date.parse(exam.date+'T00:00:00+05:00')})),
    ...(exam.possibleTimes||[]).map(time=>({course,exam,time,date:Date.parse(exam.date+'T00:00:00+05:00'),possible:true}))]));}
  function ensureControls(currentGrid){
    if(control?.isConnected&&control.nextElementSibling===currentGrid)return;
    control?.remove();control=el('section');control.id='campus-night-exam-controls';root=control.attachShadow({mode:'open'});
    const style=el('style',`:host{display:block;font:inherit;color:var(--cmp-ink-900,#0a1535)}*{box-sizing:border-box}.box{padding:0}.bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap}label{cursor:pointer;display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600}input{accent-color:var(--cmp-blue,#0098f8);width:14px;height:14px;margin:0}button,select{font:inherit;font-size:12px;font-weight:600;background:var(--cmp-surface-card,#fff);border:1px solid var(--cmp-line,#e3e8f0);color:var(--cmp-ink-900,#0a1535);border-radius:var(--cmp-r-ctl,12px);padding:6px 12px;min-height:32px;cursor:pointer}button:hover{background:var(--cmp-surface-main,#f6f7f9)}button:disabled{opacity:.5;cursor:wait}p{margin:6px 0 0;color:var(--cmp-ink-600,#5b6b84);font-size:11px;line-height:1.5}a{color:var(--cmp-blue,#0098f8);font-size:12px;text-decoration:none;margin-left:auto}a:hover{text-decoration:underline}select{max-width:100%}.choice{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:10px;font-size:12px;font-weight:400}:focus-visible{outline:2px solid var(--cmp-blue,#0098f8);outline-offset:3px}`);
    const box=el('div',null,'box'),bar=el('div',null,'bar'),label=el('label'),check=el('input');check.type='checkbox';check.id='exam-grid-enabled';check.checked=enabled;label.append(check,el('span','Экзамены в расписании'));
    const refresh=el('button','Обновить');refresh.id='exam-grid-refresh';refresh.disabled=loading;
    const source=el('a','Исходный документ');source.id='exam-grid-source';source.href=data?.source||CampusData.origin+'/ru/documents';source.target='_blank';source.rel='noopener';
    const status=el('p');status.id='exam-grid-status';status.setAttribute('role','status');
    const selectors=el('div');selectors.id='exam-grid-choices';
    const download=el('button','Точные даты в календарь');download.id='exam-grid-export';download.disabled=true;download.title='Скачать предстоящие однозначные экзамены всей сессии в файл .ics';download.addEventListener('click',()=>exportCalendar());
    bar.append(label,refresh,download,source);box.append(bar,status,selectors);root.append(style,box);currentGrid.before(control);
    check.addEventListener('change',()=>{enabled=check.checked;revision++;sync();browser.storage.local.set({[preference]:{enabled}}).catch(()=>{status.textContent='Не удалось сохранить настройку показа экзаменов.';});});
    refresh.addEventListener('click',()=>load());
    renderChoices();
  }
  function renderChoices(){
    if(!root)return;const container=root.querySelector('#exam-grid-choices');container.replaceChildren();
    for(const course of data?.courses||[]){
      if(course.language&&!choices.get(course))continue;
      if(!course.stream)continue;
      const label=el('label',course.title,'choice'),select=el('select');select.setAttribute('aria-label','Язык экзамена: '+course.title);
      for(const [value,title]of[['','Определять автоматически'],['en','Английский'],['kk','Казахский'],['ru','Русский']]){const option=el('option',title);option.value=value;select.append(option);}
      select.value=choices.get(course)||'';select.addEventListener('change',async()=>{select.disabled=true;try{await choices.set(course,select.value);}catch(error){root.querySelector('#exam-grid-status').textContent=error.message;renderChoices();}});label.append(select);container.append(label);
    }
  }
  async function load(){
    if(loading||!isSchedule())return;
    const token=generation;loading=true;error='';data=null;revision++;sync();
    try{await choices.ready;const reply=await CampusService.request('campus:exams');if(token!==generation)return;if(reply.error)throw new Error(reply.error);data=reply.value;renderChoices();}
    catch(failure){if(token===generation)error=failure.message||'Не удалось загрузить экзамены.';}
    finally{if(token===generation){loading=false;revision++;sync();}}
  }
  function sync(){
    queued=false;if(!ready)return;
    const currentGrid=isSchedule()?document.querySelector('.cmp-grid'):null;
    if(!currentGrid){if(control||grid){generation++;loading=false;data=null;error='';clearRows();control?.remove();control=null;root=null;grid=null;}return;}
    ensureControls(currentGrid);
    root.querySelector('#exam-grid-source').href=data?.source||CampusData.origin+'/ru/documents';
    const status=root.querySelector('#exam-grid-status');root.querySelector('#exam-grid-enabled').checked=enabled;root.querySelector('#exam-grid-refresh').disabled=loading;
    let canExport=false;try{canExport=!!data&&CampusCalendar.upcoming(CampusCalendar.events(data,choices.all())).length>0;}catch{}
    root.querySelector('#exam-grid-export').disabled=loading||!enabled||!canExport;
    const dates=[...currentGrid.querySelectorAll('.cmp-grid__daydate')].map(node=>CampusData.dateLabel(node.textContent));
    const key=JSON.stringify([dates,revision,enabled]);
    if(grid===currentGrid&&key===signature&&rows.every(row=>row.parentElement===currentGrid))return;
    clearRows();grid=currentGrid;signature=key;
    if(!enabled){status.textContent='Экзамены скрыты. Обычное расписание не изменено.';return;}
    if(loading){status.textContent='Проверяю PDF и группы ваших курсов…';return;}
    if(error){status.textContent=error;return;}
    if(!data){status.textContent='Подготавливаю экзамены…';load();return;}
    if(!dates.length||dates.some(date=>date===null)){status.textContent='Не удалось определить даты этой недели. Откройте список экзаменов в панели Qairu Space.';return;}
    const visible=sessions().filter(session=>dates.includes(session.date));
    const unresolved=courses().filter(course=>!course.matches.length).length;
    const grouped=new Map();for(const session of visible){const start=session.time.match(/^(\d{1,2}):(\d{2})/);if(!start)continue;const minute=+start[1]*60 + +start[2];if(!grouped.has(minute))grouped.set(minute,[]);grouped.get(minute).push(session);}
    const nativeChildren=[...grid.children].filter(child=>!child.classList.contains('cn-exam-row'));
    for(const [minute,items]of [...grouped].sort((a,b)=>a[0]-b[0])){
      const row=el('div',null,'cmp-grid__row cn-exam-row');row.setAttribute('role','row');
      const heading=el('span',null,'cmp-grid__time');heading.setAttribute('role','rowheader');heading.append(el('span','Экзамен','cn-exam-tag'),el('span',String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0'),'cmp-grid__timerange'));row.append(heading);
      for(const date of dates){const cell=el('span',null,'cmp-grid__cell');cell.setAttribute('role','cell');
        for(const {course,exam,time,possible}of items.filter(item=>item.date===date)){
          const uncertain=course.matches.length>1||!!exam.note;
          const card=el('article',null,'cn-exam-card'+(uncertain?' cn-exam-uncertain':''));
          card.append(el('strong',course.title),el('span',time,'cn-exam-time'));
          const meta=el('span',null,'cn-exam-meta');meta.append(el('span','Экзамен','cn-exam-type'),el('span','Ауд. '+exam.room,'cn-exam-room'));card.append(meta,el('span',exam.format,'cn-exam-format'));
          if(uncertain||possible)card.append(el('span',possible?'Возможный общий сеанс':'Уточните сеанс','cn-exam-warning'));
          const details=el('details',null,'cn-exam-details');details.append(el('summary','Подробнее'),el('small',`Поток ${course.stream} · практика ${course.group??'по потоку'}`));
          if(course.matches.length>1)details.append(el('span','Группа разделена: показаны все возможные сеансы.','cn-exam-note'));
          if(exam.note)details.append(el('span',exam.note,'cn-exam-note'));
          const link=el('a',`PDF · стр. ${exam.page}`);link.href=data.source+'#page='+exam.page;link.target='_blank';link.rel='noopener';details.append(link);
          const calendar=el('button','В календарь (.ics)','cn-exam-calendar');calendar.type='button';calendar.addEventListener('click',()=>exportCalendar(course,exam.date,time));details.append(calendar);card.append(details);cell.append(card);
        }row.append(cell);
      }
      const before=nativeChildren.find(child=>{const m=child.querySelector('.cmp-grid__timerange')?.textContent.match(/^(\d{1,2}):(\d{2})/);return m&&+m[1]*60 + +m[2]>=minute;});
      grid.insertBefore(row,before||null);rows.push(row);
    }
    const allDates=sessions().map(s=>s.date).sort((a,b)=>a-b);
    status.textContent=(visible.length?`Показано сеансов: ${visible.length}. Время Астаны (UTC+5).`:`В этой неделе экзаменов нет.${allDates.length?' Сессия: '+formatter.format(allDates[0])+' — '+formatter.format(allDates.at(-1))+'. Переключите неделю.':''}`)+(unresolved?` Для ${unresolved} курсов не найдено однозначное расписание; проверьте язык и список экзаменов.`:'')+(data.session?' PDF совпадает. Таблица добавлена вами — сверьте строки с оригиналом.':' Данные сверены с PDF университета.');
  }
  function schedule(){if(!queued){queued=true;queueMicrotask(sync);}}
  browser.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local')return;
    if(changes[preference]){preferencesRevision++;enabled=changes[preference].newValue?.enabled!==false;revision++;schedule();}
    if(changes.campusExamSession){generation++;loading=false;data=null;error='';revision++;schedule();}
  });
  const initialRevision=preferencesRevision;
  browser.storage.local.get(preference).then(value=>{if(initialRevision===preferencesRevision)enabled=value[preference]?.enabled!==false;}).catch(()=>{}).finally(()=>{ready=true;schedule();});
  new MutationObserver(schedule).observe(document,{childList:true,characterData:true,subtree:true});
  window.addEventListener('popstate',schedule);
  setInterval(()=>{if(enabled&&control?.isConnected&&document.visibilityState!=='hidden'&&(!data||Date.now()-data.verifiedAt>=ttl))load();},ttl);
})();
