const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
require('../extension/xp.js');const X=globalThis.CampusXP;
const doc=html=>new JSDOM(html).window.document;
test('only unique exact XP meters are accepted; missing values never become zero',()=>{
 for(const xp of [0,1200,18000])assert.equal(X.parseDocument(doc(`<meter class="qui-levelscale" aria-valuenow="${xp}"></meter>`)).xp,xp);
 for(const h of ['', '<meter class="qui-levelscale" aria-valuenow=""></meter>','<meter class="qui-levelscale" aria-valuenow="-1"></meter>','<meter class="qui-levelscale" aria-valuenow="12.3"></meter>','<meter class="qui-levelscale" aria-valuenow="1200"></meter>'.repeat(2),'<input type="password"><meter class="qui-levelscale" aria-valuenow="1200"></meter>'])assert.throws(()=>X.parseDocument(doc(h)));
});
test('campus tier boundaries and payload validation',()=>{
 for(const [xp,name] of [[0,'Hello World'],[399,'Hello World'],[400,'Стажёр'],[1199,'Стажёр'],[1200,'Junior'],[18000,'CTO'],[999999,'CTO']])assert.equal(X.tier(xp).name,name);
 assert.equal(X.validXP(1.1),false);assert.equal(X.validXP('10'),false);assert.equal(X.validXP(1000001),false);
 assert.equal(X.alias('  Orbit  '),'Orbit');assert.throws(()=>X.alias('<img src=x>'));assert.throws(()=>X.alias('name@example.com'));
});
test('XP service fetches current own trajectory on each request and refuses logout',async()=>{
 const fs=require('node:fs'),dom=new JSDOM('<h1>Campus</h1>',{url:'https://campus.qairu.edu.kz/ru',runScripts:'outside-only'}),w=dom.window;let n=0,logout=false;
 w.AbortSignal=AbortSignal;w.browser={runtime:{onMessage:{addListener(){}}},storage:{onChanged:{addListener(){}}}};
 w.fetch=async(url,opts)=>{assert.equal(url,'https://campus.qairu.edu.kz/ru/trajectory');assert.equal(opts.cache,'no-store');n++;return {ok:true,text:async()=>logout?'<input type="password">':`<h1>Trajectory</h1><meter class="qui-levelscale" aria-valuenow="${n}"></meter>`}};
 for(const f of ['campus-data.js','xp.js','dashboard-content.js'])w.eval(fs.readFileSync('extension/'+f,'utf8'));
 assert.equal((await w.CampusService.request('campus:xp')).xp,1);assert.equal((await w.CampusService.request('campus:xp')).xp,2);
 logout=true;await assert.rejects(()=>w.CampusService.request('campus:xp'));dom.window.close();
});
