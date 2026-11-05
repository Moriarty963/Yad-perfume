'use strict';
const crypto=require('node:crypto');
const DOMAIN='YAD:CLUB:UNSUBSCRIBE:V1';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_TTL=366*24*60*60;
function secret(){return process.env.YAD_CLUB_SESSION_SECRET||''}
function signature(payload){return crypto.createHmac('sha256',secret()).update(DOMAIN+':'+payload).digest('hex')}
function issueUnsubscribeToken(memberId){
 const id=String(memberId||'').toLowerCase();
 if(secret().length<32||!UUID.test(id))throw Error('Club unsubscribe not configured');
 const payload='v1.'+id+'.'+String(Math.floor(Date.now()/1000)+MAX_TTL);
 return payload+'.'+signature(payload);
}
function verifyUnsubscribeToken(token){
 if(secret().length<32||typeof token!=='string'||token.length>160)return null;
 const match=/^(v1\.([0-9a-f-]{36})\.([0-9]{10}))\.([a-f0-9]{64})$/.exec(token);
 if(!match||!UUID.test(match[2]))return null;
 const expiry=Number(match[3]),now=Math.floor(Date.now()/1000);
 if(!Number.isSafeInteger(expiry)||expiry<now||expiry>now+MAX_TTL+60)return null;
 const expected=Buffer.from(signature(match[1]),'hex');
 const actual=Buffer.from(match[4],'hex');
 return expected.length===actual.length&&crypto.timingSafeEqual(expected,actual)?match[2]:null;
}
module.exports={issueUnsubscribeToken,verifyUnsubscribeToken};
