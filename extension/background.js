'use strict';
browser.commands.onCommand.addListener(async command => {
  if (command !== 'toggle-theme') return;
  const {key, normalize, isDark} = CampusNight;
  const result = await browser.storage.local.get(key);
  const settings = normalize(result[key]);
  settings.mode = isDark(settings, matchMedia('(prefers-color-scheme: dark)').matches) ? 'off' : 'dark';
  await browser.storage.local.set({[key]: settings});
});

// One writer across popup and on-page panels: concurrent tabs cannot lose favorites.
let favoriteQueue=Promise.resolve();
browser.runtime.onMessage.addListener(message=>{
  if(!['campus:favorite-change','campus:exam-language','campus:import-settings','campus:task-note','campus:schedule-observe','campus:schedule-ack','campus:schedule-clear','campus:exam-session'].includes(message?.type)) return;
  const operation=favoriteQueue.then(async()=>{
    if(message.type==='campus:exam-session'){
      const value=message.session===null?null:CampusSessions.parse(JSON.stringify(message.session));
      await browser.storage.local.set({[CampusSessions.key]:value});return {saved:true};
    }
    if(message.type.startsWith('campus:schedule-')){
      const S=CampusScheduleHistory,stored=await browser.storage.local.get(S.key);
      if(message.type==='campus:schedule-clear'){await browser.storage.local.set({[S.key]:[]});return {cleared:true};}
      if(message.type==='campus:schedule-ack'){
        const history=S.acknowledge(stored[S.key],message.scope,message.from,message.revision);
        await browser.storage.local.set({[S.key]:history});return {history};
      }
      const result=S.observe(stored[S.key],message.scope,message.schedule);
      await browser.storage.local.set({[S.key]:result.history});return {record:result.record};
    }
    if(message.type==='campus:task-note'){
      const P=CampusPreferences,key=P.noteStorage,url=P.taskURL(message.url);
      if(!url)throw Error('Недопустимый адрес задания.');
      const stored=await browser.storage.local.get(key),notes=P.taskNotes(stored[key]);
      if(message.value===null)delete notes[url];else notes[url]=P.taskNotes({[url]:message.value},true)[url];
      P.taskNotes(notes,true);await browser.storage.local.set({[key]:notes});return {notes};
    }
    if(message.type==='campus:exam-language'){
      const P=CampusPreferences,key=P.choiceStorage;
      if(!P.validChoiceKey(message.key)||!['','en','kk','ru'].includes(message.language))throw Error('Некорректный выбор языка.');
      const stored=await browser.storage.local.get(key),choices=P.choices(stored[key]);
      if(message.language)choices[message.key]=message.language;else delete choices[message.key];
      P.choices(choices,true);await browser.storage.local.set({[key]:choices});return {choices};
    }
    if(message.type==='campus:import-settings'){
      const current=await browser.storage.local.get(CampusPreferences.keys);
      const next=CampusPreferences.mergeImport(current,message.data);
      await browser.storage.local.set(next);return {imported:true,favorites:next.campusFavorites.length};
    }
    const key='campusFavorites',change=message.change||{};
    const stored=await browser.storage.local.get(key);
    let favorites=Array.isArray(stored[key])?stored[key].filter(x=>x&&typeof x.title==='string'&&CampusData.safeURL(x.url)).map(x=>({title:x.title.slice(0,180),url:CampusData.safeURL(x.url)})).slice(0,50):[];
    if(change.remove) favorites=favorites.filter(x=>x.url!==change.remove);
    else {
      const url=CampusData.safeURL(change.add?.url),title=change.add?.title;
      if(!url||typeof title!=='string')throw new Error('Откройте страницу кампуса, которую хотите сохранить.');
      if(favorites.some(x=>x.url===url))return {favorites,duplicate:true};
      if(favorites.length>=50)throw new Error('В избранном уже 50 страниц. Уберите ненужную.');
      favorites.push({url,title:title.slice(0,180)});
    }
    await browser.storage.local.set({[key]:favorites});
    return {favorites};
  }).catch(error=>({error:error.message}));
  favoriteQueue=operation.then(()=>{});
  return operation;
});
