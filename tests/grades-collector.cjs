const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
test('collection reads fresh selected-period HTML between two identity checks and rejects account switches',async()=>{
 const dom=new JSDOM('<select><option value="2026-2027~1" selected>term</option></select><div>stale grades</div>',{url:'https://campus.qairu.edu.kz/ru/grades?term=2026-2027~1',runScripts:'outside-only'}),w=dom.window;let handler,switchAccount=false,profiles=0;const urls=[];
 w.AbortSignal=globalThis.AbortSignal;w.CampusGrades={wire:s=>s,period:s=>s};w.CampusGradesSource={identity:d=>d.body.textContent,parse:d=>{assert.equal(d.body.textContent,'fresh');return {snapshot:{period:'2026-2027~1'},issues:[]};}};
 w.fetch=async url=>{urls.push(url);return {ok:true,text:async()=>url.includes('/profile')?`<body>${++profiles===2&&switchAccount?'other':'original'}</body>`:'<body>fresh</body>'};};
 w.browser={runtime:{id:'test',onMessage:{addListener:f=>handler=f}}};w.eval(fs.readFileSync('extension/grades-collector.js','utf8'));
 let result=await handler({type:'campus:grades-collect',period:'2026-2027~1'},{id:'test'});assert.equal(result.identity,'original');assert.equal(urls[1],'https://campus.qairu.edu.kz/ru/grades?term=2026-2027~1');
 profiles=0;switchAccount=true;result=await handler({type:'campus:grades-collect'},{id:'test'});assert.match(result.error,/Аккаунт/);dom.window.close();
});
