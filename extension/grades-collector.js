(()=>{
 'use strict';if(window!==window.top)return;
 async function page(path){const r=await fetch('https://campus.qairu.edu.kz'+path,{credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Не удалось прочитать кампус. Войдите и повторите.');const html=await r.text();if(html.length>4000000)throw Error('Страница слишком большая.');return new DOMParser().parseFromString(html,'text/html');}
 async function collect(period){
  const before=CampusGradesSource.identity(await page('/ru/profile'));
  // The native period selector exposes ?term=YYYY-YYYY~N. Fetch fresh HTML, never a stale tab snapshot.
  if(!period&&location.pathname==='/ru/grades')period=[...document.querySelectorAll('select')].map(s=>s.value).find(v=>/^20\d\d-/.test(v));
  const doc=await page('/ru/grades'+(period?'?term='+GPeriod(period):''));
  const parsed=CampusGradesSource.parse(doc);
  const after=CampusGradesSource.identity(await page('/ru/profile'));if(before!==after)throw Error('Аккаунт изменился во время чтения. Повторите проверку.');
  return {identity:before,snapshot:CampusGrades.wire(parsed.snapshot),issues:parsed.issues,gpaState:parsed.gpaState};
 }
 const GPeriod=value=>encodeURIComponent(CampusGrades.period(value));
 browser.runtime.onMessage.addListener((m,s)=>m?.type==='campus:grades-collect'&&s.id===browser.runtime.id&&!s.tab?collect(m.period).catch(e=>({error:e.message})):undefined);
})();
