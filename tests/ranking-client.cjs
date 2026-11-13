const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){let secret=null,record={},calls=[],fail=false,allowed=true,listener;const ctx={crypto:globalThis.crypto,URL,AbortSignal,console,TextEncoder,fetch:async(url,o)=>{calls.push({url,...o});if(fail)throw Error('offline');return {ok:true,status:200,json:async()=>o.method==='DELETE'?{deleted:true}:{member:{id:'id-1',alias:'Orbit',xp:1200,rank:1,tier:{name:'Junior'},updatedAt:Date.now()}}}},browser:{runtime:{id:'test',getURL:p=>'moz-extension://test/'+p,onMessage:{addListener:f=>listener=f}},permissions:{getAll:async()=>({data_collection:allowed?['websiteContent','authenticationInfo','personallyIdentifyingInfo']:[]})},storage:{local:{get:async()=>record,set:async v=>Object.assign(record,v),remove:async k=>delete record[k]}},tabs:{sendMessage:async()=>({xp:1200}),query:async()=>[{id:1,url:'https://campus.qairu.edu.kz/ru',active:true}],create:async()=>({})}}};
 vm.createContext(ctx);for(const f of ['xp.js','ranking-background.js'])vm.runInContext(fs.readFileSync('extension/'+f,'utf8'),ctx);
 const vault={get:async()=>secret,put:async s=>{secret=s},clear:async()=>{secret=null}};
 const c=ctx.CampusRankingClient.create({browser:ctx.browser,fetch:ctx.fetch,vault});
 const own={id:'test',url:'moz-extension://test/ranking-account.html'},campus={id:'test',url:'https://campus.qairu.edu.kz/ru',tab:{id:1}};
 return {c,own,campus,calls,getSecret:()=>secret,fail:v=>fail=v,permit:v=>allowed=v,record};
}
test('consent and sender guard; state never transmits XP or reveals secret',async()=>{
 const s=setup();await s.c.handle({action:'state'},s.campus);assert.equal(s.calls.length,0);
 assert.ok((await s.c.handle({action:'join',alias:'Orbit',consent:true},s.campus)).error);
 assert.ok((await s.c.handle({action:'export'},s.campus)).error);
 assert.ok((await s.c.handle({action:'state'},{id:'other',url:s.campus.url})).error);
 s.permit(false);assert.ok((await s.c.handle({action:'join',alias:'Orbit',consent:true},s.own)).error);assert.equal(s.calls.length,0);
});
test('failed join and delete retain key, retries reuse identity, successful delete clears it',async()=>{
 const s=setup();s.fail(true);assert.ok((await s.c.handle({action:'join',alias:'Orbit',consent:true},s.own)).error);const secret=s.getSecret();assert.match(secret,/^[a-f0-9]{64}$/);
 s.fail(false);assert.ok((await s.c.handle({action:'join',alias:'Orbit',consent:true},s.own)).member);assert.equal(s.getSecret(),secret);
 const state=await s.c.handle({action:'state'},s.campus);assert.equal(JSON.stringify(state).includes(secret),false);assert.equal(JSON.stringify(s.record).includes(secret),false);
 s.fail(true);assert.ok((await s.c.handle({action:'delete',confirm:true},s.campus)).error);assert.equal(s.getSecret(),secret);
 s.fail(false);await s.c.handle({action:'delete',confirm:true},s.campus);assert.equal(s.getSecret(),null);
});
test('revocation blocks member traffic and key import requires no active local identity',async()=>{
 const s=setup();await s.c.handle({action:'join',alias:'Orbit',consent:true},s.own);let n=s.calls.length;s.permit(false);
 assert.ok((await s.c.handle({action:'update'},s.campus)).error);assert.equal(s.calls.length,n);
 s.permit(true);assert.ok((await s.c.handle({action:'import',secret:'b'.repeat(64),consent:true},s.own)).error);
});
