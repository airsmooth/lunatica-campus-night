/* RFC 5545 export: explicit UTC+5 source times, never inferred exam assignments. */
(() => {
  'use strict';
  const utc=value=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  const escape=value=>String(value??'').replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
  function fold(line){let result='',part='',size=0;for(const char of line){const n=new TextEncoder().encode(char).length;if(size+n>75){result+=part+'\r\n';part=' ';size=1;}part+=char;size+=n;}return result+part;}
  function events(data,choices={},now=Date.now()){
    const engine=globalThis.CampusSessions?CampusSessions.engine(data?.session):CampusExams;
    if(!data||data.source!==CampusData.origin+engine.sourcePath)throw Error('Не подтверждён источник экзаменов.');
    if(!Number.isFinite(data.verifiedAt)||now-data.verifiedAt>300000||data.verifiedAt>now+60000)throw Error('Обновите экзамены перед скачиванием календаря.');
    const result=new Map();
    for(const original of data.courses||[]){
      const language=CampusPreferences.language(choices,original),course=language?engine.match(original,[],language):original;
      for(const exam of course.matches||[]){
        const times=String(exam.time).split(';').map(time=>({time,possible:false})).concat((exam.possibleTimes||[]).map(time=>({time,possible:true})));
        for(const {time,possible}of times){
          const match=time.trim().match(/^(\d{2}):(\d{2})\s*[–—-]\s*(\d{2}):(\d{2})$/);
          if(!match||+match[1]>23||+match[3]>23||+match[2]>59||+match[4]>59)throw Error('Не удалось определить точное время экзамена.');
          const start=Date.parse(`${exam.date}T${match[1]}:${match[2]}:00+05:00`),end=Date.parse(`${exam.date}T${match[3]}:${match[4]}:00+05:00`);
          if(!Number.isFinite(start)||end<=start||new Date(start+5*3600000).toISOString().slice(0,10)!==exam.date)throw Error('Некорректные дата или время экзамена.');
          const url=CampusData.safeURL(course.url);if(!url)throw Error('Не удалось определить ссылку курса.');
          const tentative=course.matches.length>1||times.length>1||!!exam.note||possible;
          const uid=`${utc(start)}-${utc(end)}-${encodeURIComponent(url)}@campus-night`;
          const description=[`Поток ${course.stream} · практика ${course.group??'по потоку'}`,exam.format,
            tentative?'Возможный сеанс. Уточните назначенное вам время у преподавателя.':'',exam.note,
            'Время в исходном расписании: Астана (UTC+5).','Оригинал: '+data.source+'#page='+exam.page].filter(Boolean).join('\n');
          result.set(uid,{uid,start,end,title:(tentative?'Уточнить сеанс: ':'Экзамен: ')+course.title,location:exam.room,description,url:data.source+'#page='+exam.page,tentative,courseURL:url});
        }
      }
    }
    return [...result.values()].sort((a,b)=>a.start-b.start||a.uid.localeCompare(b.uid));
  }
  const upcoming=(items,now=Date.now(),certainOnly=true)=>items.filter(item=>item.end>now&&(!certainOnly||!item.tentative));
  function serialize(items,now=Date.now()){
    if(!items.length)throw Error('Нет подходящих предстоящих экзаменов для календаря.');
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Qairu Space//QAIRU Exams//RU','CALSCALE:GREGORIAN'];
    for(const item of items)lines.push('BEGIN:VEVENT','UID:'+escape(item.uid),'DTSTAMP:'+utc(now),'DTSTART:'+utc(item.start),'DTEND:'+utc(item.end),
      'SUMMARY:'+escape(item.title),'LOCATION:'+escape(item.location),'DESCRIPTION:'+escape(item.description),'URL:'+item.url,
      'STATUS:'+(item.tentative?'TENTATIVE':'CONFIRMED'),'TRANSP:OPAQUE','END:VEVENT');
    lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';
  }
  globalThis.CampusCalendar={events,upcoming,serialize};
})();
