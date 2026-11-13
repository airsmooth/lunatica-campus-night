/* Reads only ordinary campus DOM. Unknown work identities are deliberately excluded. */
globalThis.CampusGradesSource=(()=>{
 'use strict';
 const G=globalThis.CampusGrades;
 const text=n=>(n?.textContent||'').replace(/\s+/g,' ').trim();
 const fail=message=>{throw Error(message||'Не удалось прочитать полный список оценок. Откройте «Оценки», выберите один период и все курсы.');};
 function grade(raw){
  const match=/^(\d+(?:[.,]\d+)?)\s*(?:\/\s*(\d+(?:[.,]\d+)?)|%)$/.exec(raw);
  if(!match)fail();return {value:G.number(match[1]),max:match[2]?G.number(match[2]):100};
 }
 function identity(doc){
  if(doc.querySelector('input[type="password"]'))fail('Войдите в кампус.');
  const found=[...doc.querySelectorAll('dt')].filter(n=>text(n)==='Корпоративная почта');
  const email=found.length===1?text(found[0].nextElementSibling).toLowerCase():'';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)fail('Не удалось подтвердить аккаунт кампуса.');
  return email;
 }
 function parse(doc){
  if(doc.querySelector('input[type="password"]')||text(doc.querySelector('h1'))!=='Оценки и прогресс')fail();
  const periods=[...doc.querySelectorAll('select')].map(n=>n.value).filter(v=>v==='all'||/^20\d\d-/.test(v));
  if(periods.length!==1)fail();const period=G.period(periods[0]);
  const filter=doc.querySelector('[role="group"][aria-label="Отбор курсов"] [aria-pressed="true"]');
  if(text(filter)!=='Все')fail();
  const metrics=[],anchors=new Map(),issues=[],courses=new Map();
  function add(m,node){const normalized=G.validateSnapshot({period,complete:true,metrics:[m]}).metrics[0];metrics.push(m);anchors.set(normalized.key,node);}
  const rows=[...doc.querySelectorAll('table[role="grid"] tr[data-rowkey]')];if(!rows.length)fail();
  for(const row of rows){
   const cell=row.querySelector('.cmp-grades__cell'),title=text(cell?.querySelector('.cmp-grades__titlerow'));
   const code=/·\s*([A-Z][A-Z0-9 ]{1,23})$/.exec(text(cell))?.[1]?.trim();
   const statusText=text(row.lastElementChild),status=statusText==='В процессе'?'current':statusText==='Завершён'||statusText==='Завершен'||statusText==='Завершено'?'closed':null;
   if(!title||!code||!status||courses.has(title))fail();courses.set(title,code);
   const node=row.querySelector('.cmp-grades__score');
   add({kind:'course',course:code,work:'',...grade(text(node?.firstElementChild)),status},node);
  }
  const quizzes=[...doc.querySelectorAll('.qui-row a.qui-row__texts[href*="/quiz/"]')];
  const assignments=[...doc.querySelectorAll('.cmp-graderow__head')];
  const count=/(\d+)\s+работ/.exec(text(doc.querySelector('.cmp-grades__acchead')));
  if(!count||+count[1]!==quizzes.length+assignments.length)fail();
  const ids=new Map();
  for(const a of quizzes){const id=/^\/ru\/quiz\/([0-9a-f-]{36})$/.exec(a.getAttribute('href'))?.[1];if(id)ids.set(id,(ids.get(id)||0)+1);}
  for(const a of quizzes){
   const id=/^\/ru\/quiz\/([0-9a-f-]{36})$/.exec(a.getAttribute('href'))?.[1];
   const course=courses.get(text(a.children[1]).split(' · ')[0]);
   if(!id||ids.get(id)!==1||!course){issues.push('Квиз: нет однозначного сопоставления работы или попытки.');continue;}
   const node=a.closest('.qui-row').querySelector('.qui-row__meta');
   add({kind:'quiz',course,work:id,...grade(text(node)),status:'closed'},node);
  }
  for(const _ of assignments)issues.push('Работа: нет проверенного идентификатора для сопоставления.');
  const tiles=[...doc.querySelectorAll('.qui-stattile')].filter(n=>text(n.querySelector('.qui-stattile__label'))==='Средний балл (GPA)');
  if(tiles.length!==1)fail();
  const gpaNode=tiles[0].querySelector('.qui-stattile__value'),raw=text(gpaNode);let gpaState='missing';
  if(!gpaNode||!raw)fail();
  if(raw!=='—'){const value=G.number(raw);if(value===null)fail();add({kind:'gpa',course:'',work:'',value,max:4,status:'closed'},gpaNode);gpaState='available';}
  return {snapshot:G.validateSnapshot({period,complete:true,metrics}),anchors,issues,gpaState};
 }
 return {parse,identity};
})();
