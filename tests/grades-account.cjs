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
test('delete requests only key-transmission permission without requiring grade preview or upload consent',async()=>{
 const dom=new JSDOM(fs.readFileSync('extension/grades-account.html','utf8'),{url:'https://extension.test/grades-account.html',runScripts:'outside-only'}),w=dom.window,calls=[],permissions=[];let allowed=false;
 w.browser={permissions:{getAll:async()=>({data_collection:[]}),request:async p=>{permissions.push(p);allowed=true;return true;}},runtime:{sendMessage:async m=>{calls.push(m);return m.action==='delete'?(allowed?{deleted:true}:{error:'permission revoked'}):{hasKey:true,status:'deleting',period:'2026-2027~1'};}}};
 w.eval(fs.readFileSync('extension/grades-account.js','utf8'));await new Promise(setImmediate);w.document.querySelector('#delete-confirm').checked=true;w.document.querySelector('#delete-confirm').dispatchEvent(new w.Event('change'));w.document.querySelector('#delete').click();await new Promise(setImmediate);
 assert.equal(permissions.length,1);assert.equal(JSON.stringify(permissions[0]),JSON.stringify({data_collection:['authenticationInfo']}));assert.ok(calls.some(m=>m.action==='delete'));assert.ok(!calls.some(m=>['join','preview','resume'].includes(m.action)));assert.equal(w.document.querySelector('#consent').checked,false);dom.window.close();
});
test('declining delete permission still persists pending deletion before returning to the user',async()=>{
 const dom=new JSDOM(fs.readFileSync('extension/grades-account.html','utf8'),{url:'https://extension.test/grades-account.html',runScripts:'outside-only'}),w=dom.window,calls=[];let status='active';
 w.browser={permissions:{getAll:async()=>({data_collection:[]}),request:async()=>false},runtime:{sendMessage:async m=>{calls.push(m);if(m.action==='prepareDelete')status='deleting';return {hasKey:true,status,period:'2026-2027~1'};}}};
 w.eval(fs.readFileSync('extension/grades-account.js','utf8'));await new Promise(setImmediate);w.document.querySelector('#delete-confirm').checked=true;w.document.querySelector('#delete-confirm').dispatchEvent(new w.Event('change'));w.document.querySelector('#delete').click();await new Promise(setImmediate);
 assert.equal(status,'deleting');assert.ok(!calls.some(m=>m.action==='delete'));dom.window.close();
});
