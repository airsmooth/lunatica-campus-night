/* Personal work state never changes the university's submission status. */
(() => {
  'use strict';
  function mount({root}){
    const P=CampusPreferences,key=P.noteStorage,labels={todo:'Не начато',working:'В работе',ready:'Готово к отправке'};
    let stored={},revision=0,disposed=false,loadError='';
    const drafts=new Map(),editors=new Map();
    function element(tag,text){const el=document.createElement(tag);if(text)el.textContent=text;return el;}
    function update(){for(const editor of editors.values())if(editor.node.isConnected)editor.update();}
    const changed=(changes,area)=>{if(area==='local'&&changes[key]){revision++;stored=P.taskNotes(changes[key].newValue);update();}};
    browser.storage.onChanged.addListener(changed);
    const start=revision;
    const ready=browser.storage.local.get(key).then(value=>{if(start===revision)stored=P.taskNotes(value[key]);}).catch(()=>{loadError='Не удалось прочитать личные отметки. Повторите загрузку.';}).finally(()=>{if(!disposed)update();});
    function decorate(task,row){
      const url=P.taskURL(task.url);if(!url)return;
      let draft=drafts.get(url);
      if(!draft){draft={value:null,dirty:false,open:false,revision:0};drafts.set(url,draft);}
      const details=element('details'),summary=element('summary'),hint=element('p','Личная отметка. Не меняет официальный статус сдачи.');
      details.className='task-personal';details.open=draft.open;
      const stateLabel=element('label','Мой прогресс'),select=element('select');select.setAttribute('aria-label','Мой прогресс: '+task.title);
      for(const [value,label]of Object.entries(labels)){const option=element('option',label);option.value=value;select.append(option);}stateLabel.append(select);
      const noteLabel=element('label','Заметка'),note=element('textarea');note.rows=2;note.maxLength=500;note.setAttribute('aria-label','Заметка: '+task.title);noteLabel.append(note);
      const actions=element('div'),save=element('button','Сохранить'),remove=element('button','Удалить отметку'),status=element('p');
      save.type=remove.type='button';save.dataset.action='save';remove.dataset.action='remove';status.setAttribute('role','status');status.className='data-status';actions.className='task-note-actions';actions.append(save,remove);
      details.append(summary,hint,stateLabel,noteLabel,actions,status);row.append(details);
      const editor={node:details,status,update(){
        const value=stored[url]||{status:'todo',note:''};summary.textContent='Моя отметка'+(stored[url]?' · '+labels[value.status]:'');
        if(!draft.dirty){draft.value={...value};select.value=value.status;note.value=value.note;}
        remove.disabled=!stored[url]&&!draft.dirty;
        if(loadError)status.textContent=loadError;
      }};
      editors.set(url,editor);editor.update();
      if(draft.dirty){select.value=draft.value.status;note.value=draft.value.note;status.textContent='Есть несохранённые изменения.';}
      details.addEventListener('toggle',()=>{draft.open=details.open;});
      const input=()=>{draft.revision++;draft.value={status:select.value,note:note.value};draft.dirty=true;remove.disabled=false;status.textContent='Не сохранено';};
      select.addEventListener('change',input);note.addEventListener('input',input);
      async function write(value){
        const draftRevision=draft.revision;
        save.disabled=remove.disabled=select.disabled=note.disabled=true;status.textContent='Сохраняю…';
        try{
          await ready;
          const before=revision,reply=await browser.runtime.sendMessage({type:'campus:task-note',url,value});
          if(!reply?.notes)throw Error(reply?.error||'Не удалось сохранить отметку. Обновите вкладку.');
          if(before===revision)stored=P.taskNotes(reply.notes);
          const latest=editors.get(url)||editor;
          if(draft.revision===draftRevision){draft.dirty=false;draft.value=null;latest.update();latest.status.textContent=value?'Личная отметка сохранена. Работу нужно отправить в кампусе.':'Отметка удалена.';}
          else latest.status.textContent='Предыдущая редакция сохранена. Новые изменения ещё не сохранены.';
        }catch(error){status.textContent=error.message;}
        finally{save.disabled=select.disabled=note.disabled=false;remove.disabled=!stored[url]&&!draft.dirty;}
      }
      save.addEventListener('click',()=>write({status:select.value,note:note.value}));remove.addEventListener('click',()=>write(null));
    }
    return {decorate,busy:()=>!!root.activeElement?.closest?.('.task-personal'),destroy(){disposed=true;browser.storage.onChanged.removeListener(changed);drafts.clear();editors.clear();}};
  }
  globalThis.CampusTaskNotes={mount};
})();
