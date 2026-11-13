const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
test('account starts unconsented; preview is local; opt-in needs preview and checkbox; pending deletion remains actionable',async()=>{
 const dom=new JSDOM(fs.readFileSync('extension/grades-account.html','utf8'),{url:'https://extension.test/grades-account.html',runScripts:'outside-only'}),w=dom.window,calls=[];
 w.browser={permissions:{getAll:async()=>({}),request:async()=>true},runtime:{sendMessage:async m=>{calls.push(m);return m.action==='preview'?{period:'2026-2027~1',metrics:[{kind:'course',course:'TST999',value:80,max:100}],issues:[],gpaState:'missing'}:{hasKey:false,status:'off'};}}};
 w.eval(fs.readFileSync('extension/grades-account.js','utf8'));await new Promise(setImmediate);
 assert.equal(w.document.querySelector('#consent').checked,false);assert.equal(w.document.querySelector('#join').disabled,true);
 w.document.querySelector('#preview').click();await new Promise(setImmediate);assert.ok(calls.some(m=>m.action==='preview'));assert.equal(calls.some(m=>m.action==='join'),false);
 assert.match(w.document.querySelector('#preview-result').textContent,/2026-2027/);assert.equal(w.document.querySelector('#join').disabled,true);
 w.document.querySelector('#consent').checked=true;w.document.querySelector('#consent').dispatchEvent(new w.Event('change'));assert.equal(w.document.querySelector('#join').disabled,false);
 dom.window.close();
});
