(() => {
  'use strict';
  function mount(document=globalThis.document){
  const {key, defaults, normalize} = CampusNight;
  const status = document.querySelector('#status');
  let settings = {...defaults};
  let queue = Promise.resolve();
  const controls = document.querySelectorAll('#appearance input:not([type="file"]), #appearance select, #reset');
  controls.forEach(control => { control.disabled = true; });
  function render() {
    for (const name of ['mode', 'palette']) {
      document.querySelectorAll(`input[name="${name}"]`).forEach(input => { input.checked = input.value === settings[name]; });
    }
    document.querySelector('.palette').disabled = settings.mode === 'off';
    document.querySelector('#scale').value = String(settings.scale);
    for (const name of ['reduceMotion', 'wide', 'hideAI']) document.getElementById(name).checked = settings[name];
  }
  function save(patch) {
    settings = normalize({...settings, ...patch});
    render();
    status.textContent = 'Сохраняю…';
    // Serialize writes and merge with current storage so shortcut/other popup edits survive.
    queue = queue.then(async () => {
      const result = await browser.storage.local.get(key);
      const next = normalize({...normalize(result[key]), ...patch});
      await browser.storage.local.set({[key]: next});
      status.textContent = 'Настройки сохранены';
    }).catch(() => { status.textContent = 'Не удалось сохранить. Повторите.'; });
  }
  document.querySelectorAll('input[name]').forEach(input => input.addEventListener('change', () => save({[input.name]: input.value})));
  document.querySelector('#scale').addEventListener('change', event => save({scale: Number(event.target.value)}));
  for (const name of ['reduceMotion', 'wide', 'hideAI']) document.getElementById(name).addEventListener('change', event => save({[name]: event.target.checked}));
  document.querySelector('#reset').addEventListener('click', () => save({...defaults}));
  const changed=(changes, area) => {
    if (area === 'local' && changes[key]) { settings = normalize(changes[key].newValue); render(); }
  };
  browser.storage.onChanged.addListener(changed);
  browser.storage.local.get(key).then(result => {
    settings = normalize(result[key]);
    controls.forEach(control => { control.disabled = false; });
    render();
    status.textContent = 'Применяется ко всем вкладкам кампуса';
  }).catch(() => { status.textContent = 'Не удалось загрузить. Откройте окно заново.'; });
  return {destroy(){browser.storage.onChanged.removeListener(changed);}};
  }
  globalThis.CampusAppearance={mount};
  if(document.querySelector('#appearance')&&document.querySelector('#reset'))mount();
})();
