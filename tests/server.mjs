import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs';
import worker from '../server/worker.mjs';
function setup(){const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('server/schema.sql','utf8'));return {db,DB:{prepare(sql){let params=[];const s={bind(...p){params=p;return s},async first(){return db.prepare(sql).get(...params)||null},async all(){return {results:db.prepare(sql).all(...params)}},async run(){return {meta:db.prepare(sql).run(...params)}}};return s}},RATE:{limit:async()=>({success:true})}}}
const key=n=>n.repeat(64),send=(env,method,path='/v1/member',token=key('a'),body)=>worker.fetch(new Request('https://test.local'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},...(body===undefined?{}:{body:JSON.stringify(body)})}),env);
const join=(e,k,xp,alias)=>send(e,'PUT','/v1/member',k,{xp,alias,join:true});
test('idempotent enrollment, tied ranks, own update/decrease and deletion',async()=>{
 const e=setup();let a=await join(e,key('a'),1200,'Orbit');assert.equal(a.status,200);const row=await a.json();assert.equal(row.member.rank,1);assert.equal(row.member.tier.name,'Junior');assert.equal(JSON.stringify(row).includes(key('a')),false);
 await join(e,key('a'),1200,'Orbit');await join(e,key('b'),1200,'Comet');await join(e,key('c'),400,'Nova');
 let board=await (await send(e,'GET','/v1/board')).json();assert.equal(board.total,3);assert.deepEqual(board.rows.map(r=>r.rank),[1,1,3]);assert.equal(JSON.stringify(board).includes('token'),false);
 assert.equal((await send(e,'PUT','/v1/member',key('d'),{xp:200,alias:'Nope'})).status,404);
 assert.equal((await send(e,'PUT','/v1/member',key('a'),{xp:0,alias:'Orbit'})).status,200);
 assert.equal((await (await send(e,'GET')).json()).member.xp,0);
 assert.equal((await send(e,'DELETE')).status,200);assert.equal((await send(e,'DELETE')).status,200);
 assert.equal((await send(e,'GET')).status,404);assert.equal((await (await send(e,'GET','/v1/board')).json()).total,2);e.db.close();
});
test('auth, invalid input, body limits, rate limiting and inactive expiry',async()=>{
 const e=setup();assert.equal((await send(e,'GET','/v1/member','bad')).status,401);
 for(const b of [{xp:-1,alias:'Orbit',join:true},{xp:1.5,alias:'Orbit',join:true},{xp:3,alias:'<script>',join:true},{xp:3,alias:'x'.repeat(5000),join:true}])assert.ok([400,413].includes((await send(e,'PUT','/v1/member',key('a'),b)).status));
 await join(e,key('a'),100,'Orbit');e.db.exec('UPDATE participants SET updated_at=0');assert.equal((await (await send(e,'GET','/v1/board')).json()).total,0);assert.equal((await send(e,'GET')).status,404);
 assert.equal((await send(e,'PUT','/v1/member',key('a'),{xp:200,alias:'Orbit'})).status,404);
 await worker.scheduled({},e,{});assert.equal(e.db.prepare('SELECT count(*) n FROM participants').get().n,0);
 e.RATE.limit=async()=>({success:false});assert.equal((await send(e,'GET','/v1/board')).status,429);e.db.close();
});
