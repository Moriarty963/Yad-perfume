'use strict';
const crypto=require('node:crypto');
// Reuses the existing production secret with a distinct HMAC domain.
const secret=process.env.YAD_ORDER_STATUS_SECRET||process.env.ADMIN_SESSION_SECRET||process.env.admin_session_secret||'';
const ttlSeconds=180*24*60*60;
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function configured(){return typeof secret==='string'&&secret.length>=32}
function signature(payload){
 return crypto.createHmac('sha256',secret).update('YAD:ORDER_STATUS:V1:'+payload).digest('hex');
}
function issueToken(publicId){
 const id=String(publicId||'').toLowerCase();
 if(!configured()||!uuidPattern.test(id))return null;
 const expiry=Math.floor(Date.now()/1000)+ttlSeconds;
 const payload='v1.'+id+'.'+expiry;
 return payload+'.'+signature(payload);
}
function verifyToken(token){
 if(!configured()||typeof token!=='string'||token.length>160)return null;
 const m=/^(v1\.([0-9a-f-]{36})\.([0-9]{10}))\.([a-f0-9]{64})$/.exec(token);
 if(!m||!uuidPattern.test(m[2]))return null;
 const expiry=Number(m[3]),now=Math.floor(Date.now()/1000);
 if(!Number.isSafeInteger(expiry)||expiry<now||expiry>now+ttlSeconds+60)return null;
 const expected=Buffer.from(signature(m[1]),'hex');
 const provided=Buffer.from(m[4],'hex');
 if(expected.length!==provided.length||!crypto.timingSafeEqual(expected,provided))return null;
 return m[2];
}
module.exports={configured,issueToken,verifyToken,ttlSeconds};
