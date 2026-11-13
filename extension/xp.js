/* Existing QAIRU experience levels; this extension never awards XP. */
globalThis.CampusXP=(()=>{
 'use strict';
 const levels=[[0,'Hello World'],[400,'Стажёр'],[1200,'Junior'],[2400,'Junior+'],[4000,'Middle'],[6000,'Middle+'],[8400,'Senior'],[11200,'Lead'],[14400,'Архитектор'],[18000,'CTO']];
 const validXP=x=>Number.isSafeInteger(x)&&x>=0&&x<=1000000;
 function tier(xp){if(!validXP(xp))throw Error('Некорректное значение XP.');let i=levels.length-1;while(xp<levels[i][0])i--;return {level:i,min:levels[i][0],name:levels[i][1]}}
 function alias(value){const s=typeof value==='string'?value.trim().normalize('NFC'):'';if(!/^[\p{L}\p{N}][\p{L}\p{N} _-]{2,23}$/u.test(s))throw Error('Псевдоним: 3–24 буквы, цифры, пробелы, дефис или подчёркивание.');return s}
 function parseDocument(doc){
  const meters=doc.querySelectorAll('meter.qui-levelscale[aria-valuenow]');
  if(doc.querySelector('input[type="password"]')||meters.length!==1)throw Error('Не удалось прочитать ваш XP. Откройте «Моя траектория» и войдите в кампус.');
  const raw=meters[0].getAttribute('aria-valuenow');if(!/^(0|[1-9]\d*)$/.test(raw)||!validXP(Number(raw)))throw Error('Кампус вернул непонятное значение XP. Повторите позже.');
  return {xp:Number(raw)};
 }
 return {tier,alias,validXP,parseDocument};
})();
