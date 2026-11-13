/* The secret vault is extension-origin IndexedDB, never content-script storage. */
globalThis.CampusRankingClient=(()=>{
 'use strict';
 const endpoint='https://qairu-space-xp.airsmooth.workers.dev',key='qairuSpaceRanking';
 const dataTypes=['websiteContent','authenticationInfo','personallyIdentifyingInfo'];
 function vault(){
  let opening;
  function db(){return opening||=(new Promise((resolve,reject)=>{const r=indexedDB.open('qairu-space-private',1);r.onupgradeneeded=()=>r.result.createObjectStore('secrets');r.onsuccess=()=>resolve(r.result);r.onerror=()=>{opening=null;reject(Error('Не удалось открыть хранилище ключа.'))}}))}
  async function operation(mode,action){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('secrets',mode),s=t.objectStore('secrets');let result;const r=action(s);r.onsuccess=()=>result=r.result;t.oncomplete=()=>resolve(result);t.onerror=t.onabort=()=>reject(Error('Не удалось сохранить ключ рейтинга.'))})}
  return {get:()=>operation('readonly',s=>s.get('member')),put:v=>operation('readwrite',s=>s.put(v,'member')),clear:()=>operation('readwrite',s=>s.delete('member'))};
 }
 function create({browser:b,fetch:send,vault:v}){
  let queue=Promise.resolve();
  const accountURL=b.runtime.getURL('ranking-account.html');
  function senderType(sender){if(sender?.id!==b.runtime.id)return null;if(sender.url===accountURL)return 'account';try{const u=new URL(sender.url);if(u.origin==='https://campus.qairu.edu.kz'&&sender.tab?.id!=null)return 'campus'}catch{}return null}
  async function permissions(){const p=await b.permissions.getAll();if(Array.isArray(p.data_collection)&&!dataTypes.every(t=>p.data_collection.includes(t)))throw Error('Разрешение на передачу XP выключено. Откройте управление рейтингом и разрешите передачу данных.');}
  async function api(method,path,secret,payload){
   if(secret)await permissions();
   let response;try{response=await send(endpoint+path,{method,headers:{'Content-Type':'application/json',...(secret?{Authorization:'Bearer '+secret}:{})},...(payload?{body:JSON.stringify(payload)}:{}),credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)})}catch{throw Error('Нет связи с рейтингом. Ключ сохранён; повторите запрос.')}
   const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error||'Не удалось выполнить запрос.'),{status:response.status});return result;
  }
  async function xp(sender){
   let tabId=sender.tab?.id;
   if(tabId===undefined){const tabs=await b.tabs.query({url:'https://campus.qairu.edu.kz/*'});tabs.sort((a,b)=>Number(b.active)-Number(a.active));tabId=tabs[0]?.id}
   if(tabId===undefined)throw Error('Откройте кампус и войдите в свой кабинет, затем повторите.');
   let result;try{result=await b.tabs.sendMessage(tabId,{type:'campus:xp'},{frameId:0})}catch{throw Error('Не удалось прочитать XP. Обновите вкладку кампуса и войдите в кабинет.')}
   if(!CampusXP.validXP(result?.xp))throw Error('XP не прочитан. Откройте «Моя траектория» и повторите.');return result.xp;
  }
  async function run(m,sender){
   const type=senderType(sender);if(!type)throw Error('Недопустимый источник запроса.');
   if(m.action==='open'){await b.tabs.create({url:accountURL});return {opened:true}}
   if(m.action==='state'){const stored=(await b.storage.local.get(key))[key]||{};return {hasKey:!!await v.get(),member:stored.member||null,pending:stored.pending===true}}
   if(m.action==='list')return api('GET','/v1/board?offset='+Math.max(0,Math.min(10000,Number.isInteger(m.offset)?m.offset:0)));
   if(['xp','join','export','import','permit'].includes(m.action)&&type!=='account')throw Error('Откройте управление рейтингом в расширении.');
   if(m.action==='xp')return {xp:await xp(sender)};
   if(m.action==='permit'){await permissions();return {allowed:true}}
   if(m.action==='export'){const secret=await v.get();if(!secret)throw Error('Ключ ещё не создан.');return {secret}}
   if(m.action==='import'){
    if(m.consent!==true||!/^[a-f0-9]{64}$/.test(m.secret||''))throw Error('Некорректный ключ или нет согласия.');
    if(await v.get())throw Error('Сначала удалите текущую запись. Её ключ нельзя перезаписать.');
    const result=await api('GET','/v1/member',m.secret);await v.put(m.secret);await b.storage.local.set({[key]:{member:result.member,pending:false}});return result;
   }
   let secret=await v.get();
   if(m.action==='self'){if(!secret)throw Error('Вы ещё не участвуете.');const result=await api('GET','/v1/member',secret);await b.storage.local.set({[key]:{alias:result.member.alias,member:result.member,pending:false}});return result;}
   if(m.action==='delete'){
    if(m.confirm!==true)throw Error('Подтвердите удаление записи.');if(!secret)return {deleted:true};
    const result=await api('DELETE','/v1/member',secret);await v.clear();await b.storage.local.remove(key);return result;
   }
   if(m.action==='join'||m.action==='update'){
    await permissions();if(m.action==='join'&&m.consent!==true)throw Error('Подтвердите добровольное участие.');
    if(m.action==='update'&&!secret)throw Error('Сначала присоединитесь к рейтингу.');
    const stored=(await b.storage.local.get(key))[key]||{},alias=CampusXP.alias(m.action==='join'?m.alias:stored.member?.alias||stored.alias);
    const currentXP=await xp(sender);
    if(!secret){secret=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');await v.put(secret)}
    await b.storage.local.set({[key]:{...stored,alias,pending:true}});
    const result=await api('PUT','/v1/member',secret,{alias,xp:currentXP,...(m.action==='join'?{join:true}:{})});
    await b.storage.local.set({[key]:{alias,member:result.member,pending:false}});return result;
   }
   throw Error('Неизвестное действие.');
  }
  function handle(m,sender){const operation=queue.then(()=>run(m,sender)).catch(e=>({error:e.message,status:e.status||0}));queue=operation.then(()=>{});return operation}
  return {handle};
 }
 return {create,vault,dataTypes,endpoint};
})();
if(typeof indexedDB!=='undefined'){
 const ranking=CampusRankingClient.create({browser,fetch:(...args)=>fetch(...args),vault:CampusRankingClient.vault()});
 browser.runtime.onMessage.addListener((m,sender)=>m?.type==='space:ranking'?ranking.handle(m,sender):undefined);
}
