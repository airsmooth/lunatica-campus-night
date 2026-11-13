import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {routeGrades,publishGrades} from '../server/grades.mjs';
const day=86400000,start=Date.UTC(2026,10,13),token=i=>'g1_'+i.toString(16).padStart(64,'0');
function setup(){const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('server/grades-schema.sql','utf8'));const DB={prepare(sql){let params=[];const s={bind(...p){params=p;return s},async first(){return db.prepare(sql).get(...params)||null},async all(){return {results:db.prepare(sql).all(...params)}},async run(){return {meta:db.prepare(sql).run(...params)}}};return s},async batch(statements){db.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.all());db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}}};return {db,DB,RATE:{limit:async()=>({success:true})}};}
const snapshot=(value=80,period='2026-2027~1')=>({period,complete:true,metrics:[{kind:'course',course:'TST999',work:'',value,max:100,status:'current'}]});
async function req(e,method,path='member',i=1,body,now=start){return routeGrades(new Request('https://test.local/v2/grades/'+path,{method,headers:{Authorization:'Bearer '+token(i),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}),e,now);}
const put=(e,i,value=80,revision=0,now=start,period='2026-2027~1',mutation=crypto.randomUUID())=>req(e,'PUT','member',i,{snapshot:snapshot(value,period),consent:'grades-2026-11-v1',revision,mutation},now);
const results=async(e,i=1,now=start)=> (await req(e,'GET','results',i,undefined,now)).json();
test('private results require 20, daily cadence and five distinct changes; exact values never escape',async()=>{
 const e=setup();for(let i=1;i<=19;i++)assert.equal((await put(e,i)).status,200);
 await publishGrades(e,start);assert.deepEqual((await results(e)).results,[]);
 await put(e,20);await publishGrades(e,start);let r=await results(e);assert.equal(r.results.length,1);assert.deepEqual(r.results[0].range.percent,[0,100]);assert.ok(!JSON.stringify(r).includes('score'));
 await put(e,1,90,1);assert.deepEqual((await results(e)).results,[]);
 await publishGrades(e,start+day);assert.deepEqual((await results(e,1,start+day)).results,[]);
 await put(e,1,91,2,start+day);await put(e,2,91,1,start+day);await put(e,3,91,1,start+day);await put(e,4,91,1,start+day);
 await publishGrades(e,start+day);assert.deepEqual((await results(e,1,start+day)).results,[]);
 await put(e,5,91,1,start+day);await publishGrades(e,start+day);assert.equal((await results(e,1,start+day)).results.length,1);
 for(let i=1;i<=5;i++)await put(e,i,70,i===1?3:2,start+day);
 await publishGrades(e,start+day);assert.deepEqual((await results(e,1,start+day)).results,[]);
 assert.equal((await req(e,'GET','board')).status,404);assert.equal((await req(e,'GET','results?score=99')).status,400);e.db.close();
});
test('CAS, idempotency and deletion tombstone prevent lost-response duplication and resurrection',async()=>{
 const e=setup(),mutation=crypto.randomUUID();assert.equal((await put(e,1,80,0,start,'2026-2027~1',mutation)).status,200);
 assert.equal((await put(e,1,80,0,start,'2026-2027~1',mutation)).status,200);
 assert.equal(e.db.prepare('SELECT consent FROM grades_members').get().consent,'grades-2026-11-v1');
 assert.equal((await put(e,1,81,0,start,'2026-2027~1',mutation)).status,409);
 assert.equal((await put(e,1,81,0)).status,409);
 assert.equal((await req(e,'DELETE')).status,200);assert.equal((await req(e,'DELETE')).status,200);
 assert.equal((await put(e,1,80,0)).status,410);assert.equal((await put(e,1,80,1)).status,410);
 assert.equal(e.db.prepare('SELECT count(*) n FROM grades_metrics').get().n,0);assert.equal(e.db.prepare('SELECT count(*) n FROM grades_members').get().n,0);e.db.close();
});
test('deletion, period replacement and expiry immediately suppress old snapshots; heartbeat preserves unchanged enrollment',async()=>{
 const e=setup();for(let i=1;i<=20;i++)await put(e,i);await publishGrades(e,start);
 await req(e,'DELETE','member',20);assert.deepEqual((await results(e)).results,[]);
 await put(e,21);await publishGrades(e,start+day);assert.deepEqual((await results(e,1,start+day)).results,[]);
 for(let i=1;i<=4;i++)await put(e,i,81,1,start+day);await publishGrades(e,start+day);assert.equal((await results(e,1,start+day)).results.length,1);
 await put(e,1,80,2,start+day,'2026-2027~2');assert.deepEqual((await results(e,2,start+day)).results,[]);
 const last=e.db.prepare('SELECT last_changed FROM grades_members LIMIT 1').get().last_changed;
 assert.equal((await req(e,'POST','heartbeat',1,{revision:3},start+80*day)).status,200);
 assert.equal(e.db.prepare('SELECT last_changed FROM grades_members LIMIT 1').get().last_changed,last);
 assert.equal((await req(e,'GET','member',1,undefined,start+91*day)).status,200);
 assert.equal((await req(e,'GET','member',2,undefined,start+91*day)).status,410);
 await publishGrades(e,start+92*day);assert.equal(e.db.prepare('SELECT count(*) n FROM grades_members').get().n,1);e.db.close();
});
test('validation, consent, separate token and fail-closed rate gate',async()=>{
 const e=setup();assert.equal((await req(e,'PUT','member',1,{snapshot:snapshot(),revision:0,mutation:crypto.randomUUID()})).status,400);
 assert.equal((await req(e,'PUT','member',1,{snapshot:{...snapshot(),email:'private'},consent:'grades-2026-11-v1',revision:0,mutation:crypto.randomUUID()})).status,400);
 assert.equal((await routeGrades(new Request('https://test.local/v2/grades/member',{headers:{Authorization:'Bearer '+'a'.repeat(64)}}),e,start)).status,401);
 e.RATE.limit=async()=>({success:false});assert.equal((await put(e,1)).status,429);e.db.close();
});
