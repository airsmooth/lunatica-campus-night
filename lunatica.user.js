// ==UserScript==
// @name         Lunatica — Campus Night fork
// @namespace    https://github.com/airsmooth/lunatica-campus-night
// @version      2.0.1.1
// @description  QAIRU campus customization; fork of Lunatica by wateroff, maintained by wateroff and airsmooth.
// @author       miras (wateroff), airsmooth
// @license      MIT; embedded Geist Mono: OFL-1.1
// @homepageURL  https://github.com/airsmooth/lunatica-campus-night
// @supportURL   https://github.com/airsmooth/lunatica-campus-night/issues
// @downloadURL  https://raw.githubusercontent.com/airsmooth/lunatica-campus-night/main/lunatica.user.js
// @updateURL    https://raw.githubusercontent.com/airsmooth/lunatica-campus-night/main/lunatica.user.js
// @match        https://campus.qairu.edu.kz/*
// @run-at       document-start
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @noframes
// ==/UserScript==

//! Geist Mono (c) 2023 Vercel, Inc. SIL Open Font License 1.1 - github.com/vercel/geist-font

(() => {
  'use strict';

  const VERSION = '2.0.1.1';
  const NS = 'lx';
  const KEY = 'lx.settings.v2';
  const LEGACY_KEY = 'qd.settings.v1';

  const DEFAULTS = {
    theme: 'dark',
    palette: 'dark',
    contrast: 'normal',

    cardGlow: false,
    cardAnim: false,
    cardColor: '#009bff',
    animSync: false,
    animSpeed: 7,
    animTail: 62,
    animWidth: 1,

    bg: 'none',
    bgUrl: '',
    bgBlur: false,
    bgBlurPx: 8,
    bgDim: 25,
    starCount: 900,
    starSize: 1.5,
    starBright: 85,
    starTwinkle: true,
    starSpeed: 6,

    hideAiDock: false,
    hideSidebarPromo: true,
    hideAskBar: false,
    hideSearch: false,
    hideBell: false,
    hideLocale: false,

    motion: 'smooth',
    avatar: 'default',
    avatarUrl: '',
    nameStyle: 'full',
    nameOrder: 'auto',
    density: 'normal',
    contentWidth: 'default',

    hideDisabledNav: true,
    hideNavGroups: false,
    hiddenNav: [],
    hiddenBlocks: [],

    loader: true,
    roomRename: false,
    roomFrom: 'ATRIUM',
    roomTo: 'ALEM.AI Амфитеатр',

    schedHidePastMark: true,
    schedHidePeople: false,
    schedDimPast: true,

    showLauncher: true,
    panelTab: 'theme'
  };

  const ENUMS = {
    theme: ['dark', 'light', 'auto'],
    palette: ['dark', 'amoled'],
    contrast: ['normal', 'high'],
    bg: ['none', 'stars', 'url'],
    motion: ['smooth', 'site', 'off'],
    avatar: ['default', 'url', 'hide'],
    nameStyle: ['full', 'short', 'initials', 'hide'],
    nameOrder: ['auto', 'first-last', 'last-first'],
    density: ['normal', 'compact'],
    contentWidth: ['default', 'wide'],
    panelTab: ['theme', 'look', 'menu', 'sched', 'more']
  };

  const RANGES = {
    animSpeed: [2, 20], animTail: [20, 180], animWidth: [1, 4],
    bgBlurPx: [0, 30], bgDim: [0, 90],
    starCount: [200, 3500], starSize: [0.6, 3], starBright: [20, 100], starSpeed: [2, 20]
  };

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function normalize(src) {
    const s = Object.assign({}, DEFAULTS, { hiddenNav: [], hiddenBlocks: [] });
    if (!src || typeof src !== 'object') return s;

    if (src.theme === 'amoled' || src.theme === 'wateroff') {
      if (src.palette === undefined) src.palette = src.theme;
      src.theme = 'dark';
    }

    if (src.palette === undefined && src.amoled) src.palette = 'amoled';

    if (src.motion === undefined && src.reduceMotion !== undefined) {
      src.motion = src.reduceMotion === false ? 'site' : 'smooth';
    }

    for (const k in DEFAULTS) {
      const v = src[k], d = DEFAULTS[k];
      if (v === undefined || v === null) continue;
      if (Array.isArray(d)) {
        if (Array.isArray(v)) s[k] = v.filter(x => typeof x === 'string').slice(0, 200);
      } else if (typeof v === typeof d) {
        s[k] = v;
      }
    }
    for (const k in ENUMS) if (!ENUMS[k].includes(s[k])) s[k] = DEFAULTS[k];
    for (const k in RANGES) {
      const n = +s[k];
      s[k] = Number.isFinite(n) ? clamp(n, RANGES[k][0], RANGES[k][1]) : DEFAULTS[k];
    }
    if (!/^#[0-9a-f]{6}$/i.test(s.cardColor)) s.cardColor = DEFAULTS.cardColor;
    s.bgUrl = String(s.bgUrl).trim().slice(0, 2000);
    s.avatarUrl = String(s.avatarUrl).trim().slice(0, 2000);
    s.roomFrom = String(s.roomFrom).slice(0, 80);
    s.roomTo = String(s.roomTo).slice(0, 80);
    return s;
  }

  const gm = {
    get(k) { try { if (typeof GM_getValue === 'function') return GM_getValue(k, null); } catch (e) {  } return null; },
    set(k, v) { try { if (typeof GM_setValue === 'function') GM_setValue(k, v); } catch (e) {  } }
  };
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {  } }
  };

  let migrated = false;

  function readStore() {
    let raw = gm.get(KEY);
    if (raw == null) raw = ls.get(KEY);
    if (raw == null) {
      raw = gm.get(LEGACY_KEY);
      if (raw == null) raw = ls.get(LEGACY_KEY);
      migrated = raw != null;
    }
    let parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch (e) { parsed = null; }
    return normalize(parsed);
  }

  let S = readStore();

  function save() {
    const raw = JSON.stringify(S);
    gm.set(KEY, raw);
    ls.set(KEY, raw);
  }

  if (migrated) save();

  const Host = (() => {

    const ORDER = ['font', 'patch', 'theme', 'effects', 'bg', 'loader', 'prefs', 'ui'];
    const reg = new Map();
    let adopted = null;
    let guard = null, headGuard = null, headSeen = null;

    function entry(id) {
      let e = reg.get(id);
      if (!e) { e = { css: '', sheet: null, node: null }; reg.set(id, e); }
      return e;
    }

    function probe() {
      try {
        if (!document.documentElement) return null;
        if (!('adoptedStyleSheets' in document) || typeof CSSStyleSheet !== 'function') return false;
        const s = new CSSStyleSheet();
        s.replaceSync(':root{--lx-probe:1}');
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, s];
        const ok = getComputedStyle(document.documentElement).getPropertyValue('--lx-probe').trim() === '1';
        document.adoptedStyleSheets = [...document.adoptedStyleSheets].filter(x => x !== s);
        return ok;
      } catch (e) {
        return false;
      }
    }

    const ours = () => ORDER.map(id => reg.get(id)).filter(Boolean);
    const owns = sh => ours().some(e => e.sheet === sh);

    function syncAdopted() {
      const cur = [...document.adoptedStyleSheets];
      const mine = ours().filter(e => e.sheet).map(e => e.sheet);
      const tail = cur.slice(cur.length - mine.length);
      if (mine.length && tail.length === mine.length && tail.every((x, i) => x === mine[i])) return;
      document.adoptedStyleSheets = cur.filter(x => !mine.includes(x)).concat(mine);
    }

    function dropAdopted() {
      try {
        const mine = ours().map(e => e.sheet).filter(Boolean);
        if (mine.length) document.adoptedStyleSheets = [...document.adoptedStyleSheets].filter(x => !mine.includes(x));
      } catch (e) {  }
      for (const e of ours()) e.sheet = null;
    }

    function isForeignSheet(n) {
      return n && n.nodeType === 1 && !n.hasAttribute('data-' + NS) &&
        (n.tagName === 'STYLE' || (n.tagName === 'LINK' && /stylesheet/i.test(n.rel || '')));
    }

    const moves = [];
    let calmUntil = 0;

    function mountNodes() {
      const parent = document.head || document.documentElement;
      if (!parent) return;
      const mine = ours().filter(e => e.node).map(e => e.node);
      if (!mine.length) return;
      const missing = mine.filter(n => n.parentNode !== parent);
      for (const n of missing) parent.appendChild(n);
      const now = Date.now();
      if (now < calmUntil) return;
      const kids = parent.children;
      let inPlace = kids.length >= mine.length;
      if (inPlace) {
        for (let i = 0; i < mine.length; i++) {
          if (kids[kids.length - mine.length + i] !== mine[i]) { inPlace = false; break; }
        }
      }
      if (inPlace) return;
      while (moves.length && now - moves[0] > 1000) moves.shift();
      moves.push(now);
      if (moves.length > 6) { calmUntil = now + 2000; return; }
      for (const n of mine) parent.appendChild(n);
    }

    function onRecords(records) {
      let need = false;
      for (const r of records) {
        for (const n of r.removedNodes) {
          if (n.nodeType === 1 && (n.tagName === 'HEAD' || n.hasAttribute('data-' + NS))) { need = true; break; }
        }
        if (!need) for (const n of r.addedNodes) {
          if (n.nodeType === 1 && (n.tagName === 'HEAD' || isForeignSheet(n))) { need = true; break; }
        }
        if (need) break;
      }
      if (!need) return;
      watchHead();
      mountNodes();
    }

    function watchHead() {
      const head = document.head;
      if (!head || head === headSeen) return;
      if (headGuard) headGuard.disconnect();
      headSeen = head;
      headGuard = new MutationObserver(onRecords);
      headGuard.observe(head, { childList: true });
    }

    function startGuards() {
      if (guard || !window.MutationObserver) return;
      guard = new MutationObserver(onRecords);
      guard.observe(document.documentElement, { childList: true });
      watchHead();
    }

    function ensureNode(id, e) {
      if (!e.node) {
        e.node = document.createElement('style');
        e.node.id = NS + '-css-' + id;
        e.node.setAttribute('data-' + NS, '');
      }
      if (e.node.textContent !== e.css) e.node.textContent = e.css;
    }

    function set(id, css) {
      css = css || '';
      const e = entry(id);
      if (e.css === css && (e.sheet || e.node)) return;
      e.css = css;
      if (adopted === null) { const r = probe(); if (r !== null) adopted = r; }
      if (adopted) {
        try {
          if (!e.sheet) e.sheet = new CSSStyleSheet();
          e.sheet.replaceSync(css);
          syncAdopted();
          return;
        } catch (err) {
          adopted = false;
          dropAdopted();
        }
      }
      for (const [k, x] of reg) ensureNode(k, x);
      mountNodes();
      startGuards();
    }

    function check() {
      if (adopted) syncAdopted();
      else if (reg.size) mountNodes();
    }

    return { set, check, owns, get mode() { return adopted ? 'adopted' : 'nodes'; } };
  })();

  const INVERSE_ACCENT = [
    '.qui-ccard__go', '.qui-drop__btn--primary', '.qui-rte__urlbtn',
    '.qui-ed__promptbtn', '.qui-datestrip__chip--active',
    '.qui-secnav__item--active', '.qui-secnav__item--active:hover',
    '.adm-nav-pill', '.a4-mode--active', '.a4-tab--active', '.a4-msg--user',
    '.cmp-trailhead__tlpill--active', '.cmp-srcchip--add',
    '.prt-auth__cta.button', '.prt-auth__cta'
  ].join(',');

  const INVERSE_NEUTRAL = [
    '.uit-tip', '.qui-selmenu', '.qui-lightbox__caption', '.qui-prose pre',
    '.qui-blockdoc pre', '.cmp-md pre', '.qui-moresheet__count',
    '.qui-tabbar__count', '.a4-tip', '.a4-dot--off', '.a4-typing span',
    '.cmp-selfview__video', '.cmp-onb-video__player',
    '.adm-user__avatar', '.qui-ccard--closed .qui-ccard__go'
  ].join(',');

  const INVERSE_NEUTRAL_PSEUDO = 'html:root .qui-ed__resize::before,html:root .a4-step--failed .a4-step__mark::after';

  const SCALES = {
    dark: {
      label: 'Тёмная', hint: 'Мягкий графит',
      canvas: '#0c0c0f', canvasAlt: '#101014',
      soft: '#131317', surface: '#18181d', sunk: '#212128',
      line: '#2a2a32', lineSoft: '#1f1f26', lineStrong: '#3b3b45',
      field: '#121216', edge: 'rgba(255,255,255,.045)',
      ink: '#ededf0', ink2: '#dcdce2', muted: '#a2a2ad', faint: '#8b8b95',
      accent: '#2f7fe8', accentFg: '#ffffff', link: '#7ab8ff', focus: '#5aa9ff',
      navPill: '#1d3557', azure: '#15243a', backdrop: 'rgba(0,0,0,.72)'
    },
    amoled: {
      label: 'AMOLED', hint: 'Чистый чёрный',
      canvas: '#000000', canvasAlt: '#050506',
      soft: '#08080a', surface: '#0e0e12', sunk: '#17171d',
      line: '#23232b', lineSoft: '#141419', lineStrong: '#34343e',
      field: '#0a0a0d', edge: 'rgba(255,255,255,.06)',
      ink: '#eaeaef', ink2: '#d8d8df', muted: '#a2a2ad', faint: '#8b8b95',
      accent: '#2f7fe8', accentFg: '#ffffff', link: '#7ab8ff', focus: '#5aa9ff',
      navPill: '#1d3557', azure: '#15243a', backdrop: 'rgba(0,0,0,.78)'
    }
  };

  const LIGHT_PREVIEW = { canvas: '#f4f5f8', surface: '#ffffff', line: '#e4e4e7', ink: '#1c1c20', muted: '#71717a', accent: '#009bff' };

  const CARDS = '.cmp-card,.qui-ccard,.cmp-quicktile,.cmp-stats>*';

  const EARLY_SURFACES = [
    '.adm-header', '.qui-ccard', '.qui-item', '.qui-module', '.qui-drop', '.qui-rte',
    '.qui-ed', '.qui-menu__panel', '.qui-multi__box', '.qui-pager__pill', '.qui-tbtn',
    '.bb-drawer-panel', '.cmp-club-card', '.cmp-rolecard', '.qui-ccard__status',
    '.qui-drop__btn', '.qui-ed__prompt', '.qui-ed__details', '.qui-rte__url',
    '.qui-menu__trigger--button', '.qui-seg__btn--active', '.qui-deck-show__slide',
    '.prt-afield .input'
  ].join(',');

  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function isDark() {
    if (S.theme === 'dark') return true;
    if (S.theme === 'light') return false;
    return mq ? mq.matches : true;
  }

  function scale() { return SCALES[S.palette] || SCALES.dark; }

  function paintCanvasNow() {
    const root = document.documentElement;
    if (!root) return;
    if (isDark()) {
      root.style.setProperty('color-scheme', 'dark');
      root.style.setProperty('background-color', scale().canvas);
    } else {
      root.style.removeProperty('color-scheme');
      root.style.removeProperty('background-color');
    }
  }

  paintCanvasNow();

  function rgbOf(hex) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) h = '009bff';
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const rgba = (hex, a) => { const c = rgbOf(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
  const lighten = (hex, amt) => 'rgb(' + rgbOf(hex).map(v => Math.round(v + (255 - v) * amt)).join(',') + ')';

  function bgActive() {
    if (!isDark()) return false;
    if (S.bg === 'stars') return true;
    return S.bg === 'url' && !!bgImage();
  }

  function themeCSS() {
    if (!isDark()) return '';
    const P = scale();
    const hi = S.contrast === 'high';
    const ink = hi ? '#ffffff' : P.ink;
    const ink2 = hi ? '#f2f2f5' : P.ink2;
    const muted = hi ? '#c4c4ce' : P.muted;
    const faint = hi ? '#aaaab4' : P.faint;
    const line = hi ? P.lineStrong : P.line;

    const canvas = bgActive() ? 'transparent' : P.canvas;

    const tokens = [
        '--lx-edge:' + P.edge + ';--lx-brand:#009bff;--lx-solid:' + P.canvas + ';',
        '--snow:' + P.surface + ';--eclipse:' + ink + ';',
        '--background:' + P.canvas + ';--foreground:' + ink + ';',
        '--surface:' + P.surface + ';--surface-foreground:' + ink + ';',
        '--surface-secondary:' + P.sunk + ';--surface-secondary-foreground:' + ink + ';',
        '--surface-tertiary:' + P.sunk + ';--surface-tertiary-foreground:' + ink + ';',
        '--overlay:' + P.surface + ';--overlay-foreground:' + ink + ';',
        '--muted:' + muted + ';--scrollbar:' + P.lineStrong + ';',
        '--default:' + P.sunk + ';--default-foreground:' + ink + ';',
        '--accent:' + P.accent + ';--accent-foreground:' + P.accentFg + ';',
        '--field-background:' + P.field + ';--field-foreground:' + ink + ';',
        '--field-placeholder:' + faint + ';--field-border:' + line + ';',
        '--border:' + line + ';--separator:' + P.lineSoft + ';',
        '--focus:' + P.focus + ';--link:' + P.link + ';',
        '--segment:' + P.sunk + ';--segment-foreground:' + ink + ';',
        '--success:#35c48c;--success-foreground:#07130e;',
        '--warning:#e9b45a;--warning-foreground:#161208;',
        '--danger:#e9564c;--danger-foreground:#ffffff;',
        '--canvas:' + canvas + ';--canvas-alt:' + canvas + ';',
        '--surface-soft:' + P.soft + ';--surface-sunk:' + P.sunk + ';',
        '--ink:' + ink + ';--ink-2:' + ink2 + ';--ink-muted:' + muted + ';',
        '--ink-faint:' + faint + ';--ink-ghost:' + P.lineStrong + ';',
        '--line:' + line + ';--line-soft:' + P.lineSoft + ';--line-strong:' + P.lineStrong + ';',
        '--brand-ink:' + ink + ';--a4-desk:' + canvas + ';',
        '--adm-canvas:' + canvas + ';--adm-surface:' + P.surface + ';',
        '--adm-surface-soft:' + P.soft + ';--adm-surface-sunk:' + P.sunk + ';',
        '--adm-ink:' + ink + ';--adm-ink-body:' + ink2 + ';',
        '--adm-ink-muted:' + muted + ';--adm-ink-faint:' + faint + ';',
        '--adm-line:' + line + ';--adm-line-soft:' + P.lineSoft + ';--adm-line-strong:' + P.lineStrong + ';',
        '--adm-brand-navy:' + ink + ';--adm-brand-blue:' + P.focus + ';',
        '--adm-brand-azure:' + P.azure + ';--adm-brand-grey:' + P.sunk + ';',
        '--adm-locale-pill:#182234;--adm-accent:#d4542c;',
        '--adm-success:#35c48c;--adm-success-bg:#0e2419;',
        '--adm-amber-ink:#e9b45a;--adm-amber-bg:#261d0e;--adm-amber-line:#453518;',
        '--adm-red-bg:#2a1512;--adm-green:#35c48c;',
        '--cmp-canvas:' + canvas + ';--cmp-surface-main:' + P.soft + ';',
        '--cmp-surface-card:' + P.surface + ';',
        '--cmp-navy:' + ink + ';--cmp-blue:' + P.focus + ';--cmp-azure:' + P.azure + ';',
        '--cmp-ink-900:' + ink + ';--cmp-ink-600:' + muted + ';--cmp-ink-400:' + faint + ';',
        '--cmp-line:' + line + ';',
        '--cmp-neutral:' + muted + ';--cmp-neutral-bg:' + P.sunk + ';--cmp-neutral-line:' + P.lineStrong + ';',
        '--cmp-success:#35c48c;--cmp-success-bg:#0e2419;',
        '--cmp-warning:#e9b45a;--cmp-warning-bg:#261d0e;',
        '--cmp-danger:#e9564c;--cmp-danger-bg:#2a1512;',
        '--cmp-info:' + P.focus + ';--cmp-info-bg:' + P.azure + ';',
        '--cmp-violet:#a78bfa;--cmp-violet-bg:#1e1836;',
        '--cmp-tree-done-bg:#0e2419;',
        '--surface-shadow:0 1px 2px rgba(0,0,0,.55);',
        '--overlay-shadow:0 12px 34px rgba(0,0,0,.7);',
        '--field-shadow:none;--backdrop:' + P.backdrop + ';'
    ].join('');

    return [

      'html:root{color-scheme:dark;background:' + P.canvas + '!important;' + tokens + '}',
      'html :is(.light,.default,[data-theme="light"],[data-theme="default"]){color-scheme:dark;' + tokens + '}',
      'body{background:transparent}',

      'html:root svg [fill="#1A1A1A"],html:root svg [fill="#1a1a1a"]{fill:' + ink + '}',

      'html:root :is(' + INVERSE_ACCENT + '){background:' + P.navPill + ';color:' + ink + '}',
      'html:root :is(' + INVERSE_NEUTRAL + '),' + INVERSE_NEUTRAL_PSEUDO + '{background:' + P.sunk + ';color:' + ink + '}',

      'html:root :is(' + CARDS + '){background:var(--adm-surface);border-color:var(--adm-line)!important;',
        'box-shadow:inset 0 1px 0 var(--lx-edge)}',
      'html:root :is(' + CARDS + '):hover{border-color:var(--adm-line-strong)!important}',
      'html:root :is(.qui-acc,.qui-item,.qui-module,.qui-row){border-color:var(--adm-line-soft)!important}',
      'html:root :is(.cmp-card,.qui-ccard) :is(.qui-acc,.qui-item,.qui-row,.qui-module){',
        'background:var(--adm-surface-soft);border-color:var(--adm-line-soft)}',

      'html:root :is(' + EARLY_SURFACES + '){background:var(--adm-surface)}',

      'html:root ::selection{background:' + P.accent + ';color:#fff}'
    ].join('');
  }

  function effectsCSS() {
    if (!isDark() || (!S.cardGlow && !S.cardAnim)) return '';
    const C = S.cardColor;
    const tail = clamp(+S.animTail || 62, 18, 180);
    const dur = clamp(+S.animSpeed || 7, 2, 30);
    const w = clamp(+S.animWidth || 1, 1, 4);
    const s0 = (360 - tail).toFixed(1);
    const s1 = (360 - tail * 0.75).toFixed(1);
    const s1b = (360 - tail * 0.45).toFixed(1);
    const s2 = (360 - tail * 0.22).toFixed(1);
    const ring = `conic-gradient(from var(--lx-a),transparent 0deg,transparent ${s0}deg,${rgba(C, .05)} ${s1}deg,${rgba(C, .22)} ${s1b}deg,${rgba(C, .62)} ${s2}deg,${lighten(C, .3)} 357deg,transparent 360deg)`;
    const g0 = (360 - tail * 0.78).toFixed(1);
    const g1 = (360 - tail * 0.28).toFixed(1);
    const halo = `conic-gradient(from var(--lx-a),transparent 0deg,transparent ${g0}deg,${rgba(C, .28)} ${g1}deg,${rgba(C, .8)} 356deg,transparent 360deg)`;
    const MASK = '-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;' +
                 'mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;';
    const css = [
      '@property --lx-a{syntax:"<angle>";inherits:false;initial-value:0deg}',
      '@keyframes lx-orbit{to{--lx-a:360deg}}',

      'html:root :is(' + CARDS + '){position:relative;isolation:isolate}'
    ];
    if (S.cardGlow) {
      css.push('html:root :is(' + CARDS + '){box-shadow:inset 0 1px 0 var(--lx-edge),0 0 0 1px ' + rgba(C, .08) + ',0 10px 34px -14px ' + rgba(C, .36) + '}');
    }
    if (S.cardAnim) {
      css.push(
        'html:root :is(' + CARDS + ')::after{content:"";position:absolute;inset:0;border-radius:inherit;padding:' + w + 'px;background:' + ring + ';' + MASK +
          'animation:lx-orbit ' + dur + 's linear infinite;pointer-events:none;z-index:1}',
        'html:root :is(' + CARDS + ')::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:' + (w + 1) + 'px;background:' + halo + ';' + MASK +
          'filter:blur(' + (6 + w * 2) + 'px);opacity:.75;animation:lx-orbit ' + dur + 's linear infinite;pointer-events:none;z-index:0}',
        'html:root :is(' + CARDS + ')>*{position:relative;z-index:2}'
      );
      if (!S.animSync) {
        css.push(
          'html:root :is(' + CARDS + '):nth-child(3n+2)::after,:is(' + CARDS + '):nth-child(3n+2)::before{animation-delay:-' + (dur / 3).toFixed(2) + 's}',
          'html:root :is(' + CARDS + '):nth-child(3n)::after,:is(' + CARDS + '):nth-child(3n)::before{animation-delay:-' + (dur / 1.5).toFixed(2) + 's}'
        );
      }
      css.push(
        '@media (prefers-reduced-motion:reduce){',
          'html:root :is(' + CARDS + ')::after{animation:none;--lx-a:315deg;opacity:.35}',
          'html:root :is(' + CARDS + ')::before{display:none}',
        '}'
      );
    }
    return css.join('');
  }

  function bgImage() {
    const u = String(S.bgUrl || '').trim();
    if (!/^(https?:\/\/|data:image\/)/i.test(u)) return '';
    return 'url("' + u.replace(/["\\)]/g, '') + '")';
  }

  function buildStars() {
    const W = 1600, H = 900;
    const n = clamp(Math.round(+S.starCount || 900), 100, 4000);
    const maxR = clamp(+S.starSize || 1.5, 0.5, 3);
    const bright = clamp((+S.starBright || 85) / 100, 0.1, 1);
    const twN = (S.starTwinkle && !S.bgBlur) ? Math.min(120, Math.round(n * 0.08)) : 0;
    let seed = 20260919 >>> 0;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const star = () => {
      const x = (rnd() * W).toFixed(1), y = (rnd() * H).toFixed(1);
      const r = (0.25 + rnd() * rnd() * maxR).toFixed(2);
      const o = ((0.18 + rnd() * 0.82) * bright).toFixed(2);
      const c = rnd() < 0.11 ? '#9fb6ff' : '#fff';
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="${o}"/>`;
    };
    const stat = [], tw = [[], [], []];
    for (let i = 0; i < n; i++) (i < twN ? tw[i % 3] : stat).push(star());
    let body = '<g class="lx-static">' + stat.join('') + '</g>';
    if (twN) body += tw.map((g, i) => `<g class="lx-tw lx-tw${i}">${g.join('')}</g>`).join('');
    return `<svg class="lx-stars" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${body}</svg>`;
  }

  function bgCSS() {
    if (!bgActive()) return '';
    const dim = clamp(+S.bgDim || 0, 0, 90) / 100;
    const blur = S.bgBlur ? clamp(+S.bgBlurPx || 0, 0, 40) : 0;
    const over = 24 + blur * 2;
    const dur = clamp(+S.starSpeed || 6, 1, 30);
    return [
      '#lx-bg{position:fixed;inset:-' + over + 'px;z-index:-1;pointer-events:none;overflow:hidden;',
        blur ? 'filter:blur(' + blur + 'px);' : '', '}',
      '#lx-bg>*{position:absolute;inset:0;width:100%;height:100%}',
      '#lx-bg .lx-bg-img{background-size:cover;background-position:center;background-repeat:no-repeat}',
      '#lx-bg .lx-bg-dim{background:rgba(0,0,0,' + dim + ')}',
      '@keyframes lx-twinkle{0%,100%{opacity:1}50%{opacity:.4}}',
      '#lx-bg .lx-tw{will-change:opacity}',
      '#lx-bg[data-tw="1"] .lx-tw{animation:lx-twinkle ' + dur + 's ease-in-out infinite}',
      '#lx-bg[data-tw="1"] .lx-tw1{animation-duration:' + (dur * 1.45).toFixed(1) + 's;animation-delay:-1.7s}',
      '#lx-bg[data-tw="1"] .lx-tw2{animation-duration:' + (dur * 0.75).toFixed(1) + 's;animation-delay:-3.1s}',
      '@media (prefers-reduced-motion:reduce){#lx-bg .lx-tw{animation:none}}'
    ].join('');
  }

  function bgSignature() {
    return [S.bg, S.bgUrl, S.starCount, S.starSize, S.starBright, S.starTwinkle, S.bgBlur].join('|');
  }

  let bgTimer = null;

  function renderBg(node) {
    node._sig = bgSignature();
    const img = S.bg === 'url' ? bgImage() : '';
    node.innerHTML =
      (img ? '<div class="lx-bg-img" style="background-image:' + img + '"></div>' : '') +
      (S.bg === 'stars' ? buildStars() : '') +
      '<div class="lx-bg-dim"></div>';
  }

  function ensureBg() {
    let node = document.getElementById('lx-bg');
    if (!bgActive()) { if (node) node.remove(); clearTimeout(bgTimer); return; }
    if (!document.body) return;
    if (!node || !node.isConnected) {
      node = document.createElement('div');
      node.id = 'lx-bg';
      node.setAttribute('data-' + NS, '');
      node.setAttribute('aria-hidden', 'true');
      document.body.appendChild(node);
      renderBg(node);
    } else if (node._sig !== bgSignature()) {

      clearTimeout(bgTimer);
      bgTimer = setTimeout(() => { const n = document.getElementById('lx-bg'); if (n && bgActive()) renderBg(n); }, 120);
    }
    node.setAttribute('data-tw', S.starTwinkle && S.bg === 'stars' ? '1' : '0');
  }

  function loaderCSS() {
    if (!S.loader || !isDark()) return '';
    const C = S.cardColor;
    return [
      '#nprogress{pointer-events:none}',
      '#nprogress .bar{height:2px!important;background:linear-gradient(90deg,' + rgba(C, 0) + ',' + rgba(C, .85) + ' 55%,' + lighten(C, .45) + ')!important;box-shadow:0 0 12px ' + rgba(C, .65) + '}',
      '#nprogress .peg{width:110px!important;opacity:1!important;box-shadow:0 0 16px ' + rgba(C, .9) + ',0 0 5px ' + rgba(C, 1) + '!important}',

      '@keyframes lx-dim{0%{opacity:.55}60%{opacity:.55}100%{opacity:1}}',
      'html.nprogress-busy .cmp-content{animation:lx-dim 1.6s ease-out both}',
      'html.nprogress-busy .adm-header::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:1px;',
        'background-image:linear-gradient(90deg,transparent,' + rgba(C, .95) + ',transparent);background-size:38% 100%;background-repeat:no-repeat;',
        'animation:lx-sweep 1.05s ease-in-out infinite}',
      '@keyframes lx-sweep{from{background-position:-40% 0}to{background-position:140% 0}}',
      '@media (prefers-reduced-motion:reduce){html.nprogress-busy .adm-header::after{animation:none;background-position:50% 0}}'
    ].join('');
  }

  const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*[\d.]+\s*)?\)/g;

  const SKIP_SEL = /thumb|indicator|checkmark|__control|cell-indicator|\blx-/i;
  const BG_PROPS = ['background', 'background-color', 'background-image'];
  const INK_PROPS = ['color', 'fill', 'stroke', 'caret-color', 'outline-color', 'text-decoration-color'];

  const LINE_PROPS = ['border-color', 'border-top-color', 'border-bottom-color',
                      'border-left-color', 'border-right-color'];

  function parseColor(s) {
    let r, g, b, a = 1;
    if (s[0] === '#') {
      let h = s.slice(1);
      if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
      if (h.length === 8) { a = parseInt(h.slice(6, 8), 16) / 255; h = h.slice(0, 6); }
      if (h.length !== 6) return null;
      r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
    } else {
      const m = s.match(/[\d.]+/g);
      if (!m || m.length < 3) return null;
      r = +m[0]; g = +m[1]; b = +m[2];
      if (m[3] !== undefined) a = +m[3];
    }
    return { r, g, b, a };
  }

  function toHSL(c) {
    const r = c.r / 255, g = c.g / 255, b = c.b / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h, s: s * 100, l: l * 100 };
  }

  const hsl = (h, s, l, a) => {
    const v = `${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%`;
    return a >= 1 ? `hsl(${v})` : `hsl(${v} / ${a})`;
  };

  function mapColor(str, kind) {
    const c = parseColor(str);
    if (!c || c.a < 0.9) return null;
    const x = toHSL(c);
    if (kind === 'bg') {
      if (x.l < 72) return null;
      return hsl(x.h, Math.min(x.s * 0.85, 26), 5.5 + (100 - x.l) * 0.42, c.a);
    }
    if (kind === 'line') {
      if (x.l > 62) return hsl(x.h, Math.min(x.s * 0.6, 14), 14 + (100 - x.l) * 0.28, c.a);
      if (x.l < 22) return hsl(x.h, Math.min(x.s, 20), 26 + (22 - x.l) * 0.6, c.a);
      return null;
    }
    if (x.l > 42) return null;
    return hsl(x.h, Math.min(x.s, 55), 95 - x.l * 0.55, c.a);
  }

  function mapDecl(decl, out) {
    let n = 0;
    const run = (props, kind) => {
      for (const p of props) {
        const v = decl.getPropertyValue(p);
        if (!v || v.includes('var(')) continue;
        const nv = v.replace(COLOR_RE, m => mapColor(m, kind) || m);
        if (nv !== v) { out(p, nv, decl.getPropertyPriority(p)); n++; }
      }
    };
    run(BG_PROPS, 'bg');
    run(INK_PROPS, 'ink');
    run(LINE_PROPS, 'line');
    return n;
  }

  const patchedSheets = new WeakSet();
  let patchCSS = '';
  let sheetCount = -1;

  function collectRule(rule, conds) {
    const parts = [];
    mapDecl(rule.style, (p, v, prio) => parts.push(p + ':' + v + (prio ? ' !important' : '')));
    if (!parts.length) return;
    let body = rule.selectorText + '{' + parts.join(';') + '}';
    for (let i = conds.length - 1; i >= 0; i--) body = conds[i] + '{' + body + '}';
    patchCSS += body + '\n';
  }

  function walkRules(rules, conds) {
    for (const r of rules) {
      if (r.style && r.selectorText && !SKIP_SEL.test(r.selectorText)) collectRule(r, conds);
      if (r.cssRules) {
        let next = conds;
        const kind = r.constructor && r.constructor.name;
        if (r.media && r.media.mediaText) next = conds.concat('@media ' + r.media.mediaText);
        else if (r.conditionText && r.type === 12) next = conds.concat('@supports ' + r.conditionText);
        else if (r.conditionText && kind === 'CSSContainerRule') next = conds.concat('@container ' + r.conditionText);

        walkRules(r.cssRules, next);
      }
    }
  }

  function patchSheets(force) {
    if (!isDark()) return;
    let adoptedList = [];
    try { adoptedList = [...document.adoptedStyleSheets]; } catch (e) { adoptedList = []; }
    const sheets = [...document.styleSheets, ...adoptedList];
    if (!force && sheets.length === sheetCount) return;
    sheetCount = sheets.length;
    let grew = false;
    for (const sh of sheets) {
      if (patchedSheets.has(sh) || Host.owns(sh)) continue;
      const node = sh.ownerNode;
      if (node && node.nodeType === 1 && node.hasAttribute('data-' + NS)) continue;
      let rules;
      try { rules = sh.cssRules; } catch (e) { continue; }
      if (!rules) continue;
      patchedSheets.add(sh);
      const before = patchCSS.length;
      walkRules(rules, []);
      if (patchCSS.length !== before) grew = true;
    }
    if (grew) Host.set('patch', patchCSS);
  }

  const inlineOrig = new WeakMap();
  const inlineList = [];

  function isOurs(el) {
    return !!(el && el.nodeType === 1 && (el.hasAttribute('data-' + NS) || (el.closest && el.closest('[data-' + NS + ']'))));
  }

  function patchInlineEl(el) {
    if (!el || el.nodeType !== 1 || !el.hasAttribute('style')) return;
    if (isOurs(el) || SKIP_SEL.test(String(el.className))) return;
    const cur = el.getAttribute('style');
    if (el._lxStyle === cur) return;
    const d = el.style;
    const n = mapDecl(d, (p, v, prio) => d.setProperty(p, v, prio));
    if (!n) { el._lxStyle = cur; return; }
    if (!inlineOrig.has(el)) { inlineOrig.set(el, cur); inlineList.push(el); }
    el._lxStyle = el.getAttribute('style');
  }

  function patchInline(root) {
    if (!isDark()) return;
    root = root || document;
    if (root.nodeType === 1 && root.hasAttribute('style')) patchInlineEl(root);
    if (!root.querySelectorAll) return;
    const nodes = root.querySelectorAll('[style]');
    for (let i = 0; i < nodes.length; i++) patchInlineEl(nodes[i]);
  }

  function unpatchInline() {
    for (const el of inlineList) {
      const orig = inlineOrig.get(el);
      if (orig == null) el.removeAttribute('style'); else el.setAttribute('style', orig);
      el._lxStyle = undefined;
      inlineOrig.delete(el);
    }
    inlineList.length = 0;
  }

  const BLOCK_MARKS = [
    ['greeting', '.cmp-hello__greet'], ['next', '.cmp-next__row'], ['announce', '.cmp-announce'],
    ['path', '.cmp-pathmetrics'], ['observ', '.cmp-observ'], ['tour', '.cmp-tour__text'],
    ['quick', '.cmp-quicktile']
  ];
  const BLOCK_NAMES = {
    greeting: 'Приветствие', next: 'Следующая пара', deadlines: 'Дедлайны недели',
    announce: 'Объявления', path: 'Мой путь', observ: 'Заметки Aya AI',
    tour: 'Освойтесь в кабинете', quick: 'Быстрые ссылки'
  };

  let navFound = [];
  let blockFound = [];

  function tagNav() {
    const items = document.querySelectorAll('.adm-nav-item');
    if (!items.length) return;
    const list = [];
    for (const el of items) {
      const href = el.getAttribute('href') || '';
      const lab = el.querySelector('.adm-nav-item__label');
      const label = (lab ? lab.textContent : el.textContent).trim();
      let path = href.replace(/^\/(ru|kk|en)(?=\/|$)/, '') || '/';
      if (!href) path = 'no-link:' + label;
      if (el.getAttribute('data-lx-nav') !== path) el.setAttribute('data-lx-nav', path);
      const groupEl = el.parentElement && el.parentElement.closest('.adm-sidebar > div');
      const glab = groupEl && groupEl.querySelector('.adm-sidebar__group-label');
      list.push({ path, label, group: glab ? glab.textContent.trim() : '', disabled: el.classList.contains('adm-nav-item--disabled') });
    }
    navFound = list;
  }

  function tagBlocks() {
    const host = document.querySelector('.cmp-content > div');
    if (!host) { blockFound = []; return; }
    const list = [];
    for (const sec of host.children) {
      let key = null;
      for (const [k, sel] of BLOCK_MARKS) if (sec.querySelector(sel)) { key = k; break; }
      if (!key && sec.querySelector('a[href$="/assignments"]')) key = 'deadlines';
      if (!key) continue;
      if (sec.getAttribute('data-lx-block') !== key) sec.setAttribute('data-lx-block', key);
      const t = sec.querySelector('.cmp-card__title, .qui-ccard__title, h1, h2, h3');
      list.push({ key, label: t ? t.textContent.trim() : BLOCK_NAMES[key] || key });
    }
    blockFound = list;
  }

  let fullName = '';
  let firstIdx = -1;

  const PATRONYMIC_RE = /(вич|вна|ична|инична|ұлы|қызы|улы|кызы|оглы|кызы)$/i;

  function readName() {
    const n = document.querySelector('.adm-user__name');
    if (n) { const t = n.textContent.trim(); if (t && t !== fullName) { fullName = t; firstIdx = -1; } }
    if (fullName && firstIdx < 0) {
      const parts = fullName.split(/\s+/).filter(Boolean);
      const greet = document.querySelector('.cmp-hello__greet');
      if (greet) {
        const words = greet.textContent.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
        const i = parts.findIndex(p => p.length > 1 && words.includes(p.toLowerCase()));
        if (i >= 0) firstIdx = i;
      }
      if (firstIdx < 0 && parts.length >= 3 && PATRONYMIC_RE.test(parts[parts.length - 1])) firstIdx = 1;
    }
    return fullName;
  }

  function nameParts() {
    const parts = readName().split(/\s+/).filter(Boolean);
    if (parts.length < 2) return { first: parts[0] || '', last: '' };
    let order = S.nameOrder;
    if (order === 'auto') order = firstIdx === 1 ? 'last-first' : 'first-last';
    return order === 'last-first' ? { first: parts[1], last: parts[0] } : { first: parts[0], last: parts[1] };
  }

  function displayName(style) {
    const { first, last } = nameParts();
    if (!first) return '';
    const cap = s => s.charAt(0).toUpperCase();
    if (style === 'short') return last ? `${first} ${cap(last)}.` : first;
    if (style === 'initials') return last ? `${cap(first)}.${cap(last)}.` : cap(first) + '.';
    if (style === 'hide') return '';
    return last ? `${first} ${last}` : first;
  }

  const renamed = new Map();

  function applyRoomRename() {
    const from = String(S.roomFrom || '').trim();
    const to = String(S.roomTo || '');
    const on = !!(S.roomRename && from);

    for (const [node, orig] of renamed) {
      if (!node.isConnected) { renamed.delete(node); continue; }
      const want = on ? orig.split(from).join(to) : orig;
      if (node.nodeValue !== want) node.nodeValue = want;
      if (!on || want === orig) renamed.delete(node);
    }
    if (!on) return;
    const hosts = document.querySelectorAll('.qui-meet, .cmp-daylist__row, .cmp-next__row');
    for (const h of hosts) {
      const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = walker.nextNode())) {
        if (renamed.has(node) || !node.nodeValue.includes(from)) continue;
        renamed.set(node, node.nodeValue);
        node.nodeValue = node.nodeValue.split(from).join(to);
      }
    }
  }

  const cssStr = v => String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const cssAttr = v => String(v).replace(/["\\]/g, '\\$&');

  function prefsCSS() {
    const css = [];

    css.push('.adm-header{position:relative;z-index:var(--z-popover,50)}');

    if (S.hideAiDock) css.push('.a4-dock{display:none!important}');
    if (S.hideSidebarPromo) css.push('.adm-promo{display:none!important}');
    if (S.hideAskBar) css.push('.cmp-askbar{display:none!important}');
    if (S.hideSearch) css.push('.cmp-search{display:none!important}');
    if (S.hideBell) css.push('.qbell-wrap{display:none!important}');
    if (S.hideLocale) {
      css.push('.adm-locale-pill,.adm-header__right [class*="locale-pill"]:not(.adm-locale-pill__label){display:none!important}');
      css.push('.adm-header__right .select:has(.adm-locale-pill__label){display:none!important}');
    }

    if (S.motion === 'off') {
      css.push('[class*="adm-anim-"],[class*="cmp-anim-"]{animation:none!important;transition:none!important;opacity:1!important;transform:none!important}');
    } else if (S.motion === 'smooth') {
      css.push('@keyframes lx-in{from{opacity:0}to{opacity:1}}');
      css.push(':is([class*="adm-anim-"],[class*="cmp-anim-"]):not(.adm-sidebar){',
        'animation-name:lx-in!important;animation-duration:.32s!important;',
        'animation-timing-function:cubic-bezier(.22,1,.36,1)!important;animation-fill-mode:backwards!important;',
        'transform:none!important;filter:none!important}');
      css.push('@media (prefers-reduced-motion:reduce){[class*="adm-anim-"],[class*="cmp-anim-"]{animation:none!important;opacity:1!important}}');
    }

    if (S.avatar === 'hide') {
      css.push('.adm-user__avatar{display:none!important}');
    } else if (S.avatar === 'url' && /^(https?:\/\/|data:image\/)/i.test(S.avatarUrl)) {
      const au = S.avatarUrl.replace(/["\\)]/g, '');
      css.push('.adm-user__photo{display:none!important}');
      css.push('.adm-user__avatar{background-image:url("' + au + '")!important;background-size:cover;background-position:center;color:transparent}');
    }

    if (S.nameStyle === 'hide') {
      css.push('.adm-user__name{display:none!important}');
    } else if (S.nameStyle !== 'full') {
      const shown = displayName(S.nameStyle);
      if (shown) {
        css.push('.adm-user__name{font-size:0!important;line-height:0!important}');
        css.push('.adm-user__name::after{content:"' + cssStr(shown) + '";font-size:14px;line-height:1.3;font-weight:inherit;color:inherit}');
      }
    } else if (S.nameOrder !== 'auto' || firstIdx === 1) {

      const shown = displayName('full');
      if (shown && shown !== fullName) {
        css.push('.adm-user__name{font-size:0!important;line-height:0!important}');
        css.push('.adm-user__name::after{content:"' + cssStr(shown) + '";font-size:14px;line-height:1.3;font-weight:inherit;color:inherit}');
      }
    }

    if (S.density === 'compact') {
      css.push('.adm-nav-item{padding-top:6px!important;padding-bottom:6px!important}');
      css.push('.cmp-card{padding:14px 16px!important}');
      css.push('.adm-sidebar__group-label{margin-top:10px!important;margin-bottom:2px!important}');
      css.push('.cmp-content>div{gap:12px!important}');
    }
    if (S.contentWidth === 'wide') {
      css.push('.adm-shell__content{padding-left:12px!important;padding-right:12px!important}');
      css.push('.cmp-content,.cmp-content>div{max-width:none!important;width:100%!important}');
    }
    if (S.hideDisabledNav) css.push('.adm-nav-item--disabled{display:none!important}');
    if (S.hideNavGroups) css.push('.adm-sidebar__group-label{display:none!important}');
    for (const p of S.hiddenNav) css.push('.adm-nav-item[data-lx-nav="' + cssAttr(p) + '"]{display:none!important}');
    for (const k of S.hiddenBlocks) css.push('[data-lx-block="' + cssAttr(k) + '"]{display:none!important}');

    css.push('.cmp-announce .qui-acc__grow{flex:0 0 0!important;min-width:0!important}');
    css.push('.cmp-announce .qui-acc__head{gap:18px}');
    css.push('.cmp-announce .qui-acc__head>:not(.cmp-announce__head):not(.qui-acc__grow):not(.qui-acc__toggle){margin-left:auto;white-space:nowrap;font-variant-numeric:tabular-nums;text-align:right}');

    if (S.schedHidePastMark) css.push('.qui-meet__pastmark{display:none!important}');
    if (S.schedHidePeople) css.push('.qui-meet__people,.qui-meet__note{display:none!important}');
    if (S.schedDimPast) css.push('.qui-meet--past{opacity:.45}.qui-meet--past:hover{opacity:1}');
    return css.join('\n');
  }

  const txt = n => (n ? n.textContent.trim().replace(/\s+/g, ' ') : '');

  function blockText(root) {
    if (!root) return '';
    const leaves = [], seen = new Set();
    for (const el of root.querySelectorAll('*')) {
      if (el.children.length) continue;
      const t = txt(el);
      if (!t || seen.has(t)) continue;
      seen.add(t); leaves.push(t);
    }
    return leaves.length ? leaves.join(' · ') : txt(root);
  }

  function parseSchedule() {
    const grid = document.querySelector('.cmp-grid');
    if (!grid) return null;
    const rows = [...grid.querySelectorAll('.cmp-grid__row')];
    if (rows.length < 2) return null;
    const days = [...rows[0].querySelectorAll('.cmp-grid__dayhead')].map(d => {
      const date = d.querySelector('.cmp-grid__daydate');
      return { day: txt(d).replace(txt(date), '').trim(), date: txt(date) };
    });
    const items = [];
    for (const r of rows.slice(1)) {
      if (r.querySelector('.cmp-grid__break')) continue;
      const no = txt(r.querySelector('.cmp-grid__timeno'));
      const range = txt(r.querySelector('.cmp-grid__timerange'));
      [...r.querySelectorAll('.cmp-grid__cell')].forEach((c, i) => {
        for (const m of c.querySelectorAll('.qui-meet')) {
          items.push({
            day: (days[i] || {}).day || '', date: (days[i] || {}).date || '',
            pair: no, time: range,
            subject: txt(m.querySelector('.qui-meet__title')),
            type: txt(m.querySelector('.qui-meet__type')),
            room: txt(m.querySelector('.qui-meet__room')).replace(/^ауд\.\s*/i, ''),
            teacher: txt(m.querySelector('.qui-meet__people')),
            details: txt(m.querySelector('.qui-meet__note')),
            past: m.classList.contains('qui-meet--past')
          });
        }
      });
    }
    return { week: blockText(document.querySelector('.cmp-weeknav')), title: txt(document.querySelector('.cmp-sched-head__title')), days, items };
  }

  function needSchedule() {
    const d = parseSchedule();
    if (!d || !d.items.length) { toast('Откройте «Расписание» с сеткой недели — тогда будет что выгружать'); return null; }
    return d;
  }

  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
  }

  function stamp() {
    const d = new Date(), p = n => (n < 10 ? '0' : '') + n;
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function exportJSON() {
    const d = needSchedule();
    if (!d) return;
    const payload = { source: 'campus.qairu.edu.kz', exported: new Date().toISOString(), week: d.week, days: d.days, lessons: d.items };
    saveBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), 'schedule-' + stamp() + '.json');
    toast('JSON сохранён');
  }

  function scheduleText() {
    const d = parseSchedule();
    if (!d) return '';
    const lines = ['Расписание' + (d.week ? ' · ' + d.week : ''), ''];
    for (const day of d.days) {
      const mine = d.items.filter(x => x.day === day.day);
      if (!mine.length) continue;
      lines.push(day.day + ', ' + day.date);
      for (const x of mine) {
        const meta = [x.type, x.room ? 'ауд. ' + x.room : '', x.teacher].filter(Boolean).join(' · ');
        lines.push(x.time + '  ' + x.subject);
        if (meta) lines.push('       ' + meta);
      }
      lines.push('');
    }
    return lines.join('\n').trim();
  }

  function copyToClipboard(text, okMsg) {
    const legacy = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('data-' + NS, '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      toast(ok ? okMsg : 'Не удалось скопировать');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast(okMsg), legacy);
    } else legacy();
  }

  function copyText() {
    const d = needSchedule();
    if (d) copyToClipboard(scheduleText(), 'Расписание скопировано');
  }

  function clip(c, text, max) {
    if (c.measureText(text).width <= max) return text;
    let t = text;
    while (t.length > 1 && c.measureText(t + '…').width > max) t = t.slice(0, -1);
    return t + '…';
  }

  function readable(hex) {
    const c = rgbOf(hex);
    const lum = (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) / 255;
    return lum >= 0.42 ? hex : lighten(hex, (0.42 - lum) * 1.6);
  }

  function exportJPG() {
    const d = needSchedule();
    if (!d) return;
    const draw = () => drawSchedule(d);
    if (document.fonts && document.fonts.load) {
      Promise.all([
        document.fonts.load("500 14px 'Lunatica Mono'"),
        document.fonts.load("700 15px 'Lunatica Mono'")
      ]).then(draw, draw);
    } else {
      draw();
    }
  }

  function drawSchedule(d) {
    const P = scale();
    const acc = readable(S.cardColor);

    const groups = [];
    for (const day of d.days) {
      const mine = d.items.filter(x => x.day === day.day);
      if (mine.length) groups.push({ day, items: mine });
    }

    const W = 1200, PAD = 64, ROW = 66, DAY_H = 62, GAP = 18;
    const TIME_X = PAD, SPINE_X = PAD + 132, TEXT_X = PAD + 156;
    let H = 150;
    for (const g of groups) H += DAY_H + g.items.length * ROW + GAP;
    H += 76;

    const dpr = 2;
    const cv = document.createElement('canvas');
    cv.width = W * dpr;
    cv.height = H * dpr;
    const c = cv.getContext('2d');
    c.scale(dpr, dpr);

    const MONO = "'Lunatica Mono', ui-monospace, monospace";
    const rule = (y, x1, x2, color) => { c.fillStyle = color; c.fillRect(x1, y, x2 - x1, 1); };

    c.fillStyle = P.canvas === '#000000' ? '#050507' : P.canvas;
    c.fillRect(0, 0, W, H);

    c.fillStyle = P.ink;
    c.font = '800 34px ' + MONO;
    c.fillText('Расписание', PAD, 78);
    if (d.week) {
      c.fillStyle = P.muted;
      c.font = '500 15px ' + MONO;
      const w = c.measureText(d.week).width;
      c.fillText(d.week, W - PAD - w, 76);
    }
    rule(106, PAD, W - PAD, P.lineStrong);

    let y = 150;
    for (const g of groups) {
      c.fillStyle = acc;
      c.font = '700 15px ' + MONO;
      const name = g.day.day.toUpperCase();
      c.fillText(name, PAD, y);
      const nameW = c.measureText(name).width;

      if (g.day.date) {
        c.fillStyle = P.faint;
        c.font = '500 14px ' + MONO;
        const dw = c.measureText(g.day.date).width;
        c.fillText(g.day.date, W - PAD - dw, y);
        rule(y - 5, PAD + nameW + 16, W - PAD - dw - 16, P.line);
      } else {
        rule(y - 5, PAD + nameW + 16, W - PAD, P.line);
      }
      y += DAY_H - 24;

      for (const x of g.items) {
        const dim = x.past;
        c.fillStyle = dim ? P.faint : acc;
        c.globalAlpha = dim ? 0.45 : 1;
        c.fillRect(SPINE_X, y - 6, 3, ROW - 18);
        c.globalAlpha = 1;

        c.fillStyle = dim ? P.faint : P.ink2;
        c.font = '500 14px ' + MONO;
        c.fillText(x.time || '', TIME_X, y + 8);

        c.fillStyle = dim ? P.muted : P.ink;
        c.font = '700 17px ' + MONO;
        c.fillText(clip(c, x.subject, W - TEXT_X - PAD), TEXT_X, y + 8);

        const meta = [x.type, x.room ? 'ауд. ' + x.room : '', x.teacher].filter(Boolean).join('  ·  ');
        if (meta) {
          c.fillStyle = P.faint;
          c.font = '500 13.5px ' + MONO;
          c.fillText(clip(c, meta, W - TEXT_X - PAD), TEXT_X, y + 30);
        }
        y += ROW;
      }
      y += GAP;
    }

    rule(H - 62, PAD, W - PAD, P.line);
    c.fillStyle = P.muted;
    c.font = '600 13px ' + MONO;
    c.fillText('wateroff.dev', PAD, H - 34);
    c.fillStyle = P.faint;
    c.font = '500 13px ' + MONO;
    const src = 'campus.qairu.edu.kz · ' + stamp();
    c.fillText(src, W - PAD - c.measureText(src).width, H - 34);

    cv.toBlob(blob => {
      if (!blob) { toast('Не удалось собрать картинку'); return; }
      saveBlob(blob, 'schedule-' + stamp() + '.jpg');
      toast('Картинка сохранена');
    }, 'image/jpeg', 0.94);
  }

  function configText() { return JSON.stringify(S, null, 2); }

  function applyConfig(text) {
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (e) { parsed = null; }
    if (!parsed || typeof parsed !== 'object') { toast('Это не похоже на настройки'); return false; }
    S = normalize(parsed);
    save();
    applyAll();
    Panel.rebuild();
    toast('Настройки применены');
    return true;
  }

  let toastTimer = null;
  function toast(msg, action) {
    let t = document.getElementById('lx-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'lx-toast';
      t.setAttribute('data-' + NS, '');
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
    }
    t.textContent = '';
    const span = document.createElement('span');
    span.textContent = msg;
    t.appendChild(span);
    t.classList.toggle('lx-has-action', !!action);
    if (action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lx-toast-act';
      b.textContent = action.label;
      b.addEventListener('click', () => { t.classList.remove('lx-on'); action.fn(); });
      t.appendChild(b);
    }
    t.classList.add('lx-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('lx-on'), action ? 7000 : 2800);
  }

  const MONO_FONT = "'Lunatica Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
  const UI_FONT = MONO_FONT;

  function panelAccent() {
    const c = parseColor(S.cardColor) || { r: 0, g: 155, b: 255, a: 1 };
    const x = toHSL(c);
    const acc = x.l < 45 ? hsl(x.h, Math.max(x.s, 40), 55, 1) : S.cardColor;
    const rc = parseColor(acc) || c;
    const lum = x.l < 45 ? 0.55 : (rc.r * 0.299 + rc.g * 0.587 + rc.b * 0.114) / 255;
    return { acc, ink: lum > 0.5 ? '#0b0b0e' : '#ffffff' };
  }

  function uiCSS() {
    const { acc, ink: accInk } = panelAccent();
    const line = 'rgba(146,160,190,.16)';
    const line2 = 'rgba(146,160,190,.26)';
    return [
      '#lx-backdrop{position:fixed;inset:0;z-index:2147483000;background:rgba(5,7,12,.55);opacity:0;transition:opacity .2s ease}',
      '#lx-backdrop.lx-on{opacity:1}',

      '#lx-panel{--p-0:#0b0d12;--p-1:#11141a;--p-2:#171b23;--p-3:#242a36;',
        '--p-line:' + line + ';--p-line-2:' + line2 + ';',
        '--p-ink:#eceef4;--p-ink-2:#aab2c4;--p-ink-3:#7f8899;',
        '--p-acc:' + acc + ';--p-acc-ink:' + accInk + ';--p-ok:#6fd48b;--p-red:#f07a72;',
        '--p-ease:cubic-bezier(.22,.68,.24,1);',
        'position:fixed;top:0;right:0;bottom:0;width:min(400px,100vw);z-index:2147483001;',
        'display:flex;flex-direction:column;color:var(--p-ink);background:var(--p-0);',
        'font:500 13px/1.5 ' + UI_FONT + ';-webkit-font-smoothing:antialiased;',
        'border-left:1px solid var(--p-line-2);box-shadow:-24px 0 60px -30px #000;',
        'transform:translateX(16px);opacity:0;transition:transform .26s var(--p-ease),opacity .18s ease}',
      '#lx-panel.lx-on{transform:none;opacity:1}',

      ':where(#lx-panel *){box-sizing:border-box;margin:0}',
      ':where(#lx-panel button){font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}',
      '#lx-panel :where(button,input,textarea,[tabindex]):focus-visible{outline:2px solid var(--p-acc);outline-offset:2px}',
      '#lx-panel a{color:var(--p-acc);text-decoration:none}',
      '#lx-panel a:hover{text-decoration:underline}',
      '#lx-panel .lx-mono{font-family:' + MONO_FONT + '}',
      '#lx-panel [data-num]{font-variant-numeric:tabular-nums}',

      '.lx-head{display:flex;align-items:center;gap:10px;padding:16px 10px 12px 20px;flex:0 0 auto}',
      '.lx-head-text{flex:1;min-width:0;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}',
      '.lx-mark{font:700 13px/1 ' + MONO_FONT + ';color:var(--p-ink);letter-spacing:-.01em}',
      '.lx-title{font:500 12px/1 ' + MONO_FONT + ';color:var(--p-ink-3)}',
      '.lx-ver{font:500 11px/1 ' + MONO_FONT + ';color:var(--p-ink-3)}',
      '.lx-x{width:40px;height:40px;color:var(--p-ink-3);display:grid;place-items:center;border-radius:8px}',
      '.lx-x:hover{background:var(--p-2);color:var(--p-ink)}',

      '.lx-tabs{display:flex;gap:2px;padding:0 12px;border-bottom:1px solid var(--p-line);flex:0 0 auto}',
      '.lx-tab{position:relative;flex:1;min-height:46px;display:inline-flex;align-items:center;justify-content:center;gap:7px;',
        'font:600 11.5px/1 ' + UI_FONT + ';color:var(--p-ink-3);transition:color .15s ease}',
      '.lx-tab::after{content:"";position:absolute;left:6px;right:6px;bottom:-1px;height:2px;background:var(--p-acc);',
        'opacity:0;transform:scaleX(.4);transform-origin:center;transition:opacity .18s ease,transform .18s var(--p-ease)}',
      '.lx-tab svg{opacity:.7;transition:opacity .15s ease}',
      '.lx-tab:hover{color:var(--p-ink-2)}',
      '.lx-tab[aria-selected="true"]{color:var(--p-ink)}',
      '.lx-tab[aria-selected="true"]::after{opacity:1;transform:none}',
      '.lx-tab[aria-selected="true"] svg{opacity:1;color:var(--p-acc)}',
      '@media (max-width:340px){.lx-tab span{display:none}.lx-tab{gap:0}}',

      '.lx-body{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:0 20px 20px;',
        'scrollbar-width:thin;scrollbar-color:var(--p-3) transparent}',
      '.lx-body::-webkit-scrollbar{width:10px}',
      '.lx-body::-webkit-scrollbar-thumb{background:var(--p-3);border-radius:10px;border:3px solid var(--p-0)}',
      '.lx-body::-webkit-scrollbar-thumb:hover{background:#3a4353}',

      '.lx-sec{padding-bottom:8px}',
      '.lx-sec-h{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:8px;margin:0 -20px;padding:18px 20px 8px;',
        'font:600 11px/1 ' + MONO_FONT + ';letter-spacing:.1em;text-transform:uppercase;color:var(--p-ink-3);',
        'background:var(--p-0);border-bottom:1px solid var(--p-line)}',
      '.lx-sec-h .lx-i{color:var(--p-ink-3);opacity:.8}',
      '.lx-sec-h span{flex:1}',
      '.lx-hint{font-size:11px;color:var(--p-ink-3);line-height:1.6;padding:5px 0 9px}',
      '.lx-empty{font-size:11.5px;color:var(--p-ink-3);padding:10px 0;line-height:1.65}',
      '.lx-empty b{color:var(--p-ink-2);font-weight:600}',

      '.lx-row{display:flex;align-items:center;gap:14px;min-height:50px;padding:6px 0;border-top:1px solid var(--p-line)}',
      '.lx-row:first-child,.lx-sec-h+.lx-row,.lx-hint+.lx-row,.lx-group-h+.lx-row{border-top:0}',
      '.lx-row-text{flex:1;min-width:0;cursor:pointer}',
      '.lx-row-t{font-weight:600;font-size:12.5px;line-height:1.35;letter-spacing:-.01em;transition:color .15s ease}',
      '.lx-row-d{font-size:11px;color:var(--p-ink-3);margin-top:4px;line-height:1.5}',
      '.lx-row.lx-off .lx-row-t{color:var(--p-ink-2)}',
      '.lx-sw{position:relative;flex:0 0 auto;width:44px;height:26px;border-radius:999px;background:var(--p-2);',
        'box-shadow:inset 0 0 0 1px var(--p-line-2);transition:background-color .18s ease,box-shadow .18s ease}',
      '.lx-sw::after{content:"";position:absolute;top:5px;left:5px;width:16px;height:16px;border-radius:50%;background:var(--p-ink-3);',
        'transition:transform .2s var(--p-ease),background-color .18s ease,width .2s var(--p-ease),height .2s var(--p-ease),top .2s var(--p-ease),left .2s var(--p-ease)}',
      '.lx-row:hover .lx-sw::after{background:var(--p-ink-2)}',
      '.lx-sw[aria-checked="true"]{background:var(--p-acc);box-shadow:inset 0 0 0 1px transparent}',
      '.lx-sw[aria-checked="true"]::after{top:4px;left:4px;width:18px;height:18px;background:var(--p-acc-ink);transform:translateX(18px)}',
      '.lx-group-h{font:600 11px/1 ' + MONO_FONT + ';letter-spacing:.08em;color:var(--p-ink-3);padding:18px 0 6px;text-transform:lowercase}',

      '.lx-field{padding:10px 0 12px;border-top:1px solid var(--p-line)}',
      '.lx-field:first-child,.lx-sec-h+.lx-field,.lx-hint+.lx-field{border-top:0}',
      '.lx-field-h{display:flex;align-items:baseline;gap:10px;margin-bottom:9px;font-size:12.5px;font-weight:600;letter-spacing:-.01em}',
      '.lx-field-h>span:first-child{flex:1}',
      '.lx-val{font:500 11.5px/1 ' + MONO_FONT + ';color:var(--p-ink-2);font-variant-numeric:tabular-nums}',
      '.lx-seg{display:flex;border:1px solid var(--p-line-2);border-radius:8px;overflow:hidden}',
      '.lx-seg>button{flex:1;min-height:38px;padding:0 7px;font-size:11.5px;color:var(--p-ink-2);white-space:nowrap;',
        'border-left:1px solid var(--p-line);transition:color .15s ease,background-color .15s ease}',
      '.lx-seg>button:first-child{border-left:0}',
      '.lx-seg>button:hover{color:var(--p-ink);background:var(--p-2)}',
      '.lx-seg>button[aria-checked="true"]{background:var(--p-acc);color:var(--p-acc-ink);font-weight:700}',
      '.lx-seg>button[aria-checked="true"]:hover{background:var(--p-acc)}',

      '.lx-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:2px 0 12px}',
      '.lx-tile{position:relative;padding:7px 7px 9px;border-radius:10px;border:1px solid var(--p-line-2);background:var(--p-1);',
        'text-align:left;transition:border-color .15s ease,background-color .15s ease}',
      '.lx-tile:hover{border-color:#47506480;background:var(--p-2)}',
      '.lx-tile[aria-checked="true"]{border-color:var(--p-acc);background:var(--p-2)}',
      '.lx-tile-mark{position:absolute;top:12px;right:12px;width:17px;height:17px;border-radius:50%;background:var(--p-acc);',
        'color:var(--p-acc-ink);display:none;place-items:center}',
      '.lx-tile-mark svg{width:12px;height:12px;stroke-width:3}',
      '.lx-tile[aria-checked="true"] .lx-tile-mark{display:grid}',
      '.lx-tile-pv,.lx-tile-name,.lx-tile-hint{display:block}',
      '.lx-tile-pv{height:48px;border-radius:6px;position:relative;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)}',
      '.lx-tile-pv i{position:absolute;display:block}',
      '.lx-tile-card{left:6px;right:6px;top:9px;height:23px;border-radius:4px;border:1px solid}',
      '.lx-tile-line{left:11px;top:16px;width:46%;height:3px;border-radius:2px}',
      '.lx-tile-line2{left:11px;top:23px;width:28%;height:3px;border-radius:2px;opacity:.55}',
      '.lx-tile-dot{right:10px;bottom:7px;width:7px;height:7px;border-radius:50%}',
      '.lx-tile-name{font-size:11.5px;font-weight:700;margin-top:9px;line-height:1.2;letter-spacing:-.01em}',
      '.lx-tile-hint{font:500 10.5px/1.25 ' + MONO_FONT + ';color:var(--p-ink-3);margin-top:3px}',

      '.lx-swatches{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.lx-dot{position:relative;width:30px;height:30px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.35);',
        'transition:transform .15s var(--p-ease)}',
      '.lx-dot::after{content:"";position:absolute;inset:-5px;border-radius:50%;border:1.5px solid currentColor;opacity:0;transition:opacity .15s ease}',
      '.lx-dot:hover{transform:scale(1.06)}',
      '.lx-dot[aria-pressed="true"]::after{opacity:1}',
      '.lx-color{width:34px;height:30px;padding:0;border:1px solid var(--p-line-2);border-radius:7px;background:var(--p-1);cursor:pointer}',
      '.lx-color::-webkit-color-swatch-wrapper{padding:3px}',
      '.lx-color::-webkit-color-swatch{border:0;border-radius:4px}',

      '.lx-range{-webkit-appearance:none;appearance:none;width:100%;height:20px;cursor:pointer;margin:0;background:transparent}',
      '.lx-range::-webkit-slider-runnable-track{height:3px;border-radius:2px;background:var(--p-3)}',
      '.lx-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;margin-top:-6.5px;border-radius:50%;',
        'background:var(--p-acc);box-shadow:0 0 0 3px var(--p-0);transition:transform .12s var(--p-ease)}',
      '.lx-range:active::-webkit-slider-thumb{transform:scale(1.18)}',
      '.lx-range::-moz-range-track{height:3px;border-radius:2px;background:var(--p-3)}',
      '.lx-range::-moz-range-thumb{width:16px;height:16px;border:0;border-radius:50%;background:var(--p-acc);box-shadow:0 0 0 3px var(--p-0)}',

      '.lx-text{width:100%;min-height:40px;padding:9px 11px;border-radius:8px;border:1px solid var(--p-line-2);',
        'background:var(--p-1);color:var(--p-ink);font:inherit;font-size:13px}',
      '.lx-text::placeholder{color:var(--p-ink-3)}',
      '.lx-text:hover{border-color:#47506480}',
      '.lx-text:focus{outline:2px solid var(--p-acc);outline-offset:1px;border-color:transparent}',
      '.lx-ta{margin:10px 0;resize:vertical;font:500 12px/1.55 ' + MONO_FONT + '}',

      '.lx-acts{display:flex;gap:8px;flex-wrap:wrap}',
      '.lx-act{display:inline-flex;align-items:center;gap:8px;min-height:38px;padding:0 12px;border-radius:8px;',
        'border:1px solid var(--p-line-2);font:600 11.5px/1 ' + UI_FONT + ';transition:background-color .15s ease,border-color .15s ease}',
      '.lx-act:hover{background:var(--p-2);border-color:#47506480}',
      '.lx-act .lx-i{color:var(--p-ink-3)}',
      '.lx-act.lx-danger{color:var(--p-red);border-color:rgba(240,122,114,.35)}',
      '.lx-act.lx-danger .lx-i{color:var(--p-red)}',
      '.lx-act.lx-danger:hover{background:rgba(240,122,114,.1);border-color:rgba(240,122,114,.55)}',

      '.lx-preview{display:flex;align-items:center;gap:8px;padding:10px 0 2px;font:500 12px/1.4 ' + MONO_FONT + ';color:var(--p-ink-3)}',
      '.lx-preview::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--p-acc);flex:0 0 auto}',
      '.lx-preview b{color:var(--p-ink);font-weight:600}',
      '.lx-kv{display:flex;flex-direction:column;gap:10px;font-size:11.5px;color:var(--p-ink-2);line-height:1.5;padding-top:6px}',
      '.lx-kv div{display:flex;gap:10px;align-items:center}',
      '.lx-kbd{display:inline-block;font:600 11px/1 ' + MONO_FONT + ';padding:5px 7px;border-radius:5px;',
        'border:1px solid var(--p-line-2);color:var(--p-ink-2);background:var(--p-1);white-space:nowrap}',
      '.lx-about{padding:4px 0 0;font-size:11px;color:var(--p-ink-3);line-height:1.8}',
      '.lx-about b{color:var(--p-ink-2);font-weight:600}',
      '.lx-about .lx-mono{font-size:11px}',

      '.lx-foot{display:flex;align-items:center;gap:10px;padding:10px 12px 10px 20px;border-top:1px solid var(--p-line);',
        'flex:0 0 auto;min-height:54px;background:var(--p-0)}',
      '.lx-foot-hint{flex:1;display:flex;align-items:center;gap:7px;font-size:11px;color:var(--p-ink-3);min-width:0}',
      '.lx-saved{display:inline-flex;align-items:center;gap:6px;font:600 11px/1 ' + MONO_FONT + ';color:var(--p-ok);opacity:0;transition:opacity .25s ease}',
      '.lx-saved::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--p-ok)}',
      '.lx-saved.lx-on{opacity:1}',
      '.lx-confirm{display:flex;gap:8px;align-items:center;font-size:12.5px}',

      '#lx-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,10px);z-index:2147483002;max-width:min(92vw,520px);',
        'padding:11px 16px;border-radius:10px;background:#11141a;color:#eceef4;border:1px solid ' + line2 + ';',
        'box-shadow:0 18px 40px -18px #000;font:500 12px/1.4 ' + UI_FONT + ';',
        'opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s cubic-bezier(.22,.68,.24,1)}',
      '#lx-toast.lx-on{opacity:1;transform:translate(-50%,0)}',
      '#lx-toast.lx-has-action{pointer-events:auto;display:flex;align-items:center;gap:14px}',
      '.lx-toast-act{font:700 11px/1 ' + UI_FONT + ';color:' + acc + ';background:none;border:1px solid ' + line2 + ';',
        'border-radius:7px;min-height:34px;padding:0 12px;cursor:pointer}',
      '.lx-toast-act:hover{background:rgba(255,255,255,.06)}',

      '#lx-launch{display:flex;align-items:center;gap:10px;width:100%;min-height:40px;padding:8px 12px;margin:2px 0;border:0;',
        'border-radius:10px;background:none;cursor:pointer;color:var(--adm-ink-body,#1c1c20);font:inherit;font-size:14px;text-align:left}',
      '#lx-launch:hover{background:var(--adm-surface-sunk,#f3f3f5)}',
      '#lx-launch:focus-visible{outline:2px solid var(--focus,#5aa9ff);outline-offset:2px}',
      '#lx-launch svg{flex:0 0 auto;opacity:.75}',
      '.adm-sidebar--collapsed #lx-launch{justify-content:center;padding:8px}',
      '.adm-sidebar--collapsed #lx-launch span{display:none}',
      '#lx-float{position:fixed;left:14px;bottom:14px;z-index:2147482000;width:44px;height:44px;border-radius:50%;',
        'border:1px solid ' + line2 + ';background:#11141a;color:#eceef4;cursor:pointer;display:none;align-items:center;',
        'justify-content:center;box-shadow:0 10px 30px -12px #000}',
      '#lx-float:focus-visible{outline:2px solid #5aa9ff;outline-offset:2px}',

      '.lx-share{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-left:auto}',
      '.lx-share__btn{display:inline-flex;align-items:center;gap:7px;min-height:36px;padding:0 12px;border-radius:10px;cursor:pointer;',
        'border:1px solid var(--adm-line,#e4e4e7);background:var(--adm-surface,#fff);color:var(--adm-ink-body,#1c1c20);',
        'font:600 12px/1 ' + UI_FONT + ';transition:background-color .15s ease,border-color .15s ease}',
      '.lx-share__btn:hover{background:var(--adm-surface-sunk,#f3f3f5);border-color:var(--adm-line-strong,#d4d4d8)}',
      '.lx-share__btn:focus-visible{outline:2px solid var(--focus,#5aa9ff);outline-offset:2px}',
      '.lx-share__btn .lx-i{opacity:.7}',
      '@media (max-width:640px){.lx-share{width:100%;margin-left:0}.lx-share__btn{flex:1;justify-content:center}}',

      '@media (max-width:560px){#lx-panel{top:auto;left:0;right:0;width:auto;max-height:90vh;max-height:90dvh;',
        'border-left:0;border-top:1px solid var(--p-line-2);border-radius:14px 14px 0 0;transform:translateY(20px);',
        'padding-bottom:env(safe-area-inset-bottom)}',
        '#lx-panel.lx-on{transform:none}',
        '.lx-head{padding:14px 10px 10px 16px}.lx-body{padding-inline:16px}.lx-sec-h{margin-inline:-16px;padding-inline:16px}',
        '.lx-foot{padding-left:16px}.lx-text{font-size:16px}}',
      '@media (prefers-reduced-motion:reduce){#lx-panel,#lx-backdrop,#lx-toast,.lx-sw::after,.lx-tab::after{transition:none}}'
    ].join('');
  }

  const svg = (d, size) => `<svg class="lx-i" width="${size || 16}" height="${size || 16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    theme: svg('<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 7a5 5 0 0 1 0 10"/>'),
    iface: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>'),
    menu: svg('<path d="M4 6h16M4 12h16M4 18h10"/>'),
    schedule: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>'),
    misc: svg('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'),
    cards: svg('<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/>'),
    bg: svg('<circle cx="6" cy="6" r="1"/><circle cx="17" cy="8" r="1"/><circle cx="11" cy="14" r="1"/><circle cx="19" cy="17" r="1"/><circle cx="6" cy="18" r="1"/><rect x="3" y="3" width="18" height="18" rx="3"/>'),
    home: svg('<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/>'),
    user: svg('<circle cx="12" cy="8" r="3.4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>'),
    eye: svg('<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    motion: svg('<path d="M4 12h6M4 6h10M4 18h4"/><path d="m14 9 4 3-4 3"/>'),
    code: svg('<path d="m9 8-5 4 5 4M15 8l5 4-5 4"/>'),
    image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m5 18 5-5 4 4 2-2 3 3"/>'),
    copy: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>'),
    paste: svg('<rect x="6" y="5" width="12" height="16" rx="2"/><path d="M9 5V3h6v2"/><path d="M9 12h6M9 16h4"/>'),
    loader: svg('<path d="M12 3a9 9 0 1 1-6.4 2.6"/><path d="M12 7v5l3 2"/>'),
    room: svg('<path d="M4 20V7l8-4 8 4v13"/><path d="M10 20v-5h4v5"/>'),
    reset: svg('<path d="M4 12a8 8 0 1 1 2.5 5.8"/><path d="M4 18v-5h5"/>'),
    close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    check: svg('<path d="m5 12 4 4L19 7"/>'),
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
    key: svg('<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 11h.01M11 11h.01M15 11h.01M8 14h8"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>', 17)
  };

  const SWATCHES = [
    ['#009bff', 'Фирменный синий'], ['#22d3ee', 'Циан'], ['#7ee787', 'Зелёный'],
    ['#e3b341', 'Янтарь'], ['#ff7b72', 'Коралл'], ['#d2a8ff', 'Лаванда']
  ];

  const TABS = [
    ['theme', 'Тема', 'theme'], ['look', 'Вид', 'iface'], ['menu', 'Меню', 'menu'],
    ['sched', 'Пары', 'schedule'], ['more', 'Ещё', 'misc']
  ];

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  const Panel = (() => {
    let root = null, backdrop = null, body = null, savedEl = null, lastFocus = null;
    let savedTimer = null;

    function change(after) {
      save();
      applyAll();
      if (savedEl) {
        savedEl.classList.add('lx-on');
        clearTimeout(savedTimer);
        savedTimer = setTimeout(() => savedEl && savedEl.classList.remove('lx-on'), 1400);
      }
      if (after) after();
    }

    function rowToggle(title, desc, get, set, after) {
      const row = el('div', 'lx-row');
      const text = el('div', 'lx-row-text', '<div class="lx-row-t"></div>' + (desc ? '<div class="lx-row-d"></div>' : ''));
      text.firstChild.textContent = title;
      if (desc) text.lastChild.textContent = desc;
      const sw = el('button', 'lx-sw');
      sw.type = 'button';
      sw.setAttribute('role', 'switch');
      sw.setAttribute('aria-label', title);
      const sync = () => { const on = !!get(); sw.setAttribute('aria-checked', on ? 'true' : 'false'); row.classList.toggle('lx-off', !on); };
      sw.addEventListener('click', () => { set(!get()); sync(); change(after); });
      text.addEventListener('click', () => sw.click());
      sync();
      row.append(text, sw);
      return row;
    }

    function segment(title, options, get, set, after) {
      const wrap = el('div', 'lx-field');
      if (title) { const h = el('div', 'lx-field-h', '<span></span>'); h.firstChild.textContent = title; wrap.appendChild(h); }
      const seg = el('div', 'lx-seg');
      seg.setAttribute('role', 'radiogroup');
      if (title) seg.setAttribute('aria-label', title);
      const paint = () => {
        for (const b of seg.children) {
          const on = b.dataset.v === String(get());
          b.setAttribute('aria-checked', on ? 'true' : 'false');
          b.tabIndex = on ? 0 : -1;
        }
      };
      for (const [v, label] of options) {
        const b = el('button', null);
        b.type = 'button'; b.dataset.v = String(v); b.textContent = label;
        b.setAttribute('role', 'radio');
        b.addEventListener('click', () => { if (String(get()) === String(v)) return; set(v); paint(); change(after); });
        seg.appendChild(b);
      }
      seg.addEventListener('keydown', e => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
        const list = [...seg.children];
        const i = list.indexOf(document.activeElement);
        if (i < 0) return;
        const fwd = e.key === 'ArrowRight' || e.key === 'ArrowDown';
        const n = list[(i + (fwd ? 1 : list.length - 1)) % list.length];
        n.focus(); n.click(); e.preventDefault();
      });
      paint();
      wrap.appendChild(seg);
      wrap.paint = paint;
      return wrap;
    }

    function slider(title, min, max, step, fmt, get, set, after) {
      const wrap = el('div', 'lx-field');
      const head = el('div', 'lx-field-h', '<span></span><span class="lx-val"></span>');
      head.firstChild.textContent = title;
      const val = head.lastChild;
      val.textContent = fmt(get());
      const input = document.createElement('input');
      input.type = 'range'; input.className = 'lx-range';
      input.min = min; input.max = max; input.step = step; input.value = get();
      input.setAttribute('aria-label', title);

      let raf = 0;
      input.addEventListener('input', () => {
        val.textContent = fmt(+input.value);
        if (raf) return;
        raf = requestAnimationFrame(() => { raf = 0; set(+input.value); change(after); });
      });
      wrap.append(head, input);
      return wrap;
    }

    function textInput(title, placeholder, get, set, after, type, wait) {
      const wrap = el('div', 'lx-field');
      const h = el('div', 'lx-field-h', '<span></span>'); h.firstChild.textContent = title;
      const input = document.createElement('input');
      input.type = type || 'text'; input.className = 'lx-text';
      input.placeholder = placeholder; input.value = get() || ''; input.spellcheck = false;
      input.setAttribute('aria-label', title);
      let t = null;
      input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { set(input.value.trim()); change(after); }, wait || 250); });
      wrap.append(h, input);
      return wrap;
    }

    function swatches(title, get, set, after) {
      const wrap = el('div', 'lx-field');
      const h = el('div', 'lx-field-h', '<span></span>'); h.firstChild.textContent = title;
      const strip = el('div', 'lx-swatches');
      const custom = document.createElement('input');
      custom.type = 'color'; custom.className = 'lx-color'; custom.title = 'Свой цвет'; custom.setAttribute('aria-label', 'Свой цвет');
      const paint = () => {
        for (const b of strip.querySelectorAll('.lx-dot')) b.setAttribute('aria-pressed', b.dataset.hex === String(get()).toLowerCase() ? 'true' : 'false');
        custom.value = get();
      };
      for (const [hex, name] of SWATCHES) {
        const b = el('button', 'lx-dot');
        b.type = 'button'; b.dataset.hex = hex; b.title = name; b.setAttribute('aria-label', name);
        b.style.background = hex; b.style.color = hex;
        b.addEventListener('click', () => { set(hex); paint(); change(after); });
        strip.appendChild(b);
      }
      custom.addEventListener('input', () => { set(custom.value); paint(); change(after); });
      strip.appendChild(custom);
      paint();
      wrap.append(h, strip);
      return wrap;
    }

    function actions(title, hint, list) {
      const wrap = el('div', 'lx-field');
      if (title) { const h = el('div', 'lx-field-h', '<span></span>'); h.firstChild.textContent = title; wrap.appendChild(h); }
      if (hint) { const p = el('div', 'lx-hint'); p.textContent = hint; wrap.appendChild(p); }
      const strip = el('div', 'lx-acts');
      for (const [label, icon, fn, cls] of list) {
        const b = el('button', 'lx-act' + (cls ? ' ' + cls : ''), (ICONS[icon] || '') + '<span></span>');
        b.type = 'button'; b.lastChild.textContent = label;
        b.addEventListener('click', fn);
        strip.appendChild(b);
      }
      wrap.appendChild(strip);
      return wrap;
    }

    function section(title, icon) {
      const s = el('div', 'lx-sec');
      const h = el('div', 'lx-sec-h', (ICONS[icon] || '') + '<span></span>');
      h.lastChild.textContent = title;
      s.appendChild(h);
      return s;
    }

    const hint = text => { const p = el('div', 'lx-hint'); p.textContent = text; return p; };
    const inList = (arr, v) => arr.includes(v);
    function toggleIn(arr, v, on) {
      const i = arr.indexOf(v);
      if (on && i !== -1) arr.splice(i, 1);
      if (!on && i === -1) arr.push(v);
    }

    function tileHTML(key) {
      const P = key === 'light' ? LIGHT_PREVIEW : SCALES[key];
      const name = key === 'light' ? 'Светлая' : P.label;
      const h = key === 'light' ? 'Как на сайте' : P.hint;
      return `<span class="lx-tile-pv" style="background:${P.canvas}">` +
        `<i class="lx-tile-card" style="background:${P.surface};border-color:${P.line}"></i>` +
        `<i class="lx-tile-line" style="background:${P.ink}"></i><i class="lx-tile-line2" style="background:${P.muted}"></i>` +
        `<i class="lx-tile-dot" style="background:${P.accent}"></i></span>` +
        `<span class="lx-tile-mark">${ICONS.check}</span>` +
        `<span class="lx-tile-name"></span><span class="lx-tile-hint"></span>`;
    }

    function buildTheme(body) {
      const s = section('тема', 'theme');
      const tiles = el('div', 'lx-tiles');
      tiles.setAttribute('role', 'radiogroup');
      tiles.setAttribute('aria-label', 'Тема');
      const current = () => (isDark() ? S.palette : 'light');
      const paint = () => { for (const t of tiles.children) t.setAttribute('aria-checked', t.dataset.k === current() ? 'true' : 'false'); };
      for (const key of ['light', 'dark', 'amoled']) {
        const t = el('button', 'lx-tile', tileHTML(key));
        t.type = 'button'; t.dataset.k = key; t.setAttribute('role', 'radio');
        const P = key === 'light' ? null : SCALES[key];
        t.querySelector('.lx-tile-name').textContent = key === 'light' ? 'Светлая' : P.label;
        t.querySelector('.lx-tile-hint').textContent = key === 'light' ? 'Как на сайте' : P.hint;
        t.addEventListener('click', () => {
          const notes = [];
          if (key === 'light') {
            if (S.theme === 'auto') notes.push('Режим «как в системе» выключен');
            S.theme = 'light';
          } else {
            S.palette = key;
            if (S.theme === 'auto') {

              if (!(mq && mq.matches)) notes.push('Сейчас по системе светлая; ' + SCALES[key].label + ' включится в тёмное время');
            } else {
              S.theme = 'dark';
            }
          }
          paint();
          change(() => { autoRow.sync(); bgBox.sync(); if (notes.length) toast(notes.join('. ')); });
        });
        tiles.appendChild(t);
      }
      const autoHint = hint('');
      const paintAuto = () => {
        if (S.theme !== 'auto') { autoHint.style.display = 'none'; return; }
        autoHint.style.display = '';
        autoHint.textContent = 'По системе сейчас ' + (mq && mq.matches ? 'тёмная' : 'светлая') + '. Тёмная плитка — палитра для ночи: ' + scale().label + '.';
      };
      paint();
      s.appendChild(tiles);
      s.appendChild(autoHint);

      const autoRow = rowToggle('Как в системе', 'Днём светлая, ночью выбранная тёмная',
        () => S.theme === 'auto',
        v => { S.theme = v ? 'auto' : (isDark() ? 'dark' : 'light'); },
        () => { paint(); paintAuto(); });
      autoRow.sync = () => { const on = S.theme === 'auto'; autoRow.querySelector('.lx-sw').setAttribute('aria-checked', on ? 'true' : 'false'); autoRow.classList.toggle('lx-off', !on); paintAuto(); };
      paintAuto();
      s.appendChild(autoRow);
      s.appendChild(rowToggle('Повышенный контраст', 'Белее текст, заметнее линии',
        () => S.contrast === 'high', v => { S.contrast = v ? 'high' : 'normal'; }));
      body.appendChild(s);

      const sb = section('фон', 'bg');
      const urlBox = el('div'), starsBox = el('div'), blurBox = el('div'), dimBox = el('div');
      const bgBox = { sync() {
        const on = S.bg !== 'none';
        urlBox.style.display = S.bg === 'url' ? '' : 'none';
        starsBox.style.display = S.bg === 'stars' ? '' : 'none';
        blurBox.style.display = on ? '' : 'none';
        dimBox.style.display = on ? '' : 'none';
        bgSeg.paint();
      } };
      const bgSeg = segment(null, [['none', 'Нет'], ['stars', 'Звёзды'], ['url', 'Своя картинка']],
        () => S.bg, v => { S.bg = v; }, () => bgBox.sync());
      sb.appendChild(bgSeg);
      sb.appendChild(hint('Виден только в тёмной теме, между карточками.'));
      urlBox.appendChild(textInput('Ссылка на картинку', 'https://…', () => S.bgUrl, v => { S.bgUrl = v; }, null, 'url'));
      sb.appendChild(urlBox);
      starsBox.appendChild(slider('Сколько звёзд', RANGES.starCount[0], RANGES.starCount[1], 50, v => v + '', () => S.starCount, v => { S.starCount = v; }));
      starsBox.appendChild(slider('Размер', RANGES.starSize[0], RANGES.starSize[1], 0.1, v => (+v).toFixed(1) + '×', () => S.starSize, v => { S.starSize = v; }));
      starsBox.appendChild(slider('Яркость', RANGES.starBright[0], RANGES.starBright[1], 5, v => v + '%', () => S.starBright, v => { S.starBright = v; }));
      starsBox.appendChild(rowToggle('Мерцание', 'Несколько звёзд дышат вразнобой', () => S.starTwinkle, v => { S.starTwinkle = v; }));
      starsBox.appendChild(slider('Период мерцания', RANGES.starSpeed[0], RANGES.starSpeed[1], 0.5, v => v + ' с', () => S.starSpeed, v => { S.starSpeed = v; }));
      sb.appendChild(starsBox);
      blurBox.appendChild(rowToggle('Размытие', 'Фон не в фокусе, текст резкий', () => S.bgBlur, v => { S.bgBlur = v; }));
      blurBox.appendChild(slider('Сила размытия', RANGES.bgBlurPx[0], RANGES.bgBlurPx[1], 1, v => v + ' px', () => S.bgBlurPx, v => { S.bgBlurPx = v; }));
      sb.appendChild(blurBox);
      dimBox.appendChild(slider('Затемнение', RANGES.bgDim[0], RANGES.bgDim[1], 5, v => v + '%', () => S.bgDim, v => { S.bgDim = v; }));
      sb.appendChild(dimBox);
      bgBox.sync();
      body.appendChild(sb);

      const sc = section('карточки', 'cards');
      const colorBox = el('div'), animBox = el('div');
      const syncCards = () => {
        colorBox.style.display = (S.cardGlow || S.cardAnim) ? '' : 'none';
        animBox.style.display = S.cardAnim ? '' : 'none';
      };
      sc.appendChild(rowToggle('Ореол', 'Свет по краю карточки', () => S.cardGlow, v => { S.cardGlow = v; }, syncCards));
      sc.appendChild(rowToggle('Бегущая рамка', 'Блик по периметру', () => S.cardAnim, v => { S.cardAnim = v; }, syncCards));
      colorBox.appendChild(swatches('Цвет', () => S.cardColor, v => { S.cardColor = v; }, () => { if (root) { const a = panelAccent(); root.style.setProperty('--p-acc', a.acc); root.style.setProperty('--p-acc-ink', a.ink); } }));
      colorBox.appendChild(hint('Тот же цвет у полосы загрузки и у акцентов панели.'));
      sc.appendChild(colorBox);
      animBox.appendChild(rowToggle('Синхронно', 'Все карточки в одной фазе', () => S.animSync, v => { S.animSync = v; }));
      animBox.appendChild(slider('Скорость', RANGES.animSpeed[0], RANGES.animSpeed[1], 0.5, v => v + ' с на круг', () => S.animSpeed, v => { S.animSpeed = v; }));
      animBox.appendChild(slider('Длина хвоста', RANGES.animTail[0], RANGES.animTail[1], 2, v => v + '°', () => S.animTail, v => { S.animTail = v; }));
      animBox.appendChild(slider('Толщина', RANGES.animWidth[0], RANGES.animWidth[1], 1, v => v + ' px', () => S.animWidth, v => { S.animWidth = v; }));
      sc.appendChild(animBox);
      syncCards();
      body.appendChild(sc);
    }

    function buildLook(body) {
      const sp = section('профиль', 'user');
      const preview = el('div', 'lx-preview', 'В меню: <b></b>');
      const paintPreview = () => {
        readName();
        const shown = S.nameStyle === 'hide' ? '—' : (displayName(S.nameStyle) || 'появится, когда загрузится меню');
        preview.lastChild.textContent = shown;
      };
      const orderRow = rowToggle('Фамилия в кабинете стоит первой', 'Меняет, где имя, а где фамилия',
        () => (S.nameOrder === 'auto' ? firstIdx === 1 : S.nameOrder === 'last-first'),
        v => { S.nameOrder = v ? 'last-first' : 'first-last'; },
        paintPreview);
      sp.appendChild(segment('Имя в меню',
        [['full', 'Имя Фамилия'], ['short', 'Имя Ф.'], ['initials', 'И.Ф.'], ['hide', 'Пустота']],
        () => S.nameStyle, v => { S.nameStyle = v; }, paintPreview));
      sp.appendChild(preview);
      sp.appendChild(orderRow);
      paintPreview();
      const avaBox = el('div');
      const syncAva = () => { avaBox.style.display = S.avatar === 'url' ? '' : 'none'; };
      sp.appendChild(segment('Аватар', [['default', 'Как есть'], ['url', 'Своя картинка'], ['hide', 'Скрыть']],
        () => S.avatar, v => { S.avatar = v; }, syncAva));
      avaBox.appendChild(textInput('Ссылка на картинку', 'https://…', () => S.avatarUrl, v => { S.avatarUrl = v; }, null, 'url'));
      sp.appendChild(avaBox);
      syncAva();
      body.appendChild(sp);

      const sv = section('показывать', 'eye');
      sv.appendChild(rowToggle('Док Aya AI', 'Плавающая панель справа', () => !S.hideAiDock, v => { S.hideAiDock = !v; }));
      sv.appendChild(rowToggle('Промо Aya в меню', 'Рекламный блок внизу меню', () => !S.hideSidebarPromo, v => { S.hideSidebarPromo = !v; }));
      sv.appendChild(rowToggle('Поиск в шапке', null, () => !S.hideSearch, v => { S.hideSearch = !v; }));
      sv.appendChild(rowToggle('Уведомления', 'Колокольчик в шапке', () => !S.hideBell, v => { S.hideBell = !v; }));
      sv.appendChild(rowToggle('Переключатель языка', null, () => !S.hideLocale, v => { S.hideLocale = !v; }));
      sv.appendChild(rowToggle('Кнопка «Спросить Aya»', 'Внизу экрана на телефоне', () => !S.hideAskBar, v => { S.hideAskBar = !v; }));
      body.appendChild(sv);

      const sm = section('движение и плотность', 'motion');
      sm.appendChild(segment('Появление блоков', [['smooth', 'Плавно'], ['site', 'Как на сайте'], ['off', 'Сразу']],
        () => S.motion, v => { S.motion = v; }));
      sm.appendChild(hint('«Плавно»: только прозрачность, без сдвига. Страница готова с первого кадра.'));
      sm.appendChild(segment('Плотность', [['normal', 'Обычная'], ['compact', 'Компактная']],
        () => S.density, v => { S.density = v; }));
      sm.appendChild(segment('Ширина контента', [['default', 'Как на сайте'], ['wide', 'Во всю ширину']],
        () => S.contentWidth, v => { S.contentWidth = v; }));
      sm.appendChild(rowToggle('Своя полоса загрузки', 'В тёмной теме, цветом акцента', () => S.loader, v => { S.loader = v; }));
      body.appendChild(sm);
    }

    function buildMenu(body) {
      const s = section('боковое меню', 'menu');
      s.appendChild(rowToggle('Недоступные пункты', 'Например, закрытую запись на дисциплины',
        () => !S.hideDisabledNav, v => { S.hideDisabledNav = !v; }));
      s.appendChild(rowToggle('Заголовки групп', 'УЧЁБА, МОЙ ПУТЬ и другие',
        () => !S.hideNavGroups, v => { S.hideNavGroups = !v; }));
      if (navFound.length) {
        let lastGroup = null;
        for (const n of navFound) {
          if (n.group !== lastGroup) {
            lastGroup = n.group;
            const gh = el('div', 'lx-group-h'); gh.textContent = n.group || 'без группы';
            s.appendChild(gh);
          }
          s.appendChild(rowToggle(n.label, n.disabled ? 'Недоступен в кабинете' : null,
            () => !inList(S.hiddenNav, n.path), v => toggleIn(S.hiddenNav, n.path, v)));
        }
      } else {
        s.appendChild(el('div', 'lx-empty', 'Пункты меню ещё не загрузились. Закройте панель и откройте снова.'));
      }
      body.appendChild(s);

      const sh = section('блоки главной', 'home');
      if (blockFound.length) {
        for (const b of blockFound) {
          sh.appendChild(rowToggle(b.label, null, () => !inList(S.hiddenBlocks, b.key), v => toggleIn(S.hiddenBlocks, b.key, v)));
        }
      } else if (S.hiddenBlocks.length) {
        for (const k of S.hiddenBlocks) {
          sh.appendChild(rowToggle(BLOCK_NAMES[k] || k, 'Скрыт на главной', () => !inList(S.hiddenBlocks, k), v => toggleIn(S.hiddenBlocks, k, v)));
        }
        sh.appendChild(hint('Остальные блоки появятся здесь, когда откроете главную.'));
      } else {
        sh.appendChild(el('div', 'lx-empty', 'Откройте <b>Главную</b> — здесь появится переключатель для каждого её блока.'));
      }
      body.appendChild(sh);
    }

    function buildSched(body) {
      const s = section('расписание', 'schedule');
      s.appendChild(rowToggle('Подпись «Занятие прошло»', 'Повторяется в каждой ячейке',
        () => !S.schedHidePastMark, v => { S.schedHidePastMark = !v; }));
      s.appendChild(rowToggle('Преподаватель и поток', 'Останутся предмет, тип и аудитория',
        () => !S.schedHidePeople, v => { S.schedHidePeople = !v; }));
      s.appendChild(rowToggle('Приглушать прошедшие пары', 'Проявляются при наведении',
        () => S.schedDimPast, v => { S.schedDimPast = v; }));
      body.appendChild(s);

      const sr = section('аудитория', 'room');
      const box = el('div');
      const syncBox = () => { box.style.display = S.roomRename ? '' : 'none'; applyRoomRename(); };
      sr.appendChild(rowToggle('Переименовать аудиторию', 'Своё название вместо кода в сетке и на главной',
        () => S.roomRename, v => { S.roomRename = v; }, syncBox));
      box.appendChild(textInput('Что заменить', 'ATRIUM', () => S.roomFrom, v => { S.roomFrom = v; }, applyRoomRename, 'text', 700));
      box.appendChild(textInput('На что', 'ALEM.AI Амфитеатр', () => S.roomTo, v => { S.roomTo = v; }, applyRoomRename, 'text', 700));
      sr.appendChild(box);
      box.style.display = S.roomRename ? '' : 'none';
      body.appendChild(sr);

      const se = section('поделиться', 'image');
      se.appendChild(actions(null, 'Берёт неделю, открытую на странице расписания. Те же кнопки есть над сеткой.',
        [['JSON', 'code', exportJSON], ['Картинка', 'image', exportJPG], ['Скопировать текстом', 'copy', copyText]]));
      body.appendChild(se);
    }

    function buildMore(body) {
      const s = section('запуск', 'key');
      s.appendChild(rowToggle('Пункт «Настройки вида» в меню', 'Без него остаются кнопка в углу и Alt+Q',
        () => S.showLauncher, v => { S.showLauncher = v; }, mountLauncher));
      const kv = el('div', 'lx-kv');
      kv.innerHTML = '<div><span class="lx-kbd">Alt</span>+<span class="lx-kbd">Q</span><span>открыть или закрыть панель</span></div>' +
                     '<div><span class="lx-kbd">Esc</span><span>закрыть</span></div>';
      s.appendChild(kv);
      body.appendChild(s);

      const sc = section('настройки текстом', 'code');
      const pasteBox = el('div');
      pasteBox.style.display = 'none';
      const ta = document.createElement('textarea');
      ta.className = 'lx-text lx-ta'; ta.rows = 5; ta.spellcheck = false;
      ta.placeholder = 'Вставьте настройки и нажмите «Применить»';
      ta.setAttribute('aria-label', 'Настройки текстом');
      pasteBox.appendChild(ta);
      pasteBox.appendChild(actions(null, null, [['Применить', 'check', () => applyConfig(ta.value)]]));
      sc.appendChild(actions(null, 'Скопируйте и отправьте: у другого человека применится всё целиком.', [
        ['Скопировать', 'copy', () => copyToClipboard(configText(), 'Настройки скопированы')],
        ['Вставить', 'paste', () => {
          const manual = () => { pasteBox.style.display = ''; ta.focus(); };
          if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(t => { if (!applyConfig(t)) manual(); }, manual);
          } else manual();
        }]
      ]));
      sc.appendChild(pasteBox);
      body.appendChild(sc);

      const sa = section('о скрипте', 'info');
      const about = el('div', 'lx-about');
      about.innerHTML = '<div>originally created by <b>miras yessenaly</b> with love</div>' +
        '<div><a href="https://wateroff.dev/qairu-campus-extension" target="_blank" rel="noopener noreferrer">wateroff.dev/qairu-campus-extension</a></div>' +
        '<div class="lx-mono" style="padding-top:8px">lunatica ' + VERSION + ' \u00b7 ' + Host.mode + ' \u00b7 ' + KEY + '</div>' +
        '<div class="lx-mono" style="padding-top:2px">\u0448\u0440\u0438\u0444\u0442 Geist Mono \u00b7 Vercel \u00b7 SIL OFL 1.1</div>';
      sa.appendChild(about);
      body.appendChild(sa);
    }

    const BUILDERS = { theme: buildTheme, look: buildLook, menu: buildMenu, sched: buildSched, more: buildMore };

    function renderTab(key, keepScroll) {
      const top = keepScroll && body ? body.scrollTop : 0;
      body.innerHTML = '';
      (BUILDERS[key] || buildTheme)(body);
      for (const t of root.querySelectorAll('.lx-tab')) t.setAttribute('aria-selected', t.dataset.k === key ? 'true' : 'false');
      body.scrollTop = top;
    }

    function build() {
      backdrop = el('div');
      backdrop.id = 'lx-backdrop';
      backdrop.setAttribute('data-' + NS, '');

      root = el('div');
      root.id = 'lx-panel';
      root.setAttribute('data-' + NS, '');
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-label', 'Настройки вида');
      { const a = panelAccent(); root.style.setProperty('--p-acc', a.acc); root.style.setProperty('--p-acc-ink', a.ink); }

      const head = el('div', 'lx-head',
        '<div class="lx-head-text"><span class="lx-mark">lunatica</span>' +
        '<span class="lx-title">настройки вида</span></div>' +
        '<span class="lx-ver">' + VERSION + '</span>');
      const x = el('button', 'lx-x', ICONS.close);
      x.type = 'button'; x.title = 'Закрыть'; x.setAttribute('aria-label', 'Закрыть');
      x.addEventListener('click', close);
      head.appendChild(x);

      const tabs = el('div', 'lx-tabs');
      tabs.setAttribute('role', 'tablist');
      for (const [k, label, icon] of TABS) {
        const b = el('button', 'lx-tab', ICONS[icon] + '<span></span>');
        b.type = 'button'; b.dataset.k = k; b.setAttribute('role', 'tab');
        b.setAttribute('aria-label', label);
        b.lastChild.textContent = label;
        b.addEventListener('click', () => { S.panelTab = k; save(); renderTab(k); });
        tabs.appendChild(b);
      }

      tabs.addEventListener('keydown', e => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        const list = [...tabs.children];
        const i = list.indexOf(document.activeElement);
        if (i < 0) return;
        const n = list[(i + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length];
        n.focus(); n.click(); e.preventDefault();
      });

      body = el('div', 'lx-body');

      const foot = el('div', 'lx-foot');
      const fh = el('div', 'lx-foot-hint', '<span class="lx-kbd">Alt+Q</span><span>·</span><span class="lx-kbd">Esc</span>');
      savedEl = el('span', 'lx-saved', 'сохранено');
      fh.appendChild(savedEl);
      foot.appendChild(fh);

      const resetWrap = el('div');
      const resetBtn = el('button', 'lx-act', ICONS.reset + '<span>Сбросить</span>');
      resetBtn.type = 'button';
      let confirmTimer = null;
      const cancelConfirm = (focusBack) => {
        clearTimeout(confirmTimer);
        if (!resetWrap.querySelector('.lx-confirm')) return false;
        resetWrap.innerHTML = '';
        resetWrap.appendChild(resetBtn);
        if (focusBack) resetBtn.focus();
        return true;
      };
      const showConfirm = () => {
        resetWrap.innerHTML = '';
        const c = el('div', 'lx-confirm');
        const yes = el('button', 'lx-act lx-danger', ICONS.reset + '<span>Да, сбросить всё</span>');
        const no = el('button', 'lx-act', '<span>Отмена</span>');
        yes.type = no.type = 'button';
        yes.addEventListener('click', () => {
          const prev = JSON.stringify(S);
          S = normalize(null);
          S.panelTab = 'theme';
          save(); applyAll();
          cancelConfirm(false);
          rebuild();
          toast('Настройки сброшены', { label: 'Отменить', fn: () => { applyConfig(prev); } });
        });
        no.addEventListener('click', () => cancelConfirm(true));
        c.append(no, yes);
        resetWrap.appendChild(c);
        no.focus();
        clearTimeout(confirmTimer);
        confirmTimer = setTimeout(() => cancelConfirm(false), 8000);
      };
      resetBtn.addEventListener('click', showConfirm);
      resetWrap.appendChild(resetBtn);
      foot.appendChild(resetWrap);
      root._cancelConfirm = cancelConfirm;

      root.append(head, tabs, body, foot);
      document.body.append(backdrop, root);

      root.addEventListener('keydown', e => {
        if (e.key !== 'Tab') return;
        const f = [...root.querySelectorAll('button,input,textarea,a[href],[tabindex]:not([tabindex="-1"])'),
                   ...document.querySelectorAll('#lx-toast.lx-on .lx-toast-act')].filter(n => n.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      });
      renderTab(ENUMS.panelTab.includes(S.panelTab) ? S.panelTab : 'theme');
    }

    function open() {
      if (root) return;
      tagNav(); tagBlocks(); readName();
      lastFocus = document.activeElement;
      build();
      requestAnimationFrame(() => {
        if (!root) return;
        backdrop.classList.add('lx-on');
        root.classList.add('lx-on');
        const first = root.querySelector('.lx-tab[aria-selected="true"]');
        if (first) first.focus({ preventScroll: true });
        setTimeout(() => { if (backdrop) backdrop.addEventListener('click', close); }, 80);
      });
    }

    function close() {
      if (!root) return;
      if (root._cancelConfirm && root._cancelConfirm(true)) return;
      const r = root, b = backdrop;
      root = null; backdrop = null; body = null; savedEl = null;
      r.classList.remove('lx-on'); b.classList.remove('lx-on');
      setTimeout(() => { r.remove(); b.remove(); }, 240);
      if (lastFocus && lastFocus.focus && lastFocus.isConnected) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {  } }
      lastFocus = null;
    }

    function toggle() { root ? close() : open(); }

    function rebuild() {
      if (!root) return;
      { const a = panelAccent(); root.style.setProperty('--p-acc', a.acc); root.style.setProperty('--p-acc-ink', a.ink); }
      renderTab(S.panelTab, true);
    }

    return { open, close, toggle, rebuild, get isOpen() { return !!root; } };
  })();

  let loadedAt = 0;
  function hydrated(el) {
    if (!el) return false;
    for (const k in el) if (k.startsWith('__reactFiber')) return true;
    return loadedAt > 0 && Date.now() - loadedAt > 3000;
  }

  function mountLauncher() {
    const old = document.getElementById('lx-launch');
    const float = document.getElementById('lx-float');
    const spacer = S.showLauncher ? document.querySelector('.adm-sidebar__spacer') : null;
    if (!S.showLauncher && old) old.remove();
    if (spacer && spacer.parentElement && hydrated(spacer.parentElement)) {
      if (!(old && old.parentElement === spacer.parentElement && old.previousElementSibling === spacer)) {
        if (old) old.remove();
        const b = el('button', null, ICONS.gear + '<span>Настройки вида</span>');
        b.id = 'lx-launch';
        b.type = 'button';
        b.title = 'Настройки вида (Alt+Q)';
        b.setAttribute('data-' + NS, '');
        b.addEventListener('click', Panel.toggle);
        spacer.parentElement.insertBefore(b, spacer.nextSibling);
      }
      if (float) float.style.display = 'none';
      return;
    }
    if (spacer && spacer.parentElement) return;

    let f = float;
    if (!f) {
      f = el('button', null, ICONS.gear);
      f.id = 'lx-float';
      f.type = 'button';
      f.title = 'Настройки вида';
      f.setAttribute('aria-label', 'Настройки вида');
      f.setAttribute('data-' + NS, '');
      f.addEventListener('click', Panel.toggle);
      document.body.appendChild(f);
    }
    f.style.display = 'flex';
  }

  function mountShareBar() {
    const host = document.querySelector('.cmp-sched-head');
    const bar = document.getElementById('lx-share');
    if (!host || !document.querySelector('.cmp-grid, .cmp-daylist')) { if (bar) bar.remove(); return; }
    if (bar && bar.parentNode === host) return;
    if (!hydrated(host)) return;
    if (bar) bar.remove();
    const b = el('div', 'lx-share');
    b.id = 'lx-share';
    b.setAttribute('data-' + NS, '');
    for (const [label, icon, fn, title] of [
      ['JSON', 'code', exportJSON, 'Машиночитаемый файл расписания'],
      ['Картинка', 'image', exportJPG, 'Сохранить расписание картинкой'],
      ['Скопировать', 'copy', copyText, 'Расписание текстом в буфер обмена']
    ]) {
      const btn = el('button', 'lx-share__btn', (ICONS[icon] || '') + '<span></span>');
      btn.type = 'button'; btn.title = title; btn.lastChild.textContent = label;
      btn.addEventListener('click', fn);
      b.appendChild(btn);
    }
    host.appendChild(b);
  }

  const FONT_CSS = [
    "@font-face{font-family:'Lunatica Mono';font-style:normal;font-weight:500 700;font-display:block;"
      + "src:url(data:font/woff2;base64,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) format('woff2');"
      + "unicode-range:U+0000-00FF,U+2013-2014,U+2026,U+2192,U+00D7}",
    "@font-face{font-family:'Lunatica Mono';font-style:normal;font-weight:500 700;font-display:block;"
      + "src:url(data:font/woff2;base64,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) format('woff2');"
      + "unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}",
    "@font-face{font-family:'Lunatica Mono';font-style:normal;font-weight:500 700;font-display:block;"
      + "src:url(data:font/woff2;base64,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) format('woff2');"
      + "unicode-range:U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F}"
  ].join('');

  let wantTheme = null;
  let attrGuard = null;

  function syncAttrs() {
    const root = document.documentElement;
    const cur = root.getAttribute('data-theme');
    if (wantTheme === null) { if (cur === 'dark') root.removeAttribute('data-theme'); }
    else if (cur !== wantTheme) root.setAttribute('data-theme', wantTheme);
  }

  function startAttrGuard() {
    if (attrGuard || !window.MutationObserver) return;
    attrGuard = new MutationObserver(syncAttrs);
    attrGuard.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  let wasDark = null;

  function applyTheme() {
    const dark = isDark();
    wantTheme = dark ? 'dark' : null;
    paintCanvasNow();
    syncAttrs();
    startAttrGuard();
    Host.set('theme', themeCSS());
    Host.set('effects', effectsCSS());
    Host.set('bg', bgCSS());
    Host.set('loader', loaderCSS());
    if (dark) {
      Host.set('patch', patchCSS);

      if (wasDark !== true) { patchSheets(true); patchInline(); }
    } else {
      Host.set('patch', '');
      unpatchInline();
    }
    wasDark = dark;
    ensureBg();
  }

  function applyAll() {
    Host.set('font', FONT_CSS);
    applyTheme();
    Host.set('prefs', prefsCSS());
    Host.set('ui', uiCSS());
    startObserver();
  }

  let tick = null;
  let nameSig = '';
  let observer = null;
  let observed = '';

  function runTick() {
    tick = null;
    Host.check();
    syncAttrs();

    if (inlineList.length > 200) {
      let j = 0;
      for (let i = 0; i < inlineList.length; i++) if (inlineList[i].isConnected) inlineList[j++] = inlineList[i];
      inlineList.length = j;
    }
    readName();
    const sig = fullName + '|' + firstIdx;
    if (sig !== nameSig) { nameSig = sig; Host.set('prefs', prefsCSS()); }
    ensureBg();
    patchSheets();
    tagNav();
    tagBlocks();
    applyRoomRename();
    mountLauncher();
    mountShareBar();
  }

  function scheduleTick() {
    if (tick) return;
    tick = setTimeout(runTick, 150);
  }

  function onMutations(records) {
    const dark = isDark();
    let need = false;
    for (const r of records) {

      if (isOurs(r.target)) continue;
      if (r.type === 'attributes') {
        if (dark) patchInlineEl(r.target);
        continue;
      }
      if (r.type === 'characterData') {

        if (S.roomRename && r.target.parentElement && r.target.parentElement.closest('.qui-meet,.cmp-daylist__row,.cmp-next__row')) need = true;
        continue;
      }
      for (const n of r.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.hasAttribute('data-' + NS)) continue;
        if (n.tagName === 'LINK' && /stylesheet/i.test(n.rel || '')) n.addEventListener('load', () => patchSheets(true), { once: true });
        if (n.tagName === 'STYLE') need = true;
        if (dark) patchInline(n);
        need = true;
      }
      if (!need) for (const n of r.removedNodes) {
        if (n.nodeType !== 1) continue;

        if (n.hasAttribute('data-' + NS)) { if (/^lx-(bg|launch|share)$/.test(n.id)) need = true; continue; }
        need = true; break;
      }
    }
    if (need) scheduleTick();
  }

  function startObserver() {
    if (!window.MutationObserver || !document.documentElement) return;
    const sig = S.roomRename ? 'cd' : '';
    if (observer && observed === sig) return;
    if (!observer) observer = new MutationObserver(onMutations);
    observed = sig;
    observer.observe(document.documentElement, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['style'],
      characterData: !!S.roomRename
    });
  }

  applyAll();
  startObserver();

  document.addEventListener('load', e => {
    const t = e.target;
    if (t && t.tagName === 'LINK' && /stylesheet/i.test(t.rel || '')) { patchSheets(true); patchInline(); }
  }, true);

  document.addEventListener('readystatechange', () => { patchSheets(true); patchInline(); });

  if (mq && mq.addEventListener) {
    mq.addEventListener('change', () => { if (S.theme === 'auto') { applyAll(); Panel.rebuild(); } });
  }

  function boot() {
    applyAll();
    ensureBg();
    tagNav();
    tagBlocks();
    readName();
    nameSig = fullName + '|' + firstIdx;
    Host.set('prefs', prefsCSS());
    applyRoomRename();
    mountLauncher();
    mountShareBar();
    patchSheets(true);
    patchInline();
    startObserver();
    window.addEventListener('load', () => {
      loadedAt = Date.now();
      patchSheets(true); patchInline(); scheduleTick();

      setTimeout(scheduleTick, 3300);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  document.addEventListener('keydown', e => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q')) {
      e.preventDefault();
      Panel.toggle();
    } else if (e.key === 'Escape' && Panel.isOpen) {
      e.stopPropagation();
      Panel.close();
    }
  }, true);

  try {
    if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand('Настройки вида (Alt+Q)', Panel.toggle);
  } catch (e) {  }

})();
