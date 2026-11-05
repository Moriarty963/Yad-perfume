'use strict';
const crypto=require('node:crypto');
const {database,available}=require('../lib/yad-club-db');
const COOKIE='yad_club_session';
const DAYS=30;
const MAX_BODY=1700;
const CONSENT_VERSION='2026-11-v1';
const formatEmail=value=>String(value||'').trim().toLowerCase();
const emailValid=value=>typeof value==='string'&&value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
const nameValid=value=>typeof value==='string'&&value.trim().length>=2&&value.trim().length<=80&&!/[<>\x00-\x1f]/.test(value);
const digest=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
function secret(){return process.env.YAD_CLUB_SESSION_SECRET||''}
const codeHash=(email,code)=>crypto.createHmac('sha256',secret()).update('YAD:CLUB:OTP:v1:'+email+':'+code).digest('hex');
const cookie=(value,age)=>COOKIE+'='+value+'; HttpOnly; Secure; SameSite=Lax; Path=/api/club; Max-Age='+age;
function sameOrigin(req){
 const origin=req.headers.origin;
 if(!origin)return false;
 try{return new URL(origin).host===req.headers.host&&new URL(origin).protocol==='https:'}catch{return false}
}
async function getMember(db,req){
 const v=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';
 if(!/^[a-f0-9]{64}$/.test(v))return null;
 const r=await db.query(`SELECT m.id,m.display_name,m.email,m.verified_at,m.promotions_opt_in,m.created_at
  FROM yad_club_sessions s JOIN yad_club_members m ON m.id=s.member_id
  WHERE s.token_hash=$1 AND s.expires_at>now() LIMIT 1`,[digest(v)]);
 return r.rows[0]||null;
}
async function emailCode(to,code){
 const response=await fetch('https://api.resend.com/emails',{method:'POST',
  headers:{'Authorization':'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},
  body:JSON.stringify({from:process.env.YAD_CLUB_FROM_EMAIL,to:[to],
   subject:'YAD Club — ваш код подтверждения',
   text:'Код для входа в YAD Club: '+code+'\n\nДействует 10 минут. Если вы не запрашивали код, проигнорируйте письмо.'}),
  signal:AbortSignal.timeout(7000)});
 if(!response.ok)throw Error('Resend rejected verification email');
}
async function safeBody(req){
 const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});
 if(raw.length>MAX_BODY)throw Object.assign(new Error('Слишком большой запрос.'),{http:413});
 try{return typeof req.body==='string'?JSON.parse(req.body):req.body||{}}
 catch{throw Object.assign(new Error('Некорректные данные.'),{http:400})}
}
function publicMember(row){return {name:row.display_name,email:row.email,verified:Boolean(row.verified_at),promotions:Boolean(row.promotions_opt_in),created_at:row.created_at}}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST','PATCH','DELETE'].includes(req.method)){res.setHeader('Allow','GET, POST, PATCH, DELETE');return res.status(405).json({error:'Метод не поддерживается.'})}
 if(!available())return res.status(503).json({enabled:false,error:'Регистрация YAD Club готовится к запуску.'});
 if(req.method!=='GET'&&!sameOrigin(req))return res.status(403).json({error:'Запрос не прошёл проверку безопасности.'});
 const action=String(req.query?.action||'');
 try{
  const db=database();
  if(req.method==='GET'){
   const member=await getMember(db,req);
   return res.status(200).json({enabled:true,authenticated:Boolean(member),member:member?publicMember(member):null});
  }
  if(req.method==='POST'&&action==='start'){
   const b=await safeBody(req);
   const email=formatEmail(b.email);
   const name=String(b.name||'').trim();
   if(!emailValid(email)||!nameValid(name)||typeof b.promotions!=='boolean'||b.terms!==true)return res.status(400).json({error:'Укажите корректные имя и адрес почты.'});
   // Rate limiting by privacy-preserving daily IP fingerprint. Never persist the raw IP.
   const ip=String(req.headers['x-forwarded-for']||'').split(',')[0].trim().slice(0,120);
   const daily=new Date().toISOString().slice(0,10);
   const ipHash=crypto.createHmac('sha256',secret()).update('ip:'+daily+':'+ip).digest('hex');
   const recent=await db.query(`SELECT count(*)::int AS n FROM yad_club_request_log WHERE ip_hash=$1 AND requested_at>now()-interval '1 hour'`,[ipHash]);
   if(Number(recent.rows[0].n)>=10)return res.status(429).json({error:'Слишком много запросов. Повторите позже.'});
   const code=String(crypto.randomInt(0,1000000)).padStart(6,'0');
   // The database enforces a 60-second cooldown even under simultaneous requests.
   // Do not create a member or subscribe them until this code is verified.
   const challenge=await db.query(`INSERT INTO yad_club_challenges
    (email,display_name,code_hash,expires_at,sent_at,attempts,promotions_requested,request_ip_hash)
    VALUES($1,$2,$3,now()+interval '10 minutes',now(),0,$4,$5)
    ON CONFLICT(email) DO UPDATE SET display_name=excluded.display_name,code_hash=excluded.code_hash,
     expires_at=excluded.expires_at,sent_at=now(),attempts=0,promotions_requested=excluded.promotions_requested,
     request_ip_hash=excluded.request_ip_hash
    WHERE yad_club_challenges.sent_at <= now()-interval '60 seconds'
    RETURNING email`,[email,name,codeHash(email,code),b.promotions,ipHash]);
   if(!challenge.rows.length)return res.status(429).json({error:'Повторно запросить код можно через минуту.'});
   await db.query(`INSERT INTO yad_club_request_log(ip_hash) VALUES($1)`,[ipHash]);
   try{await emailCode(email,code)}catch(e){
    // Delete the unused code so the user can safely retry after a sending outage.
    await db.query(`DELETE FROM yad_club_challenges WHERE email=$1 AND code_hash=$2`,[email,codeHash(email,code)]);
    console.error('YAD Club transactional email unavailable',e?.message);
    return res.status(503).json({error:'Сейчас не удаётся отправить письмо. Попробуйте позже.'});
   }
   return res.status(200).json({ok:true,message:'Отправили шестизначный код на вашу почту.'});
  }
  if(req.method==='POST'&&action==='verify'){
   const b=await safeBody(req),email=formatEmail(b.email),code=String(b.code||'');
   if(!emailValid(email)||!/^[0-9]{6}$/.test(code))return res.status(400).json({error:'Введите код из шести цифр.'});
   const client=await db.connect();
   let member,token;
   try{
    await client.query('BEGIN');
    const candidate=await client.query(`SELECT code_hash,display_name,promotions_requested,attempts FROM yad_club_challenges
    WHERE email=$1 AND expires_at>now() AND attempts<5 FOR UPDATE`,[email]);
   if(!candidate.rows.length){await client.query('ROLLBACK');return res.status(400).json({error:'Код недействителен или истёк. Запросите новый.'})}
   const value=candidate.rows[0];
   const expected=Buffer.from(value.code_hash,'hex'),received=Buffer.from(codeHash(email,code),'hex');
   if(!crypto.timingSafeEqual(expected,received)){
    await client.query(`UPDATE yad_club_challenges SET attempts=attempts+1 WHERE email=$1`,[email]);
    await client.query('COMMIT');
    return res.status(400).json({error:'Код не подходит. Проверьте письмо.'});
   }
   // Serialize successful verification to prevent duplicate session/account creation.
    const consumed=await client.query(`DELETE FROM yad_club_challenges WHERE email=$1 AND code_hash=$2 AND attempts<5 AND expires_at>now() RETURNING display_name,promotions_requested`,[email,value.code_hash]);
    if(!consumed.rows.length){await client.query('ROLLBACK');return res.status(409).json({error:'Код уже использован.'})}
    const existing=await client.query(`SELECT id FROM yad_club_members WHERE email=$1`,[email]);
    if(!existing.rows.length){
     const created=await client.query(`INSERT INTO yad_club_members(email,display_name,promotions_opt_in,promotions_consented_at,consent_version)
      VALUES($1,$2,$3,CASE WHEN $3 THEN now() ELSE NULL END,$4) RETURNING id`,
      [email,value.display_name,value.promotions_requested,CONSENT_VERSION]);
     member=created.rows[0];
     if(value.promotions_requested)await client.query(`INSERT INTO yad_club_consent_log(member_id,consent_version,action,source) VALUES($1,$2,'opt_in','registration')`,[member.id,CONSENT_VERSION]);
    }else{
     member=existing.rows[0];
     // Signing into an existing account never silently changes newsletter preferences.
    }
    token=crypto.randomBytes(32).toString('hex');
    await client.query(`INSERT INTO yad_club_sessions(token_hash,member_id,expires_at) VALUES($1,$2,now()+interval '30 days')`,[digest(token),member.id]);
    await client.query('COMMIT');
   }catch(e){await client.query('ROLLBACK');throw e}
   finally{client.release()}
   res.setHeader('Set-Cookie',cookie(token,DAYS*24*60*60));
   const result=await getMember(db,{headers:{cookie:COOKIE+'='+token}});
   return res.status(200).json({authenticated:true,member:publicMember(result)});
  }
  if(req.method==='POST'&&action==='logout'){
   const v=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';
   if(/^[a-f0-9]{64}$/.test(v))await db.query(`DELETE FROM yad_club_sessions WHERE token_hash=$1`,[digest(v)]);
   res.setHeader('Set-Cookie',cookie('',0));
   return res.status(200).json({ok:true});
  }
  const member=await getMember(db,req);
  if(!member)return res.status(401).json({error:'Сначала войдите в аккаунт.'});
  if(req.method==='PATCH'){
   const b=await safeBody(req);
   if(!nameValid(b.name)||typeof b.promotions!=='boolean')return res.status(400).json({error:'Проверьте имя и настройки рассылки.'});
   const client=await db.connect();
   try{
    await client.query('BEGIN');
    const previous=await client.query(`SELECT promotions_opt_in FROM yad_club_members WHERE id=$1 FOR UPDATE`,[member.id]);
    if(!previous.rows.length){await client.query('ROLLBACK');return res.status(401).json({error:'Сессия больше не действует.'})}
    await client.query(`UPDATE yad_club_members SET display_name=$1,
     promotions_opt_in=$2,promotions_consented_at=CASE WHEN $2 AND NOT promotions_opt_in THEN now() ELSE promotions_consented_at END,
     promotions_revoked_at=CASE WHEN NOT $2 AND promotions_opt_in THEN now() ELSE promotions_revoked_at END,
     consent_version=$3 WHERE id=$4`,[b.name.trim(),b.promotions,CONSENT_VERSION,member.id]);
    if(previous.rows[0].promotions_opt_in!==b.promotions){
     await client.query(`INSERT INTO yad_club_consent_log(member_id,consent_version,action,source) VALUES($1,$2,$3,'profile')`,
      [member.id,CONSENT_VERSION,b.promotions?'opt_in':'opt_out']);
    }
    await client.query('COMMIT');
   }catch(e){await client.query('ROLLBACK');throw e}
   finally{client.release()}
   const updated=await getMember(db,req);
   return res.status(200).json({member:publicMember(updated)});
  }
  if(req.method==='DELETE'){
   await db.query(`DELETE FROM yad_club_members WHERE id=$1`,[member.id]);
   res.setHeader('Set-Cookie',cookie('',0));
   return res.status(200).json({ok:true});
  }
  res.setHeader('Allow','GET, POST, PATCH, DELETE');
  return res.status(405).json({error:'Метод не поддерживается.'});
 }catch(e){
  if(e?.http)return res.status(e.http).json({error:e.message});
  console.error('YAD Club failed',e?.message);
  return res.status(500).json({error:'YAD Club временно недоступен.'});
 }
};
