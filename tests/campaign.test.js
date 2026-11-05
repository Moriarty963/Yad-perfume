'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');

test('campaign drafts: admin auth, validation, create, revision conflict, delete',async()=>{
 const originalLoad=Module._load;
 const originalEnv={ADMIN_PASSWORD:process.env.ADMIN_PASSWORD,ADMIN_SESSION_SECRET:process.env.ADMIN_SESSION_SECRET,DATABASE_URL:process.env.DATABASE_URL};
 process.env.ADMIN_PASSWORD='campaign-test-very-long-admin-password';
 process.env.ADMIN_SESSION_SECRET='campaign-test-long-and-private-session-secret-2026';
 process.env.DATABASE_URL='postgresql://mock-host/mock';
 const saved=[];
 const uuid='12345678-1234-4234-8234-123456789abc';
 async function sql(strings,...args){
  const query=strings.join('?').replace(/\s+/g,' ').trim();
  if(query.startsWith('SELECT id,title,body,target_url,revision,created_at,updated_at FROM yad_campaign_drafts'))return saved.slice();
  if(query.startsWith('INSERT INTO yad_campaign_drafts (title,body,target_url)')){
   const row={id:uuid,title:args[0],body:args[1],target_url:args[2],revision:1,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
   saved.push(row);return [row];
  }
  if(query.startsWith('UPDATE yad_campaign_drafts SET')){
   const row=saved.find(x=>x.id===args[3]&&x.revision===args[4]);
   if(!row)return [];
   row.title=args[0];row.body=args[1];row.target_url=args[2];row.revision++;return [row];
  }
  if(query.startsWith('SELECT id FROM yad_campaign_drafts WHERE id='))return saved.filter(x=>x.id===args[0]).map(x=>({id:x.id}));
  if(query.startsWith('DELETE FROM yad_campaign_drafts WHERE id=')){
   const i=saved.findIndex(x=>x.id===args[0]);if(i<0)return [];
   return [{id:saved.splice(i,1)[0].id}];
  }
  throw new Error('Unexpected database query in campaign test: '+query);
 }
 function res(){
  return {statusCode:200,headers:{},body:null,setHeader(k,v){this.headers[k]=v;return this},status(v){this.statusCode=v;return this},json(v){this.body=v;return this}};
 }
 let handler;
 try{
  Module._load=function(request,parent,isMain){
   if(request==='@neondatabase/serverless')return {neon:()=>sql};
   return originalLoad.apply(this,arguments);
  };
  delete require.cache[require.resolve('../api/admin')];
  handler=require('../api/admin');
 }finally{Module._load=originalLoad}
 try{
  const host='yad-market.vercel.app',origin='https://'+host;
  const anon=res();
  await handler({method:'GET',headers:{host},query:{action:'campaigns'}},anon);
  assert.equal(anon.statusCode,401);
  const login=res();
  await handler({method:'POST',headers:{host,origin},query:{action:'login'},body:{password:process.env.ADMIN_PASSWORD}},login);
  assert.equal(login.statusCode,200);
  const session=login.headers['Set-Cookie'].split(';')[0];
  const req=(method,action,body,headers={})=>({method,headers:{host,origin,cookie:session,...headers},query:{action},body});
  const cross=res();
  await handler(req('POST','campaign',{title:'Акция YAD',body:'Наше специальное предложение',url:''},{origin:'https://hostile.example'}),cross);
  assert.equal(cross.statusCode,403);
  const link=res();
  await handler(req('POST','campaign',{title:'Акция YAD',body:'Наше специальное предложение',url:'https://another.example/phishing'}),link);
  assert.equal(link.statusCode,400);
  const malformed=res();
  await handler(req('POST','campaign','{'),malformed);
  assert.equal(malformed.statusCode,400);
  const data={title:'Подарочный набор YAD',body:'Три аромата по 20 мл в подарочной коробке за 4900 ₽.',url:'https://yad-market.vercel.app/gift-set'};
  const create=res();
  await handler(req('POST','campaign',data),create);
  assert.equal(create.statusCode,201);
  assert.equal(create.body.draft.revision,1);
  const list=res();await handler(req('GET','campaigns'),list);
  assert.equal(list.statusCode,200);assert.equal(list.body.drafts.length,1);
  const update=res();
  await handler(req('PATCH','campaign',{...data,id:uuid,revision:1,title:'Подарочный набор · специальная цена'}),update);
  assert.equal(update.statusCode,200);assert.equal(update.body.draft.revision,2);
  const stale=res();
  await handler(req('PATCH','campaign',{...data,id:uuid,revision:1}),stale);
  assert.equal(stale.statusCode,409);
  const deleteReq=res();await handler(req('DELETE','campaign',{id:uuid}),deleteReq);
  assert.equal(deleteReq.statusCode,200);
  const empty=res();await handler(req('GET','campaigns'),empty);
  assert.equal(empty.body.drafts.length,0);
 }finally{
  delete require.cache[require.resolve('../api/admin')];
  for(const [k,v] of Object.entries(originalEnv)){if(v===undefined)delete process.env[k];else process.env[k]=v}
 }
});
