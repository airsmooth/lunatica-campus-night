(() => {
  'use strict';
  const template=`<details class="session-manager"><summary>Таблица экзаменационной сессии</summary><p id="session-current">Читаю выбранную таблицу…</p><p>Для новой сессии выберите подготовленную JSON-таблицу. Это не распознавание PDF: строки нужно сверить с оригиналом. Расширение проверит совпадение исходного файла перед показом дат.</p><label class="backup-file">Выбрать таблицу (.json)<input id="session-file" type="file" accept=".json,application/json"></label><div id="session-preview" hidden><p id="session-summary"></p><p class="exam-warning">Таблица добавлена вами. Совпадение PDF не подтверждает правильность заполнения её строк.</p><button id="session-apply" type="button">Использовать таблицу</button> <button id="session-cancel" type="button">Отмена</button></div><div class="settings-actions"><button id="session-example" type="button">Скачать образец таблицы</button><button id="session-reset" type="button">Вернуть встроенную сессию</button></div><details><summary>Как подготовить новую таблицу</summary><p>Образец содержит проверенную сессию ноября 2026 года. Для новой сессии замените название, полное название документа в кампусе, путь PDF, SHA-256 и все строки. В строках нужны точное название курса, поток, язык (ru, kk или en), практические группы, дата, время, аудитория, формат экзамена и номер страницы. Сохраните все возможные сеансы, если группа разделена. После загрузки сверьте подбор с оригиналом. Таблица хранится отдельно от копии настроек; сохраняйте её исходный JSON.</p></details><p id="session-status" role="status" class="data-status"></p></details>`;
  function mount({root}){
    const parsed=new DOMParser().parseFromString(template,'text/html'),node=parsed.body.firstElementChild;root.querySelector('#exam-list').before(node);
    const $=s=>node.querySelector(s),S=CampusSessions,file=$('#session-file'),preview=$('#session-preview'),status=$('#session-status'),apply=$('#session-apply'),cancel=$('#session-cancel'),reset=$('#session-reset');
    let pending=null,revision=0,storageRevision=0,disposed=false,currentSession=null;
    function render(value){if(disposed)return;currentSession=value;$('#session-current').textContent=value?`Выбрана: ${value.title}. Локальная таблица пользователя.`:'Выбрана встроенная сессия: бакалавриат, ноябрь 2026.';reset.disabled=!value;}
    const changed=(changes,area)=>{if(area==='local'&&changes[S.key]){storageRevision++;render(changes[S.key].newValue);}};
    browser.storage.onChanged.addListener(changed);const initial=storageRevision;
    browser.storage.local.get(S.key).then(value=>{if(initial===storageRevision)render(value[S.key]);}).catch(()=>{status.textContent='Не удалось прочитать таблицу. Повторите загрузку.';});
    function clear(){pending=null;preview.hidden=true;file.value='';}
    file.addEventListener('change',async()=>{
      const token=++revision,selected=file.files?.[0];pending=null;preview.hidden=true;if(!selected)return;
      try{
        if(selected.size>S.limit)throw Error('Таблица должна быть не больше 512 КБ.');const value=S.parse(await selected.text());if(token!==revision||disposed)return;
        const dates=value.rows.map(row=>row.date).sort();pending=value;$('#session-summary').textContent=`${value.title}. Строк: ${value.rows.length}. Даты: ${dates[0]} — ${dates.at(-1)}. Документ: ${value.sourceTitle}. Изменения ещё не применены.`;preview.hidden=false;status.textContent='';
      }catch(error){if(token===revision){clear();status.textContent=error.message;}}
    });
    cancel.addEventListener('click',()=>{revision++;clear();status.textContent='Таблица не изменена.';});
    async function save(session){
      apply.disabled=cancel.disabled=file.disabled=reset.disabled=true;
      try{const result=await browser.runtime.sendMessage({type:'campus:exam-session',session});if(!result?.saved)throw Error(result?.error||'Не удалось сохранить таблицу.');revision++;clear();render(session);status.textContent='Таблица сохранена. Нажмите «Обновить экзамены», чтобы проверить PDF и подобрать сеансы.';}
      catch(error){status.textContent=error.message;}
      finally{apply.disabled=cancel.disabled=file.disabled=false;reset.disabled=!currentSession;}
    }
    apply.addEventListener('click',()=>{if(pending)void save(pending);});reset.addEventListener('click',()=>save(null));
    $('#session-example').addEventListener('click',()=>{try{CampusFiles.save(JSON.stringify(S.builtin(),null,2),'campus-exam-table-example.json','application/json;charset=utf-8');status.textContent='Скачан образец на основе ноября 2026 года. Для новой сессии нужно заменить данные и сверить их с PDF.';}catch(error){status.textContent=error.message;}});
    return {destroy(){disposed=true;revision++;browser.storage.onChanged.removeListener(changed);node.remove();}};
  }
  globalThis.CampusSessionUI={mount};
})();
