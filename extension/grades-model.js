/* Private comparison contract, shared by extension and service. No student identity. */
globalThis.CampusGrades = (() => {
 'use strict';
 const fail=()=>{throw Error('Некорректный или неполный снимок оценок.');};
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
 function number(value){
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  if(typeof value!=='string'||!/^\d+(?:[.,]\d+)?$/.test(value.trim()))return null;
  return Number(value.trim().replace(',','.'));
 }
 function fields(obj,keys){if(!obj||Array.isArray(obj)||typeof obj!=='object'||Object.keys(obj).some(k=>!keys.includes(k)))fail();}
 function period(value){const m=typeof value==='string'&&/^(20\d{2})-(20\d{2})~([1-3])$/.exec(value);if(!m||+m[2]!==+m[1]+1)fail();return value;}
 function validateSnapshot(input){
  fields(input,['period','complete','metrics']);period(input.period);
  if(input.complete!==true||!Array.isArray(input.metrics)||input.metrics.length<1||input.metrics.length>300)fail();
  const seen=new Set();
  const metrics=input.metrics.map(m=>{
   fields(m,['kind','course','work','value','max','status']);
   if(!['course','quiz','assignment','gpa'].includes(m.kind)||!['current','closed'].includes(m.status))fail();
   if(typeof m.value!=='number'||typeof m.max!=='number'||!Number.isFinite(m.value)||!Number.isFinite(m.max)||m.value<0||m.max<=0||m.max>10000||m.value>m.max)fail();
   if(m.kind==='gpa') {if(m.course!==''||m.work!==''||m.max!==4||m.status!=='closed')fail();}
   else if(typeof m.course!=='string'||!/^[A-Z][A-Z0-9 ]{1,23}$/.test(m.course))fail();
   if(['quiz','assignment'].includes(m.kind)){if(typeof m.work!=='string'||!uuid.test(m.work))fail();}
   else if(m.work!=='')fail();
   const key=m.kind==='gpa'?'gpa:period:4':m.kind==='course'?`course:${m.course}:${m.status}`:`${m.kind}:${m.course}:${m.work}:${m.status}`;
   if(seen.has(key))fail();seen.add(key);
   return {...m,key,score:m.kind==='gpa'?m.value:Number((100*m.value/m.max).toFixed(8))};
  }).sort((a,b)=>a.key.localeCompare(b.key));
  return {period:input.period,complete:true,metrics};
 }
 function wire(snapshot){return {period:snapshot.period,complete:true,metrics:snapshot.metrics.map(({kind,course,work,value,max,status})=>({kind,course,work,value,max,status}))};}
 function range(n,h,e){
  if(![n,h,e].every(Number.isSafeInteger)||n<1||h<0||e<1||h+e>n)fail();
  if(n<20)return null;
  return {percent:[Math.floor(10*h/n)*10,Math.ceil(10*(h+e)/n)*10],places:[20*Math.floor(h/20)+1,20*Math.ceil((h+e)/20)],participants:[20*Math.floor(n/20),20*Math.floor(n/20)+19],tied:e>1};
 }
 return {number,period,validateSnapshot,wire,range,consentVersion:'grades-2026-11-v1'};
})();
