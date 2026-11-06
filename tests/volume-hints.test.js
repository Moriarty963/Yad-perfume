'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

test('all six YAD sizes have a plain-language, dynamically selected explanation',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
 const start=code.indexOf('const detailVolumeHints=');
 const end=code.indexOf('function updateDetailPackaging()',start);
 assert.ok(start>0&&end>start,'volume helper is present');
 const segment=code.slice(start,end);
 const holder={textContent:''};
 const api=vm.runInNewContext(segment+'\n({hints:detailVolumeHints,update:updateDetailVolumeHint})',{'$':id=>id==='detailSizeHint'?holder:null});
 assert.deepEqual(Object.keys(api.hints).sort(),['6','10','100','20','30','50'].sort());
 for(const ml of [6,10,20,30,50,100]){
  api.update(ml);
  assert.equal(holder.textContent,api.hints[ml]);
  assert.ok(holder.textContent.length>=20,'guide should be informative for '+ml);
 }
 assert.ok(!code.includes('30% эссенции'),'do not show internal composition percent');
 assert.ok(code.includes('updateDetailVolumeHint(Number(size.dataset.detailSize))'),'guide updates when size changes');
 assert.ok(code.includes('updateDetailVolumeHint(20)'),'guide starts from selected default size');
});
