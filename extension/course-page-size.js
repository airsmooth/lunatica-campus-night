(() => {
  'use strict';
  if (window !== window.top) return;
  const applied = new WeakSet();
  let timer;
  function apply() {
    timer = null;
    if (!/^\/(ru|kk|en)\/courses\/?$/.test(location.pathname)) return;
    for (const select of document.querySelectorAll('.qui-pager__size select')) {
      if (applied.has(select) || select.disabled || ![...select.options].some(o => o.value === '12')) continue;
      applied.add(select);
      if (select.value === '12') continue;
      // Use the campus select's ordinary change event, including its React Aria handler.
      // Run once per mounted pager so a manual choice remains available for this visit.
      select.value = '12';
      select.dispatchEvent(new Event('change', {bubbles: true}));
    }
  }
  function schedule() { if (!timer) timer = setTimeout(apply, 150); }
  const observer = new MutationObserver(schedule);
  function start() {
    observer.observe(document.documentElement, {childList: true, subtree: true});
    schedule();
  }
  if (document.documentElement) start();
  else document.addEventListener('DOMContentLoaded', start, {once: true});
  window.addEventListener('pageshow', schedule);
})();
