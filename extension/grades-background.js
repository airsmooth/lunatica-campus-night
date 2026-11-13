globalThis.CampusGradesClient=(()=>{
 'use strict';
 const G=globalThis.CampusGrades,DAY=86400000,endpoint='https://qairu-space-xp.airsmooth.workers.dev/v2/grades/';
 const dataTypes=['websiteContent','authenticationInfo','personallyIdentifyingInfo'];
 const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
 const digest=async snapshot=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(G.wire(G.validateSnapshot(snapshot)))))));
 async function binding(identity,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(salt),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(identity))));}
 function vault(){
  let opening;const db=()=>opening||=(new Promise((resolve,reject)=>{const r=indexedDB.open('qairu-space-grades-private',1);r.onupgradeneeded=()=>r.result.createObjectStore('secrets');r.onsuccess=()=>resolve(r.result);r.onerror=()=>{opening=null;reject(Error('Не удалось открыть хранилище участия.'));};}));
  async function op(mode,fn){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('secrets',mode),r=fn(tx.objectStore('secrets'));let result;r.onsuccess=()=>result=r.result;tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(Error('Не удалось сохранить ключ оценок.'));});}
  return {get:()=>op('readonly',s=>s.get('member')),put:value=>op('readwrite',s=>s.put(value,'member')),clear:()=>op('readwrite',s=>s.delete('member'))};
 }
 function create({browser:b,fetch:send,vault:v,now=Date.now}){
  const account=b.runtime.getURL('grades-account.html');let queue=Promise.resolve(),loaded,state,preview,epoch=0;
  async function load(){if(!loaded)loaded=v.get().then(s=>state=s||null);await loaded;return state;}
  const save=()=>state?v.put(structuredClone(state)):v.clear();
  function source(s){if(s?.id!==b.runtime.id)return null;if(s.url===account)return 'account';try{if(new URL(s.url).origin==='https://campus.qairu.edu.kz'&&s.tab?.id!=null&&(!s.frameId||s.frameId===0))return 'campus';}catch{}return null;}
  async function permissions(required=dataTypes){const p=await b.permissions.getAll();if(Array.isArray(p.data_collection)&&!required.every(t=>p.data_collection.includes(t)))throw Error('Разрешите передачу данных на странице управления сравнением.');}
  async function api(method,path,payload){await permissions(method==='DELETE'?['authenticationInfo']:dataTypes);let r;try{r=await send(endpoint+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+state.secret},...(payload?{body:JSON.stringify(payload)}:{}),credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});}catch{throw Error('Нет связи. Ключ сохранён; повторите действие позже.');}const result=await r.json();if(!r.ok)throw Object.assign(Error(result.error||'Сравнение недоступно.'),{status:r.status});return result;}
  async function collect(sender,period){
   let id=source(sender)==='campus'?sender.tab.id:null;
   if(id===null){const tabs=await b.tabs.query({url:'https://campus.qairu.edu.kz/*'});tabs.sort((a,b)=>Number(b.active)-Number(a.active));id=tabs[0]?.id;}
   if(id===undefined)throw Error('Откройте кампус в этом браузере и войдите в кабинет.');
   const r=await b.tabs.sendMessage(id,{type:'campus:grades-collect',period},{frameId:0});
   if(r?.error)throw Error(r.error);if(typeof r?.identity!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.identity))throw Error('Аккаунт кампуса не подтверждён.');
   return {identity:r.identity,snapshot:G.wire(G.validateSnapshot(r.snapshot)),issues:Array.isArray(r.issues)?r.issues.slice(0,300):[],gpaState:r.gpaState};
  }
  async function checked(sender,allowPeriod=false){const read=await collect(sender,allowPeriod?undefined:state.period);if(await binding(read.identity,state.salt)!==state.binding)throw Error('В кампусе другой аккаунт. Обновление остановлено; войдите в исходный аккаунт.');if(!allowPeriod&&read.snapshot.period!==state.period)throw Error('В кампусе выбран другой период. Он не будет отправлен без отдельного подтверждения.');return read;}
  function publicState(){return state?{hasKey:true,status:state.status,period:state.period,lastCheck:state.lastCheck||null,lastSuccess:state.lastSuccess||null,error:state.error||null}:{hasKey:false,status:'off'};}
  async function erase(){if(!state)return {deleted:true};state.status='deleting';await save();const r=await api('DELETE','member');state=null;preview=null;await save();return r;}
  async function upload(read,startEpoch){
   if(startEpoch!==epoch||state.status==='deleting'||state.status==='paused')throw Error('Обновление остановлено.');
   const hash=await digest(read.snapshot);
   // Resolve an uncertain response before another write. Never blindly replay a stale snapshot.
   if(state.status==='pending'){
    try{const remote=await api('GET','member');if(startEpoch!==epoch)return publicState();if(remote.digest===hash&&remote.period===read.snapshot.period){state.revision=remote.revision;state.digest=hash;state.period=remote.period;state.status='active';state.lastSuccess=now();state.error=null;state.pending=null;await save();return publicState();}if(remote.revision!==state.revision)throw Error('Запись изменена в другом браузере. Приостановите и подтвердите возобновление.');}
    catch(e){if(e.status!==404)throw e;}
   }
   if(startEpoch!==epoch)throw Error('Обновление остановлено.');
   if(hash===state.digest){await api('POST','heartbeat',{revision:state.revision});}
   else {
    const mutation=state.pending?.digest===hash?state.pending.mutation:crypto.randomUUID();state.pending={mutation,digest:hash};state.status='pending';await save();
    if(startEpoch!==epoch)throw Error('Обновление остановлено.');
    const r=await api('PUT','member',{snapshot:read.snapshot,revision:state.revision,mutation,consent:G.consentVersion});state.revision=r.revision;state.digest=hash;state.period=read.snapshot.period;state.pending=null;
   }
   if(startEpoch===epoch){state.status='active';state.error=null;state.lastSuccess=now();}await save();return publicState();
  }
  async function run(m,sender,startEpoch){
   const type=source(sender);if(!type)throw Error('Недопустимый источник запроса.');await load();
   if(m.action==='open'){await b.tabs.create({url:account});return {opened:true};}
   if(m.action==='state')return publicState();
   if(!['tick','results'].includes(m.action)&&type!=='account')throw Error('Откройте управление сравнением в расширении.');
   if(m.action==='preview'){
    const r=await collect(sender);const salt=state?.salt||random();preview={at:now(),period:r.snapshot.period,salt,binding:await binding(r.identity,salt)};
    return {period:preview.period,metrics:r.snapshot.metrics,issues:r.issues,gpaState:r.gpaState};
   }
   if(m.action==='pause'){if(state){state.status='paused';await save();}return publicState();}
   if(m.action==='prepareDelete'){if(m.confirm!==true)throw Error('Подтвердите удаление.');return publicState();}
   if(m.action==='delete'){if(m.confirm!==true)throw Error('Подтвердите удаление.');return erase();}
   if(m.action==='export'){if(!state)throw Error('Ключ ещё не создан.');return {format:'qairu-space-grades-key',version:1,secret:state.secret,salt:state.salt,binding:state.binding,period:state.period};}
   if(['join','resume','changePeriod','import'].includes(m.action)){
    if(m.consent!==true||!preview||now()-preview.at>300000)throw Error('Прочитайте локальный предпросмотр и подтвердите согласие на выбранный период.');
    await permissions();
    if(state?.status==='deleting')throw Error('Сначала завершите удаление записи.');
    if(m.action==='import'){
     const f=m.file;if(state||!f||f.format!=='qairu-space-grades-key'||f.version!==1||!/^g1_[a-f0-9]{64}$/.test(f.secret)||!/^([a-f0-9]{64})$/.test(f.salt)||!/^([a-f0-9]{64})$/.test(f.binding))throw Error('Некорректный файл или уже есть участие.');
     G.period(f.period);const read=await collect(sender);if(read.snapshot.period!==preview.period||await binding(read.identity,preview.salt)!==preview.binding)throw Error('Предпросмотр устарел. Прочитайте данные заново.');if(startEpoch!==epoch)throw Error('Действие остановлено.');if(read.snapshot.period!==f.period||await binding(read.identity,f.salt)!==f.binding)throw Error('Ключ относится к другому аккаунту или периоду.');
     state={secret:f.secret,salt:f.salt,binding:f.binding,period:f.period,revision:0,status:'paused',lastCheck:now()};await save();
     const remote=await api('GET','member');if(startEpoch!==epoch)return publicState();if(remote.period!==f.period)throw Error('На сервере выбран другой период. Используйте свежий файл ключа.');
     state.revision=remote.revision;state.digest=remote.digest;state.status='active';await save();return upload(read,startEpoch);
    }
    if(!state){if(m.action!=='join')throw Error('Сначала присоединитесь.');state={secret:'g1_'+random(),salt:preview.salt,binding:preview.binding,period:preview.period,revision:0,status:'pending',consent:G.consentVersion};await save();}
    const read=await checked(sender,m.action==='changePeriod');
    if(read.snapshot.period!==preview.period||await binding(read.identity,preview.salt)!==preview.binding)throw Error('Предпросмотр устарел. Прочитайте данные заново.');
    if(startEpoch!==epoch)return publicState();
    if(m.action==='resume') {const remote=await api('GET','member');if(startEpoch!==epoch)return publicState();state.revision=remote.revision;state.digest=remote.digest;state.status='active';}
    else if(state.status==='paused')state.status='active';
    state.lastCheck=now();await save();return upload(read,startEpoch);
   }
   if(m.action==='tick'){
    if(!state)return publicState();if(state.status==='deleting')return erase();
    if(state.status!=='active'||now()-(state.lastCheck||0)<DAY)return publicState();
   }
   if(m.action==='update'||m.action==='tick'){
    if(!state||!['active','pending'].includes(state.status))throw Error('Подтвердите возобновление участия.');
    await permissions();state.lastCheck=now();await save();return upload(await checked(sender),startEpoch);
   }
   if(m.action==='results'){
    if(!state||state.status!=='active')return {results:[],status:state?.status||'off'};
    await permissions();await checked(sender);return api('GET','results');
   }
   throw Error('Неизвестное действие.');
  }
  function handle(m,sender){
   const type=source(sender);let stop=Promise.resolve();
   if(type==='account'&&(m.action==='pause'||['delete','prepareDelete'].includes(m.action)&&m.confirm===true)){
    epoch++;stop=load().then(async()=>{if(state){state.status=m.action==='pause'?'paused':'deleting';await save();}});
   }
   const startEpoch=epoch,operation=queue.then(()=>stop).then(()=>run(m,sender,startEpoch)).catch(async e=>{if(state){state.error=e.message;await save();}return {error:e.message,status:e.status||0};});queue=operation.then(()=>{});return operation;
  }
  return {handle};
 }
 return {create,vault,digest,dataTypes};
})();
if(typeof indexedDB!=='undefined'){
 const client=CampusGradesClient.create({browser,fetch:(...args)=>fetch(...args),vault:CampusGradesClient.vault()});
 browser.runtime.onMessage.addListener((m,s)=>m?.type==='space:grades'?client.handle(m,s):undefined);
}
