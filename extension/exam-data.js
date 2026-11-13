/* Manually verified transcription of the university's scanned November 2026 table.
 * Never use it unless the downloaded source has the exact SHA-256 below.
 * Multiple matches deliberately remain ambiguous: split groups have several sessions.
 */
(() => {
  'use strict';
  const rows=[];
  const titles={ict:'Информационно-коммуникационные технологии',history:'История Казахстана',math:'Основы математического анализа',programming:'Введение в программирование',ai:'Основы искусственного интеллекта'};
  function add(subject,stream,language,date,room,groups,times,page,format='Письменный экзамен',note='') {
    groups.forEach((group,i)=>rows.push({subject,title:titles[subject],stream,language,groups:group,date:'2026-11-'+date,
      room, time:times[i],page,format,note}));
  }
  const written=['09:00–10:40','11:00–12:40','13:00–14:40','15:00–16:40','17:00–18:40'];
  add('ict',1,'kk','16','200',[[1,2],[3,6],[4],[5,7]],written,1);
  add('ict',1,'en','16','219',[[1,3],[2],[4],[5],[6,7]],written,1);
  add('ict',2,'en','17','200',[[4,1],[5,1],[2,6],[3],[7]],written,1,'Письменный экзамен','Практика 1 разделена между двумя сеансами.');
  add('history',1,'en','18','ALEM-CW-B, C, D, E',[null],['09:00–09:50'],2,'Компьютерное тестирование','В таблице также есть общий сеанс в 12:00–12:50 для потоков 1 и 2 (90 человек); распределение не указано. Уточните свой сеанс.');
  add('history',2,'en','18','ALEM-CW-B, C, D, E',[null],['10:00–10:50'],2,'Компьютерное тестирование','В таблице также есть общий сеанс в 12:00–12:50 для потоков 1 и 2 (90 человек); распределение не указано. Уточните свой сеанс.');
  add('history',1,'kk','18','ALEM-CW-B, C, D, E',[null],['11:00–11:50'],2,'Компьютерное тестирование','В таблице также есть общий сеанс в 12:00–12:50 (90 человек); распределение не указано. Уточните свой сеанс.');
  add('math',1,'en','19','200',[[1,3],[2,3]],written,2,'Письменный экзамен','Практика 3 разделена между двумя сеансами.');
  add('math',2,'en','19','200',[[1],[2,3]],written.slice(2),2);
  add('math',1,'kk','19','219',[[1,3],[2,3]],written,2,'Письменный экзамен','Практика 3 разделена между двумя сеансами.');
  add('math',2,'kk','19','219',[[1,3],[2,4]],written.slice(2),2);
  add('math',3,'en','20','219',[[2,1],[3,1]],written,2,'Письменный экзамен','Практика 1 разделена между двумя сеансами.');
  add('math',4,'en','20','200',[[1],[2],[3],[4,5]],written,2);
  add('programming',1,'kk','23','200',[[1],[2,6],[3,7],[4],[5]],written,3);
  add('programming',1,'en','23','219',[[1],[2],[3,4],[5,6,7]],written,3);
  add('programming',2,'en','24','200',[[1,2],[4,3],[5,2],[6],[7,3]],written,3,'Письменный экзамен','Практики 2 и 3 разделены между сеансами.');
  add('ai',1,'kk','24','200',[[1,2],[3,4,6],[5,7]],['09:00–09:50; 10:00–10:50; 11:00–11:50','12:00–12:50; 13:00–13:50; 14:00–14:50','15:00–15:50; 16:00–16:50; 17:00–17:50'],4,'Защита проекта','Указаны все слоты для вашей группы; очередь защиты уточните у преподавателя.');
  add('ai',2,'en','25','224',[[1,2,3],[4,5],[6,7]],['09:00–09:50; 10:00–10:50; 11:00–11:50','12:00–12:50; 13:00–13:50; 14:00–14:50','15:00–15:50; 16:00–16:50; 17:00–17:50'],4,'Защита проекта','Указаны все слоты для вашей группы; очередь защиты уточните у преподавателя.');
  add('ai',1,'en','25','219',[[1,2],[3,5],[4],[6,7]],['09:00–09:50; 10:00–10:50; 11:00–11:50','12:00–12:50; 13:00–13:50','14:00–14:50; 15:00–15:50','16:00–16:50; 17:00–17:50; 18:00–18:50'],4,'Защита проекта','Указаны все слоты для вашей группы; очередь защиты уточните у преподавателя.');
  // Page 2 also lists an undivided 90-person history session. Preserve it as a
  // possible session, never as an assigned one, including in the timetable grid.
  for(const row of rows.filter(row=>row.subject==='history'))row.possibleTimes=['12:00–12:50'];
  // Surnames below are transcribed from the verified source, with explicit Latin aliases.
  // They identify the language of a specific subject/stream when teaching has ended.
  const teachers={
    ict:{en:/имашев|imashev/i,kk:/алдаберген|aldabergen/i},
    history:{en:/аужанова|auzhanova/i,kk:/тапалова|tapalova/i},
    math:{en:/бердикожа|berdiqozha|мурзабекова|murzabekova/i,kk:/нурсултанов|nursultanov|өмірәлі|омирали|emirali/i},
    programming:{en:/омиргалиев|omirgaliyev|omirgaliev/i,kk:/бердикожа|berdiqozha/i},
    ai:{en:/сыдыкова|sydykova|sydyqova|ускенбаева|uskenbayeva/i,kk:/жукабаева|zhukabayeva|zhukabaeva/i}
  };
  function match(course,lessons,chosenLanguage=null,session=null) {
    const byStream=(session?.rows||rows).filter(r=>r.title.toLowerCase()===course.title.toLowerCase()&&r.stream===course.stream);
    const related=lessons.filter(l=>l.title.toLowerCase()===course.title.toLowerCase());
    const languages=[...new Set(related.map(l=>/Английский/i.test(l.note)?'en':/Казахский|Қазақ/i.test(l.note)?'kk':/Русский|Орыс/i.test(l.note)?'ru':null).filter(Boolean))];
    let language=languages.length===1?languages[0]:null;
    let languageSource=language?'расписание занятий':'';
    if(!language && languages.length===0) {
      const options=[...new Set(byStream.map(r=>r.language))];
      if(options.length===1) {language=options[0];languageSource='единственный язык потока в PDF';}
      else {
        const subject=byStream[0]?.subject, mapping=session?null:teachers[subject];
        const matched=mapping?options.filter(lang=>mapping[lang]?.test(course.teacher||'')):[];
        if(matched.length===1) {language=matched[0];languageSource='преподаватель курса и PDF';}
      }
    }
    if(['en','kk','ru'].includes(chosenLanguage)) {language=chosenLanguage;languageSource='выбрано вручную';}
    if (!course.stream || !language) return {...course,language,languageSource,matches:[],issue:'Язык не определён однозначно. Выберите его ниже; поток и практика взяты из курса.'};
    const candidates=byStream.filter(r=>r.language===language);
    if(candidates.some(r=>r.groups) && !course.group) return {...course,language,matches:[],issue:'В карточке курса не указан номер практической группы.'};
    let matches=candidates.filter(r=>!r.groups||r.groups.includes(course.group));
    // A stream-wide split note must not make an unsplit practical group uncertain.
    if(matches.length===1 && /^Практик/.test(matches[0].note))matches=matches.map(row=>({...row,note:''}));
    return {...course,language,languageSource,matches,issue:matches.length?'':'В таблице нет строки для этой группы и потока.'};
  }
  function forSession(session){return {...session,titles:Object.fromEntries(session.rows.map(row=>[row.subject,row.title])),match:(course,lessons,language=null)=>match(course,lessons,language,session)};}
  globalThis.CampusExams={rows,titles,match,forSession,
    sourcePath:'/api/storage/7dc0cb81-49e8-4d17-8c6f-a59169f9bc76',
    sourceTitle:'Расписание экзаменов: бакалавриат, 16–27 ноября 2026 года',
    sha256:'27d3fab0f4ce9bffec3b50834f8686876312ed7a763fc01bb9b82d116a6e9e7d'};
})();
