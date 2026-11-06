'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');

test('Bibliothèque is a unique catalog item with 70 total fragrances and valid audience/family',()=>{
 const {YAD_CATALOG_ROWS}=require('../catalog-data.js');
 assert.equal(YAD_CATALOG_ROWS.length,70);
 const ids=YAD_CATALOG_ROWS.map(row=>row[0]);
 assert.equal(new Set(ids).size,ids.length);
 const item=YAD_CATALOG_ROWS.find(([id])=>id==='bibliotheque');
 assert.deepEqual(item,['bibliotheque','Bibliothèque','Слива · фиалка · кожа · пачули · ваниль','woody','unisex']);
});
test('the order endpoint accepts the new scent at existing YAD pricing',async()=>{
 const {YAD_CATALOG_ROWS}=require('../catalog-data.js');
 assert.ok(YAD_CATALOG_ROWS.some(([id])=>id==='bibliotheque'));
 const originalLoad=Module._load;
 const savedEnv={DATABASE_URL:process.env.DATABASE_URL,YAD_TELEGRAM_BOT_TOKEN:process.env.YAD_TELEGRAM_BOT_TOKEN};
 process.env.DATABASE_URL='postgres://mock.test/database';
 delete process.env.YAD_TELEGRAM_BOT_TOKEN;
 let actualItems=null;
 let handler;
 try{
  Module._load=function(request,parent,isMain){
   if(request==='@neondatabase/serverless')return {neon:()=>async(strings,...args)=>{
    actualItems=JSON.parse(args[7]);
    return[{public_id:'11111111-2222-4333-8444-555555555555',total_rub:1550,subtotal_rub:1300,delivery_rub:250}];
   }};
   if(request==='../lib/order-status-token.js')return {issueToken:()=> 'test-token'};
   if(request==='../lib/yad-telegram-admin')return {adminId:()=>null};
   return originalLoad.call(this,request,parent,isMain);
  };
  delete require.cache[require.resolve('../api/orders.js')];
  handler=require('../api/orders.js');
 }finally{Module._load=originalLoad}
 const res={statusCode:200,payload:null,setHeader(){return this},status(value){this.statusCode=value;return this},json(v){this.payload=v;return this}};
 try{
  await handler({method:'POST',body:{
   name:'Тест Покупатель',method:'whatsapp',contact:'+79991234567',delivery:'Wildberries',address:'Тестовый ПВЗ',comment:'',
   items:[{id:'bibliotheque',ml:20,qty:1}]
  },headers:{}},res);
  assert.equal(res.statusCode,201);
  assert.equal(res.payload.total,1550);
  assert.equal(actualItems[0].id,'bibliotheque');
  assert.equal(actualItems[0].unit_price,1300);
 }finally{
  delete require.cache[require.resolve('../api/orders.js')];
  for(const [k,v] of Object.entries(savedEnv)){if(v===undefined)delete process.env[k];else process.env[k]=v}
 }
});
