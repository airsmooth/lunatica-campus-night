const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),base='extension/',tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const d=new JSDOM('<div id="exam-list"></div>',{url:'https://campus.qairu.edu.kz/ru',runScripts:'outside-only'}),w=d.window;let state=null,writes=0,downloads;const listeners=new Set();
 w.TextEncoder=TextEncoder;w.browser={storage:{local:{get:async()=>({campusExamSession:state})},onChanged:{addListener:fn=>listeners.add(fn),removeListener:fn=>listeners.delete(fn)}},runtime:{sendMessage:async m=>{writes++;state=m.session;for(const fn of listeners)fn({campusExamSession:{newValue:state}},'local');return {saved:true};}}};
 for(const file of ['exam-data.js','exam-sessions.js','session-ui.js'])if(fs.existsSync(base+file))w.eval(fs.readFileSync(base+file,'utf8'));
 w.CampusFiles={save:(...args)=>downloads=args};assert.equal(typeof w.CampusSessionUI?.mount,'function','session import UI required');
 const view=w.CampusSessionUI.mount({root:w.document});await tick();const q=s=>w.document.querySelector(s),file=q('#session-file');
 const select=async text=>{Object.defineProperty(file,'files',{configurable:true,value:[{size:Buffer.byteLength(text),text:async()=>text}]});file.dispatchEvent(new w.Event('change'));await tick();};
 const incoming={...w.CampusSessions.builtin(),title:'Imported semester'};await select(JSON.stringify(incoming));assert.equal(q('#session-preview').hidden,false);assert.equal(writes,0);assert.match(q('#session-preview').textContent,/Imported semester/);
 q('#session-cancel').click();assert.equal(q('#session-preview').hidden,true);assert.equal(writes,0);
 await select('{broken');assert.equal(q('#session-preview').hidden,true);assert.equal(writes,0);
 await select(JSON.stringify(incoming));q('#session-apply').click();await tick();assert.equal(state.title,'Imported semester');assert.equal(writes,1);
 q('#session-example').click();assert.equal(JSON.parse(downloads[0]).format,'campus-night-exams');
 const send=w.browser.runtime.sendMessage;w.browser.runtime.sendMessage=async()=>({saved:false,error:'Storage unavailable'});
 q('#session-reset').click();await tick();assert.equal(state.title,'Imported semester');assert.match(q('#session-status').textContent,/Storage unavailable/);assert.equal(q('#session-reset').disabled,false,'failed reset must be retryable');
 w.browser.runtime.sendMessage=send;q('#session-reset').click();await tick();assert.equal(state,null);assert.equal(q('#session-reset').disabled,true);view.destroy();assert.equal(listeners.size,0);w.close();console.log('PASS session UI: preview without writes, cancel, malformed rejection, apply, template download, retry after reset failure, reset and cleanup.');
})().catch(error=>{console.error(error);process.exitCode=1;});
