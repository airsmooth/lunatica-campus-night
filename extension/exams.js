(() => {
  'use strict';
  function mount({root=document,request=null}={}) {
    const list=root.querySelector('#exam-list'),status=root.querySelector('#exam-status'),refresh=root.querySelector('#refresh-exams');
    const dateFormat=new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Almaty',weekday:'long',day:'numeric',month:'long'});
    const timeFormat=new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Almaty',hour:'2-digit',minute:'2-digit'});
    let data=null,disposed=false;
    let generation=0;
    const sessionUI=globalThis.CampusSessionUI?.mount({root});
    const el=(tag,text,cls)=>{const node=document.createElement(tag);node.textContent=text||'';if(cls)node.className=cls;return node;};
    const tools=el('div',null,'exam-tools'),download=el('button','Скачать точные даты (.ics)'),hint=el('p',null,'hint');
    download.id='export-exams';download.disabled=true;tools.append(download,hint);list.before(tools);
    const choices=CampusPreferences.watch(()=>{if(data&&!disposed)render();});
    function exportCalendar(courseURL=null){
      try{
        const all=CampusCalendar.events(data,choices.all());
        const selected=CampusCalendar.upcoming(courseURL?all.filter(event=>event.courseURL===courseURL):all,Date.now(),!courseURL);
        CampusFiles.save(CampusCalendar.serialize(selected),'campus-exams.ics','text/calendar;charset=utf-8');
        status.textContent=`Файл календаря подготовлен: ${selected.length} сеансов. Импортируйте его в свой календарь. Это копия дат, без автоматического обновления.`;
      }catch(error){status.textContent=error.message;}
    }
    download.addEventListener('click',()=>exportCalendar());
    function render(){
      list.replaceChildren();download.disabled=true;hint.textContent='';
      const engine=globalThis.CampusSessions?CampusSessions.engine(data.session):CampusExams;
      const courses=data.courses.map(c=>choices.get(c)?engine.match(c,[],choices.get(c)):c).sort((a,b)=>(a.matches[0]?.date||'z').localeCompare(b.matches[0]?.date||'z'));
      let all=[];try{all=CampusCalendar.events(data,choices.all());}catch(error){hint.textContent=error.message;}
      const future=CampusCalendar.upcoming(all,Date.now(),false),certain=future.filter(event=>!event.tentative);
      if(all.length){download.disabled=!certain.length;hint.textContent=`В общий файл: ${certain.length} точных сеансов.${future.length>certain.length?` Возможных сеансов: ${future.length-certain.length} — скачиваются отдельно после уточнения.`:''} Файл не обновляется автоматически.`;}
      else if(!hint.textContent)hint.textContent='Нет однозначных предстоящих экзаменов для экспорта.';
      for(const course of courses){
        const card=el('article',null,'exam-card');
        card.append(el('h3',course.title),el('p',`Поток ${course.stream??'не определён'} · практика ${course.group??'не определена'}${course.language?' · '+({en:'английский',kk:'казахский',ru:'русский'}[course.language]):''}`));
        if(course.languageSource)card.append(el('small','Язык: '+course.languageSource));
        if(course.stream){
          const label=el('label','Язык курса '),select=el('select');select.setAttribute('aria-label','Язык курса: '+course.title);
          for(const [value,title]of [['','Определять автоматически'],['en','Английский'],['kk','Казахский'],['ru','Русский']]){const option=el('option',title);option.value=value;select.append(option);}
          select.value=choices.get(course)||'';
          select.addEventListener('change',async()=>{select.disabled=true;try{await choices.set(course,select.value);status.textContent='Язык сохранён для этого курса, потока и группы.';}catch(error){status.textContent=error.message;render();}});
          label.append(select);card.append(label);
        }
        if(course.issue)card.append(el('p',course.issue,'exam-warning'));
        if(course.matches.length>1)card.append(el('p','Группа разделена между сеансами. Ниже все совпадения; своё время уточните у преподавателя.','exam-warning'));
        for(const exam of course.matches){
          const details=el('div',null,'exam-session'),stamp=Date.parse(exam.date+'T00:00:00+05:00');
          details.append(el('strong',dateFormat.format(stamp)),el('p',exam.time,'exam-time'),el('p',exam.format),el('p','Аудитория: '+exam.room));
          if(exam.note)details.append(el('p',exam.note,'exam-warning'));
          const source=el('a',`Оригинал · стр. ${exam.page} ↗`);source.href=data.source+'#page='+exam.page;source.target='_blank';source.rel='noopener';details.append(source);
          if(stamp+86400000<=Date.now())details.append(el('small','Дата уже прошла'));
          card.append(details);
        }
        const courseURL=CampusData.safeURL(course.url),items=future.filter(event=>event.courseURL===courseURL);
        if(items.length){
          const uncertain=items.some(event=>event.tentative),button=el('button',uncertain?'Скачать возможные сеансы (.ics)':'Добавить в календарь (.ics)','exam-calendar');
          button.addEventListener('click',()=>exportCalendar(courseURL));card.append(button);
          if(uncertain)card.append(el('small','В календаре будет пометка «Уточнить сеанс». Это не назначенное вам время.'));
        }
        list.append(card);
      }
    }
    async function load(){
      const token=++generation;
      refresh.disabled=true;download.disabled=true;data=null;list.replaceChildren();hint.textContent='';status.textContent='Сверяю PDF и читаю группы ваших курсов…';
      try{
        await choices.ready;let reply;
        if(request)reply=await request('campus:exams');
        else{
          const tabs=(await browser.tabs.query({url:CampusData.origin+'/*'})).filter(t=>CampusData.safeURL(t.url)).sort((a,b)=>Number(b.active)-Number(a.active)||(b.lastAccessed||0)-(a.lastAccessed||0));
          if(!tabs.length)throw Error('Откройте кампус в этом браузере и войдите в кабинет.');
          try{reply=await browser.tabs.sendMessage(tabs[0].id,{type:'campus:exams'},{frameId:0});}catch{throw Error('Обновите вкладку кампуса после установки расширения и повторите.');}
        }
        if(disposed||token!==generation)return;if(reply.error)throw Error(reply.error);data=reply.value;render();
        status.textContent=`${data.sessionTitle||'Бакалавриат · ноябрь 2026'}. PDF совпадает с исходным файлом таблицы. Проверено в ${timeFormat.format(data.verifiedAt)} · UTC+5.${data.session?' Таблица добавлена вами; сверьте её строки с оригиналом.':''}`;
      }catch(error){if(!disposed&&token===generation)status.textContent=error.message;}
      finally{if(!disposed&&token===generation)refresh.disabled=false;}
    }
    const sessionChanged=(changes,area)=>{if(area==='local'&&changes.campusExamSession){generation++;data=null;list.replaceChildren();download.disabled=true;refresh.disabled=false;hint.textContent='';status.textContent='Выбрана другая таблица. Обновите экзамены для проверки исходного PDF.';}};
    browser.storage.onChanged.addListener(sessionChanged);
    refresh.addEventListener('click',load);
    return {destroy(){disposed=true;choices.destroy();sessionUI?.destroy();browser.storage.onChanged.removeListener(sessionChanged);refresh.removeEventListener('click',load);tools.remove();}};
  }
  globalThis.CampusExamUI={mount};
})();
