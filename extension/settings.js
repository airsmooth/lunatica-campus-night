/* Shared by the Firefox content script, popup and event page. */
globalThis.CampusNight = (() => {
  const key = 'campusNight';
  const defaults = Object.freeze({mode: 'dark', palette: 'graphite', scale: 100, reduceMotion: true, wide: false, hideAI: false});
  const palettes = Object.freeze({
    graphite: {background: '#181c22', text: '#dddfe3', sepia: 0},
    warm: {background: '#211e1a', text: '#e3dbcc', sepia: 12},
    midnight: {background: '#0c0e12', text: '#d5d9df', sepia: 0}
  });
  function normalize(value) {
    const s = value && typeof value === 'object' ? value : {};
    return {
      mode: ['dark', 'system', 'off'].includes(s.mode) ? s.mode : defaults.mode,
      palette: Object.hasOwn(palettes, s.palette) ? s.palette : defaults.palette,
      scale: [100, 110, 125, 140].includes(s.scale) ? s.scale : defaults.scale,
      reduceMotion: typeof s.reduceMotion === 'boolean' ? s.reduceMotion : defaults.reduceMotion,
      wide: typeof s.wide === 'boolean' ? s.wide : defaults.wide,
      hideAI: typeof s.hideAI === 'boolean' ? s.hideAI : defaults.hideAI
    };
  }
  const isDark = (s, systemDark) => s.mode === 'dark' || (s.mode === 'system' && systemDark);
  return {key, defaults, palettes, normalize, isDark};
})();
