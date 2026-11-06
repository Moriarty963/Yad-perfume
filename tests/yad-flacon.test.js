'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const sharp=require('sharp');
const {renderYadFlacon,BOTTLES,fragrance}=require('../lib/yad-flacon-renderer');
const {YAD_CATALOG_ROWS,YAD_BASE_STUDIO_COUNT}=require('../catalog-data.js');

test('new catalog entries automatically receive all six original YAD bottle formats',()=>{
 assert.equal(YAD_BASE_STUDIO_COUNT,69);
 assert.equal(YAD_CATALOG_ROWS.length,70);
 assert.equal(fragrance('imagination'),null);
 assert.equal(fragrance('bibliotheque')[1],'Bibliothèque');
 assert.deepEqual(Object.keys(BOTTLES).map(Number).sort((a,b)=>a-b),[6,10,20,30,50,100]);
});
test('six formatted YAD bottle photos render with precise replacement names and WebP output',async()=>{
 const original=global.fetch;
 // Fixed neutral studio input avoids any real HTTP dependency during tests.
 const input=await sharp({create:{width:1200,height:1450,channels:4,background:'#f4e1cd'}})
  .webp().toBuffer();
 global.fetch=async()=>({ok:true,arrayBuffer:async()=>input});
 try{
  for(const ml of [6,10,20,30,50,100]){
   const output=await renderYadFlacon('bibliotheque',ml);
   const info=await sharp(output).metadata();
   assert.equal(info.format,'webp');
   assert.equal(info.width,1200);
   assert.equal(info.height,1450);
   assert.ok(output.length>500,'image is empty at '+ml+'ml');
  }
  await assert.rejects(()=>renderYadFlacon('imagination',20),/Unknown new fragrance/);
  await assert.rejects(()=>renderYadFlacon('unlisted',20),/Unknown new fragrance/);
 }finally{global.fetch=original}
});
