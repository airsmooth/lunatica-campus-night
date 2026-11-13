(() => {
  'use strict';
  const {key,normalize,isDark}=CampusNight,media=matchMedia('(prefers-color-scheme: dark)');
  let settings,revision=0,timer,style,patch,observer,serial=0;
  const marked=new Set();
  function owned(node){return node===style||node===patch||node?.parentNode===style||node?.parentNode===patch;}
  function sheet(id){const el=document.createElement('style');el.id=id;el.dataset.qairuOwned='true';(document.head||document.documentElement).append(el);return el;}
  function patchPage(){
    clearTimeout(timer);timer=null;
    if(!settings||!isDark(settings,media.matches)||!document.documentElement)return;
    if(!patch?.isConnected)patch=sheet('qairu-space-colors');
    const rules=[];let count=0;
    function walk(list,conditions=[]){
      for(const rule of list){
        if(++count>12000)return;
        if(rule.selectorText&&rule.style&&!/thumb|indicator|checkmark|__control|cell-indicator/i.test(rule.selectorText)){
          const out=[];CampusSpaceTheme.mapDecl(rule.style,(p,v)=>out.push(p+':'+v+'!important'));
          if(out.length){let css=rule.selectorText+'{'+out.join(';')+'}';for(const condition of [...conditions].reverse())css=condition+'{'+css+'}';rules.push(css);}
        }else if(rule.cssRules){
          const prelude=rule.cssText.slice(0,rule.cssText.indexOf('{')).trim();
          if(/^@(media|supports|container|layer)\b/.test(prelude))walk(rule.cssRules,[...conditions,prelude]);
        }
      }
    }
    for(const sh of [...document.styleSheets,...(document.adoptedStyleSheets||[])]){
      if(sh===style?.sheet||sh===patch.sheet||owned(sh.ownerNode))continue;
      try{walk(sh.cssRules)}catch{/* Campus tokens also cover inaccessible styles. */}
    }
    for(const el of [...marked])if(!el.isConnected)marked.delete(el);
    for(const el of document.querySelectorAll('[style]')){
      if(owned(el)||el.closest('#campus-night-panel')||/thumb|indicator|checkmark/i.test(String(el.className)))continue;
      const out=[];CampusSpaceTheme.mapDecl(el.style,(p,v)=>out.push(p+':'+v+'!important'));
      if(out.length){if(!marked.has(el)){el.setAttribute('data-qairu-color',String(++serial));marked.add(el)}rules.push('[data-qairu-color="'+el.getAttribute('data-qairu-color')+'"]{'+out.join(';')+'}');}
    }
    const css=rules.join('\n');if(patch.textContent!==css)patch.textContent=css;
  }
  function schedule(){if(!timer)timer=setTimeout(patchPage,150);}
  function apply(){
    const root=document.documentElement;if(!root||!settings)return;
    const dark=isDark(settings,media.matches);
    root.dataset.cnDark=String(dark);root.dataset.cnScale=String(window.top===window?settings.scale:100);
    root.toggleAttribute('data-cn-motion',settings.reduceMotion);root.toggleAttribute('data-cn-wide',settings.wide);root.toggleAttribute('data-cn-hide-ai',settings.hideAI);
    if(dark){
      if(!style?.isConnected)style=sheet('qairu-space-theme');
      const css=CampusSpaceTheme.css(settings.palette);if(style.textContent!==css)style.textContent=css;
      schedule();
      if(!observer){observer=new MutationObserver(records=>{if(records.some(r=>!owned(r.target)))schedule()});observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['style']});}
    }else{
      observer?.disconnect();observer=null;clearTimeout(timer);timer=null;style?.remove();patch?.remove();
      for(const el of marked)el.removeAttribute('data-qairu-color');marked.clear();
    }
  }
  browser.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes[key]){revision++;settings=normalize(changes[key].newValue);apply()}});
  const initial=revision;
  browser.storage.local.get(key).then(result=>{if(initial===revision)settings=normalize(result[key]);apply()}).catch(()=>{});
  media.addEventListener('change',apply);document.addEventListener('DOMContentLoaded',apply,{once:true});
  document.addEventListener('load',e=>{if(e.target?.tagName==='LINK')schedule()},true);
})();
