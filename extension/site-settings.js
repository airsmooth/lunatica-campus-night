(() => {
  'use strict';
  const template=`
    <section id="appearance" class="panel" hidden aria-label="Настройки Qairu Space">
      <h3>Оформление</h3>
      <fieldset class="mode"><legend>Тема</legend><label><input type="radio" name="mode" value="dark"> Тёмная</label><label><input type="radio" name="mode" value="system"> Как в системе</label><label><input type="radio" name="mode" value="off"> Исходная</label></fieldset>
      <fieldset class="palette"><legend>Цветовая схема</legend><label><input type="radio" name="palette" value="graphite"> Графит</label><label><input type="radio" name="palette" value="warm"> Тёплая</label><label><input type="radio" name="palette" value="midnight"> Полночь</label></fieldset>
      <label class="settings-row">Масштаб страницы <select id="scale"><option value="100">100%</option><option value="110">110%</option><option value="125">125%</option><option value="140">140%</option></select></label>
      <label class="settings-row"><span>Меньше движения</span><input id="reduceMotion" type="checkbox"></label>
      <label class="settings-row"><span>Больше места для содержимого</span><input id="wide" type="checkbox"></label>
      <label class="settings-row"><span>Скрыть панель Aya AI</span><input id="hideAI" type="checkbox"></label>
      <div class="settings-actions"><button id="reset" type="button">Сбросить оформление</button><span id="status" role="status">Загружаю настройки…</span></div>
      <section class="settings-section backup" aria-labelledby="backup-title"><h3 id="backup-title">Перенос настроек</h3><p>Оформление, избранное, языки экзаменов и личные заметки. Копия хранится у вас.</p><button id="backup-export" type="button">Скачать копию</button><label class="backup-file">Выбрать файл<input id="backup-file" type="file" accept=".json,application/json"></label><div id="backup-preview" hidden><p id="backup-summary"></p><div class="settings-actions"><button id="backup-apply" type="button">Применить</button><button id="backup-cancel" type="button">Отмена</button></div></div><p id="backup-status" class="data-status" role="status"></p></section>
      <section class="settings-section"><h3>Сравнение расписания</h3><p>На устройстве хранятся до четырёх последних недель, не дольше 35 дней. История не входит в резервную копию.</p><button id="history-clear" type="button">Очистить историю сравнения</button><p id="history-status" class="data-status" role="status"></p></section>
      <section class="settings-section"><h3>Сохранённые личные отметки</h3><p>Здесь можно удалить заметки, в том числе у уже сданных заданий. Официальные работы в кампусе не изменятся.</p><div id="saved-notes"></div><p id="notes-manager-status" class="data-status" role="status"></p></section>
    </section>
    <section id="search" class="panel" hidden aria-label="Поиск по курсам и избранному"><label for="campus-search">Найти курс или избранную страницу</label><input id="campus-search" type="search" placeholder="Название курса или страницы" autocomplete="off"><div class="section-head"><p id="search-status" role="status"></p><button id="search-refresh" type="button">Обновить курсы</button></div><div id="search-results"></div></section>`;
  function mount({root,request}){
    const parsed=new DOMParser().parseFromString(template,'text/html');
    const container=root.querySelector('#panel-content')||root;container.append(...parsed.body.childNodes);
    const appearance=CampusAppearance.mount(root),backup=CampusBackup.mount(root);
    const $=s=>root.querySelector(s),input=$('#campus-search'),results=$('#search-results'),status=$('#search-status');
    let disposed=false,favorites=[],courses=[],loading=false,loaded=false,revision=0,notesRevision=0,notes={};
    function element(tag,text){const el=document.createElement(tag);if(text)el.textContent=text;return el;}
    function renderNotes(){
      if(disposed)return;const list=$('#saved-notes');list.replaceChildren();
      const entries=Object.entries(notes);if(!entries.length){list.append(element('p','Личных отметок пока нет.'));return;}
      for(const [url,note]of entries){
        const row=element('article'),link=element('a','Открыть задание'),remove=element('button','Удалить отметку');row.className='saved-note';link.href=url;link.target='_blank';link.rel='noopener';remove.type='button';
        row.append(link,element('small',{todo:'Не начато',working:'В работе',ready:'Готово к отправке'}[note.status]),element('p',note.note||'Без заметки'),remove);list.append(row);
        remove.addEventListener('click',async()=>{
          remove.disabled=true;
          try{const before=notesRevision,reply=await browser.runtime.sendMessage({type:'campus:task-note',url,value:null});if(!reply?.notes)throw Error(reply?.error||'Не удалось удалить отметку.');if(before===notesRevision)notes=CampusPreferences.taskNotes(reply.notes);renderNotes();$('#notes-manager-status').textContent='Личная отметка удалена.';}
          catch(error){$('#notes-manager-status').textContent=error.message;remove.disabled=false;}
        });
      }
    }
    function render(){
      if(disposed)return;results.replaceChildren();const query=input.value.trim().toLocaleLowerCase('ru-RU');
      const items=new Map();
      for(const [values,kind]of [[favorites,'Избранное'],[courses,'Курс']])for(const item of values){
        const url=CampusData.safeURL(item?.url);if(!url||typeof item.title!=='string')continue;
        const current=items.get(url);if(current){current.kind='Курс · избранное';continue;}items.set(url,{title:item.title.slice(0,180),url,kind});
      }
      let count=0;
      for(const item of items.values())if(!query||item.title.toLocaleLowerCase('ru-RU').includes(query)){
        const row=element('div'),link=element('a',item.title);row.className='search-result';link.href=item.url;row.append(link,element('small',item.kind));results.append(row);count++;
      }
      if(!count)results.append(element('p',loading?'Загружаю курсы…':query?'Совпадений нет. Попробуйте часть названия.':'Избранных страниц пока нет. Обновите курсы или добавьте страницу в избранное.'));
    }
    async function load(){
      if(loading)return;loading=true;$('#search-refresh').disabled=true;status.textContent='Читаю ваши курсы…';render();
      try{const value=await request('campus:courses');if(!Array.isArray(value))throw Error('Не удалось прочитать курсы. Откройте раздел «Курсы» и повторите.');courses=value;loaded=true;status.textContent=`Курсов: ${courses.length}. Поиск работает по названиям.`;}
      catch(error){status.textContent=error.message||'Не удалось загрузить курсы.';}
      finally{loading=false;$('#search-refresh').disabled=false;render();}
    }
    input.addEventListener('input',()=>{render();if(!loaded)void load();});input.addEventListener('focus',()=>{if(!loaded)void load();});$('#search-refresh').addEventListener('click',load);
    const changed=(changes,area)=>{
      if(area!=='local')return;
      if(changes.campusFavorites){revision++;favorites=Array.isArray(changes.campusFavorites.newValue)?changes.campusFavorites.newValue:[];render();}
      if(changes.campusTaskNotes){notesRevision++;notes=CampusPreferences.taskNotes(changes.campusTaskNotes.newValue);renderNotes();}
    };
    browser.storage.onChanged.addListener(changed);const before=revision;
    browser.storage.local.get('campusFavorites').then(value=>{if(before===revision)favorites=Array.isArray(value.campusFavorites)?value.campusFavorites:[];render();}).catch(()=>{status.textContent='Не удалось прочитать избранное.';});
    const beforeNotes=notesRevision;
    browser.storage.local.get('campusTaskNotes').then(value=>{if(beforeNotes===notesRevision)notes=CampusPreferences.taskNotes(value.campusTaskNotes);renderNotes();}).catch(()=>{$('#notes-manager-status').textContent='Не удалось прочитать заметки.';});
    $('#history-clear').addEventListener('click',async()=>{
      const button=$('#history-clear');button.disabled=true;
      try{const reply=await browser.runtime.sendMessage({type:'campus:schedule-clear'});if(!reply?.cleared)throw Error(reply?.error||'Не удалось очистить историю.');$('#history-status').textContent='История очищена. Следующая загрузка станет новой точкой сравнения.';}
      catch(error){$('#history-status').textContent=error.message;}finally{button.disabled=false;}
    });
    render();return {destroy(){disposed=true;appearance.destroy();backup.destroy();browser.storage.onChanged.removeListener(changed);}};
  }
  globalThis.CampusSiteSettings={mount};
})();
