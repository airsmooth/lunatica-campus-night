(() => {
  'use strict';
  if(window!==window.top) return;
  const preferenceKey='campusPanel';
  let collapsed=/^\/(ru|kk|en)\/schedule\/?$/.test(location.pathname), preferencesLoaded=false, host=null, root=null, dashboard=null;
  let refreshTimer, scheduled=false, loaded=false, examUI=null,settingsUI=null,rankingUI=null;
  const template=`
    <section class="shell" aria-label="Qairu Space — учебная панель">
      <header><h2>Учебная сводка</h2><button id="panel-toggle" aria-expanded="true" aria-controls="panel-content">Свернуть</button></header>
      <div id="panel-content">
        <nav class="tabs" aria-label="Разделы учебной панели"><button data-panel="today" aria-pressed="true">Обзор</button><button data-panel="exams" aria-pressed="false">Экзамены</button><button data-panel="ranking" aria-pressed="false">Рейтинг XP</button><button data-panel="grades" aria-pressed="false">Оценки</button><button data-panel="search" aria-pressed="false">Поиск</button><button data-panel="appearance" aria-pressed="false">Настройки</button></nav>
        <section id="grades" class="panel" hidden><h3>Сравнение оценок · бета</h3><p>Свой диапазон мест рядом с оценками и GPA в кампусе. Только по отдельному согласию; чужие оценки скрыты. Нужно не менее 20 участников с тем же показателем.</p><div class="section-head"><a href="https://campus.qairu.edu.kz/ru/grades">Открыть оценки</a><button id="grades-manage" type="button">Участие и приватность</button></div><p id="grades-status" role="status"></p></section><section id="today" class="panel">
          <div class="overview">
            <section class="column"><div class="section-head"><h3>Ближайшая пара</h3><button id="refresh">Обновить</button></div><div id="next-class" class="feature-card"><p>Загружаю расписание…</p></div></section>
            <section class="column"><div class="section-head"><h3>Дедлайны</h3><select id="deadline-filter" aria-label="Период дедлайнов"><option value="week">7 дней</option><option value="today">Сегодня</option><option value="all">Все</option></select></div><div id="deadlines" class="scroll-list"></div></section>
            <section class="column favorites-column"><div class="section-head"><h3>Избранное</h3><button id="add-favorite" title="Добавить текущую страницу кампуса">+ Страница</button></div><div id="favorite-list" class="scroll-list"></div><p id="favorite-status" role="status" class="data-status"></p></section>
          </div><p id="data-status" role="status" class="data-status"></p>
        </section>
        <section id="exams" class="panel" hidden><div class="section-head exam-heading"><div><h3>Экзамены</h3><p>Подбор по потоку и практике · выбранная сессия</p></div><button id="refresh-exams">Обновить экзамены</button></div><div id="exam-list"><p class="empty">Нажмите «Обновить экзамены», чтобы сверить расписание университета и найти ваши сеансы.</p></div><p id="exam-status" role="status" class="data-status"></p><a href="https://campus.qairu.edu.kz/ru/documents" target="_blank" rel="noopener">Документы университета ↗</a></section>
      </div>
    </section>`;
  const css=`
    :host{display:block!important;margin:0 0 16px!important;width:100%!important;min-width:0;box-sizing:border-box!important;font:inherit;color:inherit;container-type:inline-size}
    *{box-sizing:border-box}[hidden]{display:none!important}
    .shell{font:inherit;color:var(--cmp-ink-900,#0a1535);background:var(--cmp-surface-card,#fff);border:1px solid var(--cmp-line,#e3e8f0);border-radius:var(--cmp-r-card,16px);padding:14px 20px}
    header,.section-head,.tabs,.favorite{display:flex;align-items:center;gap:12px}header,.section-head{justify-content:space-between}
    h2,h3,p{margin:0}h2{font-size:16px;font-weight:700;line-height:1.4}h3{font-size:14px;font-weight:700;line-height:1.4}p,small{color:var(--cmp-ink-600,#5b6b84)}p{font-size:12px;line-height:1.5}small{display:block;font-size:11px;line-height:1.45;margin-top:4px}
    button,select{font:inherit;font-size:12px;font-weight:600;color:var(--cmp-ink-900,#0a1535);border:1px solid var(--cmp-line,#e3e8f0);border-radius:var(--cmp-r-ctl,12px);background:var(--cmp-surface-card,#fff);padding:6px 12px;min-height:32px;cursor:pointer;line-height:1.4}
    button:hover{background:var(--cmp-surface-main,#f6f7f9)}button:disabled{opacity:.5;cursor:wait}select{max-width:100%;padding:5px 8px}#panel-toggle{border-color:transparent;background:transparent;color:var(--cmp-ink-600,#5b6b84);padding-right:0}#panel-toggle:hover{color:var(--cmp-ink-900,#0a1535)}
    :focus-visible{outline:2px solid var(--cmp-blue,#0098f8);outline-offset:3px}a{color:var(--cmp-blue,#0098f8);text-decoration:none;font-size:12px;font-weight:600}a:hover{text-decoration:underline;text-underline-offset:3px}::selection{background:var(--cmp-azure,#e8f2fe);color:var(--cmp-ink-900,#0a1535)}
    .tabs{margin:8px 0 16px;gap:20px;border-bottom:1px solid var(--cmp-line,#e3e8f0)}.tabs button{border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent;padding:10px 0;color:var(--cmp-ink-600,#5b6b84)}.tabs button[aria-pressed=true]{border-bottom-color:var(--cmp-blue,#0098f8);color:var(--cmp-ink-900,#0a1535)}
    .overview{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,.85fr);gap:20px}.column{min-width:0}.column+.column{border-left:1px solid var(--cmp-line,#e3e8f0);padding-left:20px}.section-head{margin-bottom:12px;flex-wrap:wrap}.feature-card{padding:0}.feature-card h3{font-size:14px;line-height:1.45;margin:6px 0}.feature-card p{margin:4px 0}.feature-card .eyebrow{font-size:12px;font-weight:600;color:var(--cmp-ink-600,#5b6b84)}.feature-card .when{color:var(--cmp-ink-700,#3d4b63);font-variant-numeric:tabular-nums}.feature-card a{display:inline-block;margin-top:8px}
    .scroll-list{max-height:250px;overflow:auto;scrollbar-width:thin;padding:0 4px 2px 0}.task{padding:10px 0;border-bottom:1px solid var(--cmp-line,#e3e8f0);overflow-wrap:anywhere}.task:first-child{padding-top:0}.task a{font-size:13px;color:var(--cmp-ink-900,#0a1535)}.task p{margin-top:3px}.due{color:var(--cmp-ink-700,#3d4b63)}.overdue{color:var(--cmp-danger,#dc2626)}
    .empty{line-height:1.6;padding:4px 0 8px}.data-status{font-size:11px;margin-top:12px;line-height:1.5}.data-status:empty{display:none}.favorite{justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--cmp-line,#e3e8f0)}.favorite a{font-size:13px;color:var(--cmp-ink-900,#0a1535);overflow-wrap:anywhere}.favorite button{flex-shrink:0;border:0;font-size:11px;color:var(--cmp-ink-600,#5b6b84);padding:4px}details{margin:10px 0}summary{cursor:pointer;color:var(--cmp-ink-600,#5b6b84);font-size:12px;padding:4px 0}
    .exam-heading p{margin-top:4px}#exam-list{max-height:480px;overflow:auto;scrollbar-width:thin}.exam-card{padding:14px 0;border-top:1px solid var(--cmp-line,#e3e8f0);min-width:0}.exam-card h3{font-size:14px;margin-bottom:6px}.exam-card label{display:block;margin-top:10px}.exam-session{margin-top:12px;padding:0 0 0 12px;border-left:1px solid var(--cmp-line,#e3e8f0)}.exam-session strong{color:var(--cmp-ink-900,#0a1535);font-size:13px;font-weight:700}.exam-session p{margin-top:4px}.exam-session a{display:inline-block;margin-top:8px}.exam-time{font-size:13px;font-variant-numeric:tabular-nums;color:var(--cmp-ink-700,#3d4b63);line-height:1.6}.exam-warning{color:var(--cmp-warning,#b45309);margin-top:6px!important;line-height:1.5}
    .exam-tools{margin-bottom:12px}.exam-tools p{margin-top:8px}.exam-calendar{margin-top:12px}
    .task-personal label{display:block;font-size:12px;margin-top:10px}.task-personal select,.task-personal textarea{display:block;width:100%;margin-top:4px}.task-personal textarea{font:inherit;font-size:13px;line-height:1.5;color:var(--cmp-ink-900,#0a1535);background:var(--cmp-surface-card,#fff);border:1px solid var(--cmp-line,#e3e8f0);border-radius:var(--cmp-r-ctl,12px);padding:8px;resize:vertical}.task-note-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}#schedule-changes{margin:12px 0}.schedule-change{padding:10px 0;border-bottom:1px solid var(--cmp-line,#e3e8f0)}.schedule-change p{margin-top:4px}.schedule-change strong{font-size:13px}
    .tabs{flex-wrap:wrap;column-gap:20px;row-gap:0}#appearance,#search{max-width:720px}#appearance fieldset{border:0;border-bottom:1px solid var(--cmp-line,#e3e8f0);padding:12px 0;margin:12px 0}#appearance legend{font-size:13px;font-weight:600}#appearance fieldset label{display:inline-flex;align-items:center;gap:4px;margin:4px 16px 4px 0;font-size:13px}#appearance input[type=checkbox],#appearance input[type=radio]{accent-color:var(--cmp-blue,#0098f8)}.settings-row{display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:13px;padding:10px 0;border-bottom:1px solid var(--cmp-line,#e3e8f0)}.settings-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:12px}.settings-actions span{font-size:12px;color:var(--cmp-ink-600,#5b6b84)}.settings-section{margin-top:24px;padding-top:20px;border-top:1px solid var(--cmp-line,#e3e8f0)}.settings-section p{margin:8px 0 12px}.backup-file{display:block;font-size:12px;margin-top:12px}.backup-file input{display:block;max-width:100%;margin-top:6px;font:inherit}#backup-preview{margin-top:12px}#search label{display:block;font-size:13px;font-weight:600;margin-bottom:8px}#campus-search{width:100%;padding:10px 12px;margin-bottom:12px;border:1px solid var(--cmp-line,#e3e8f0);border-radius:var(--cmp-r-ctl,12px);color:var(--cmp-ink-900,#0a1535);background:var(--cmp-surface-card,#fff);font:inherit;font-size:14px}#search-results{max-height:400px;overflow:auto}.search-result{padding:10px 0;border-bottom:1px solid var(--cmp-line,#e3e8f0)}.search-result a{font-size:13px;overflow-wrap:anywhere}
    @container(max-width:800px){.overview{grid-template-columns:1fr 1fr}.favorites-column{grid-column:1/-1}.column.favorites-column{padding:16px 0 0;border-left:0;border-top:1px solid var(--cmp-line,#e3e8f0)}}
    @container(max-width:520px){.shell{padding:12px 16px}.overview{grid-template-columns:1fr;gap:16px}.column+.column{padding:16px 0 0;border-left:0;border-top:1px solid var(--cmp-line,#e3e8f0)}.favorites-column{grid-column:auto}.scroll-list{max-height:240px}}
    @media print{:host{display:none!important}}
    #deadlines:has(.task-personal[open]){max-height:none;overflow:visible}#saved-notes{max-height:360px;overflow:auto}.saved-note{padding:12px 0;border-bottom:1px solid var(--cmp-line,#e3e8f0);overflow-wrap:anywhere}.saved-note p{white-space:pre-wrap}.session-manager{padding-bottom:12px;border-bottom:1px solid var(--cmp-line,#e3e8f0)}.session-manager p{margin:8px 0;max-width:70ch}.session-manager button{margin-top:8px}
  `;
  function active(){return !!host?.isConnected&&!collapsed&&document.visibilityState!=='hidden';}
  function applyCollapsed(){
    if(!root) return;
    const button=root.querySelector('#panel-toggle');
    button.textContent=collapsed?'Развернуть':'Свернуть';
    button.setAttribute('aria-expanded',String(!collapsed));
    root.querySelector('#panel-content').hidden=collapsed;
    if(!collapsed&&!loaded){loaded=true;dashboard.refresh();}
  }
  function unmount(){
    rankingUI?.destroy();rankingUI=null;
    dashboard?.destroy();dashboard=null;examUI?.destroy();examUI=null;settingsUI?.destroy();settingsUI=null;clearInterval(refreshTimer);
    host?.remove();host=null;root=null;loaded=false;
  }
  function sync(){
    scheduled=false;
    if(!preferencesLoaded) return;
    const route=location.href;
    // This authenticated shell is absent on login/error pages. Never mount in forms.
    const container=document.querySelector('.adm-shell__content');
    // Aya and notebooks use fixed-height, overflow-hidden workspaces. Inserting a
    // dashboard there would squeeze their editor; keep those original layouts intact.
    const target=CampusData.safeURL(route)&&!document.querySelector('input[type="password"]')&&!container?.querySelector('.a4-page,.cmp-nb')?container:null;
    if(!target){unmount();return;}
    if(host?.isConnected&&host.parentElement===target)return;
    unmount();
    host=document.createElement('section');host.id='campus-night-panel';
    root=host.attachShadow({mode:'open'});
    const style=document.createElement('style');style.textContent=css;root.append(style);
    const content=document.createElement('div');
    // The template is a bundled constant; campus or user strings are never parsed.
    const parsed=new DOMParser().parseFromString(template,'text/html');
    content.append(...parsed.body.childNodes);root.append(content);
    target.prepend(host);
    settingsUI=globalThis.CampusSiteSettings?.mount({root,request:CampusService.request});
    rankingUI=globalThis.CampusRanking?.mount({root});
    root.querySelector('#grades-manage').onclick=async()=>{try{const r=await browser.runtime.sendMessage({type:'space:grades',action:'open'});if(r?.error)throw Error(r.error);}catch(e){root.querySelector('#grades-status').textContent=e.message;}};
    dashboard=CampusDashboard.mount({root,request:CampusService.request,autoLoad:false,isActive:active});
    examUI=CampusExamUI.mount({root,request:CampusService.request});
    root.querySelector('#panel-toggle').addEventListener('click',async()=>{
      collapsed=!collapsed;applyCollapsed();
      try{await browser.storage.local.set({[preferenceKey]:{collapsed}});}catch{root.querySelector('#data-status').textContent='Не удалось сохранить положение панели.';}
    });
    applyCollapsed();
    refreshTimer=setInterval(()=>{if(active()) dashboard.refresh();},300000);
  }
  function scheduleSync(){if(!scheduled){scheduled=true;queueMicrotask(sync);}}
  let preferenceRevision=0;
  browser.storage.onChanged.addListener((changes,area)=>{
    if(area==='local'&&changes[preferenceKey]){preferenceRevision++;collapsed=changes[preferenceKey].newValue?.collapsed===true;applyCollapsed();}
  });
  const initialRevision=preferenceRevision;
  browser.storage.local.get(preferenceKey).then(value=>{if(initialRevision===preferenceRevision&&typeof value[preferenceKey]?.collapsed==='boolean')collapsed=value[preferenceKey].collapsed;}).catch(()=>{}).finally(()=>{preferencesLoaded=true;scheduleSync();});
  const observer=new MutationObserver(scheduleSync);
  observer.observe(document,{childList:true,subtree:true});
  window.addEventListener('popstate',scheduleSync);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleSync();});
})();
