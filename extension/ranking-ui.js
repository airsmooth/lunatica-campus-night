globalThis.CampusRanking=(()=>{
 'use strict';
 function mount({root}){
  const doc=root.ownerDocument||root,section=doc.createElement('section');section.id='ranking';section.className='panel';section.hidden=true;
  const make=(tag,text,parent=section)=>{const e=doc.createElement(tag);if(text)e.textContent=text;parent.append(e);return e};
  const style=make('style');style.textContent=`#ranking{max-width:960px}#ranking .rank-tools{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}#ranking p{max-width:72ch;margin:8px 0}#ranking table{border-collapse:collapse;width:100%;font-size:13px}#ranking th,#ranking td{text-align:left;padding:12px 8px;border-bottom:1px solid var(--cmp-line,#e3e8f0)}#ranking th{font-size:12px;font-weight:600;color:var(--cmp-ink-600,#5b6b84)}#ranking td:first-child,#ranking td:nth-child(3){font-variant-numeric:tabular-nums;white-space:nowrap}#ranking td:nth-child(2){overflow-wrap:anywhere}#ranking td small{display:block}#ranking .rank-scroll{overflow:auto;max-height:600px}#ranking .rank-self{padding:12px 0;border-block:1px solid var(--cmp-line,#e3e8f0);font-size:13px}#ranking .rank-empty{padding:16px 0}#ranking .rank-pagination{display:flex;gap:12px;align-items:center;margin-top:12px}#ranking [aria-current=true]{background:var(--cmp-info-bg,#e8f2fe)}@container(max-width:520px){#ranking th,#ranking td{padding:10px 4px}#ranking td small{font-size:10px}#ranking table{font-size:12px}}`;
  make('h3','Рейтинг XP · бета');
  make('p','Место среди участников Qairu Space. XP прислан расширением и не проверен университетом. Это не рейтинг оценок или всех студентов.');
  const tools=make('div');tools.className='rank-tools';
  function button(label,action,parent=tools){const b=make('button',label,parent);b.type='button';b.dataset.rankingAction=action;return b}
  const refresh=button('Обновить список','refresh'),open=button('Присоединиться','open'),update=button('Обновить мой XP','update'),remove=button('Выйти и удалить запись','delete');
  const self=make('p');self.className='rank-self';self.hidden=true;
  const confirm=make('div');confirm.hidden=true;make('p','Удалить запись из общего рейтинга? Учебные заметки и настройки останутся.',confirm);
  const yes=button('Удалить запись','confirm',confirm),no=button('Отмена','cancel',confirm);
  const status=make('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const scroll=make('div');scroll.className='rank-scroll';
  const page=make('div');page.className='rank-pagination';const prev=button('Назад','prev',page),count=make('span','',page),next=button('Далее','next',page);
  const details=make('details');make('summary','Как устроены тиры',details);make('p','Тиры повторяют уровни кампуса: Hello World — 0, Стажёр — 400, Junior — 1 200, Junior+ — 2 400, Middle — 4 000, Middle+ — 6 000, Senior — 8 400, Lead — 11 200, Архитектор — 14 400, CTO — 18 000 XP. При равном XP место одинаковое.',details);
  (root.querySelector('#panel-content')||root).append(section);
  let busy=false,disposed=false,offset=0,state={};
  async function request(action,extra={}){const r=await browser.runtime.sendMessage({type:'space:ranking',action,...extra});if(!r||r.error)throw Error(r?.error||'Расширение обновилось. Перезагрузите вкладку.');return r}
  function controls(){for(const b of section.querySelectorAll('button'))b.disabled=busy;update.hidden=remove.hidden=!state.hasKey;open.textContent=state.hasKey?'Управление и перенос ключа':'Присоединиться'}
  function render(data){
   scroll.replaceChildren();count.textContent=`Участников: ${data.total}`;prev.hidden=offset===0;next.hidden=!data.hasMore;
   if(!data.rows.length){make('p',data.total?'На этой странице нет участников. Вернитесь назад.':'Пока никто не присоединился. Можно стать первым.',scroll).className='rank-empty';return}
   const table=make('table','',scroll),caption=make('caption','Участники по XP',table);caption.style.cssText='text-align:left;padding:8px 0';
   const head=make('tr','',make('thead','',table));for(const name of ['Место','Участник','XP','Тир']){const th=make('th',name,head);th.scope='col'}
   const tbody=make('tbody','',table);for(const r of data.rows){const tr=make('tr','',tbody);if(r.id===state.member?.id)tr.setAttribute('aria-current','true');make('td',String(r.rank),tr);const name=make('td',r.alias,tr);make('small','Обновлено '+new Date(r.updatedAt).toLocaleDateString('ru-RU'),name);make('td',Number(r.xp).toLocaleString('ru-RU'),tr);make('td',r.tier?.name||'—',tr)}
  }
  async function load(){state=await request('state');controls();self.hidden=!state.hasKey;self.textContent=state.member?`${state.member.alias} · ${state.member.xp.toLocaleString('ru-RU')} XP · ${state.member.tier?.name||''}. Сохранённый результат; для актуального места обновите список.`:'Вступление не завершено. Откройте управление, чтобы повторить или удалить запись.';const data=await request('list',{offset});if(disposed)return;render(data);if(state.hasKey){try{const r=await request('self');state.member=r.member;self.textContent=`${r.member.alias} · место ${r.member.rank} · ${r.member.xp.toLocaleString('ru-RU')} XP · ${r.member.tier.name}`;render(data)}catch(e){self.textContent+=' '+e.message}}}
  async function work(fn){if(busy||disposed)return;busy=true;controls();status.textContent='Загружаю…';try{await fn();if(!disposed)status.textContent=''}catch(e){if(!disposed)status.textContent=e.message}finally{busy=false;if(!disposed)controls()}}
  refresh.onclick=()=>work(load);open.onclick=()=>work(()=>request('open'));update.onclick=e=>e.isTrusted&&work(async()=>{await request('update');await load()});
  remove.onclick=()=>{confirm.hidden=false;yes.focus()};no.onclick=()=>{confirm.hidden=true;remove.focus()};yes.onclick=e=>e.isTrusted&&!confirm.hidden&&work(async()=>{await request('delete',{confirm:true});confirm.hidden=true;await load()});
  prev.onclick=()=>work(async()=>{offset=Math.max(0,offset-50);await load()});next.onclick=()=>work(async()=>{offset+=50;await load()});
  controls();const activate=()=>work(load),tab=root.querySelector('[data-panel="ranking"]');tab?.addEventListener('click',activate);
  return {activate,destroy(){disposed=true;tab?.removeEventListener('click',activate);section.remove()}};
 }
 return {mount};
})();
