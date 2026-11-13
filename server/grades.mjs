import '../extension/grades-model.js';
const G=globalThis.CampusGrades,DAY=86400000,TTL=90*DAY;
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, PUT, POST, DELETE, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
const error=(message,status=400)=>Object.assign(Error(message),{status});
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const stmt=(env,sql,...args)=>env.DB.prepare(sql).bind(...args);
const all=async(env,sql,...args)=>(await stmt(env,sql,...args).all()).results;
async function readBody(request){
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw error('Ожидается JSON.');
 const reader=request.body?.getReader();if(!reader)throw error('Пустой запрос.');
 let size=0;const parts=[];
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();throw error('Слишком большой снимок.',413);}parts.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw error('Некорректный JSON.');}
}
function allow(b,fields){if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!fields.includes(k)))throw error('Некорректные поля.');}
// All dependent writes share a transaction and a generation guard. A stale reader writes nothing.
async function commit(env,generation,build){
 const nonce=crypto.randomUUID(),guard='EXISTS(SELECT 1 FROM grades_state WHERE id=1 AND nonce=?)';
 const statements=[stmt(env,'UPDATE grades_state SET generation=generation+1,nonce=? WHERE id=1 AND generation=? RETURNING generation',nonce,generation)];
 const add=(sql,...args)=>statements.push(stmt(env,sql.replaceAll('$guard',guard),...args,nonce));
 build(add);const out=await env.DB.batch(statements);return out[0].results.length===1;
}
async function remove(env,token,now){
 for(let retry=0;retry<5;retry++){
  const {generation}=await stmt(env,'SELECT generation FROM grades_state WHERE id=1').first();
  if(await commit(env,generation,add=>{
   add('UPDATE grades_snapshots SET valid=0 WHERE scope IN(SELECT scope FROM grades_metrics WHERE token=?) AND $guard',token);
   add('DELETE FROM grades_results WHERE scope IN(SELECT scope FROM grades_metrics WHERE token=?) AND $guard',token);
   add('DELETE FROM grades_changes WHERE token=? AND $guard',token);
   add('DELETE FROM grades_metrics WHERE token=? AND $guard',token);
   add('DELETE FROM grades_members WHERE token=? AND $guard',token);
   add('INSERT OR IGNORE INTO grades_retired(token,retired) SELECT ?,? WHERE $guard',token,now);
  }))return;
 }throw error('Конфликт обновлений. Повторите позже.',409);
}
export async function routeGrades(request,env,now=Date.now()){
 try{
  const url=new URL(request.url),path=url.pathname,method=request.method;
  if(!['/v2/grades/member','/v2/grades/heartbeat','/v2/grades/results'].includes(path))throw error('Не найдено.',404);
  if(url.search)throw error('Параметры сравнения не поддерживаются.');
  if(method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!env.RATE||!(await env.RATE.limit({key:'grades:'+await hash(request.headers.get('CF-Connecting-IP')||'unknown')})).success)throw error('Повторите запрос позже.',429);
  const auth=request.headers.get('Authorization')||'';if(!/^Bearer g1_[a-f0-9]{64}$/.test(auth))throw error('Нужен отдельный ключ оценок.',401);
  const token=await hash(auth.slice(7));
  if(path.endsWith('/member')&&method==='DELETE'){await remove(env,token,now);return json({deleted:true});}
  const b=['PUT','POST'].includes(method)?await readBody(request):null;
  let normalized,digest,metrics;
  if(path.endsWith('/member')&&method==='PUT'){
   allow(b,['snapshot','consent','revision','mutation']);
   if(b.consent!==G.consentVersion||!Number.isSafeInteger(b.revision)||b.revision<0||typeof b.mutation!=='string'||!/^[a-f0-9-]{36}$/.test(b.mutation))throw error('Нужны согласие и версия записи.');
   try{normalized=G.validateSnapshot(b.snapshot);}catch{throw error('Некорректный снимок оценок.');}
   digest=await hash(JSON.stringify(G.wire(normalized)));
   metrics=await Promise.all(normalized.metrics.map(async m=>({scope:normalized.period+'|'+m.key,key:m.key,fingerprint:await hash(JSON.stringify(m)),value:m.score,exact:JSON.stringify(m)})));
  }
  for(let retry=0;retry<5;retry++){
   const {generation}=await stmt(env,'SELECT generation FROM grades_state WHERE id=1').first();
   const member=await stmt(env,'SELECT * FROM grades_members WHERE token=?',token).first();
   if(await stmt(env,'SELECT token FROM grades_retired WHERE token=?',token).first())throw error('Запись удалена. Для нового участия нужен новый ключ.',410);
   if(member&&member.last_seen<=now-TTL){await remove(env,token,now);throw error('Запись удалена после 90 дней неактивности.',410);}
   if(path.endsWith('/results')&&method==='GET'){
    if(!member)throw error('Вы ещё не участвуете.',404);
    const rows=await all(env,`SELECT m.metric_key,r.result,s.published FROM grades_metrics m JOIN grades_results r ON r.scope=m.scope AND r.token=m.token AND r.fingerprint=m.fingerprint JOIN grades_snapshots s ON s.scope=m.scope JOIN grades_members a ON a.token=m.token WHERE m.token=? AND s.valid=1 AND a.last_seen>? AND NOT EXISTS(SELECT 1 FROM grades_metrics expired JOIN grades_members e ON e.token=expired.token WHERE expired.scope=m.scope AND e.last_seen<=?)`,token,now-TTL,now-TTL);
    return json({period:member.period,results:rows.map(r=>({key:r.metric_key,range:JSON.parse(r.result),published:r.published})),verified:false});
   }
   if(path.endsWith('/member')&&method==='GET'){
    if(!member)throw error('Вы ещё не участвуете.',404);
    return json({revision:member.revision,period:member.period,digest:member.digest,lastSeen:member.last_seen});
   }
   if(path.endsWith('/heartbeat')&&method==='POST'){
    allow(b,['revision']);if(!member)throw error('Запись не найдена.',404);
    if(b.revision!==member.revision)throw error('Запись обновлена в другом браузере.',409);
    if(await commit(env,generation,add=>add('UPDATE grades_members SET last_seen=? WHERE token=? AND $guard',now,token)))return json({revision:member.revision});
    continue;
   }
   if(!normalized)throw error('Метод не поддерживается.',405);
   if(member?.mutation===b.mutation){if(member.digest!==digest)throw error('Конфликт повторного запроса.',409);return json({revision:member.revision,digest});}
   if((member?.revision||0)!==b.revision)throw error('Запись обновлена в другом браузере.',409);
   const revision=b.revision+1,data=JSON.stringify(metrics);
   if(await commit(env,generation,add=>{
    // A removed metric (including an old period) invalidates the complete cohort snapshot.
    add(`UPDATE grades_snapshots SET valid=0 WHERE scope IN(SELECT scope FROM grades_metrics WHERE token=? AND scope NOT IN(SELECT json_extract(value,'$.scope') FROM json_each(?))) AND $guard`,token,data);
    add(`DELETE FROM grades_results WHERE scope IN(SELECT scope FROM grades_metrics WHERE token=? AND scope NOT IN(SELECT json_extract(value,'$.scope') FROM json_each(?))) AND $guard`,token,data);
    add(`DELETE FROM grades_changes WHERE token=? AND scope NOT IN(SELECT json_extract(value,'$.scope') FROM json_each(?)) AND $guard`,token,data);
    add(`INSERT OR IGNORE INTO grades_changes(scope,token) SELECT json_extract(j.value,'$.scope'),? FROM json_each(?) j WHERE NOT EXISTS(SELECT 1 FROM grades_metrics m WHERE m.token=? AND m.scope=json_extract(j.value,'$.scope') AND m.fingerprint=json_extract(j.value,'$.fingerprint')) AND $guard`,token,data,token);
    add('DELETE FROM grades_metrics WHERE token=? AND $guard',token);
    add(`INSERT INTO grades_metrics(token,scope,metric_key,fingerprint,value,exact) SELECT ?,json_extract(value,'$.scope'),json_extract(value,'$.key'),json_extract(value,'$.fingerprint'),json_extract(value,'$.value'),json_extract(value,'$.exact') FROM json_each(?) WHERE $guard`,token,data);
    add(`INSERT INTO grades_members(token,revision,period,digest,mutation,last_seen,last_changed) SELECT ?,?,?,?,?,?,? WHERE $guard ON CONFLICT(token) DO UPDATE SET revision=excluded.revision,period=excluded.period,digest=excluded.digest,mutation=excluded.mutation,last_seen=excluded.last_seen,last_changed=excluded.last_changed`,token,revision,normalized.period,digest,b.mutation,now,member?.digest===digest?member.last_changed:now);
   }))return json({revision,digest});
  }throw error('Конфликт обновлений. Повторите позже.',409);
 }catch(e){return json({error:e.status?e.message:'Сравнение временно недоступно.'},e.status||503);}
}
export async function publishGrades(env,now=Date.now()){
 const expired=await all(env,'SELECT token FROM grades_members WHERE last_seen<=?',now-TTL);
 for(const m of expired)await remove(env,m.token,now);
 const scopes=await all(env,'SELECT DISTINCT scope FROM grades_metrics');
 for(const {scope} of scopes){
  const {generation}=await stmt(env,'SELECT generation FROM grades_state WHERE id=1').first();
  const old=await stmt(env,'SELECT * FROM grades_snapshots WHERE scope=?',scope).first();
  if(old&&Math.floor(old.published/DAY)>=Math.floor(now/DAY))continue;
  const changes=await stmt(env,'SELECT count(*) n FROM grades_changes WHERE scope=?',scope).first();
  if(old&&changes.n<5)continue;
  const members=await all(env,'SELECT m.token,m.fingerprint,m.value FROM grades_metrics m JOIN grades_members a ON a.token=m.token WHERE m.scope=? AND a.last_seen>? ORDER BY m.value DESC',scope,now-TTL);
  if(members.length<20)continue;
  // Each result row is private and contains only a coarse interval, never a distribution.
  const scores=new Map();for(let i=0;i<members.length;i++){const v=members[i].value;if(!scores.has(v))scores.set(v,{h:i,e:0});scores.get(v).e++;}
  const data=JSON.stringify(members.map(m=>{const {h,e}=scores.get(m.value);return {token:m.token,fingerprint:m.fingerprint,result:JSON.stringify(G.range(members.length,h,e))};}));
  await commit(env,generation,add=>{
   add('DELETE FROM grades_results WHERE scope=? AND $guard',scope);
   add(`INSERT INTO grades_results(scope,token,fingerprint,result) SELECT ?,json_extract(value,'$.token'),json_extract(value,'$.fingerprint'),json_extract(value,'$.result') FROM json_each(?) WHERE $guard`,scope,data);
   add('INSERT INTO grades_snapshots(scope,published,valid) SELECT ?,?,1 WHERE $guard ON CONFLICT(scope) DO UPDATE SET published=excluded.published,valid=1',scope,now);
   add('DELETE FROM grades_changes WHERE scope=? AND $guard',scope);
  });
 }
}
