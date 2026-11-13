import '../extension/xp.js';
import {routeGrades,publishGrades} from './grades.mjs';
const X=globalThis.CampusXP,RETENTION=90*86400000;
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, PUT, DELETE, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const error=(message,status)=>Object.assign(Error(message),{status});
async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('')}
async function body(request){
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw error('Ожидается JSON.',400);
 const reader=request.body?.getReader();if(!reader)throw error('Пустой запрос.',400);
 let total=0,parts=[];
 try{for(;;){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>1024){await reader.cancel();throw error('Запрос слишком большой.',413)}parts.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(total);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{throw error('Некорректный JSON.',400)}
}
function row(r){return {id:r.id,alias:r.alias,xp:r.xp,updatedAt:r.updated_at,rank:r.rank,tier:X.tier(r.xp)}}
async function member(env,tokenHash,cutoff){
 const r=await env.DB.prepare('SELECT id,alias,xp,updated_at,1+(SELECT count(*) FROM participants b WHERE b.xp>a.xp AND b.updated_at>?) AS rank FROM participants a WHERE token_hash=? AND updated_at>?').bind(cutoff,tokenHash,cutoff).first();return r?row(r):null;
}
export default {
 async fetch(request,env){
  try{
   const url=new URL(request.url),method=request.method;
   if(url.pathname.startsWith('/v2/grades/'))return routeGrades(request,env);
   if(method==='OPTIONS')return new Response(null,{status:204,headers});
   if(url.pathname==='/health'&&method==='GET')return json({service:'Qairu Space beta',version:'2.1.0'});
   if(!['/v1/board','/v1/member'].includes(url.pathname))throw error('Не найдено.',404);
   if(!env.RATE)throw error('Рейтинг временно недоступен.',503);
   const ipHash=await hash(request.headers.get('CF-Connecting-IP')||'unknown');
   if(!(await env.RATE.limit({key:ipHash})).success)throw error('Слишком много запросов. Повторите через минуту.',429);
   const now=Date.now(),cutoff=now-RETENTION;
   if(url.pathname==='/v1/board'){
    if(method!=='GET')throw error('Метод не поддерживается.',405);
    const raw=url.searchParams.get('offset')||'0',offset=Number(raw);
    if(!/^\d{1,5}$/.test(raw)||offset>10000)throw error('Некорректная страница.',400);
    const result=await env.DB.prepare('SELECT id,alias,xp,updated_at,RANK() OVER (ORDER BY xp DESC) AS rank FROM participants WHERE updated_at>? ORDER BY xp DESC,id LIMIT 50 OFFSET ?').bind(cutoff,offset).all();
    const total=(await env.DB.prepare('SELECT count(*) AS n FROM participants WHERE updated_at>?').bind(cutoff).first()).n;
    return json({rows:result.results.map(row),total,offset,hasMore:offset+result.results.length<total,verified:false});
   }
   const auth=request.headers.get('Authorization')||'';if(!/^Bearer [a-f0-9]{64}$/.test(auth))throw error('Нужен ключ управления записью.',401);
   const tokenHash=await hash(auth.slice(7));
   if(method==='DELETE'){await env.DB.prepare('DELETE FROM participants WHERE token_hash=?').bind(tokenHash).run();return json({deleted:true})}
   if(method==='GET'){const m=await member(env,tokenHash,cutoff);if(!m)throw error('Запись не найдена или удалена после 90 дней без обновления.',404);return json({member:m})}
   if(method!=='PUT')throw error('Метод не поддерживается.',405);
   const b=await body(request);if(!b||Array.isArray(b)||!X.validXP(b.xp))throw error('Некорректное значение XP.',400);
   let alias;try{alias=X.alias(b.alias)}catch(e){throw error(e.message,400)}
   if(b.join===true){
    await env.DB.prepare('INSERT INTO participants(token_hash,id,alias,xp,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(token_hash) DO UPDATE SET alias=excluded.alias,xp=excluded.xp,updated_at=excluded.updated_at').bind(tokenHash,crypto.randomUUID(),alias,b.xp,now).run();
   }else{
    await env.DB.prepare('UPDATE participants SET alias=?,xp=?,updated_at=? WHERE token_hash=? AND updated_at>?').bind(alias,b.xp,now,tokenHash,cutoff).run();
   }
   const m=await member(env,tokenHash,cutoff);if(!m)throw error('Запись не найдена. Присоединитесь заново, если хотите участвовать.',404);return json({member:m,verified:false});
  }catch(e){return json({error:e.status?e.message:'Рейтинг временно недоступен. Повторите позже.'},e.status||503)}
 },
 async scheduled(event,env){await env.DB.prepare('DELETE FROM participants WHERE updated_at<=?').bind(Date.now()-RETENTION).run();await publishGrades(env)}
};
