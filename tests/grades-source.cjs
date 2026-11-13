const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
require('../extension/grades-model.js');require('../extension/grades-source.js');const S=globalThis.CampusGradesSource;
const id='11111111-1111-4111-8111-111111111111';
function doc({gpa='—',score='80 %',extra='',count=2,selected='2026-2027~1'}={}){return new JSDOM(`<main><h1>Оценки и прогресс</h1><select><option value="${selected}" selected>Период</option></select><div class="qui-stattile"><div class="qui-stattile__label">Средний балл (GPA)</div><div class="qui-stattile__value">${gpa}</div></div><div role="group" aria-label="Отбор курсов"><button aria-pressed="true">Все</button></div><table role="grid"><tbody><tr data-rowkey="${id}"><td><span class="cmp-grades__cell"><span class="cmp-grades__titlerow"><span>Синтетический курс</span></span><span>4 кредита · AI1303</span></span></td><td><span class="cmp-grades__score"><span>${score}</span><span>B</span></span></td><td>В процессе</td></tr></tbody></table><div class="cmp-grades__acchead">Все оценённые работы <span>${count} работ оценено</span></div><div class="qui-row"><a class="qui-row__texts" href="/ru/quiz/${id}"><span>Квиз 1</span><span>Синтетический курс · 1 ноября · попытка 1</span></a><span class="qui-row__meta">40 / 40</span></div><div class="qui-acc"><span class="cmp-graderow__head"><span class="cmp-graderow__meta"><span>Работа без ID</span><span>Синтетический курс · 1 ноября</span></span><span>70 / 100</span></span></div>${extra}</main>`,{url:'https://campus.qairu.edu.kz/ru/grades'}).window.document}
test('observed grade DOM yields course, quiz, verified period GPA without guessing unknown work',()=>{
 const a=S.parse(doc());assert.equal(a.snapshot.period,'2026-2027~1');assert.equal(a.snapshot.metrics.length,2);assert.ok(a.issues.some(x=>/сопостав/.test(x)));
 assert.equal(a.snapshot.metrics.find(m=>m.kind==='quiz').score,100);assert.equal(a.gpaState,'missing');
 const b=S.parse(doc({gpa:'3,67'}));assert.equal(b.snapshot.metrics.find(m=>m.kind==='gpa').value,3.67);
 assert.equal(S.parse(doc({gpa:'0'})).snapshot.metrics.find(m=>m.kind==='gpa').value,0);
 assert.throws(()=>S.parse(doc({gpa:'4,1'})));assert.throws(()=>S.parse(doc({score:'—'})));assert.throws(()=>S.parse(doc({count:3})));assert.throws(()=>S.parse(doc({selected:'all'})));
});
test('duplicate attempts, partial filters and missing identity fail closed',()=>{
 const d=doc();d.querySelector('.qui-row').after(d.querySelector('.qui-row').cloneNode(true));d.querySelector('.cmp-grades__acchead').textContent='Все оценённые работы 3 работ оценено';
 assert.equal(S.parse(d).snapshot.metrics.filter(x=>x.kind==='quiz').length,0);
 const filtered=doc();filtered.querySelector('[aria-pressed]').textContent='Завершены';assert.throws(()=>S.parse(filtered));
 const p=new JSDOM('<h1>Профиль</h1><dl><div><dt>Корпоративная почта</dt><dd>student@example.qairu.edu.kz</dd></div><div><dt>ИИН</dt><dd>never-read</dd></div></dl>').window.document;
 assert.equal(S.identity(p),'student@example.qairu.edu.kz');p.querySelector('dd').textContent='';assert.throws(()=>S.identity(p));
});
