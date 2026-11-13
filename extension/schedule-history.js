/* Bounded local snapshots, never a guess about official timetable revisions. */
(() => {
  'use strict';
  const key='campusScheduleHistory',day=86400000;
  function snapshot(value){
    if(!value||!Number.isFinite(value.from)||!Number.isFinite(value.through)||value.through<value.from||value.through-value.from>7*day||!Array.isArray(value.lessons)||value.lessons.length>500)throw Error('Не удалось проверить расписание для сравнения.');
    const lessons=value.lessons.map(item=>{
      if(!item||!Number.isFinite(item.start)||!Number.isFinite(item.end)||item.start<value.from||item.start>=value.through+day||item.end<=item.start||item.end>item.start+day)throw Error('Некорректное время занятия.');
      const result={start:item.start,end:item.end};
      for(const field of ['title','room','teacher','type','note']){
        if(typeof item[field]!=='string'||item[field].length>500)throw Error('Некорректное описание занятия.');result[field]=item[field];
      }
      return result;
    });
    return {from:value.from,through:value.through,lessons};
  }
  const identity=l=>JSON.stringify([l.title,l.type,l.teacher,l.note]);
  const exact=l=>JSON.stringify([identity(l),l.start,l.end,l.room]);
  function diff(previous,next){
    const before=snapshot(previous),after=snapshot(next);
    if(before.from!==after.from||before.through!==after.through)return [];
    const removed=[...before.lessons],added=[...after.lessons];
    for(let i=removed.length-1;i>=0;i--){const at=added.findIndex(l=>exact(l)===exact(removed[i]));if(at!==-1){removed.splice(i,1);added.splice(at,1);}}
    const changes=[];
    for(const id of new Set(removed.map(identity))){
      const old=removed.filter(l=>identity(l)===id),fresh=added.filter(l=>identity(l)===id);
      if(old.length===1&&fresh.length===1){changes.push({kind:'changed',before:old[0],after:fresh[0]});removed.splice(removed.indexOf(old[0]),1);added.splice(added.indexOf(fresh[0]),1);}
    }
    changes.push(...removed.map(before=>({kind:'removed',before})),...added.map(after=>({kind:'added',after})));
    return changes;
  }
  function history(value,now=Date.now()){
    if(!Array.isArray(value))return [];
    return value.filter(record=>{
      try{return /^[a-f0-9]{64}$/.test(record.scope)&&Number.isSafeInteger(record.revision)&&record.updatedAt>now-35*day&&record.updatedAt<=now+day&&snapshot(record)&&Array.isArray(record.changes)&&record.changes.length<=50;}catch{return false;}
    }).slice(-4);
  }
  function observe(value,scope,next,now=Date.now()){
    if(!/^[a-f0-9]{64}$/.test(scope))throw Error('Не определён набор курсов для сравнения.');
    const data=snapshot(next),all=history(value,now),prior=all.find(r=>r.scope===scope&&r.from===data.from&&r.through===data.through);
    const changes=prior?diff(prior,data):[];
    const combined=[...(prior?.changes||[])];
    for(const change of changes){change.observedAt=now;combined.push(change);}
    const record={...data,scope,revision:(prior?.revision||0)+(changes.length||!prior?1:0),updatedAt:now,changes:combined.slice(-50)};
    return {record,history:[...all.filter(r=>r!==prior),record].slice(-4)};
  }
  function acknowledge(value,scope,from,revision){
    return (Array.isArray(value)?value:[]).map(record=>record.scope===scope&&record.from===from&&record.revision===revision?{...record,changes:[]}:record);
  }
  globalThis.CampusScheduleHistory={key,snapshot,diff,history,observe,acknowledge};
})();
