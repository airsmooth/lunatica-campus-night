/* Local, data-only session tables; dates remain hidden until the source PDF matches. */
(() => {
  'use strict';
  const key='campusExamSession',limit=524288;
  const integer=(n,max=1000)=>Number.isInteger(n)&&n>=1&&n<=max;
  function string(value,max=240,empty=false){if(typeof value!=='string'||value.length>max||(!empty&&!value.trim()))throw Error('В таблице есть пустой или слишком длинный текст.');return value.trim();}
  function time(value){
    const text=string(value,240),parts=text.split(';');if(parts.length>12)throw Error('Слишком много сеансов в одной строке.');
    for(const part of parts){const m=part.trim().match(/^(\d{2}):(\d{2})\s*[–—-]\s*(\d{2}):(\d{2})$/);if(!m||+m[1]>23||+m[3]>23||+m[2]>59||+m[4]>59||+m[3]*60 + +m[4]<=+m[1]*60 + +m[2])throw Error('В таблице некорректное время экзамена.');}
    return parts.map(part=>part.trim().replace(/\s*[–—-]\s*/,'–')).join('; ');
  }
  function validate(value){
    if(value?.format!=='campus-night-exams'||value.version!==1)throw Error('Нужна таблица Campus Night в формате JSON версии 1. PDF сам по себе не является таблицей.');
    if(!/^\/api\/storage\/[a-zA-Z0-9-]{1,100}$/.test(value.sourcePath)||!/^[a-f0-9]{64}$/.test(value.sha256))throw Error('Некорректная ссылка или SHA-256 исходного PDF.');
    const sourceTitle=string(value.sourceTitle,300);if(sourceTitle.length<8)throw Error('Укажите полное название исходного документа.');
    if(!Array.isArray(value.rows)||!value.rows.length||value.rows.length>1000)throw Error('В таблице должно быть от 1 до 1000 строк.');
    const rows=value.rows.map(row=>{
      if(!row||!integer(row.stream)||!integer(row.page)||!['en','kk','ru'].includes(row.language))throw Error('Некорректные поток, язык или страница PDF.');
      if(row.groups!==null&&(!Array.isArray(row.groups)||!row.groups.length||row.groups.length>100||row.groups.some(n=>!integer(n))))throw Error('Некорректные практические группы. Для всего потока используйте null.');
      if(typeof row.date!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(row.date))throw Error('Дата должна быть в формате ГГГГ-ММ-ДД.');
      const stamp=Date.parse(row.date+'T00:00:00Z');if(!Number.isFinite(stamp)||new Date(stamp).toISOString().slice(0,10)!==row.date)throw Error('Несуществующая дата экзамена.');
      const item={subject:string(row.subject,100),title:string(row.title),stream:row.stream,language:row.language,groups:row.groups===null?null:[...new Set(row.groups)],date:row.date,time:time(row.time),room:string(row.room,200),page:row.page,format:string(row.format,200),note:string(row.note??'',1000,true)};
      if(row.possibleTimes!==undefined){if(!Array.isArray(row.possibleTimes)||row.possibleTimes.length>12)throw Error('Некорректные возможные сеансы.');item.possibleTimes=[...new Set(row.possibleTimes.flatMap(value=>time(value).split('; ')))];if(item.possibleTimes.length>12)throw Error('Слишком много возможных сеансов.');}
      return item;
    });
    return {format:'campus-night-exams',version:1,title:string(value.title,200),sourceTitle,sourcePath:value.sourcePath,sha256:value.sha256,rows};
  }
  function parse(text){if(typeof text!=='string'||new TextEncoder().encode(text).length>limit)throw Error('Таблица должна быть не больше 512 КБ.');let value;try{value=JSON.parse(text);}catch{throw Error('Не удалось прочитать JSON-таблицу экзаменов.');}return validate(value);}
  const builtin=()=>({format:'campus-night-exams',version:1,title:'Бакалавриат · ноябрь 2026',sourceTitle:CampusExams.sourceTitle,sourcePath:CampusExams.sourcePath,sha256:CampusExams.sha256,rows:CampusExams.rows});
  const engine=session=>session?CampusExams.forSession(validate(session)):CampusExams;
  function documentMatches(session,doc){
    if(!session)return /экзамен/i.test(doc.title)&&/бакалавр/i.test(doc.title)&&/2026/.test(doc.title)&&/ноябр/i.test(doc.title);
    const normalize=text=>String(text).toLocaleLowerCase('ru-RU').replace(/\s+/g,' ').trim();return normalize(doc.title).includes(normalize(session.sourceTitle));
  }
  globalThis.CampusSessions={key,limit,validate,parse,builtin,engine,documentMatches};
})();
