'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');
test('public campaign is visible only after authenticated explicit publication',async()=>{
 const savedEnvironment={ADMIN_PASSWORD:process.env.ADMIN_PASSWORD,ADMIN_SESSION_SECRET:process.env.ADMIN_SESSION_SECRET,DATABASE_URL:process.env.DATABASE_URL};
 process.env.ADMIN_PASSWORD='campaign-test-long-admin-password';
 process.env.ADMIN_SESSION_SECRET='campaign-test-long-private-session-secret-2026';
 process.env.DATABASE_URL='postgres://mock/db';
 const id='11111111-2222-4333-8444-555555555555';
 let published=false;
 const draft={id,title:'YAD Gift Set',body:'Три аромата на выбор в подарочной коробке',target_url:'https://yad-market.vercel.app/gift-set',revision:1};
 async function sql(strings,...args){
  const q=strings.join('?').replace(/\s+/g,' ').trim();
  if(q.startsWith('INSERT INTO yad_campaign_publication(slot,campaign_id,published_at)')){
   if(args[0]!==id||!draft.target_url)return [];
   published=true;return [{campaign_id:id,published_at:new Date().toISOString()}];
  }
  if(q.startsWith('DELETE FROM yad_campaign_publication')){
   const rows=published&&args[0]===id?[{campaign_id:id}]:[];
   published=false;return rows;
  }
  if(q.startsWith('SELECT d.title,d.body,d.target_url FROM yad_campaign_publication')){
   return published?[{title:draft.title,body:draft.body,target_url:draft.target_url}]:[];
  }
  if(q.startsWith('SELECT d.id,d.title,d.body,d.target_url,d.revision,d.created_at,d.updated_at,')){
   return [{...draft,published}];
  }
  throw Error('Unexpected SQL: '+q);
 }
 function response(){return{statusCode:200,headers:{},payload:null,setHeader(k,v){this.headers[k]=v;return this},status(v){this.statusCode=v;return this},json(v){this.payload=v;return this}}}
 const original=Module._load;
 let admin,publicCampaign;
 try{
  Module._load=function(request,...rest){
   if(request==='@neondatabase/serverless')return{neon:()=>sql};
   return original.call(this,request,...rest);
  };
  for(const mod of ['../api/admin','../api/campaign']){delete require.cache[require.resolve(mod)]}
  admin=require('../api/admin');publicCampaign=require('../api/campaign');
 }finally{Module._load=original}
 try{
  const host='yad-market.vercel.app',origin='https://'+host;
  const unauth=response();
  await admin({method:'POST',headers:{host,origin},query:{action:'campaign-publication'},body:{id,publish:true}},unauth);
  assert.equal(unauth.statusCode,401);
  let r=response();await publicCampaign({method:'GET',headers:{host}},r);
  assert.equal(r.statusCode,200);assert.equal(r.payload.campaign,null);
  const login=response();
  await admin({method:'POST',headers:{host,origin},query:{action:'login'},body:{password:process.env.ADMIN_PASSWORD}},login);
  assert.equal(login.statusCode,200);
  const cookie=login.headers['Set-Cookie'].split(';')[0];
  const make=(method,body,customOrigin=origin)=>({method,headers:{host,origin:customOrigin,cookie},query:{action:'campaign-publication'},body});
  r=response();await admin(make('POST',{id,publish:true},'https://other.example'),r);
  assert.equal(r.statusCode,403);
  r=response();await admin(make('POST',{id,publish:true}),r);
  assert.equal(r.statusCode,200);assert.equal(r.payload.published,true);
  r=response();await publicCampaign({method:'GET',headers:{host}},r);
  assert.equal(r.statusCode,200);
  assert.equal(r.payload.campaign.title,'YAD Gift Set');
  assert.equal(r.payload.campaign.url,'https://yad-market.vercel.app/gift-set');
  const privateList=response();
  await admin({method:'GET',headers:{host,cookie},query:{action:'campaigns'}},privateList);
  assert.equal(privateList.statusCode,200);assert.equal(privateList.payload.drafts[0].published,true);
  r=response();await admin(make('POST',{id,publish:false}),r);
  assert.equal(r.statusCode,200);assert.equal(r.payload.published,false);
  r=response();await publicCampaign({method:'GET',headers:{host}},r);
  assert.equal(r.payload.campaign,null);
  r=response();await publicCampaign({method:'POST',headers:{host}},r);
  assert.equal(r.statusCode,405);
 }finally{
  for(const mod of ['../api/admin','../api/campaign'])delete require.cache[require.resolve(mod)];
  for(const [k,v] of Object.entries(savedEnvironment)){if(v===undefined)delete process.env[k];else process.env[k]=v}
 }
});
