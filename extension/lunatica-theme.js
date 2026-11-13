/* Generated from Lunatica by wateroff; MIT. See LICENSE and scripts/build-theme.cjs. */
globalThis.CampusSpaceTheme=(()=>{
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


  function css(palette='graphite') {
    const P={...SCALES.dark};
    if(palette==='warm')Object.assign(P,{canvas:'#211e1a',canvasAlt:'#26221d',soft:'#29251f',surface:'#302b24',sunk:'#39332a',line:'#51483c',lineSoft:'#41392f',field:'#26221d',ink:'#e3dbcc',ink2:'#e3dbcc',muted:'#bdb3a2',faint:'#b0a593'});
    if(palette==='midnight')Object.assign(P,{...SCALES.amoled,canvas:'#0c0e12',soft:'#11151b',surface:'#171c24',ink:'#d5d9df'});
    const S={contrast:'normal'},isDark=()=>true,bgActive=()=>false,scale=()=>P;
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


    return themeCSS()+'html:root{--cmp-ink-700:'+P.ink2+';}';
  }
  return {css,mapDecl};
})();
