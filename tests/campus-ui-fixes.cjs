const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const pager=`<div class="qui-pager__size"><button data-slot="select-trigger">6</button><div><label><select><option value="6">6</option><option value="12">12</option><option value="24">24</option><option value="48">48</option></select></label></div></div>`;
function start(path='/ru/courses',html=pager){
 const dom=new JSDOM(`<main>${html}</main>`,{url:'https://campus.qairu.edu.kz'+path,runScripts:'outside-only'});
 const w=dom.window;w.eval(fs.readFileSync('extension/course-page-size.js','utf8'));return dom;
}
test('course list defaults to 12, dispatches change, and permits manual selection for this visit',async()=>{
 const dom=start(),w=dom.window,s=w.document.querySelector('select');let changes=0;s.addEventListener('change',()=>changes++);
 await wait(350);assert.equal(s.value,'12');assert.equal(changes,1);
 s.value='24';s.dispatchEvent(new w.Event('change',{bubbles:true}));w.document.querySelector('main').append(w.document.createElement('span'));
 await wait(350);assert.equal(s.value,'24');assert.equal(changes,2);dom.window.close();
});
test('late and remounted course pagers receive 12 without touching other routes or selectors',async()=>{
 const dom=start('/en/courses','<select id="other"><option>6</option><option>12</option></select>'),w=dom.window;
 await wait(200);w.document.querySelector('main').insertAdjacentHTML('beforeend',pager);await wait(350);
 assert.equal(w.document.querySelector('.qui-pager__size select').value,'12');assert.equal(w.document.querySelector('#other').value,'6');
 w.document.querySelector('.qui-pager__size').remove();w.document.querySelector('main').insertAdjacentHTML('beforeend',pager);await wait(350);
 assert.equal(w.document.querySelector('.qui-pager__size select').value,'12');dom.window.close();
 for(const path of ['/ru/grades','/ru/courses/abc','/kk/catalog']){const d=start(path);await wait(250);assert.equal(d.window.document.querySelector('select').value,'6');d.window.close();}
});
function luminance(rgb){const c=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{const v=x/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('campus announcement tokens and dark call-to-action retain readable contrast in every palette',()=>{
 const dom=new JSDOM(`<style>:root{--cmp-navy:#0a1535}.qan{--qan-navy:#0a1535;--qan-navy-bg:#eef3ff;--qan-red:#d84c3f;--qan-red-soft:#fcebe9;--qan-course-bg:#eaf5fe;--qan-course-ink:#0a6fc2;background:var(--surface)}.qan-board__title{color:var(--qan-navy)}.qan-badge[data-kind=pinned]{color:var(--qan-navy);background:var(--qan-navy-bg)}.qan-badge[data-kind=important]{color:var(--qan-red);background:var(--qan-red-soft)}.qan-badge[data-kind=course]{color:var(--qan-course-ink);background:var(--qan-course-bg)}.button--dark{--button-bg:var(--cmp-navy);--button-fg:#fff;background:var(--button-bg);color:var(--button-fg)}</style><section class="qan" data-cab="campus"><h2 class="qan-board__title">Объявления</h2><span class="qan-badge" data-kind="pinned">Закреплено</span><span class="qan-badge" data-kind="important">Важное</span><span class="qan-badge" data-kind="course">Курс</span></section><a class="button button--primary button--dark">Посмотреть возможности</a>`,{runScripts:'outside-only'}),w=dom.window;
 w.eval(fs.readFileSync('extension/lunatica-theme.js','utf8'));const style=w.document.createElement('style');w.document.head.append(style);
 for(const palette of ['graphite','warm','midnight']){
  style.textContent=w.CampusSpaceTheme.css(palette);
  for(const e of w.document.querySelectorAll('h2,.qan-badge,.button--dark')){const c=w.getComputedStyle(e),bg=e.tagName==='H2'?w.getComputedStyle(e.parentElement).backgroundColor:c.backgroundColor;assert.ok(contrast(c.color,bg)>=4.5,`${palette} ${e.className}: ${c.color} on ${bg}`);}
 }
 style.remove();assert.equal(w.getComputedStyle(w.document.querySelector('h2')).color,'rgb(10, 21, 53)');dom.window.close();
});
