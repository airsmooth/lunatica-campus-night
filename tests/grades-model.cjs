const {test}=require('node:test'),assert=require('node:assert/strict');
require('../extension/grades-model.js'); const G=globalThis.CampusGrades;
const metric=(more={})=>({kind:'course',course:'AI1303',work:'',value:40,max:40,status:'current',...more});
test('strict numbers, normalization, bounds and allowlisted payload',()=>{
 assert.equal(G.number('92,72'),92.72);assert.equal(G.number('—'),null);assert.equal(G.number(''),null);assert.equal(G.number('0'),0);
 for(const bad of ['1e2','0x10','Infinity','1,2.3','100junk'])assert.equal(G.number(bad),null);
 const s=G.validateSnapshot({period:'2026-2027~1',complete:true,metrics:[metric()]});
 assert.equal(s.metrics[0].score,100);assert.equal(s.metrics[0].key,'course:AI1303:current');
 assert.equal(G.validateSnapshot({period:'2026-2027~1',complete:true,metrics:[metric({value:0})]}).metrics[0].score,0);
 for(const v of [{period:'all',complete:true,metrics:[]},{period:'2026-2027~1',complete:false,metrics:[]},{period:'2026-2027~1',complete:true,metrics:[metric({value:41})]},{period:'2026-2027~1',complete:true,metrics:[metric(),metric()]},{period:'2026-2027~1',complete:true,metrics:[metric({email:'x@y.kz'})]}])assert.throws(()=>G.validateSnapshot(v));
 assert.throws(()=>G.validateSnapshot({period:'2026-2027~1',complete:true,metrics:[metric({kind:'gpa',course:'',value:4.1,max:4,status:'closed'})]}));
});
test('coarse percentile and rank ranges keep all ties and suppress small samples',()=>{
 assert.equal(G.range(19,0,1),null);
 assert.deepEqual(G.range(100,20,1),{percent:[20,30],places:[21,40],participants:[100,119],tied:false});
 assert.deepEqual(G.range(20,0,20).percent,[0,100]);assert.equal(G.range(20,0,20).tied,true);
 assert.deepEqual(G.range(100,19,3).percent,[10,30]);assert.deepEqual(G.range(100,19,3).places,[1,40]);
 assert.throws(()=>G.range(20,20,1));
});
