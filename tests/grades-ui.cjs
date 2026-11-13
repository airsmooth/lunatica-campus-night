const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
test('inline comparisons preserve grades, tolerate rerenders, hide stale values and never enroll through campus',async()=>{
 const dom=new JSDOM('<main><h1>Оценки и прогресс</h1><span id="score">80 %</span><span id="gpa">—</span></main>',{url:'https://campus.qairu.edu.kz/ru/grades',runScripts:'outside-only'}),w=dom.window;let value=80;const calls=[];
 w.TextEncoder=TextEncoder;Object.defineProperty(w,'crypto',{value:crypto});w.CampusGradesSource={parse:()=>({snapshot:{period:'2026-2027~1',metrics:[{key:'course:TST999:current',kind:'course',course:'TST999',work:'',value,max:100,status:'current',score:value}]},anchors:new Map([['course:TST999:current',w.document.querySelector('#score')]]),issues:[],gpaState:'missing'})};
 w.browser={runtime:{sendMessage:async m=>{calls.push(m);return {hasKey:false,status:'off'};}}};
 w.eval(fs.readFileSync('extension/grades-ui.js','utf8'));
 const metric=w.CampusGradesSource.parse().snapshot.metrics[0];const fingerprint=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(metric)))).toString('hex');
 const data={period:'2026-2027~1',results:[{key:metric.key,fingerprint,range:{percent:[20,30],places:[21,40],participants:[100,119],tied:false},published:Date.UTC(2026,10,13)}]};
 await w.CampusGradesUI.render(w.document,data,{status:'active'});assert.equal(w.document.querySelector('#score').textContent,'80 %');assert.equal(w.document.querySelectorAll('[data-space-grade]').length,1);assert.match(w.document.querySelector('[data-space-grade]').textContent,/20–30%/);
 await w.CampusGradesUI.render(w.document,data,{status:'active'});assert.equal(w.document.querySelectorAll('[data-space-grade]').length,1);
 value=90;await w.CampusGradesUI.render(w.document,data,{status:'active'});assert.doesNotMatch(w.document.querySelector('[data-space-grade]').textContent,/20–30%/);
 await w.CampusGradesUI.render(w.document,data,{status:'off'});assert.equal(w.document.querySelectorAll('[data-space-grade]').length,0);assert.equal(calls.some(m=>m.action==='join'),false);dom.window.close();
});
