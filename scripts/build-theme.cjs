// Reproducible extraction from Lunatica (MIT, wateroff).
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),src=fs.readFileSync(path.join(root,'lunatica.user.js'),'utf8');
function part(start,end){const a=src.indexOf(start),b=src.indexOf(end,a);if(a<0||b<a)throw Error('Upstream markers changed');return src.slice(a,b)}
const constants=part('  const INVERSE_ACCENT =','  const mq =');
const theme=part('  function themeCSS()','  function effectsCSS()');
const colors=part('  const COLOR_RE =','  const patchedSheets =');
const adapter=`
  function css(palette='graphite') {
    const P={...SCALES.dark};
    if(palette==='warm')Object.assign(P,{canvas:'#211e1a',canvasAlt:'#26221d',soft:'#29251f',surface:'#302b24',sunk:'#39332a',line:'#51483c',lineSoft:'#41392f',field:'#26221d',ink:'#e3dbcc',ink2:'#e3dbcc',muted:'#bdb3a2',faint:'#b0a593'});
    if(palette==='midnight')Object.assign(P,{...SCALES.amoled,canvas:'#0c0e12',soft:'#11151b',surface:'#171c24',ink:'#d5d9df'});
    const S={contrast:'normal'},isDark=()=>true,bgActive=()=>false,scale=()=>P;
    ${theme}
    return themeCSS();
  }
  return {css,mapDecl};
`;
fs.writeFileSync(path.join(root,'extension/lunatica-theme.js'),'/* Generated from Lunatica by wateroff; MIT. See LICENSE and scripts/build-theme.cjs. */\nglobalThis.CampusSpaceTheme=(()=>{\n'+constants+colors+adapter+'})();\n');
