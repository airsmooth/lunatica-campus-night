(() => {
  'use strict';
  function mount(document=globalThis.document){
  const exportButton=document.querySelector('#backup-export'),file=document.querySelector('#backup-file'),apply=document.querySelector('#backup-apply'),cancel=document.querySelector('#backup-cancel');
  const preview=document.querySelector('#backup-preview'),summary=document.querySelector('#backup-summary'),status=document.querySelector('#backup-status');
  let pending=null,revision=0;
  const clear=()=>{pending=null;preview.hidden=true;file.value='';};
  exportButton.addEventListener('click',async()=>{
    exportButton.disabled=true;
    try{
      const state=await browser.storage.local.get(CampusPreferences.keys),backup=CampusPreferences.backup(state);
      CampusFiles.save(JSON.stringify(backup,null,2),'campus-night-settings.json','application/json;charset=utf-8');
      status.textContent='Копия подготовлена. Для переноса откройте «Вид» или настройки на сайте → «Выбрать файл». Файл содержит избранное и личные заметки; передавайте его только на свои устройства. Для этой копии нужна версия 1.4 или новее.';
    }catch(error){status.textContent=error.message||'Не удалось сохранить копию.';}
    finally{exportButton.disabled=false;}
  });
  file.addEventListener('change',async()=>{
    const token=++revision,selected=file.files?.[0];pending=null;preview.hidden=true;status.textContent='';if(!selected)return;
    try{
      if(selected.size>CampusPreferences.backupLimit)throw Error('Размер файла должен быть не больше 1 МБ.');
      const parsed=CampusPreferences.parse(await selected.text());
      const current=await browser.storage.local.get(CampusPreferences.keys),merged=CampusPreferences.mergeImport(current,parsed);
      if(token!==revision)return;
      pending=parsed;
      const theme={dark:'тёмная',system:'как в системе',off:'исходная'}[parsed.campusNight.mode];
      const added=merged.campusFavorites.length-CampusPreferences.backup(current).data.campusFavorites.length;
      summary.textContent=`Тема: ${theme}; масштаб: ${parsed.campusNight.scale}%. Добавится избранных страниц: ${added}; всего будет ${merged.campusFavorites.length}. Сохранённых языков в файле: ${Object.keys(parsed.campusExamChoices||{}).length}. Личных отметок: ${Object.keys(parsed.campusTaskNotes||{}).length}. Настройки оформления и панелей из файла заменят текущие. Избранное, языки и отметки объединятся; при совпадении применяется значение из файла.`;
      preview.hidden=false;apply.disabled=false;
    }catch(error){if(token===revision){clear();status.textContent=error.message;}}
  });
  cancel.addEventListener('click',()=>{revision++;clear();status.textContent='Импорт отменён. Настройки не изменены.';});
  apply.addEventListener('click',async()=>{
    if(!pending)return;apply.disabled=true;cancel.disabled=true;file.disabled=true;
    try{
      const reply=await browser.runtime.sendMessage({type:'campus:import-settings',data:pending});
      if(!reply?.imported)throw Error(reply?.error||'Не удалось применить копию. Обновите расширение.');
      clear();status.textContent=`Настройки перенесены. В избранном ${reply.favorites} страниц. Открытые вкладки кампуса применят изменения автоматически.`;
    }catch(error){status.textContent=error.message;}
    finally{apply.disabled=false;cancel.disabled=false;file.disabled=false;}
  });
  return {destroy(){revision++;pending=null;}};
  }
  globalThis.CampusBackup={mount};
  if(document.querySelector('#backup-export'))mount();
})();
