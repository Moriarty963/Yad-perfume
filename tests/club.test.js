'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {issueUnsubscribeToken,verifyUnsubscribeToken}=require('../lib/yad-club-unsubscribe');
const sessionSecret='yad-club-unit-test-session-secret-2026-11';
const memberId='12345678-1234-4234-8234-123456789abc';
function mockResponse(){
 return {statusCode:200,headers:{},payload:null,setHeader(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},json(payload){this.payload=payload;return this},end(){return this}};
}
function withoutClubConfig(run){
 const names=['YAD_CLUB_DATABASE_URL','YAD_CLUB_SESSION_SECRET','YAD_CLUB_DATA_REGION','YAD_CLUB_PRIVACY_APPROVED','RESEND_API_KEY','YAD_CLUB_FROM_EMAIL'];
 const before=Object.fromEntries(names.map(k=>[k,process.env[k]]));
 for(const k of names)delete process.env[k];
 return Promise.resolve().then(run).finally(()=>{for(const k of names){if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k]}});
}
test('signed promotional opt-out link requires the exact member and untampered signature',()=>{
 const old=process.env.YAD_CLUB_SESSION_SECRET;
 process.env.YAD_CLUB_SESSION_SECRET=sessionSecret;
 try{
  const token=issueUnsubscribeToken(memberId);
  assert.equal(verifyUnsubscribeToken(token),memberId);
  assert.equal(verifyUnsubscribeToken(token.replace(memberId,'12345678-1234-4234-8234-123456789abd')),null);
  assert.equal(verifyUnsubscribeToken(token.slice(0,-2)+'00'),null);
  assert.equal(verifyUnsubscribeToken('bad'),null);
 }finally{if(old===undefined)delete process.env.YAD_CLUB_SESSION_SECRET;else process.env.YAD_CLUB_SESSION_SECRET=old}
});
test('Club registration API fails closed while account infrastructure is unavailable',async()=>{
 await withoutClubConfig(async()=>{
  const handler=require('../api/club');
  for(const method of ['GET','POST','PATCH','DELETE']){
   const response=mockResponse();
   await handler({method,headers:{},query:{action:'start'},body:{email:'test@example.com'}},response);
   assert.equal(response.statusCode,503);
   assert.equal(response.payload.enabled,false);
  }
 });
});
test('Club unsubscribe API fails closed without a configured regional database',async()=>{
 await withoutClubConfig(async()=>{
  const handler=require('../api/club-unsubscribe');
  const response=mockResponse();
  await handler({method:'GET',headers:{},query:{token:'bogus'}},response);
  assert.equal(response.statusCode,503);
 });
});
test('HMAC tokens are domain separated from unrelated session tokens',()=>{
 const old=process.env.YAD_CLUB_SESSION_SECRET;
 process.env.YAD_CLUB_SESSION_SECRET=sessionSecret;
 try{
  const token=issueUnsubscribeToken(memberId);
  const payload=token.slice(0,token.lastIndexOf('.'));
  const raw=crypto.createHmac('sha256',sessionSecret).update(payload).digest('hex');
  assert.notEqual(token.split('.').at(-1),raw);
 }finally{if(old===undefined)delete process.env.YAD_CLUB_SESSION_SECRET;else process.env.YAD_CLUB_SESSION_SECRET=old}
});
