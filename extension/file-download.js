(() => {
  'use strict';
  function save(text,name,type){
    const url=URL.createObjectURL(new Blob([text],{type})),link=document.createElement('a');
    link.href=url;link.download=name;link.hidden=true;(document.body||document.documentElement).append(link);
    try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  }
  globalThis.CampusFiles={save};
})();
