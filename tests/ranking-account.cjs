const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
test('joining requires fresh visible XP and permission denial never enrolls',async()=>{
 const dom=new JSDOM(fs.readFileSync('extension/ranking-account.html','utf8'),{url:'https://extension.test/ranking-account.html',runScripts:'outside-only'}),w=dom.window,calls=[];
 w.browser={permissions:{getAll:async()=>({data_collection:[]}),request:async()=>false},runtime:{sendMessage:async m=>{calls.push(m);return m.action==='state'?{hasKey:false}:m.action==='xp'?{xp:1200}:{}}}};
 w.eval(fs.readFileSync('extension/ranking-account.js','utf8'));await new Promise(setImmediate);
 w.document.querySelector('#consent').click();assert.equal(w.document.querySelector('#join').disabled,true,'must preview XP before join');
 w.document.querySelector('#read-xp').click();await new Promise(setImmediate);assert.match(w.document.querySelector('#xp').textContent,/1.?200/);assert.equal(w.document.querySelector('#join').disabled,false);
 w.document.querySelector('#join').click();await new Promise(setImmediate);assert.equal(calls.some(x=>x.action==='join'),false);assert.match(w.document.querySelector('#status').textContent,/не разрешена/);dom.window.close();
});
