const {test}=require('node:test'),assert=require('node:assert/strict');
require('../extension/grades-model.js');require('../extension/grades-background.js');
const G=globalThis.CampusGrades;
function setup(){let saved=null,time=1000000,allowed=true,fail=false,email='synthetic@qairu.test',value=80,period='2026-2027~1',reads=0,remote=null,retired=false;const calls=[];
 const browser={runtime:{id:'test',getURL:p=>'moz-extension://test/'+p},permissions:{getAll:async()=>({data_collection:allowed?['websiteContent','authenticationInfo','personallyIdentifyingInfo']:[]})},tabs:{query:async()=>[{id:1,active:true}],create:async()=>({}),sendMessage:async()=>{reads++;return {identity:email,snapshot:{period,complete:true,metrics:[{kind:'course',course:'TST999',work:'',value,max:100,status:'current'}]},issues:[],gpaState:'missing'}}}};
 const vault={get:async()=>structuredClone(saved),put:async v=>{saved=structuredClone(v)},clear:async()=>{saved=null}};
 const fetch=async(url,options)=>{calls.push({url,...options});if(fail)throw Error('offline');const b=options.body&&JSON.parse(options.body);let data,status=200;if(options.method==='DELETE'){remote=null;retired=true;data={deleted:true};}else if(retired){status=410;data={error:'retired'};}else if(options.method==='PUT'){if((remote?.revision||0)!==b.revision){status=409;data={error:'conflict'};}else{remote={revision:b.revision+1,period:b.snapshot.period,digest:await CampusGradesClient.digest(b.snapshot)};data=remote;}}else if(!remote){status=404;data={error:'missing'};}else data=url.endsWith('/results')?{period:remote.period,results:[]}:remote;return {ok:status===200,status,json:async()=>data};};
 const create=()=>CampusGradesClient.create({browser,fetch,vault,now:()=>time});let client=create();
 const own={id:'test',url:browser.runtime.getURL('grades-account.html')},campus={id:'test',url:'https://campus.qairu.edu.kz/ru/grades',tab:{id:1}};
 const act=(action,more={},sender=own)=>client.handle({action,...more},sender);
 return {act,own,campus,calls,vault,browser,get:()=>saved,reads:()=>reads,time:n=>time=n,allow:v=>allowed=v,fail:v=>fail=v,email:v=>email=v,value:v=>value=v,period:v=>period=v,restart:()=>{client=create();},preview:()=>act('preview'),join:()=>act('join',{consent:true})};
}
test('no opt-in means no reads or requests; campus cannot enroll or export',async()=>{
 const s=setup();await s.act('tick',{},s.campus);await s.act('state',{},s.campus);assert.equal(s.reads(),0);assert.equal(s.calls.length,0);
 assert.ok((await s.act('join',{consent:true},s.campus)).error);assert.ok((await s.act('export',{},s.campus)).error);
 assert.ok((await s.join()).error);await s.preview();assert.equal(s.calls.length,0);s.allow(false);assert.ok((await s.join()).error);assert.equal(s.calls.length,0);
});
test('bound-account daily unchanged heartbeat; mismatched account/period never uploads; pause survives restart',async()=>{
 const s=setup();await s.preview();assert.ok(!(await s.join()).error);const secret=s.get().secret;
 assert.ok(!JSON.stringify(await s.act('state',{},s.campus)).includes(secret));assert.ok(!JSON.stringify(s.calls).includes('synthetic@'));
 let n=s.calls.length,r=s.reads();await s.act('tick',{},s.campus);assert.equal(s.calls.length,n);assert.equal(s.reads(),r);
 s.time(1000000+86400000);await s.act('tick',{},s.campus);assert.ok(s.calls.at(-1).url.endsWith('/heartbeat'));assert.ok(!s.calls.at(-1).body.includes('metrics'));
 s.email('different@qairu.test');n=s.calls.length;assert.ok((await s.act('update')).error);assert.equal(s.calls.length,n);
 s.email('synthetic@qairu.test');s.period('2026-2027~2');assert.ok((await s.act('update')).error);assert.equal(s.calls.length,n);
 await s.act('pause');s.restart();r=s.reads();await s.act('tick',{},s.campus);assert.equal(s.reads(),r);
});
test('failed join and delete preserve separate key; pending deletion retries after restart without collection',async()=>{
 const s=setup();await s.preview();s.fail(true);assert.ok((await s.join()).error);const secret=s.get().secret;assert.match(secret,/^g1_[a-f0-9]{64}$/);
 s.fail(false);await s.preview();assert.ok(!(await s.join()).error);assert.equal(s.get().secret,secret);
 s.fail(true);assert.ok((await s.act('delete',{confirm:true})).error);assert.equal(s.get().status,'deleting');s.restart();const reads=s.reads();s.fail(false);await s.act('tick',{},s.campus);assert.equal(s.reads(),reads);assert.equal(s.get(),null);
});
test('period change and transfer require renewed consent and preview; revoke blocks transmission',async()=>{
 const s=setup();await s.preview();await s.join();const key=await s.act('export');assert.equal(key.format,'qairu-space-grades-key');
 s.period('2026-2027~2');assert.ok((await s.act('changePeriod',{consent:true})).error);await s.preview();assert.ok(!(await s.act('changePeriod',{consent:true})).error);assert.equal(s.get().period,'2026-2027~2');
 s.allow(false);const n=s.calls.length;assert.ok((await s.act('update')).error);assert.equal(s.calls.length,n);
 assert.ok((await s.act('import',{file:key,consent:true})).error);
});
