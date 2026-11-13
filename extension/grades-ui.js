globalThis.CampusGradesUI=(()=>{
 'use strict';
 const fingerprint=async m=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(m)))),b=>b.toString(16).padStart(2,'0')).join('');
 async function render(doc,data,state){
  doc.querySelectorAll('[data-space-grade]').forEach(n=>n.remove());
  if(state.status!=='active'||doc.querySelector('input[type="password"]'))return;
  let parsed;try{parsed=CampusGradesSource.parse(doc);}catch{return;}
  const pending=[];
  for(const m of parsed.snapshot.metrics){
   const anchor=parsed.anchors.get(m.key);if(!anchor)continue;
   const r=data?.period===parsed.snapshot.period?data.results?.find(r=>r.key===m.key&&r.fingerprint):null;
   const valid=r&&r.fingerprint===await fingerprint(m);
   const detail=doc.createElement('details');detail.dataset.spaceGrade=m.key;detail.className='space-grade-note';
   const summary=doc.createElement('summary');summary.textContent=valid?`Верхние ${r.range.percent[0]}–${r.range.percent[1]}% участников`:'Сравнение пока недоступно';detail.append(summary);
   const p=doc.createElement('p');p.textContent=valid?`Примерно места ${r.range.places[0]}–${r.range.places[1]} среди ${r.range.participants[0]}–${r.range.participants[1]} участников этого периода и показателя. Статистика: ${new Date(r.published).toLocaleDateString('ru-RU')}. ${r.range.tied?'Одинаковые результаты занимают общий диапазон. ':''}Добровольные данные; университетом не проверены.`:'Нужно не менее 20 участников с тем же показателем. Статистика пересчитывается раз в сутки после изменений у пяти разных участников. Новая оценка, удаление или смена периода временно скрывают прежнее сравнение.';detail.append(p);pending.push([anchor,detail]);
  }
  for(const [anchor,detail] of pending)if(anchor.isConnected)anchor.after(detail);
 }
 function start(){
  let state={status:'off'},data=null,busy=false,observer,timer,route='',rendering=false;
  const request=async(action)=>{const r=await browser.runtime.sendMessage({type:'space:grades',action});if(!r||r.error)throw Error(r?.error||'Перезагрузите вкладку кампуса.');return r;};
  function clean(){document.querySelectorAll('[data-space-grade],#space-grades-tools').forEach(n=>n.remove());}
  async function draw(){
   if(rendering)return;rendering=true;observer?.disconnect();
   try{
    if(location.pathname!=='/ru/grades'||document.querySelector('input[type="password"]')){clean();return;}
    const heading=document.querySelector('h1');if(!heading)return;
    let tools=document.getElementById('space-grades-tools');
    if(!tools){tools=document.createElement('div');tools.id='space-grades-tools';tools.className='space-grades-tools';const label=document.createElement('span');label.dataset.gradeStatus='';tools.append(label);const manage=document.createElement('button');manage.type='button';manage.textContent='Сравнение оценок';manage.onclick=()=>request('open').catch(e=>label.textContent=e.message);tools.append(manage);const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Обновить сравнение';refresh.onclick=e=>e.isTrusted&&refreshData();tools.append(refresh);heading.after(tools);}
    tools.querySelector('[data-grade-status]').textContent=state.status==='active'?'Только твои диапазоны среди участников беты.':state.status==='off'?'Сравнение оценок — по отдельному согласию.':state.status==='deleting'?'Удаление ещё не подтверждено. Открой управление.':'Обновление приостановлено или ожидает подтверждения.';
    tools.querySelectorAll('button')[1].hidden=state.status!=='active';
    await render(document,data,state);
   }finally{rendering=false;observer?.observe(document.documentElement,{childList:true,subtree:true});}
  }
  async function refreshData(){if(busy)return;busy=true;try{state=await request('state');data=state.status==='active'?await request('results'):null;}catch(e){data=null;const label=document.querySelector('[data-grade-status]');if(label)label.textContent=e.message;}finally{busy=false;await draw();}}
  async function tick(){if(document.visibilityState==='hidden')return;try{await request('tick');const next=await request('state');if(next.status!==state.status)data=null;state=next;}catch{}await draw();}
  observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(async()=>{const current=location.pathname+location.search;if(current!==route){route=current;data=null;await refreshData();}else await draw();},250);});
  route=location.pathname+location.search;observer.observe(document.documentElement,{childList:true,subtree:true});
  tick().then(()=>location.pathname==='/ru/grades'&&refreshData());setInterval(tick,60000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')tick();});
 }
 return {render,start};
})();
if(typeof window!=='undefined'&&window===window.top&&globalThis.browser?.runtime?.id){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',CampusGradesUI.start,{once:true});else CampusGradesUI.start();}
