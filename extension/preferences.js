/* Portable, allowlisted local preferences. No fetched study data is backed up. */
(() => {
  'use strict';
  const choiceStorage='campusExamChoices';
  const noteStorage='campusTaskNotes';
  const backupLimit=1048576;
  const keys=['campusNight','campusFavorites','campusPanel','campusExamGrid',choiceStorage,noteStorage];
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  function taskURL(value){
    const safe=CampusData.safeURL(value);if(!safe)return null;const url=new URL(safe);
    if(!/^\/(ru|kk|en)\/assignments\/[^/?#]+\/?$/.test(url.pathname))return null;
    url.pathname=url.pathname.replace(/^\/(kk|en)\//,'/ru/').replace(/\/$/,'');url.hash='';return url.href;
  }
  function taskNotes(value,strict=false){
    if(!object(value)){if(strict)throw Error('Некорректные личные отметки.');return {};}
    const result={};
    for(const [key,item]of Object.entries(value)){
      const url=taskURL(key);
      if(!url||!object(item)||!['todo','working','ready'].includes(item.status)||typeof item.note!=='string'){
        if(strict)throw Error('Некорректная личная отметка задания.');continue;
      }
      if(item.note.length>500){if(strict)throw Error('Заметка должна быть не длиннее 500 символов.');continue;}
      if(Object.keys(result).length>=200&&!Object.hasOwn(result,url))throw Error('Можно сохранить не более 200 личных отметок. Удалите ненужные.');
      result[url]={status:item.status,note:item.note};
    }
    return result;
  }
  function courseURL(value){const url=CampusData.safeURL(value);return url&&/^\/(ru|kk|en)\/courses\/[^/?#]+\/?$/.test(new URL(url).pathname)?url:null;}
  function choiceKey(course){
    const url=courseURL(course.url);
    if(!url||!Number.isInteger(course.stream)||course.stream<1)return null;
    return JSON.stringify([course.examHash||CampusExams.sha256,url,course.stream,course.group??null]);
  }
  function validChoiceKey(key){
    try{const a=JSON.parse(key);return Array.isArray(a)&&a.length===4&&/^[a-f0-9]{64}$/.test(a[0])&&courseURL(a[1])===a[1]&&Number.isInteger(a[2])&&a[2]>0&&a[2]<=1000&&(a[3]===null||Number.isInteger(a[3])&&a[3]>0&&a[3]<=1000);}catch{return false;}
  }
  function choices(value,strict=false){
    if(!object(value)){if(strict)throw Error('Некорректные настройки языков.');return {};}
    const result={};
    for(const [key,language]of Object.entries(value)){
      if(!validChoiceKey(key)||!['en','kk','ru'].includes(language)){if(strict)throw Error('Некорректные настройки языков.');continue;}
      if(Object.keys(result).length>=200)throw Error('Слишком много настроек языков.');
      result[key]=language;
    }
    return result;
  }
  function favorites(value,strict=false){
    if(!Array.isArray(value)){if(strict)throw Error('Некорректный список избранного.');return [];}
    const result=[];
    for(const item of value){
      const url=CampusData.safeURL(item?.url);
      if(!url||typeof item.title!=='string'||!item.title.trim()||item.title.length>180){if(strict)throw Error('В избранном есть некорректная ссылка или название.');continue;}
      if(!result.some(f=>f.url===url))result.push({title:item.title,url});
    }
    if(result.length>50)throw Error('В избранном может быть не более 50 страниц.');
    return result;
  }
  function validate(data){
    if(!object(data)||!object(data.campusNight)||!Array.isArray(data.campusFavorites))throw Error('В файле нет настроек и избранного.');
    const normalized=CampusNight.normalize(data.campusNight);
    if(Object.keys(normalized).some(key=>data.campusNight[key]!==normalized[key]))throw Error('В файле некорректные настройки оформления.');
    const result={campusNight:normalized,campusFavorites:favorites(data.campusFavorites,true)};
    for(const [key,field]of [['campusPanel','collapsed'],['campusExamGrid','enabled']])if(Object.hasOwn(data,key)){
      if(!object(data[key])||typeof data[key][field]!=='boolean')throw Error('В файле некорректные настройки панелей.');
      result[key]={[field]:data[key][field]};
    }
    if(Object.hasOwn(data,choiceStorage))result[choiceStorage]=choices(data[choiceStorage],true);
    if(Object.hasOwn(data,noteStorage))result[noteStorage]=taskNotes(data[noteStorage],true);
    return result;
  }
  function backup(state){
    const data={campusNight:CampusNight.normalize(state.campusNight),campusFavorites:favorites(state.campusFavorites)};
    for(const [key,field]of [['campusPanel','collapsed'],['campusExamGrid','enabled']])if(typeof state[key]?.[field]==='boolean')data[key]={[field]:state[key][field]};
    data[choiceStorage]=choices(state[choiceStorage]);
    data[noteStorage]=taskNotes(state[noteStorage]);
    return {format:'campus-night-settings',version:2,createdAt:new Date().toISOString(),data};
  }
  function parse(text){
    if(typeof text!=='string'||new TextEncoder().encode(text).length>backupLimit)throw Error('Размер файла должен быть не больше 1 МБ.');
    let doc;try{doc=JSON.parse(text);}catch{throw Error('Не удалось прочитать JSON-файл.');}
    if(doc?.format!=='campus-night-settings')throw Error('Это не формат резервной копии Qairu Space.');
    if(![1,2].includes(doc.version))throw Error('Версия резервной копии не поддерживается. Обновите расширение.');
    return validate(doc.data);
  }
  function mergeImport(current,data){
    const safe=validate(data);
    safe.campusFavorites=favorites([...favorites(current.campusFavorites),...safe.campusFavorites],true);
    if(safe[choiceStorage])safe[choiceStorage]=choices({...choices(current[choiceStorage]),...safe[choiceStorage]},true);
    if(safe[noteStorage])safe[noteStorage]=taskNotes({...taskNotes(current[noteStorage]),...safe[noteStorage]},true);
    return safe;
  }
  function language(stored,course){return stored[choiceKey(course)]||null;}
  function watch(onChange){
    let value={},revision=0,disposed=false;
    const changed=(updates,area)=>{if(area==='local'&&updates[choiceStorage]){revision++;value=choices(updates[choiceStorage].newValue);if(!disposed)onChange();}};
    browser.storage.onChanged.addListener(changed);
    const ready=browser.storage.local.get(choiceStorage).then(stored=>{if(!revision)value=choices(stored[choiceStorage]);}).finally(()=>{if(!disposed)onChange();});
    ready.catch(()=>{});
    return {ready,get:course=>language(value,course),all:()=>value,
      async set(course,selected){await ready;const key=choiceKey(course);if(!key)throw Error('Не удалось определить курс и поток.');const before=revision;const reply=await browser.runtime.sendMessage({type:'campus:exam-language',key,language:selected});if(reply?.error)throw Error(reply.error);if(!reply?.choices)throw Error('Не удалось сохранить язык. Обновите вкладку.');if(revision===before)value=choices(reply.choices);if(!disposed)onChange();},
      destroy(){disposed=true;browser.storage.onChanged.removeListener(changed);}};
  }
  globalThis.CampusPreferences={keys,backupLimit,choiceStorage,noteStorage,taskURL,taskNotes,choiceKey,validChoiceKey,choices,language,backup,parse,validate,mergeImport,watch};
})();
