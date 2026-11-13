const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
test('ranking is lazy, uses safe text, and joining opens extension consent without sending XP',async()=>{
 const dom=new JSDOM('<div id="panel-content"></div><button data-panel="ranking">XP</button>',{url:'https://campus.qairu.edu.kz/ru',runScripts:'outside-only'}),w=dom.window,calls=[];
 w.browser={runtime:{sendMessage:async m=>{calls.push(m);return m.action==='state'?{hasKey:false}:m.action==='list'?{rows:[{id:'id',alias:'<img src=x onerror=alert(1)>',xp:1200,rank:1,updatedAt:Date.now(),tier:{name:'Junior'}}],total:1,offset:0,hasMore:false}: {opened:true}}}};
 w.eval(fs.readFileSync('extension/ranking-ui.js','utf8'));const ui=w.CampusRanking.mount({root:w.document});assert.equal(calls.length,0);
 await ui.activate();assert.equal(w.document.querySelector('#ranking img'),null);assert.match(w.document.querySelector('#ranking').textContent,/<img src=x/);
 w.document.querySelector('[data-ranking-action="open"]').click();await new Promise(setImmediate);assert.equal(calls.at(-1).action,'open');assert.equal(calls.some(c=>c.action==='join'||c.action==='update'),false);ui.destroy();dom.window.close();
});
test('network errors keep retry available',async()=>{const dom=new JSDOM('<div id="panel-content"></div>',{runScripts:'outside-only'}),w=dom.window;w.browser={runtime:{sendMessage:async()=>({error:'Нет связи'})}};w.eval(fs.readFileSync('extension/ranking-ui.js','utf8'));const ui=w.CampusRanking.mount({root:w.document});await ui.activate();assert.match(w.document.querySelector('[role="status"]').textContent,/Нет связи/);assert.equal(w.document.querySelector('[data-ranking-action="refresh"]').disabled,false);ui.destroy();dom.window.close()});
test('campus scripts cannot upload XP or delete through synthetic clicks',async()=>{
 const dom=new JSDOM('<div id="panel-content"></div>',{runScripts:'outside-only'}),w=dom.window,calls=[];
 w.browser={runtime:{sendMessage:async m=>{calls.push(m);return m.action==='state'?{hasKey:true}:m.action==='list'?{rows:[],total:0,hasMore:false}:{error:'Synthetic action'}}}};
 w.eval(fs.readFileSync('extension/ranking-ui.js','utf8'));const ui=w.CampusRanking.mount({root:w.document});await ui.activate();
 w.document.querySelector('[data-ranking-action="update"]').click();await new Promise(setImmediate);
 w.document.querySelector('[data-ranking-action="confirm"]').click();await new Promise(setImmediate);
 assert.equal(calls.some(m=>['update','delete'].includes(m.action)),false);ui.destroy();w.close();
});
