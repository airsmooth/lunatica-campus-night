/* Read-only parsers for the Russian campus pages. */
(() => {
  'use strict';
  const origin = 'https://campus.qairu.edu.kz';
  const day = 86400000, offset = 5 * 3600000;
  const text = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const today = (now = Date.now()) => Math.floor((now + offset) / day) * day - offset;
  function safeURL(value) {
    try {
      const u = new URL(value, origin);
      if (u.origin !== origin || u.username || u.password || !/^\/(ru|kk|en)(\/|$)/.test(u.pathname) || /\/(logout|login|auth)(\/|$)/i.test(u.pathname)) return null;
      u.search = '';
      return u.href;
    } catch { return null; }
  }
  function dateLabel(value, now = Date.now()) {
    const normalized=value.toLowerCase().replace(/,/g,' ');
    let m=normalized.match(/(\d{1,2})\s+([\p{L}.]+)\s*(\d{4})?/u);
    if(!m){const reversed=normalized.match(/([\p{L}.]+)\s+(\d{1,2})\s*(\d{4})?/u);if(reversed)m=[reversed[0],reversed[2],reversed[1],reversed[3]];}
    if (!m) return null;
    const aliases=['янв қаң jan','фев ақп feb','мар нау mar','апр сәу apr','май мая мам may','июн мау jun','июл шіл jul','авг там aug','сен қыр sep','окт қаз oct','ноя қар nov','дек жел dec'];
    const month=aliases.findIndex(words=>words.split(' ').includes(m[2].slice(0,3)));
    if(month<0 || +m[1]<1 || +m[1]>31)return null;
    const year = new Date(now + offset).getUTCFullYear();
    const candidates = (m[3] ? [+m[3]] : [year-1,year,year+1]).map(y => Date.UTC(y, month, +m[1])-offset);
    return candidates.sort((a,b) => Math.abs(a-now)-Math.abs(b-now))[0];
  }
  function schedule(doc, now = Date.now()) {
    const grid = doc.querySelector('.cmp-grid');
    if (!grid) throw new Error('Не удалось прочитать сетку расписания. Откройте расписание в кампусе.');
    const dates = [...grid.querySelectorAll('.cmp-grid__daydate')].map(el => dateLabel(text(el), now));
    if (!dates.length || dates.some(d => d === null)) throw new Error('Кампус изменил формат дат расписания.');
    const lessons = [];
    for (const row of grid.querySelectorAll('.cmp-grid__row:not(.cmp-grid__row--head)')) {
      const time = text(row.querySelector('.cmp-grid__timerange')).match(/(\d{1,2}):(\d{2})\s*[–—-]\s*(\d{1,2}):(\d{2})/);
      if (!time) continue;
      [...row.querySelectorAll('.cmp-grid__cell')].forEach((cell,index) => {
        if (dates[index] === undefined) return;
        for (const meet of cell.querySelectorAll('.qui-meet')) {
          const title = text(meet.querySelector('.qui-meet__title'));
          if (!title) continue;
          lessons.push({title, start:dates[index]+(+time[1]*60 + +time[2])*60000,
            end:dates[index]+(+time[3]*60 + +time[4])*60000,
            room:text(meet.querySelector('.qui-meet__room')), teacher:text(meet.querySelector('.qui-meet__people')),
            type:text(meet.querySelector('.qui-meet__type')), note:text(meet.querySelector('.qui-meet__note'))});
        }
      });
    }
    return {lessons:lessons.sort((a,b)=>a.start-b.start), from:Math.min(...dates), through:Math.max(...dates)};
  }
  function assignments(doc, now = Date.now()) {
    if (!doc.querySelector('.cmp-toolbar')) throw new Error('Не удалось прочитать список заданий. Откройте задания в кампусе.');
    const items = [];
    for (const row of doc.querySelectorAll('.qui-row')) {
      const link = row.querySelector('a.qui-row__texts');
      const url = safeURL(link?.getAttribute('href'));
      if (!url || !/\/assignments\//.test(url)) continue;
      const chips = text(row.querySelector('.cmp-deadline-row__chips'));
      if (!/Не сдано/i.test(chips) || /Ведомость закрыта/i.test(chips)) continue;
      const days = chips.match(/Осталось\s+(\d+)\s+д/);
      const overdue = /Просрочено/i.test(chips);
      const due = /Сегодня/i.test(chips) ? today(now) : days ? today(now) + +days[1]*day : null;
      items.push({url, title:text(link.children[0]) || text(link), course:text(link.children[1]), due, overdue});
    }
    return items.sort((a,b)=>Number(b.overdue)-Number(a.overdue)||(a.due??Infinity)-(b.due??Infinity)||a.title.localeCompare(b.title));
  }
  function assignmentDeadline(doc, now=Date.now(), dayHint=null) {
    // Campus renders a separate "до {dayMonthTime}" badge on assignment details.
    // Never infer a time from the relative-day chip or the assignment's prose.
    const values=[];
    for(const chip of doc.querySelectorAll('.cmp-deadline-row__chips > *')) {
      const m=text(chip).match(/^до\s+(\d{1,2})\s+([\p{L}.]+)(?:\s+(\d{4}))?\s*,?\s+(\d{1,2}):(\d{2})$/iu);
      if(!m||+m[4]>23||+m[5]>59)continue;
      const date=dateLabel(`${m[1]} ${m[2]}${m[3]?' '+m[3]:''}`,dayHint??now);
      if(date===null||new Date(date+offset).getUTCDate()!==+m[1]||dayHint!==null&&date!==dayHint)continue;
      values.push(date+(+m[4]*60 + +m[5])*60000);
    }
    const unique=[...new Set(values)];return unique.length===1?unique[0]:null;
  }
  function courses(doc){
    const found=[];
    for(const link of doc.querySelectorAll('article a[href]')){
      const title=text(link.querySelector('h3')),url=safeURL(link.getAttribute('href'));
      if(title&&url&&/^\/(ru|kk|en)\/courses\/[^/?#]+\/?$/.test(new URL(url).pathname)&&!found.some(x=>x.url===url))found.push({title:title.slice(0,180),url});
    }
    return found;
  }
  function page(doc, href) {
    const url = safeURL(href);
    if (!url) throw new Error('Откройте страницу кампуса, которую хотите сохранить.');
    const title = text(doc.querySelector('.cmp-cd-head__title, .cmp-course-head__title')) || text(doc.querySelector('h1')) || 'Кампус';
    return {url, title:title.slice(0,180)};
  }
  globalThis.CampusData = {origin, text, today, dateLabel, safeURL, schedule, assignments, assignmentDeadline, courses, page};
})();
