const {neon}=require('@neondatabase/serverless');
const crypto=require('node:crypto');
const COOKIE='yad_admin_session';
const adminPassword=process.env.ADMIN_PASSWORD||process.env.Admin_password;
const sessionSecret=process.env.ADMIN_SESSION_SECRET||process.env.admin_session_secret;
const maxAge=60*60*8;
function configured(){return Boolean(adminPassword&&sessionSecret&&adminPassword.length>=12&&sessionSecret.length>=32&&process.env.DATABASE_URL)}
function digest(v){return crypto.createHash('sha256').update(String(v)).digest()}
function equal(a,b){return crypto.timingSafeEqual(digest(a),digest(b))}
function sign(payload){return crypto.createHmac('sha256',sessionSecret).update(payload).digest('hex')}
function authorized(req){const cookies=(req.headers.cookie||'').split(';').map(s=>s.trim());const value=cookies.find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!value)return false;const match=/^(\d+)\.([a-f0-9]{64})$/.exec(value);if(!match||Number(match[1])<Date.now()||Number(match[1])>Date.now()+maxAge*1000)return false;return equal(match[2],sign(match[1]))}
function cookie(value,age){return COOKIE+'='+value+'; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age='+age}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(!configured())return res.status(503).json({error:'Панель администратора ещё не активирована.'});
 if(req.method==='POST'&&req.query.action==='login'){
  const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  if(typeof b.password!=='string'||!equal(b.password,adminPassword))return res.status(401).json({error:'Неверный пароль.'});
  const exp=String(Date.now()+maxAge*1000);res.setHeader('Set-Cookie',cookie(exp+'.'+sign(exp),maxAge));return res.status(200).json({ok:true});
 }
 if(req.method==='POST'&&req.query.action==='logout'){res.setHeader('Set-Cookie',cookie('',0));return res.status(200).json({ok:true})}
 if(!authorized(req))return res.status(401).json({error:'Требуется вход.'});
 const sql=neon(process.env.DATABASE_URL);
 try{
  if(req.method==='GET'){
   const rows=await sql`SELECT public_id,created_at,customer_name,customer_phone,contact_method,contact_value,delivery_service,pickup_address,comment,items,subtotal_rub,delivery_rub,total_rub,status FROM yad_orders ORDER BY created_at DESC LIMIT 100`;
   return res.status(200).json({orders:rows});
  }
  if(req.method==='PATCH'){
   const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
   if(typeof b.id!=='string'||!/^[0-9a-f-]{36}$/i.test(b.id)||!['new','confirmed','processing','shipped','completed','cancelled'].includes(b.status))return res.status(400).json({error:'Неверные данные.'});
   const rows=await sql`UPDATE yad_orders SET status=${b.status} WHERE public_id=${b.id}::uuid RETURNING public_id,status`;
   if(!rows.length)return res.status(404).json({error:'Заказ не найден.'});
   return res.status(200).json({order:rows[0]});
  }
  res.setHeader('Allow','GET, POST, PATCH');return res.status(405).json({error:'Method not allowed'});
 }catch(e){console.error('YAD admin failed',e?.message);return res.status(500).json({error:'Не удалось загрузить данные.'})}
};